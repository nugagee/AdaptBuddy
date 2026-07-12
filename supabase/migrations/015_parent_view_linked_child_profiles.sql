-- Allow linked parents/teachers to read child profile rows used by parent_dashboard_summary.
-- Without this policy, security_invoker views return no children after Buddy ID linking.

drop policy if exists "Linked adults can view child profiles" on public.profiles;
create policy "Linked adults can view child profiles"
  on public.profiles for select
  using (
    role::text = 'child'
    and (
      exists (
        select 1
        from public.child_relationships cr
        where cr.child_id = profiles.id
          and cr.parent_id = auth.uid()
      )
      or exists (
        select 1
        from public.trusted_adults ta
        where ta.child_id = profiles.id
          and ta.adult_id = auth.uid()
          and ta.status in ('active', 'connected')
      )
    )
  );

-- PostgreSQL cannot reorder view columns with CREATE OR REPLACE; drop first.
drop view if exists public.parent_dashboard_summary;

create view public.parent_dashboard_summary
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
  ) as profile_completion,
  cp.buddy_id
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
  cp.buddy_id,
  cp.full_name,
  cp.child_name,
  cp.first_name,
  cp.age,
  cp.neuro_types,
  cp.onboarding_completed,
  cp.companion_onboarding_completed;

grant select on public.parent_dashboard_summary to authenticated;
