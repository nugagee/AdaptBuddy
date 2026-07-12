-- Extend admin analytics and visibility for parent hub / companion platform features.

-- Admins can inspect parent-child links
drop policy if exists "Admins can view child relationships" on public.child_relationships;
create policy "Admins can view child relationships"
  on public.child_relationships for select
  using (public.is_admin());

drop policy if exists "Admins can view trusted adults" on public.trusted_adults;
create policy "Admins can view trusted adults"
  on public.trusted_adults for select
  using (public.is_admin());

create or replace function public.admin_get_analytics()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
  v_parent_child_links int := 0;
  v_trusted_adult_links int := 0;
  v_shared_journal_entries int := 0;
  v_active_alerts int := 0;
  v_parents_with_children int := 0;
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin only';
  end if;

  begin
    select count(*)::int into v_parent_child_links from public.child_relationships;
  exception when undefined_table then
    v_parent_child_links := 0;
  end;

  begin
    select count(*)::int
    into v_trusted_adult_links
    from public.trusted_adults
    where status in ('active', 'connected');
  exception when undefined_table then
    v_trusted_adult_links := 0;
  end;

  begin
    select count(*)::int
    into v_shared_journal_entries
    from public.journal_entries
    where is_shared = true;
  exception when undefined_table then
    v_shared_journal_entries := 0;
  end;

  begin
    select count(*)::int
    into v_active_alerts
    from public.alerts
    where acknowledged_at is null;
  exception when undefined_table then
    v_active_alerts := 0;
  end;

  begin
    select count(distinct parent_id)::int
    into v_parents_with_children
    from public.child_relationships;
  exception when undefined_table then
    v_parents_with_children := 0;
  end;

  select jsonb_build_object(
    'total_users', count(*)::int,
    'by_role', jsonb_build_object(
      'child', count(*) filter (where role = 'child')::int,
      'parent', count(*) filter (where role = 'parent')::int,
      'teacher', count(*) filter (where role = 'teacher')::int,
      'admin', count(*) filter (where role = 'admin')::int
    ),
    'by_sex', jsonb_build_object(
      'male', count(*) filter (where sex = 'male')::int,
      'female', count(*) filter (where sex = 'female')::int,
      'intersex', count(*) filter (where sex = 'intersex')::int,
      'prefer_not_to_say', count(*) filter (where sex = 'prefer_not_to_say')::int,
      'unspecified', count(*) filter (where sex is null)::int
    ),
    'by_gender', jsonb_build_object(
      'woman', count(*) filter (where gender = 'woman')::int,
      'man', count(*) filter (where gender = 'man')::int,
      'non_binary', count(*) filter (where gender = 'non_binary')::int,
      'other', count(*) filter (where gender = 'other')::int,
      'prefer_not_to_say', count(*) filter (where gender = 'prefer_not_to_say')::int,
      'unspecified', count(*) filter (where gender is null)::int
    ),
    'by_status', jsonb_build_object(
      'active', count(*) filter (where status = 'active')::int,
      'suspended', count(*) filter (where status = 'suspended')::int,
      'pending', count(*) filter (where status = 'pending')::int
    ),
    'by_neuro_type', jsonb_build_object(
      'autism', count(*) filter (where 'autism' = any(coalesce(neuro_types, '{}'::text[])))::int,
      'adhd', count(*) filter (where 'adhd' = any(coalesce(neuro_types, '{}'::text[])))::int,
      'dyslexia', count(*) filter (where 'dyslexia' = any(coalesce(neuro_types, '{}'::text[])))::int,
      'unspecified', count(*) filter (where cardinality(coalesce(neuro_types, '{}'::text[])) = 0)::int
    ),
    'authorized', count(*) filter (where is_authorized = true)::int,
    'unauthorized', count(*) filter (where is_authorized = false)::int,
    'onboarding_complete', count(*) filter (where onboarding_completed = true)::int,
    'companion_onboarding_complete', count(*) filter (where coalesce(companion_onboarding_completed, false) = true)::int,
    'children_with_buddy_id', count(*) filter (where role = 'child' and buddy_id is not null)::int,
    'avg_age', round(avg(age) filter (where age is not null), 1),
    'recent_signups_7d', count(*) filter (where created_at >= now() - interval '7 days')::int,
    'recent_signups_30d', count(*) filter (where created_at >= now() - interval '30 days')::int,
    'parent_child_links', v_parent_child_links,
    'trusted_adult_links', v_trusted_adult_links,
    'parents_with_linked_children', v_parents_with_children,
    'shared_journal_entries', v_shared_journal_entries,
    'active_alerts', v_active_alerts
  )
  into result
  from public.profiles;

  return result;
end;
$$;

create or replace function public.admin_get_relationship_counts()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  children_by_parent jsonb := '{}'::jsonb;
  parents_by_child jsonb := '{}'::jsonb;
begin
  if not public.is_admin() then
    raise exception 'Forbidden: admin only';
  end if;

  begin
    select coalesce(
      jsonb_object_agg(parent_id::text, child_count),
      '{}'::jsonb
    )
    into children_by_parent
    from (
      select parent_id, count(*)::int as child_count
      from public.child_relationships
      group by parent_id
    ) parent_counts;
  exception when undefined_table then
    children_by_parent := '{}'::jsonb;
  end;

  begin
    select coalesce(
      jsonb_object_agg(child_id::text, parent_count),
      '{}'::jsonb
    )
    into parents_by_child
    from (
      select child_id, count(*)::int as parent_count
      from public.child_relationships
      group by child_id
    ) child_counts;
  exception when undefined_table then
    parents_by_child := '{}'::jsonb;
  end;

  return jsonb_build_object(
    'children_by_parent', children_by_parent,
    'parents_by_child', parents_by_child
  );
end;
$$;

grant execute on function public.admin_get_relationship_counts() to authenticated;
