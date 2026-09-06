-- Child-controlled privacy for mood notes and journal-derived support signals.
-- Apply after 008_companion_onboarding.sql and 009_parent_dashboard_tables.sql.

alter table public.mood_check_ins
  add column if not exists is_shared boolean not null default false;

drop policy if exists "Trusted adults view child mood check-ins" on public.mood_check_ins;
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
