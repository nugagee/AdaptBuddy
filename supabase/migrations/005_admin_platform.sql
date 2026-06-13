-- STEP 2 of 2 — Run AFTER 004_admin_role_enum.sql has succeeded.
-- Adds profile fields, admin RLS, and privileged RPCs.
-- Then run: node scripts/seed-superadmin.js

-- 1. Profile fields for admin analytics & authorization
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS gender text
    CHECK (gender IS NULL OR gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  ADD COLUMN IF NOT EXISTS is_authorized boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'pending'));

CREATE INDEX IF NOT EXISTS profiles_gender_idx ON public.profiles (gender);
CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles (status);
CREATE INDEX IF NOT EXISTS profiles_is_authorized_idx ON public.profiles (is_authorized);

-- 2. Admin check (security definer — used in RLS & RPCs)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'::public.user_role
  );
$$;

-- 3. Admin RLS on profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());

-- 4. Analytics snapshot (admin-only RPC)
CREATE OR REPLACE FUNCTION public.admin_get_analytics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  SELECT jsonb_build_object(
    'total_users', count(*)::int,
    'by_role', jsonb_build_object(
      'child', count(*) FILTER (WHERE role = 'child')::int,
      'parent', count(*) FILTER (WHERE role = 'parent')::int,
      'teacher', count(*) FILTER (WHERE role = 'teacher')::int,
      'admin', count(*) FILTER (WHERE role = 'admin')::int
    ),
    'by_gender', jsonb_build_object(
      'male', count(*) FILTER (WHERE gender = 'male')::int,
      'female', count(*) FILTER (WHERE gender = 'female')::int,
      'other', count(*) FILTER (WHERE gender = 'other')::int,
      'prefer_not_to_say', count(*) FILTER (WHERE gender = 'prefer_not_to_say')::int,
      'unspecified', count(*) FILTER (WHERE gender IS NULL)::int
    ),
    'by_status', jsonb_build_object(
      'active', count(*) FILTER (WHERE status = 'active')::int,
      'suspended', count(*) FILTER (WHERE status = 'suspended')::int,
      'pending', count(*) FILTER (WHERE status = 'pending')::int
    ),
    'authorized', count(*) FILTER (WHERE is_authorized = true)::int,
    'unauthorized', count(*) FILTER (WHERE is_authorized = false)::int,
    'onboarding_complete', count(*) FILTER (WHERE onboarding_completed = true)::int,
    'avg_age', round(avg(age) FILTER (WHERE age IS NOT NULL), 1),
    'recent_signups_7d', count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int,
    'recent_signups_30d', count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int
  )
  INTO result
  FROM public.profiles;

  RETURN result;
END;
$$;

-- 5. Create user (admin-only; creates auth user + profile)
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email text,
  p_password text,
  p_role public.user_role,
  p_first_name text DEFAULT '',
  p_last_name text DEFAULT '',
  p_gender text DEFAULT NULL,
  p_age integer DEFAULT NULL,
  p_child_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id uuid := gen_random_uuid();
  v_email text := lower(trim(p_email));
  v_encrypted_pw text;
  v_full_name text := trim(coalesce(p_first_name, '') || ' ' || coalesce(p_last_name, ''));
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  IF v_email = '' OR p_password IS NULL OR length(p_password) < 8 THEN
    RAISE EXCEPTION 'Valid email and password (min 8 chars) required';
  END IF;

  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    v_encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'role', p_role::text,
      'first_name', coalesce(p_first_name, ''),
      'last_name', coalesce(p_last_name, ''),
      'full_name', v_full_name,
      'child_name', p_child_name
    ),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_email,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    now(),
    now(),
    now()
  );

  INSERT INTO public.profiles (
    id, email, role, first_name, last_name, full_name,
    child_name, gender, age, is_authorized, status, email_verified_at
  ) VALUES (
    v_user_id, v_email, p_role,
    coalesce(p_first_name, ''), coalesce(p_last_name, ''), v_full_name,
    p_child_name, p_gender, p_age, true, 'active', now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    full_name = EXCLUDED.full_name,
    gender = EXCLUDED.gender,
    age = EXCLUDED.age,
    is_authorized = true,
    status = 'active';

  RETURN jsonb_build_object('id', v_user_id, 'email', v_email, 'role', p_role::text);
END;
$$;

-- 6. Delete user (admin-only; removes auth user — profile cascades)
CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account from admin panel';
  END IF;

  DELETE FROM auth.users WHERE id = p_user_id;
  RETURN true;
END;
$$;

-- 7. Reset password (admin-only)
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_user_id uuid,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, extensions
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Forbidden: admin only';
  END IF;

  IF p_new_password IS NULL OR length(p_new_password) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters';
  END IF;

  UPDATE auth.users
  SET
    encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
    updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, public.user_role, text, text, text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(uuid, text) TO authenticated;
