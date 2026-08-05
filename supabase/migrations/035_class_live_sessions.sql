-- Live classroom sessions: teacher launch → child join when live.

create table if not exists public.class_live_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.teacher_classes(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'live' check (status in ('live', 'ended')),
  launched_at timestamptz not null default now(),
  ended_at timestamptz,
  focus_title text not null default 'Welcome to our classroom',
  focus_message text not null default 'Take a breath — we will start together in a calm, friendly way.',
  activity_mode text not null default 'welcome'
    check (activity_mode in ('welcome', 'learn', 'calm', 'check_in', 'break')),
  now_step text not null default '',
  next_step text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists class_live_sessions_one_live_per_class
  on public.class_live_sessions (class_id)
  where status = 'live';

create index if not exists class_live_sessions_teacher_id_idx
  on public.class_live_sessions (teacher_id, status, launched_at desc);

create table if not exists public.class_session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_live_sessions(id) on delete cascade,
  child_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  last_seen_at timestamptz not null default now(),
  mood_pulse text,
  hand_raised boolean not null default false,
  status text not null default 'joined' check (status in ('joined', 'left')),
  unique (session_id, child_id)
);

create index if not exists class_session_participants_session_idx
  on public.class_session_participants (session_id, status, last_seen_at desc);

alter table public.class_live_sessions enable row level security;
alter table public.class_session_participants enable row level security;

-- Teachers manage sessions for their classes
create policy class_live_sessions_teacher_all on public.class_live_sessions
  for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

-- Active members can read live sessions for their class
create policy class_live_sessions_child_read on public.class_live_sessions
  for select
  using (
    status = 'live'
    and exists (
      select 1
      from public.class_memberships cm
      where cm.class_id = class_live_sessions.class_id
        and cm.child_id = auth.uid()
        and cm.status = 'active'
    )
  );

-- Participants: children insert/update own row; teachers read for their sessions
create policy class_session_participants_child_own on public.class_session_participants
  for all
  using (child_id = auth.uid())
  with check (child_id = auth.uid());

create policy class_session_participants_teacher_read on public.class_session_participants
  for select
  using (
    exists (
      select 1
      from public.class_live_sessions cls
      where cls.id = class_session_participants.session_id
        and cls.teacher_id = auth.uid()
    )
  );

create or replace function public.launch_class_session(
  p_class_id uuid,
  p_focus_title text default 'Our classroom is live',
  p_focus_message text default 'Join when you feel ready — we will take it step by step.'
)
returns public.class_live_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_teacher_id uuid := auth.uid();
  v_session public.class_live_sessions;
begin
  if v_teacher_id is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1 from public.teacher_classes tc
    where tc.id = p_class_id and tc.teacher_id = v_teacher_id
  ) then
    raise exception 'Class not found';
  end if;

  update public.class_live_sessions
  set status = 'ended', ended_at = now(), updated_at = now()
  where class_id = p_class_id and status = 'live';

  insert into public.class_live_sessions (
    class_id, teacher_id, focus_title, focus_message, activity_mode
  )
  values (
    p_class_id, v_teacher_id, coalesce(nullif(trim(p_focus_title), ''), 'Our classroom is live'),
    coalesce(nullif(trim(p_focus_message), ''), 'Join when you feel ready — we will take it step by step.'),
    'welcome'
  )
  returning * into v_session;

  return v_session;
end;
$$;

create or replace function public.end_class_session(p_session_id uuid)
returns public.class_live_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.class_live_sessions;
begin
  update public.class_live_sessions cls
  set status = 'ended', ended_at = now(), updated_at = now()
  where cls.id = p_session_id
    and cls.teacher_id = auth.uid()
    and cls.status = 'live'
  returning * into v_session;

  if v_session.id is null then
    raise exception 'Live session not found';
  end if;

  update public.class_session_participants
  set status = 'left', left_at = now(), last_seen_at = now()
  where session_id = p_session_id and status = 'joined';

  return v_session;
end;
$$;

create or replace function public.join_class_session(p_session_id uuid)
returns public.class_session_participants
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child_id uuid := auth.uid();
  v_session public.class_live_sessions;
  v_participant public.class_session_participants;
begin
  if v_child_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_session
  from public.class_live_sessions
  where id = p_session_id and status = 'live';

  if v_session.id is null then
    raise exception 'This classroom is not live right now';
  end if;

  if not exists (
    select 1 from public.class_memberships cm
    where cm.class_id = v_session.class_id
      and cm.child_id = v_child_id
      and cm.status = 'active'
  ) then
    raise exception 'You are not connected to this class yet';
  end if;

  insert into public.class_session_participants (session_id, child_id, status, joined_at, last_seen_at)
  values (p_session_id, v_child_id, 'joined', now(), now())
  on conflict (session_id, child_id) do update
  set status = 'joined', left_at = null, last_seen_at = now(), hand_raised = false
  returning * into v_participant;

  return v_participant;
end;
$$;

create or replace function public.leave_class_session(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.class_session_participants
  set status = 'left', left_at = now(), last_seen_at = now(), hand_raised = false
  where session_id = p_session_id
    and child_id = auth.uid()
    and status = 'joined';
end;
$$;

create or replace function public.update_class_session_state(
  p_session_id uuid,
  p_focus_title text default null,
  p_focus_message text default null,
  p_activity_mode text default null,
  p_now_step text default null,
  p_next_step text default null
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
    focus_title = coalesce(nullif(trim(p_focus_title), ''), cls.focus_title),
    focus_message = coalesce(nullif(trim(p_focus_message), ''), cls.focus_message),
    activity_mode = coalesce(nullif(trim(p_activity_mode), ''), cls.activity_mode),
    now_step = coalesce(p_now_step, cls.now_step),
    next_step = coalesce(p_next_step, cls.next_step),
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
      'updatedAt', v_session.updated_at
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

create or replace function public.child_live_classrooms(p_child_id uuid default auth.uid())
returns table (
  class_id uuid,
  class_name text,
  school_name text,
  subject text,
  year_group text,
  class_code text,
  teacher_name text,
  session_id uuid,
  session_status text,
  launched_at timestamptz,
  focus_title text,
  participant_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    tc.id as class_id,
    tc.class_name,
    tc.school_name,
    tc.subject,
    tc.year_group,
    tc.class_code,
    coalesce(nullif(tp.full_name, ''), nullif(tp.first_name, ''), tp.email, 'Teacher') as teacher_name,
    cls.id as session_id,
    cls.status as session_status,
    cls.launched_at,
    cls.focus_title,
    (
      select count(*)::bigint
      from public.class_session_participants csp
      where csp.session_id = cls.id and csp.status = 'joined'
    ) as participant_count
  from public.class_memberships cm
  join public.teacher_classes tc on tc.id = cm.class_id
  left join public.profiles tp on tp.id = tc.teacher_id
  left join public.class_live_sessions cls
    on cls.class_id = cm.class_id and cls.status = 'live'
  where cm.child_id = p_child_id
    and cm.status = 'active'
    and (
      p_child_id = auth.uid()
      or exists (
        select 1 from public.child_relationships cr
        where cr.child_id = p_child_id and cr.parent_id = auth.uid()
      )
    )
  order by cls.launched_at desc nulls last, cm.joined_at desc;
$$;

create or replace function public.teacher_live_sessions(p_teacher_id uuid default auth.uid())
returns table (
  session_id uuid,
  class_id uuid,
  class_name text,
  status text,
  launched_at timestamptz,
  focus_title text,
  participant_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    cls.id as session_id,
    cls.class_id,
    tc.class_name,
    cls.status,
    cls.launched_at,
    cls.focus_title,
    (
      select count(*)::bigint
      from public.class_session_participants csp
      where csp.session_id = cls.id and csp.status = 'joined'
    ) as participant_count
  from public.class_live_sessions cls
  join public.teacher_classes tc on tc.id = cls.class_id
  where cls.teacher_id = p_teacher_id
    and cls.status = 'live'
    and p_teacher_id = auth.uid()
  order by cls.launched_at desc;
$$;

create or replace function public.class_session_participant_pulse(
  p_session_id uuid,
  p_mood_pulse text default null,
  p_hand_raised boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.class_session_participants
  set
    last_seen_at = now(),
    mood_pulse = coalesce(p_mood_pulse, mood_pulse),
    hand_raised = coalesce(p_hand_raised, hand_raised)
  where session_id = p_session_id
    and child_id = auth.uid()
    and status = 'joined';
end;
$$;

revoke all on function public.launch_class_session(uuid, text, text) from public;
grant execute on function public.launch_class_session(uuid, text, text) to authenticated;
revoke all on function public.end_class_session(uuid) from public;
grant execute on function public.end_class_session(uuid) to authenticated;
revoke all on function public.join_class_session(uuid) from public;
grant execute on function public.join_class_session(uuid) to authenticated;
revoke all on function public.leave_class_session(uuid) from public;
grant execute on function public.leave_class_session(uuid) to authenticated;
revoke all on function public.update_class_session_state(uuid, text, text, text, text, text) from public;
grant execute on function public.update_class_session_state(uuid, text, text, text, text, text) to authenticated;
revoke all on function public.class_session_snapshot(uuid) from public;
grant execute on function public.class_session_snapshot(uuid) to authenticated;
revoke all on function public.child_live_classrooms(uuid) from public;
grant execute on function public.child_live_classrooms(uuid) to authenticated;
revoke all on function public.teacher_live_sessions(uuid) from public;
grant execute on function public.teacher_live_sessions(uuid) to authenticated;
revoke all on function public.class_session_participant_pulse(uuid, text, boolean) from public;
grant execute on function public.class_session_participant_pulse(uuid, text, boolean) to authenticated;
