-- Parent dashboard data model
-- Uses public.profiles for both parent and child accounts in this project.

create extension if not exists pgcrypto;

create table if not exists public.child_relationships (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  child_id uuid not null references public.profiles(id) on delete cascade,
  relationship text not null default 'parent',
  created_at timestamptz not null default now(),
  constraint child_relationships_relationship_check
    check (relationship in ('parent', 'guardian', 'grandparent', 'carer')),
  unique(parent_id, child_id)
);

create index if not exists child_relationships_parent_id_idx
  on public.child_relationships(parent_id);

create index if not exists child_relationships_child_id_idx
  on public.child_relationships(child_id);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles(id) on delete cascade,
  emotion text,
  text text,
  audio_url text,
  ai_analysis jsonb,
  risk_level text not null default 'low',
  is_shared boolean not null default true,
  created_at timestamptz not null default now(),
  constraint journal_entries_risk_level_check
    check (risk_level in ('low', 'medium', 'high'))
);

create index if not exists journal_entries_child_id_created_at_idx
  on public.journal_entries(child_id, created_at desc);

create index if not exists journal_entries_risk_level_idx
  on public.journal_entries(risk_level);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  child_id uuid not null references public.profiles(id) on delete cascade,
  risk_level text not null default 'low',
  notified_adults uuid[] not null default '{}',
  acknowledged_by uuid references public.profiles(id) on delete set null,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  constraint alerts_risk_level_check
    check (risk_level in ('low', 'medium', 'high'))
);

create index if not exists alerts_child_id_created_at_idx
  on public.alerts(child_id, created_at desc);

create index if not exists alerts_risk_level_idx
  on public.alerts(risk_level);

create or replace view public.parent_dashboard_summary
with (security_invoker = true) as
select
  cp.id as child_id,
  coalesce(nullif(cp.full_name, ''), nullif(cp.child_name, ''), nullif(cp.first_name, ''), 'Child') as child_name,
  cp.age,
  cp.neuro_types as neurotypes,
  count(distinct je.id) as total_entries,
  count(distinct je.id) filter (where je.created_at > now() - interval '7 days') as entries_last_7_days,
  count(distinct a.id) as total_alerts,
  count(distinct a.id) filter (where a.risk_level = 'high' and a.acknowledged_at is null) as high_alerts,
  count(distinct ta_count.id) filter (where ta_count.status in ('active', 'connected')) as trusted_adults_count,
  least(
    100,
    (case when cp.onboarding_completed then 25 else 0 end) +
    (case when coalesce(cp.companion_onboarding_completed, false) then 20 else 0 end) +
    (case when cardinality(coalesce(cp.neuro_types, '{}'::text[])) > 0 then 20 else 0 end) +
    (case when bool_or(ap.id is not null) then 20 else 0 end) +
    (case when count(distinct ta_count.id) filter (where ta_count.status in ('active', 'connected')) > 0 then 15 else 0 end)
  ) as profile_completion
from public.profiles cp
left join public.journal_entries je
  on je.child_id = cp.id
  and je.is_shared = true
left join public.alerts a
  on a.child_id = cp.id
left join public.trusted_adults ta_count
  on ta_count.child_id = cp.id
left join public.autism_profiles ap
  on ap.child_id = cp.id
where cp.role::text = 'child'
  and (
    exists (
      select 1
      from public.child_relationships cr
      where cr.child_id = cp.id
        and cr.parent_id = auth.uid()
    )
    or exists (
      select 1
      from public.trusted_adults ta
      where ta.child_id = cp.id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  )
group by
  cp.id,
  cp.full_name,
  cp.child_name,
  cp.first_name,
  cp.age,
  cp.neuro_types,
  cp.onboarding_completed,
  cp.companion_onboarding_completed;

alter table public.child_relationships enable row level security;
alter table public.journal_entries enable row level security;
alter table public.alerts enable row level security;

drop policy if exists "Linked users can view child relationships" on public.child_relationships;
create policy "Linked users can view child relationships"
  on public.child_relationships for select
  using (parent_id = auth.uid() or child_id = auth.uid());

drop policy if exists "Children can manage own journal entries" on public.journal_entries;
create policy "Children can manage own journal entries"
  on public.journal_entries for all
  using (child_id = auth.uid())
  with check (child_id = auth.uid());

drop policy if exists "Linked adults can view shared journal entries" on public.journal_entries;
create policy "Linked adults can view shared journal entries"
  on public.journal_entries for select
  using (
    is_shared = true
    and (
      exists (
        select 1
        from public.child_relationships cr
        where cr.child_id = journal_entries.child_id
          and cr.parent_id = auth.uid()
      )
      or exists (
        select 1
        from public.trusted_adults ta
        where ta.child_id = journal_entries.child_id
          and ta.adult_id = auth.uid()
          and ta.status in ('active', 'connected')
      )
    )
  );

drop policy if exists "Children can create own alerts" on public.alerts;
create policy "Children can create own alerts"
  on public.alerts for insert
  with check (child_id = auth.uid());

drop policy if exists "Children can view own alerts" on public.alerts;
create policy "Children can view own alerts"
  on public.alerts for select
  using (child_id = auth.uid());

drop policy if exists "Linked adults can view child alerts" on public.alerts;
create policy "Linked adults can view child alerts"
  on public.alerts for select
  using (
    exists (
      select 1
      from public.child_relationships cr
      where cr.child_id = alerts.child_id
        and cr.parent_id = auth.uid()
    )
    or exists (
      select 1
      from public.trusted_adults ta
      where ta.child_id = alerts.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  );

drop policy if exists "Linked adults can acknowledge child alerts" on public.alerts;
create policy "Linked adults can acknowledge child alerts"
  on public.alerts for update
  using (
    exists (
      select 1
      from public.child_relationships cr
      where cr.child_id = alerts.child_id
        and cr.parent_id = auth.uid()
    )
    or exists (
      select 1
      from public.trusted_adults ta
      where ta.child_id = alerts.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  )
  with check (acknowledged_by is null or acknowledged_by = auth.uid());

grant select on public.parent_dashboard_summary to authenticated;
