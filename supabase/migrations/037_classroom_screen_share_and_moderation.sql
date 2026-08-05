-- Screen share approval, extended classroom settings, remove participant.

alter table public.class_live_sessions
  add column if not exists require_screen_share_approval boolean not null default true,
  add column if not exists allow_learner_hand_raise boolean not null default true,
  add column if not exists active_screen_sharer_id text,
  add column if not exists teacher_screen_sharing boolean not null default false;

alter table public.class_session_participants
  add column if not exists screen_share_status text not null default 'none'
    check (screen_share_status in ('none', 'pending', 'approved', 'active')),
  add column if not exists screen_sharing boolean not null default false;

-- Extend participant status to include teacher removal
alter table public.class_session_participants
  drop constraint if exists class_session_participants_status_check;

alter table public.class_session_participants
  add constraint class_session_participants_status_check
  check (status in ('joined', 'left', 'removed'));

create or replace function public.update_class_session_settings(
  p_session_id uuid,
  p_spotlight_participant_id text default null,
  p_restrict_learner_video boolean default null,
  p_restrict_learner_mic boolean default null,
  p_require_screen_share_approval boolean default null,
  p_allow_learner_hand_raise boolean default null
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
    require_screen_share_approval = coalesce(p_require_screen_share_approval, cls.require_screen_share_approval),
    allow_learner_hand_raise = coalesce(p_allow_learner_hand_raise, cls.allow_learner_hand_raise),
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

create or replace function public.request_screen_share(p_session_id uuid)
returns public.class_session_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.class_live_sessions;
  v_participant public.class_session_participants;
begin
  select * into v_session from public.class_live_sessions where id = p_session_id and status = 'live';
  if v_session.id is null then raise exception 'Live session not found'; end if;

  if v_session.active_screen_sharer_id is not null then
    raise exception 'Someone is already sharing their screen';
  end if;

  update public.class_session_participants
  set screen_share_status = 'pending', last_seen_at = now()
  where session_id = p_session_id and child_id = auth.uid() and status = 'joined'
  returning * into v_participant;

  if v_participant.id is null then raise exception 'You are not in this classroom'; end if;
  return v_participant;
end;
$$;

create or replace function public.respond_screen_share_request(
  p_session_id uuid,
  p_child_id uuid,
  p_approved boolean
)
returns public.class_session_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participant public.class_session_participants;
begin
  if not exists (
    select 1 from public.class_live_sessions
    where id = p_session_id and teacher_id = auth.uid() and status = 'live'
  ) then
    raise exception 'Live session not found';
  end if;

  update public.class_session_participants
  set
    screen_share_status = case when p_approved then 'approved' else 'none' end,
    last_seen_at = now()
  where session_id = p_session_id
    and child_id = p_child_id
    and status = 'joined'
    and screen_share_status = 'pending'
  returning * into v_participant;

  if v_participant.id is null then raise exception 'Screen share request not found'; end if;
  return v_participant;
end;
$$;

create or replace function public.set_screen_share_state(
  p_session_id uuid,
  p_active boolean,
  p_as_teacher boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.class_live_sessions;
  v_user uuid := auth.uid();
begin
  select * into v_session from public.class_live_sessions where id = p_session_id and status = 'live';
  if v_session.id is null then raise exception 'Live session not found'; end if;

  if p_as_teacher then
    if v_session.teacher_id <> v_user then raise exception 'Not allowed'; end if;
    update public.class_live_sessions
    set
      teacher_screen_sharing = p_active,
      active_screen_sharer_id = case when p_active then v_user::text else null end,
      spotlight_participant_id = case when p_active then 'teacher' else spotlight_participant_id end,
      updated_at = now()
    where id = p_session_id;
    return;
  end if;

  if p_active then
    if not exists (
      select 1 from public.class_session_participants
      where session_id = p_session_id and child_id = v_user and status = 'joined'
        and screen_share_status in ('approved', 'active')
    ) then
      raise exception 'Screen share not approved yet';
    end if;

    update public.class_live_sessions
    set active_screen_sharer_id = v_user::text, updated_at = now()
    where id = p_session_id;

    update public.class_session_participants
    set screen_share_status = 'active', screen_sharing = true, last_seen_at = now()
    where session_id = p_session_id and child_id = v_user and status = 'joined';
  else
    update public.class_session_participants
    set screen_share_status = 'none', screen_sharing = false, last_seen_at = now()
    where session_id = p_session_id and child_id = v_user and status = 'joined';

    update public.class_live_sessions
    set active_screen_sharer_id = null, updated_at = now()
    where id = p_session_id and active_screen_sharer_id = v_user::text;
  end if;
end;
$$;

create or replace function public.remove_session_participant(
  p_session_id uuid,
  p_child_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.class_live_sessions
    where id = p_session_id and teacher_id = auth.uid() and status = 'live'
  ) then
    raise exception 'Live session not found';
  end if;

  update public.class_session_participants
  set
    status = 'removed',
    left_at = now(),
    last_seen_at = now(),
    hand_raised = false,
    screen_share_status = 'none',
    screen_sharing = false
  where session_id = p_session_id and child_id = p_child_id and status = 'joined';

  update public.class_live_sessions
  set
    active_screen_sharer_id = null,
    spotlight_participant_id = case
      when spotlight_participant_id = p_child_id::text then 'teacher'
      else spotlight_participant_id
    end,
    updated_at = now()
  where id = p_session_id and active_screen_sharer_id = p_child_id::text;
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
  if v_session.id is null then return jsonb_build_object('found', false); end if;

  select * into v_class from public.teacher_classes where id = v_session.class_id;

  if v_session.teacher_id <> v_caller
     and not exists (
       select 1 from public.class_memberships cm
       where cm.class_id = v_session.class_id and cm.child_id = v_caller and cm.status = 'active'
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
      'screenShareStatus', csp.screen_share_status,
      'screenSharing', csp.screen_sharing,
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
      'requireScreenShareApproval', v_session.require_screen_share_approval,
      'allowLearnerHandRaise', v_session.allow_learner_hand_raise,
      'activeScreenSharerId', v_session.active_screen_sharer_id,
      'teacherScreenSharing', v_session.teacher_screen_sharing,
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

revoke all on function public.request_screen_share(uuid) from public;
grant execute on function public.request_screen_share(uuid) to authenticated;
revoke all on function public.respond_screen_share_request(uuid, uuid, boolean) from public;
grant execute on function public.respond_screen_share_request(uuid, uuid, boolean) to authenticated;
revoke all on function public.set_screen_share_state(uuid, boolean, boolean) from public;
grant execute on function public.set_screen_share_state(uuid, boolean, boolean) to authenticated;
revoke all on function public.remove_session_participant(uuid, uuid) from public;
grant execute on function public.remove_session_participant(uuid, uuid) to authenticated;
