-- Scoped production release: mood privacy (040) and profile compatibility (043).
-- Rehearse against the hosted public schema before applying to fmlxtlicawkgiemubyid.
-- No broad 041/042 drafts, account changes, row deletions or demographic rewrites.
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


-- Child-controlled privacy for mood notes and journal-derived support signals.
-- Apply after 008_companion_onboarding.sql and 009_parent_dashboard_tables.sql.

alter table public.mood_check_ins
  add column if not exists is_shared boolean not null default false;

drop policy if exists "Trusted adults view child mood check-ins" on public.mood_check_ins;
drop policy if exists "Trusted adults view shared child mood check-ins" on public.mood_check_ins;
create policy "Trusted adults view shared child mood check-ins"
  on public.mood_check_ins for select
  using (
    is_shared = true
    and exists (
      select 1
      from public.trusted_adults ta
      where ta.child_id = mood_check_ins.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  );

-- The child owns the private entry. Adults receive alerts and deliberately
-- shared summaries through the existing alerts and parent_child_signals tables.
comment on column public.mood_check_ins.is_shared is
  'Child-controlled flag. Free-text mood notes are hidden from linked adults unless true.';

notify pgrst, 'reload schema';
commit;
