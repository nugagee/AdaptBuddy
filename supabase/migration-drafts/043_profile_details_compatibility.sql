-- DRAFT: reconcile editable profile fields with the audited hosted schema.
-- Rehearse before release. This changes no existing demographic values.
-- Do not replay migration 007 blindly: it rewrites values before replacing
-- the legacy gender constraint and also replaces unrelated administrator RPCs.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

alter table public.profiles add column if not exists sex text;
alter table public.profiles drop constraint if exists profiles_sex_check;
alter table public.profiles add constraint profiles_sex_check
  check (sex is null or sex in ('male', 'female', 'intersex', 'prefer_not_to_say'));

-- Retain the historical values until users explicitly edit their details.
-- A recorded gender value is not evidence from which to infer a sex value.
alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles add constraint profiles_gender_check
  check (gender is null or gender in
    ('male', 'female', 'woman', 'man', 'non_binary', 'other', 'prefer_not_to_say'));

notify pgrst, 'reload schema';
commit;
