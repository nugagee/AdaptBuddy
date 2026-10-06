-- Independent Buddy: adult / young-adult self-directed learners (18+).

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'adult';

-- Product feedback may be submitted by adult learners (when table exists).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'product_feedback'
  ) THEN
    ALTER TABLE public.product_feedback
      DROP CONSTRAINT IF EXISTS product_feedback_role_check;
    ALTER TABLE public.product_feedback
      ADD CONSTRAINT product_feedback_role_check
      CHECK (user_role in ('child', 'adult', 'parent', 'teacher', 'admin'));
  END IF;
END $$;

-- Analytics sessions (optional — only if migration 043 applied).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'platform_activity_sessions'
  ) THEN
    ALTER TABLE public.platform_activity_sessions
      DROP CONSTRAINT IF EXISTS platform_activity_sessions_user_role_check;
    ALTER TABLE public.platform_activity_sessions
      ADD CONSTRAINT platform_activity_sessions_user_role_check
      CHECK (
        user_role is null
        or user_role in ('child', 'adult', 'parent', 'teacher', 'admin', 'guest', 'visitor')
      );
  END IF;
END $$;
