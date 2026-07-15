-- Safe parent/teacher audit RPC.
-- This intentionally does not replace public.parent_teacher_class_requests(uuid[])
-- because changing an existing table-returning function's OUT columns causes
-- Postgres error 42P13. The app calls this audit RPC first and falls back to
-- the older RPC if this one is not installed yet.

create or replace function public.parent_teacher_class_requests_audit(
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
  teacher_approved_by uuid,
  teacher_approved_at timestamptz,
  teacher_approved_by_name text,
  parent_approved_by uuid,
  parent_approved_at timestamptz,
  parent_approved_by_name text,
  approved_at timestamptz,
  declined_by uuid,
  declined_at timestamptz,
  declined_by_name text,
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
    cjr.teacher_approved_by,
    cjr.teacher_approved_at,
    coalesce(
      nullif(tap.full_name, ''),
      trim(concat_ws(' ', nullif(tap.first_name, ''), nullif(tap.last_name, ''))),
      tap.email,
      'Teacher'
    ) as teacher_approved_by_name,
    cjr.parent_approved_by,
    cjr.parent_approved_at,
    coalesce(
      nullif(pap.full_name, ''),
      trim(concat_ws(' ', nullif(pap.first_name, ''), nullif(pap.last_name, ''))),
      pap.email,
      'Parent'
    ) as parent_approved_by_name,
    cjr.approved_at,
    cjr.declined_by,
    cjr.declined_at,
    coalesce(
      nullif(dp.full_name, ''),
      trim(concat_ws(' ', nullif(dp.first_name, ''), nullif(dp.last_name, ''))),
      dp.email,
      'Adult'
    ) as declined_by_name,
    cjr.created_at
  from public.class_join_requests cjr
  join public.teacher_classes tc
    on tc.id = cjr.class_id
  join public.profiles tp
    on tp.id = tc.teacher_id
  left join public.profiles tap
    on tap.id = cjr.teacher_approved_by
  left join public.profiles pap
    on pap.id = cjr.parent_approved_by
  left join public.profiles dp
    on dp.id = cjr.declined_by
  where cjr.status in ('pending', 'pending_parent', 'pending_teacher', 'approved', 'declined', 'cancelled')
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
  order by cjr.created_at desc
  limit 50;
$$;

grant execute on function public.parent_teacher_class_requests_audit(uuid[]) to authenticated;

create or replace function public.parent_approve_class_join_request(
  p_request_id uuid,
  p_visibility_settings jsonb default null
)
returns table (
  request_id uuid,
  membership_id uuid,
  class_id uuid,
  child_id uuid,
  status text,
  approved_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_parent_id uuid := auth.uid();
  v_request public.class_join_requests%rowtype;
  v_class public.teacher_classes%rowtype;
  v_membership public.class_memberships%rowtype;
  v_raw_visibility jsonb;
  v_visibility jsonb;
begin
  if v_parent_id is null then
    raise exception 'You need to be signed in as a parent or guardian.';
  end if;

  select * into v_request
  from public.class_join_requests cjr
  where cjr.id = p_request_id;

  if v_request.id is null then
    raise exception 'Join request not found.';
  end if;

  if v_request.status in ('declined', 'cancelled') then
    raise exception 'This join request is no longer active.';
  end if;

  if not (
    exists (
      select 1 from public.child_relationships cr
      where cr.child_id = v_request.child_id
        and cr.parent_id = v_parent_id
    )
    or exists (
      select 1 from public.trusted_adults ta
      where ta.child_id = v_request.child_id
        and ta.adult_id = v_parent_id
        and ta.status in ('active', 'connected')
    )
  ) then
    raise exception 'Only a linked parent or guardian can approve this class request.';
  end if;

  select * into v_class
  from public.teacher_classes tc
  where tc.id = v_request.class_id;

  if v_class.id is null then
    raise exception 'Class not found for this request.';
  end if;

  v_raw_visibility :=
    jsonb_build_object(
      'childName', false,
      'neuroProfile', true,
      'dailyMood', 'summary',
      'worryDiaryText', false,
      'safeguardingAlerts', true,
      'academicTasks', true,
      'personalNotes', false
    )
    || coalesce(v_request.visibility_settings, '{}'::jsonb)
    || coalesce(p_visibility_settings, '{}'::jsonb);

  v_visibility := jsonb_build_object(
    'childName',
      case
        when v_raw_visibility ->> 'childName' in ('true', 'false')
          then (v_raw_visibility ->> 'childName')::boolean
        else false
      end,
    'neuroProfile',
      case
        when v_raw_visibility ->> 'neuroProfile' in ('true', 'false')
          then (v_raw_visibility ->> 'neuroProfile')::boolean
        else true
      end,
    'dailyMood',
      case
        when v_raw_visibility ->> 'dailyMood' in ('hidden', 'summary', 'full')
          then v_raw_visibility ->> 'dailyMood'
        else 'summary'
      end,
    'worryDiaryText',
      case
        when v_raw_visibility ->> 'worryDiaryText' in ('true', 'false')
          then (v_raw_visibility ->> 'worryDiaryText')::boolean
        else false
      end,
    'safeguardingAlerts',
      case
        when v_raw_visibility ->> 'safeguardingAlerts' in ('true', 'false')
          then (v_raw_visibility ->> 'safeguardingAlerts')::boolean
        else true
      end,
    'academicTasks',
      case
        when v_raw_visibility ->> 'academicTasks' in ('true', 'false')
          then (v_raw_visibility ->> 'academicTasks')::boolean
        else true
      end,
    'personalNotes',
      case
        when v_raw_visibility ->> 'personalNotes' in ('true', 'false')
          then (v_raw_visibility ->> 'personalNotes')::boolean
        else false
      end
  );

  update public.class_join_requests cjr
  set
    parent_approved = true,
    parent_approved_by = v_parent_id,
    parent_approved_at = now(),
    visibility_settings = v_visibility,
    status = case when cjr.teacher_approved then 'approved' else 'pending_teacher' end,
    approved_at = case when cjr.teacher_approved then now() else cjr.approved_at end,
    updated_at = now()
  where cjr.id = v_request.id
  returning * into v_request;

  if v_request.teacher_approved is true then
    insert into public.class_memberships (
      class_id,
      child_id,
      teacher_id,
      visibility_settings,
      status
    )
    values (
      v_request.class_id,
      v_request.child_id,
      v_class.teacher_id,
      v_visibility,
      'active'
    )
    on conflict (class_id, child_id)
    do update set
      teacher_id = excluded.teacher_id,
      visibility_settings = excluded.visibility_settings,
      status = 'active',
      updated_at = now()
    returning * into v_membership;
  end if;

  return query
  select
    v_request.id,
    v_membership.id,
    v_request.class_id,
    v_request.child_id,
    v_request.status,
    v_request.approved_at;
end;
$$;

grant execute on function public.parent_approve_class_join_request(uuid, jsonb) to authenticated;
