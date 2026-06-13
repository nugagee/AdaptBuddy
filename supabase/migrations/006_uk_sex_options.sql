-- UK-standard sex values on profiles.gender (run after 005_admin_platform.sql)

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_gender_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_gender_check
  CHECK (
    gender IS NULL OR gender IN (
      'male',
      'female',
      'non_binary',
      'intersex',
      'other',
      'prefer_not_to_say'
    )
  );

-- Refresh analytics to include new sex categories
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
      'non_binary', count(*) FILTER (WHERE gender = 'non_binary')::int,
      'intersex', count(*) FILTER (WHERE gender = 'intersex')::int,
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
