-- Separate sex and gender identity on profiles (run after 006_uk_sex_options.sql)
-- Sex = UK ONS biological/legal (profiles.sex)
-- Gender = UK NHS gender identity (profiles.gender)

-- 1. Add sex column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS sex text;

-- 2. Migrate legacy data from gender-only column
UPDATE public.profiles
SET sex = gender
WHERE sex IS NULL
  AND gender IN ('male', 'female', 'intersex', 'prefer_not_to_say');

UPDATE public.profiles
SET gender = 'man'
WHERE gender = 'male';

UPDATE public.profiles
SET gender = 'woman'
WHERE gender = 'female';

-- non_binary, other, prefer_not_to_say on gender stay as-is

-- 3. Constraints
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_gender_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_sex_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_sex_check
  CHECK (
    sex IS NULL OR sex IN ('male', 'female', 'intersex', 'prefer_not_to_say')
  );

ALTER TABLE public.profiles ADD CONSTRAINT profiles_gender_check
  CHECK (
    gender IS NULL OR gender IN ('woman', 'man', 'non_binary', 'other', 'prefer_not_to_say')
  );

CREATE INDEX IF NOT EXISTS profiles_sex_idx ON public.profiles (sex);

-- 4. Analytics — separate sex and gender breakdowns
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
    'by_sex', jsonb_build_object(
      'male', count(*) FILTER (WHERE sex = 'male')::int,
      'female', count(*) FILTER (WHERE sex = 'female')::int,
      'intersex', count(*) FILTER (WHERE sex = 'intersex')::int,
      'prefer_not_to_say', count(*) FILTER (WHERE sex = 'prefer_not_to_say')::int,
      'unspecified', count(*) FILTER (WHERE sex IS NULL)::int
    ),
    'by_gender', jsonb_build_object(
      'woman', count(*) FILTER (WHERE gender = 'woman')::int,
      'man', count(*) FILTER (WHERE gender = 'man')::int,
      'non_binary', count(*) FILTER (WHERE gender = 'non_binary')::int,
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

-- 5. Update admin_create_user to accept sex + gender
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email text,
  p_password text,
  p_role public.user_role,
  p_first_name text DEFAULT '',
  p_last_name text DEFAULT '',
  p_sex text DEFAULT NULL,
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
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated', v_email, v_encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object(
      'role', p_role::text,
      'first_name', coalesce(p_first_name, ''),
      'last_name', coalesce(p_last_name, ''),
      'full_name', v_full_name,
      'child_name', p_child_name,
      'sex', p_sex,
      'gender', p_gender
    ),
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id, v_email,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email', now(), now(), now()
  );

  INSERT INTO public.profiles (
    id, email, role, first_name, last_name, full_name,
    child_name, sex, gender, age, is_authorized, status, email_verified_at
  ) VALUES (
    v_user_id, v_email, p_role,
    coalesce(p_first_name, ''), coalesce(p_last_name, ''), v_full_name,
    p_child_name, p_sex, p_gender, p_age, true, 'active', now()
  )
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    full_name = EXCLUDED.full_name,
    sex = EXCLUDED.sex,
    gender = EXCLUDED.gender,
    age = EXCLUDED.age,
    is_authorized = true,
    status = 'active';

  RETURN jsonb_build_object('id', v_user_id, 'email', v_email, 'role', p_role::text);
END;
$$;

-- Drop old overload if it exists (gender-only param signature from 005)
DROP FUNCTION IF EXISTS public.admin_create_user(text, text, public.user_role, text, text, text, integer, text);

GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, public.user_role, text, text, text, text, integer, text) TO authenticated;
