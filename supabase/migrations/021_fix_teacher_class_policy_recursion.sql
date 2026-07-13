-- Fix recursive RLS between teacher_classes and class_join_requests.
-- Parents read pending teacher requests through a security-definer RPC instead
-- of a teacher_classes policy that recursively queries class_join_requests.

drop policy if exists "Linked parents can view requested classes" on public.teacher_classes;

create or replace function public.parent_teacher_class_requests(
  p_child_ids uuid[] default null
)
returns table (
  request_id uuid,
  child_id uuid,
  class_id uuid,
  class_name text,
  school_name text,
  subject text,
  year_group text,
  teacher_id uuid,
  teacher_name text,
  teacher_email text,
  requested_buddy_id text,
  request_method text,
  status text,
  parent_approved boolean,
  teacher_approved boolean,
  visibility_settings jsonb,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    cjr.id as request_id,
    cjr.child_id,
    cjr.class_id,
    tc.class_name,
    tc.school_name,
    tc.subject,
    tc.year_group,
    tc.teacher_id,
    coalesce(
      nullif(tp.full_name, ''),
      trim(concat_ws(' ', nullif(tp.first_name, ''), nullif(tp.last_name, ''))),
      tp.email,
      'Teacher'
    ) as teacher_name,
    tp.email as teacher_email,
    cjr.requested_buddy_id,
    cjr.request_method,
    cjr.status,
    cjr.parent_approved,
    cjr.teacher_approved,
    cjr.visibility_settings,
    cjr.created_at
  from public.class_join_requests cjr
  join public.teacher_classes tc
    on tc.id = cjr.class_id
  join public.profiles tp
    on tp.id = tc.teacher_id
  where cjr.status in ('pending', 'pending_parent', 'pending_teacher')
    and (p_child_ids is null or cjr.child_id = any(p_child_ids))
    and (
      exists (
        select 1
        from public.child_relationships cr
        where cr.child_id = cjr.child_id
          and cr.parent_id = auth.uid()
      )
      or exists (
        select 1
        from public.trusted_adults ta
        where ta.child_id = cjr.child_id
          and ta.adult_id = auth.uid()
          and ta.status in ('active', 'connected')
      )
    )
  order by cjr.created_at desc;
$$;

grant execute on function public.parent_teacher_class_requests(uuid[]) to authenticated;
