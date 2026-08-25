-- Child activity log: past classroom sessions with attendance / time spent

create or replace function public.child_class_session_history(
  p_child_id uuid default auth.uid()
)
returns table (
  session_id uuid,
  class_id uuid,
  class_name text,
  school_name text,
  subject text,
  year_group text,
  class_code text,
  teacher_name text,
  session_status text,
  activity_mode text,
  focus_title text,
  focus_message text,
  now_step text,
  next_step text,
  launched_at timestamptz,
  ended_at timestamptz,
  joined_at timestamptz,
  left_at timestamptz,
  last_seen_at timestamptz,
  participant_status text,
  mood_pulse text,
  duration_seconds integer
)
language sql
security definer
set search_path = public
as $$
  select
    cls.id as session_id,
    tc.id as class_id,
    tc.class_name,
    tc.school_name,
    tc.subject,
    tc.year_group,
    tc.class_code,
    coalesce(nullif(tp.full_name, ''), nullif(tp.first_name, ''), tp.email, 'Teacher') as teacher_name,
    cls.status as session_status,
    cls.activity_mode,
    cls.focus_title,
    cls.focus_message,
    cls.now_step,
    cls.next_step,
    cls.launched_at,
    cls.ended_at,
    csp.joined_at,
    csp.left_at,
    csp.last_seen_at,
    csp.status as participant_status,
    csp.mood_pulse,
    greatest(
      0,
      floor(
        extract(
          epoch from (
            coalesce(csp.left_at, cls.ended_at, csp.last_seen_at, now()) - csp.joined_at
          )
        )
      )
    )::integer as duration_seconds
  from public.class_session_participants csp
  join public.class_live_sessions cls on cls.id = csp.session_id
  join public.teacher_classes tc on tc.id = cls.class_id
  left join public.profiles tp on tp.id = cls.teacher_id
  where csp.child_id = p_child_id
    and (
      cls.status = 'ended'
      or csp.status in ('left', 'removed')
    )
    and (
      p_child_id = auth.uid()
      or exists (
        select 1 from public.child_relationships cr
        where cr.child_id = p_child_id and cr.parent_id = auth.uid()
      )
    )
  order by coalesce(cls.ended_at, csp.left_at, csp.joined_at) desc;
$$;

revoke all on function public.child_class_session_history(uuid) from public;
grant execute on function public.child_class_session_history(uuid) to authenticated;
