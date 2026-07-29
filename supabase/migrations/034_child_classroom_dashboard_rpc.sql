-- Child dashboard classroom summary for active and pending school connections.

create or replace function public.child_classroom_dashboard(
  p_child_id uuid default auth.uid()
)
returns table (
  class_id uuid,
  class_name text,
  school_name text,
  subject text,
  year_group text,
  class_code text,
  teacher_id uuid,
  teacher_name text,
  status text,
  connected_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with allowed_child as (
    select p_child_id as child_id
    where p_child_id = auth.uid()
      or exists (
        select 1
        from public.child_relationships cr
        where cr.child_id = p_child_id
          and cr.parent_id = auth.uid()
      )
      or exists (
        select 1
        from public.trusted_adults ta
        where ta.child_id = p_child_id
          and ta.adult_id = auth.uid()
          and ta.status in ('active', 'connected')
      )
  ),
  active_classes as (
    select
      tc.id as class_id,
      tc.class_name,
      tc.school_name,
      tc.subject,
      tc.year_group,
      tc.class_code,
      tc.teacher_id,
      coalesce(nullif(tp.full_name, ''), nullif(tp.first_name, ''), tp.email, 'Teacher') as teacher_name,
      'active'::text as status,
      cm.joined_at as connected_at
    from public.class_memberships cm
    join allowed_child ac
      on ac.child_id = cm.child_id
    join public.teacher_classes tc
      on tc.id = cm.class_id
    left join public.profiles tp
      on tp.id = tc.teacher_id
    where cm.status = 'active'
  ),
  pending_classes as (
    select
      tc.id as class_id,
      tc.class_name,
      tc.school_name,
      tc.subject,
      tc.year_group,
      tc.class_code,
      tc.teacher_id,
      coalesce(nullif(tp.full_name, ''), nullif(tp.first_name, ''), tp.email, 'Teacher') as teacher_name,
      cjr.status,
      cjr.created_at as connected_at
    from public.class_join_requests cjr
    join allowed_child ac
      on ac.child_id = cjr.child_id
    join public.teacher_classes tc
      on tc.id = cjr.class_id
    left join public.profiles tp
      on tp.id = tc.teacher_id
    where cjr.status in ('pending', 'pending_parent', 'pending_teacher')
      and not exists (
        select 1
        from public.class_memberships cm
        where cm.class_id = cjr.class_id
          and cm.child_id = cjr.child_id
          and cm.status = 'active'
      )
  )
  select * from active_classes
  union all
  select * from pending_classes
  order by connected_at desc;
$$;

revoke all on function public.child_classroom_dashboard(uuid) from public;
grant execute on function public.child_classroom_dashboard(uuid) to authenticated;
