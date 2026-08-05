-- Teacher activity / audit log: past classroom sessions with attendance detail

create or replace function public.teacher_class_session_history(
  p_teacher_id uuid default auth.uid()
)
returns table (
  session_id uuid,
  class_id uuid,
  class_name text,
  school_name text,
  subject text,
  year_group text,
  class_code text,
  session_status text,
  activity_mode text,
  focus_title text,
  focus_message text,
  now_step text,
  next_step text,
  launched_at timestamptz,
  ended_at timestamptz,
  duration_seconds integer,
  restrict_learner_video boolean,
  restrict_learner_mic boolean,
  require_screen_share_approval boolean,
  allow_learner_hand_raise boolean,
  participant_count bigint,
  removed_count bigint,
  participants jsonb
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
    cls.status as session_status,
    cls.activity_mode,
    cls.focus_title,
    cls.focus_message,
    cls.now_step,
    cls.next_step,
    cls.launched_at,
    cls.ended_at,
    greatest(
      0,
      floor(
        extract(
          epoch from (
            coalesce(cls.ended_at, now()) - cls.launched_at
          )
        )
      )
    )::integer as duration_seconds,
    cls.restrict_learner_video,
    cls.restrict_learner_mic,
    cls.require_screen_share_approval,
    cls.allow_learner_hand_raise,
    (
      select count(*)::bigint
      from public.class_session_participants csp
      where csp.session_id = cls.id
    ) as participant_count,
    (
      select count(*)::bigint
      from public.class_session_participants csp
      where csp.session_id = cls.id and csp.status = 'removed'
    ) as removed_count,
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'childId', csp.child_id,
            'childName', csp.child_name,
            'joinedAt', csp.joined_at,
            'leftAt', csp.left_at,
            'lastSeenAt', csp.last_seen_at,
            'status', csp.status,
            'moodPulse', csp.mood_pulse,
            'durationSeconds', greatest(
              0,
              floor(
                extract(
                  epoch from (
                    coalesce(csp.left_at, cls.ended_at, csp.last_seen_at, now()) - csp.joined_at
                  )
                )
              )
            )::integer
          )
          order by csp.joined_at asc
        )
        from public.class_session_participants csp
        where csp.session_id = cls.id
      ),
      '[]'::jsonb
    ) as participants
  from public.class_live_sessions cls
  join public.teacher_classes tc on tc.id = cls.class_id
  where cls.teacher_id = p_teacher_id
    and cls.status = 'ended'
    and p_teacher_id = auth.uid()
  order by coalesce(cls.ended_at, cls.launched_at) desc;
$$;

revoke all on function public.teacher_class_session_history(uuid) from public;
grant execute on function public.teacher_class_session_history(uuid) to authenticated;
