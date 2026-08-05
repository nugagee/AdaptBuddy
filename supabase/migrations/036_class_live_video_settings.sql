-- Live classroom video: spotlight, learner restrictions, media state.

alter table public.class_live_sessions
  add column if not exists spotlight_participant_id text not null default 'teacher',
  add column if not exists restrict_learner_video boolean not null default false,
  add column if not exists restrict_learner_mic boolean not null default false,
  add column if not exists teacher_video_enabled boolean not null default false,
  add column if not exists teacher_audio_enabled boolean not null default false;

alter table public.class_session_participants
  add column if not exists video_enabled boolean not null default false,
  add column if not exists audio_enabled boolean not null default false;

create or replace function public.update_class_session_settings(
  p_session_id uuid,
  p_spotlight_participant_id text default null,
  p_restrict_learner_video boolean default null,
  p_restrict_learner_mic boolean default null
)
returns public.class_live_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.class_live_sessions;
begin
  update public.class_live_sessions cls
  set
    spotlight_participant_id = coalesce(nullif(trim(p_spotlight_participant_id), ''), cls.spotlight_participant_id),
    restrict_learner_video = coalesce(p_restrict_learner_video, cls.restrict_learner_video),
    restrict_learner_mic = coalesce(p_restrict_learner_mic, cls.restrict_learner_mic),
    updated_at = now()
  where cls.id = p_session_id
    and cls.teacher_id = auth.uid()
    and cls.status = 'live'
  returning * into v_session;

  if v_session.id is null then
    raise exception 'Live session not found';
  end if;

  return v_session;
end;
$$;

create or replace function public.update_class_session_teacher_media(
  p_session_id uuid,
  p_video_enabled boolean default null,
  p_audio_enabled boolean default null
)
returns public.class_live_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.class_live_sessions;
begin
  update public.class_live_sessions cls
  set
    teacher_video_enabled = coalesce(p_video_enabled, cls.teacher_video_enabled),
    teacher_audio_enabled = coalesce(p_audio_enabled, cls.teacher_audio_enabled),
    updated_at = now()
  where cls.id = p_session_id
    and cls.teacher_id = auth.uid()
    and cls.status = 'live'
  returning * into v_session;

  if v_session.id is null then
    raise exception 'Live session not found';
  end if;

  return v_session;
end;
$$;

create or replace function public.class_session_participant_pulse(
  p_session_id uuid,
  p_mood_pulse text default null,
  p_hand_raised boolean default null,
  p_video_enabled boolean default null,
  p_audio_enabled boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.class_live_sessions;
begin
  select * into v_session
  from public.class_live_sessions
  where id = p_session_id and status = 'live';

  if v_session.id is null then
    raise exception 'Live session not found';
  end if;

  if v_session.restrict_learner_video and p_video_enabled is not null and p_video_enabled = true then
    raise exception 'Your teacher has turned off learner cameras for now';
  end if;

  if v_session.restrict_learner_mic and p_audio_enabled is not null and p_audio_enabled = true then
    raise exception 'Your teacher has turned off learner microphones for now';
  end if;

  update public.class_session_participants
  set
    last_seen_at = now(),
    mood_pulse = coalesce(p_mood_pulse, mood_pulse),
    hand_raised = coalesce(p_hand_raised, hand_raised),
    video_enabled = coalesce(p_video_enabled, video_enabled),
    audio_enabled = coalesce(p_audio_enabled, audio_enabled)
  where session_id = p_session_id
    and child_id = auth.uid()
    and status = 'joined';
end;
$$;

create or replace function public.class_session_snapshot(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.class_live_sessions;
  v_class public.teacher_classes;
  v_participants jsonb;
  v_caller uuid := auth.uid();
begin
  select * into v_session from public.class_live_sessions where id = p_session_id;
  if v_session.id is null then
    return jsonb_build_object('found', false);
  end if;

  select * into v_class from public.teacher_classes where id = v_session.class_id;

  if v_session.teacher_id <> v_caller
     and not exists (
       select 1 from public.class_memberships cm
       where cm.class_id = v_session.class_id
         and cm.child_id = v_caller
         and cm.status = 'active'
     ) then
    raise exception 'Not allowed';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', csp.id,
      'childId', csp.child_id,
      'childName', coalesce(nullif(p.full_name, ''), nullif(p.first_name, ''), 'Learner'),
      'joinedAt', csp.joined_at,
      'lastSeenAt', csp.last_seen_at,
      'moodPulse', csp.mood_pulse,
      'handRaised', csp.hand_raised,
      'videoEnabled', csp.video_enabled,
      'audioEnabled', csp.audio_enabled,
      'status', csp.status
    ) order by csp.joined_at
  ), '[]'::jsonb)
  into v_participants
  from public.class_session_participants csp
  left join public.profiles p on p.id = csp.child_id
  where csp.session_id = p_session_id and csp.status = 'joined';

  return jsonb_build_object(
    'found', true,
    'session', jsonb_build_object(
      'id', v_session.id,
      'classId', v_session.class_id,
      'teacherId', v_session.teacher_id,
      'status', v_session.status,
      'launchedAt', v_session.launched_at,
      'endedAt', v_session.ended_at,
      'focusTitle', v_session.focus_title,
      'focusMessage', v_session.focus_message,
      'activityMode', v_session.activity_mode,
      'nowStep', v_session.now_step,
      'nextStep', v_session.next_step,
      'updatedAt', v_session.updated_at,
      'spotlightParticipantId', v_session.spotlight_participant_id,
      'restrictLearnerVideo', v_session.restrict_learner_video,
      'restrictLearnerMic', v_session.restrict_learner_mic,
      'teacherVideoEnabled', v_session.teacher_video_enabled,
      'teacherAudioEnabled', v_session.teacher_audio_enabled
    ),
    'class', jsonb_build_object(
      'className', v_class.class_name,
      'schoolName', v_class.school_name,
      'subject', v_class.subject,
      'yearGroup', v_class.year_group,
      'classCode', v_class.class_code
    ),
    'participants', v_participants
  );
end;
$$;

revoke all on function public.update_class_session_settings(uuid, text, boolean, boolean) from public;
grant execute on function public.update_class_session_settings(uuid, text, boolean, boolean) to authenticated;
revoke all on function public.update_class_session_teacher_media(uuid, boolean, boolean) from public;
grant execute on function public.update_class_session_teacher_media(uuid, boolean, boolean) to authenticated;
