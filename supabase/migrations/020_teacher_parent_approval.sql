-- Teacher parent-approval privacy gate.
-- Requests may be initiated by a teacher, but class membership is created only
-- after a linked parent/guardian approves the request and visibility settings.

alter table public.class_join_requests
  add column if not exists requested_buddy_id text,
  add column if not exists teacher_approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists teacher_approved_at timestamptz,
  add column if not exists parent_approved_by uuid references public.profiles(id) on delete set null,
  add column if not exists parent_approved_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists declined_by uuid references public.profiles(id) on delete set null,
  add column if not exists declined_at timestamptz;

update public.class_join_requests cjr
set requested_buddy_id = p.buddy_id
from public.profiles p
where p.id = cjr.child_id
  and cjr.requested_buddy_id is null;

alter table public.class_join_requests
  drop constraint if exists class_join_requests_status_check;

update public.class_join_requests
set status = 'pending_parent'
where status = 'pending'
  and teacher_approved = true
  and parent_approved = false;

alter table public.class_join_requests
  add constraint class_join_requests_status_check
  check (status in ('pending', 'pending_parent', 'pending_teacher', 'approved', 'declined', 'cancelled'));

create index if not exists class_join_requests_requested_buddy_id_idx
  on public.class_join_requests(requested_buddy_id);

drop policy if exists "Linked parents can view requested classes" on public.teacher_classes;
create policy "Linked parents can view requested classes"
  on public.teacher_classes for select
  using (
    exists (
      select 1
      from public.class_join_requests cjr
      where cjr.class_id = teacher_classes.id
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
    )
  );

drop policy if exists "Class participants can view join requests" on public.class_join_requests;
create policy "Class participants can view join requests"
  on public.class_join_requests for select
  using (
    requested_by = auth.uid()
    or child_id = auth.uid()
    or exists (
      select 1 from public.teacher_classes tc
      where tc.id = class_join_requests.class_id
        and tc.teacher_id = auth.uid()
    )
    or exists (
      select 1 from public.child_relationships cr
      where cr.child_id = class_join_requests.child_id
        and cr.parent_id = auth.uid()
    )
    or exists (
      select 1 from public.trusted_adults ta
      where ta.child_id = class_join_requests.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  );

drop policy if exists "Linked parents can update class join requests" on public.class_join_requests;
create policy "Linked parents can update class join requests"
  on public.class_join_requests for update
  using (
    exists (
      select 1 from public.child_relationships cr
      where cr.child_id = class_join_requests.child_id
        and cr.parent_id = auth.uid()
    )
    or exists (
      select 1 from public.trusted_adults ta
      where ta.child_id = class_join_requests.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  )
  with check (
    exists (
      select 1 from public.child_relationships cr
      where cr.child_id = class_join_requests.child_id
        and cr.parent_id = auth.uid()
    )
    or exists (
      select 1 from public.trusted_adults ta
      where ta.child_id = class_join_requests.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  );

drop policy if exists "Class teachers can view class child profiles" on public.profiles;
create policy "Class teachers can view class child profiles"
  on public.profiles for select
  using (
    role::text = 'child'
    and exists (
      select 1
      from public.teacher_classes tc
      left join public.class_memberships cm
        on cm.class_id = tc.id
        and cm.child_id = profiles.id
        and cm.status = 'active'
      left join public.class_join_requests cjr
        on cjr.class_id = tc.id
        and cjr.child_id = profiles.id
        and cjr.parent_approved = true
        and cjr.status in ('pending_teacher', 'approved')
      where tc.teacher_id = auth.uid()
        and (cm.id is not null or cjr.id is not null)
    )
  );

create or replace function public.teacher_request_student_by_buddy_id(
  p_class_id uuid,
  p_buddy_id text
)
returns table (
  request_id uuid,
  class_id uuid,
  child_id uuid,
  child_name text,
  buddy_id text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_teacher_id uuid := auth.uid();
  v_teacher public.profiles%rowtype;
  v_class public.teacher_classes%rowtype;
  v_child public.profiles%rowtype;
  v_buddy_id text := public.normalize_buddy_id(p_buddy_id);
  v_request public.class_join_requests%rowtype;
begin
  if v_teacher_id is null then
    raise exception 'You need to be signed in as a teacher.';
  end if;

  select * into v_teacher from public.profiles p where p.id = v_teacher_id;
  if v_teacher.id is null or v_teacher.role::text not in ('teacher', 'admin') then
    raise exception 'Only teacher accounts can connect students to a class.';
  end if;

  select * into v_class
  from public.teacher_classes tc
  where tc.id = p_class_id
    and tc.teacher_id = v_teacher_id;

  if v_class.id is null then
    raise exception 'Class not found for this teacher account.';
  end if;

  if v_buddy_id is null then
    raise exception 'Enter a valid Buddy ID like AB-7K4M-23.';
  end if;

  select * into v_child
  from public.profiles p
  where p.buddy_id = v_buddy_id
    and p.role::text = 'child';

  if v_child.id is null then
    raise exception 'No child profile was found for that Buddy ID.';
  end if;

  insert into public.class_join_requests (
    class_id,
    child_id,
    requested_by,
    requested_buddy_id,
    request_method,
    status,
    teacher_approved,
    teacher_approved_by,
    teacher_approved_at
  )
  values (
    v_class.id,
    v_child.id,
    v_teacher_id,
    v_child.buddy_id,
    'buddy_id',
    'pending_parent',
    true,
    v_teacher_id,
    now()
  )
  on conflict (class_id, child_id)
  do update set
    requested_by = excluded.requested_by,
    requested_buddy_id = excluded.requested_buddy_id,
    request_method = 'buddy_id',
    status = case
      when public.class_join_requests.status = 'approved' then 'approved'
      when public.class_join_requests.parent_approved = true then 'pending_teacher'
      else 'pending_parent'
    end,
    teacher_approved = true,
    teacher_approved_by = v_teacher_id,
    teacher_approved_at = now(),
    declined_by = null,
    declined_at = null,
    updated_at = now()
  returning * into v_request;

  return query
  select
    v_request.id,
    v_request.class_id,
    v_child.id,
    'Pending learner'::text,
    v_child.buddy_id,
    v_request.status,
    v_request.created_at;
end;
$$;

grant execute on function public.teacher_request_student_by_buddy_id(uuid, text) to authenticated;

create or replace function public.approve_class_join_request(
  p_request_id uuid
)
returns table (
  membership_id uuid,
  class_id uuid,
  child_id uuid,
  status text,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_teacher_id uuid := auth.uid();
  v_request public.class_join_requests%rowtype;
  v_class public.teacher_classes%rowtype;
  v_membership public.class_memberships%rowtype;
begin
  select * into v_request
  from public.class_join_requests cjr
  where cjr.id = p_request_id;

  if v_request.id is null then
    raise exception 'Join request not found.';
  end if;

  if v_request.status in ('declined', 'cancelled') then
    raise exception 'This join request is no longer active.';
  end if;

  select * into v_class
  from public.teacher_classes tc
  where tc.id = v_request.class_id
    and tc.teacher_id = v_teacher_id;

  if v_class.id is null then
    raise exception 'Only the class teacher can approve this request.';
  end if;

  update public.class_join_requests cjr
  set
    teacher_approved = true,
    teacher_approved_by = v_teacher_id,
    teacher_approved_at = coalesce(cjr.teacher_approved_at, now()),
    status = case when cjr.parent_approved then 'approved' else 'pending_parent' end,
    approved_at = case when cjr.parent_approved then coalesce(cjr.approved_at, now()) else cjr.approved_at end,
    updated_at = now()
  where cjr.id = v_request.id
  returning * into v_request;

  if v_request.parent_approved is not true then
    return query
    select
      null::uuid,
      v_request.class_id,
      v_request.child_id,
      v_request.status,
      null::timestamptz;
    return;
  end if;

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
    v_teacher_id,
    v_request.visibility_settings,
    'active'
  )
  on conflict (class_id, child_id)
  do update set
    teacher_id = excluded.teacher_id,
    visibility_settings = excluded.visibility_settings,
    status = 'active',
    updated_at = now()
  returning * into v_membership;

  return query
  select
    v_membership.id,
    v_membership.class_id,
    v_membership.child_id,
    v_membership.status,
    v_membership.joined_at;
end;
$$;

grant execute on function public.approve_class_join_request(uuid) to authenticated;

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

  v_visibility :=
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

create or replace function public.parent_decline_class_join_request(
  p_request_id uuid
)
returns table (
  request_id uuid,
  class_id uuid,
  child_id uuid,
  status text
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_parent_id uuid := auth.uid();
  v_request public.class_join_requests%rowtype;
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
    raise exception 'Only a linked parent or guardian can decline this class request.';
  end if;

  update public.class_join_requests cjr
  set
    status = 'declined',
    parent_approved = false,
    declined_by = v_parent_id,
    declined_at = now(),
    updated_at = now()
  where cjr.id = v_request.id
  returning * into v_request;

  update public.class_memberships cm
  set status = 'removed', updated_at = now()
  where cm.class_id = v_request.class_id
    and cm.child_id = v_request.child_id;

  return query
  select
    v_request.id,
    v_request.class_id,
    v_request.child_id,
    v_request.status;
end;
$$;

grant execute on function public.parent_decline_class_join_request(uuid) to authenticated;
