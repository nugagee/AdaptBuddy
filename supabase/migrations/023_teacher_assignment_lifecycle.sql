-- Teacher assignment lifecycle controls.
-- Adds soft archive support so old assignments can leave active child,
-- parent, and teacher views without deleting historical submissions.

alter table public.teacher_assignments
  add column if not exists archived_at timestamptz;

create index if not exists teacher_assignments_active_class_due_idx
  on public.teacher_assignments(class_id, due_at)
  where archived_at is null;

create or replace function public.parent_assignment_summaries(
  p_child_ids uuid[] default null
)
returns table (
  assignment_id uuid,
  child_id uuid,
  child_name text,
  class_id uuid,
  class_name text,
  school_name text,
  teacher_id uuid,
  teacher_name text,
  teacher_email text,
  title text,
  description text,
  assignment_type text,
  support_tools text[],
  due_at timestamptz,
  created_at timestamptz,
  status text,
  support_used text[],
  mood_after_task text,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    ta.id as assignment_id,
    cm.child_id,
    coalesce(nullif(child.full_name, ''), nullif(child.child_name, ''), nullif(child.first_name, ''), 'Child') as child_name,
    cm.class_id,
    tc.class_name,
    tc.school_name,
    ta.teacher_id,
    coalesce(nullif(teacher.full_name, ''), nullif(teacher.first_name, ''), teacher.email, 'Teacher') as teacher_name,
    coalesce(teacher.email, '') as teacher_email,
    ta.title,
    ta.description,
    ta.assignment_type,
    ta.support_tools,
    ta.due_at,
    ta.created_at,
    coalesce(sub.status, 'not_started') as status,
    coalesce(sub.support_used, '{}'::text[]) as support_used,
    sub.mood_after_task,
    sub.updated_at
  from public.class_memberships cm
  join public.teacher_classes tc
    on tc.id = cm.class_id
  join public.teacher_assignments ta
    on ta.class_id = cm.class_id
  join public.profiles child
    on child.id = cm.child_id
  left join public.profiles teacher
    on teacher.id = ta.teacher_id
  left join public.assignment_submissions sub
    on sub.assignment_id = ta.id
    and sub.child_id = cm.child_id
  where cm.status = 'active'
    and ta.archived_at is null
    and (p_child_ids is null or cardinality(p_child_ids) = 0 or cm.child_id = any(p_child_ids))
    and (
      exists (
        select 1
        from public.child_relationships cr
        where cr.child_id = cm.child_id
          and cr.parent_id = auth.uid()
      )
      or exists (
        select 1
        from public.trusted_adults trusted
        where trusted.child_id = cm.child_id
          and trusted.adult_id = auth.uid()
          and trusted.status in ('active', 'connected')
      )
    )
  order by coalesce(ta.due_at, ta.created_at) desc, ta.created_at desc
  limit 50;
$$;

revoke all on function public.parent_assignment_summaries(uuid[]) from public;
grant execute on function public.parent_assignment_summaries(uuid[]) to authenticated;
