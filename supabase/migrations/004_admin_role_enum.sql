-- STEP 1 of 2 — Run this ALONE first, then click Run.
-- PostgreSQL cannot use a new enum value in the same transaction it was added.
-- After this succeeds, run 005_admin_platform.sql in a NEW query.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'admin';
