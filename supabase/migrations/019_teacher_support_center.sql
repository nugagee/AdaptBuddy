-- Teacher support centre foundation.
-- Adds class management, Buddy ID join requests, class memberships, and assignment tables.

create extension if not exists pgcrypto;

create table if not exists public.teacher_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  school_name text not null default '',
  class_name text not null,
  class_code text not null unique,
  subject text not null default 'general',
  year_group text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists teacher_classes_teacher_id_idx
  on public.teacher_classes(teacher_id);

create table if not exists public.class_join_requests (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.teacher_classes(id) on delete cascade,
  child_id uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  request_method text not null default 'buddy_id',
  status text not null default 'pending',
  parent_approved boolean not null default false,
  teacher_approved boolean not null default false,
  visibility_settings jsonb not null default jsonb_build_object(
    'childName', false,
    'neuroProfile', true,
    'dailyMood', 'summary',
    'worryDiaryText', false,
    'safeguardingAlerts', true,
    'academicTasks', true,
    'personalNotes', false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_join_requests_method_check
    check (request_method in ('class_code', 'buddy_id', 'parent_invite', 'manual')),
  constraint class_join_requests_status_check
    check (status in ('pending', 'approved', 'declined', 'cancelled')),
  unique(class_id, child_id)
);

create index if not exists class_join_requests_class_status_idx
  on public.class_join_requests(class_id, status);

create index if not exists class_join_requests_child_idx
  on public.class_join_requests(child_id);

create table if not exists public.class_memberships (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.teacher_classes(id) on delete cascade,
  child_id uuid not null references public.profiles(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  visibility_settings jsonb not null default jsonb_build_object(
    'childName', false,
    'neuroProfile', true,
    'dailyMood', 'summary',
    'worryDiaryText', false,
    'safeguardingAlerts', true,
    'academicTasks', true,
    'personalNotes', false
  ),
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint class_memberships_status_check
    check (status in ('active', 'paused', 'removed')),
  unique(class_id, child_id)
);

create index if not exists class_memberships_teacher_status_idx
  on public.class_memberships(teacher_id, status);

create index if not exists class_memberships_child_idx
  on public.class_memberships(child_id);

create table if not exists public.teacher_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.teacher_classes(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  assignment_type text not null default 'task',
  support_tools text[] not null default '{}',
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint teacher_assignments_type_check
    check (assignment_type in ('reading', 'maths', 'writing', 'calm_break', 'visual_routine', 'social_story', 'task'))
);

create index if not exists teacher_assignments_class_due_idx
  on public.teacher_assignments(class_id, due_at);

create table if not exists public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.teacher_assignments(id) on delete cascade,
  child_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'not_started',
  response_text text,
  support_used text[] not null default '{}',
  mood_after_task text,
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint assignment_submissions_status_check
    check (status in ('not_started', 'in_progress', 'needs_help', 'completed', 'submitted')),
  unique(assignment_id, child_id)
);

create index if not exists assignment_submissions_child_status_idx
  on public.assignment_submissions(child_id, status);

create or replace function public.set_teacher_support_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists teacher_classes_updated_at on public.teacher_classes;
create trigger teacher_classes_updated_at
  before update on public.teacher_classes
  for each row execute function public.set_teacher_support_updated_at();

drop trigger if exists class_join_requests_updated_at on public.class_join_requests;
create trigger class_join_requests_updated_at
  before update on public.class_join_requests
  for each row execute function public.set_teacher_support_updated_at();

drop trigger if exists class_memberships_updated_at on public.class_memberships;
create trigger class_memberships_updated_at
  before update on public.class_memberships
  for each row execute function public.set_teacher_support_updated_at();

drop trigger if exists teacher_assignments_updated_at on public.teacher_assignments;
create trigger teacher_assignments_updated_at
  before update on public.teacher_assignments
  for each row execute function public.set_teacher_support_updated_at();

drop trigger if exists assignment_submissions_updated_at on public.assignment_submissions;
create trigger assignment_submissions_updated_at
  before update on public.assignment_submissions
  for each row execute function public.set_teacher_support_updated_at();

alter table public.teacher_classes enable row level security;
alter table public.class_join_requests enable row level security;
alter table public.class_memberships enable row level security;
alter table public.teacher_assignments enable row level security;
alter table public.assignment_submissions enable row level security;

drop policy if exists "Teachers can manage own classes" on public.teacher_classes;
create policy "Teachers can manage own classes"
  on public.teacher_classes for all
  using (
    teacher_id = auth.uid()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role::text = 'admin')
  )
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role::text in ('teacher', 'admin')
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
  );

drop policy if exists "Class teachers can update join requests" on public.class_join_requests;
create policy "Class teachers can update join requests"
  on public.class_join_requests for update
  using (
    exists (
      select 1 from public.teacher_classes tc
      where tc.id = class_join_requests.class_id
        and tc.teacher_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.teacher_classes tc
      where tc.id = class_join_requests.class_id
        and tc.teacher_id = auth.uid()
    )
  );

drop policy if exists "Class request creators can insert requests" on public.class_join_requests;
create policy "Class request creators can insert requests"
  on public.class_join_requests for insert
  with check (
    requested_by = auth.uid()
    and (
      child_id = auth.uid()
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
    )
  );

drop policy if exists "Class participants can view memberships" on public.class_memberships;
create policy "Class participants can view memberships"
  on public.class_memberships for select
  using (
    teacher_id = auth.uid()
    or child_id = auth.uid()
    or exists (
      select 1 from public.child_relationships cr
      where cr.child_id = class_memberships.child_id
        and cr.parent_id = auth.uid()
    )
  );

drop policy if exists "Class teachers can update memberships" on public.class_memberships;
create policy "Class teachers can update memberships"
  on public.class_memberships for update
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

drop policy if exists "Class teachers can create memberships" on public.class_memberships;
create policy "Class teachers can create memberships"
  on public.class_memberships for insert
  with check (teacher_id = auth.uid());

drop policy if exists "Class participants can view assignments" on public.teacher_assignments;
create policy "Class participants can view assignments"
  on public.teacher_assignments for select
  using (
    teacher_id = auth.uid()
    or exists (
      select 1 from public.class_memberships cm
      where cm.class_id = teacher_assignments.class_id
        and cm.child_id = auth.uid()
        and cm.status = 'active'
    )
  );

drop policy if exists "Class teachers can manage assignments" on public.teacher_assignments;
create policy "Class teachers can manage assignments"
  on public.teacher_assignments for all
  using (teacher_id = auth.uid())
  with check (
    teacher_id = auth.uid()
    and exists (
      select 1 from public.teacher_classes tc
      where tc.id = teacher_assignments.class_id
        and tc.teacher_id = auth.uid()
    )
  );

drop policy if exists "Teachers and children can view submissions" on public.assignment_submissions;
create policy "Teachers and children can view submissions"
  on public.assignment_submissions for select
  using (
    child_id = auth.uid()
    or exists (
      select 1
      from public.teacher_assignments ta
      where ta.id = assignment_submissions.assignment_id
        and ta.teacher_id = auth.uid()
    )
  );

drop policy if exists "Children can manage own submissions" on public.assignment_submissions;
create policy "Children can manage own submissions"
  on public.assignment_submissions for all
  using (child_id = auth.uid())
  with check (child_id = auth.uid());

drop policy if exists "Class teachers can view class child profiles" on public.profiles;
create policy "Class teachers can view class child profiles"
  on public.profiles for select
  using (
    role::text = 'child'
    and exists (
      select 1
      from public.teacher_classes tc
      left join public.class_join_requests cjr
        on cjr.class_id = tc.id
        and cjr.child_id = profiles.id
      left join public.class_memberships cm
        on cm.class_id = tc.id
        and cm.child_id = profiles.id
      where tc.teacher_id = auth.uid()
        and (cjr.id is not null or cm.id is not null)
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
    request_method,
    status,
    teacher_approved
  )
  values (
    v_class.id,
    v_child.id,
    v_teacher_id,
    'buddy_id',
    'pending',
    true
  )
  on conflict (class_id, child_id)
  do update set
    requested_by = excluded.requested_by,
    request_method = 'buddy_id',
    status = case
      when public.class_join_requests.status = 'approved' then 'approved'
      else 'pending'
    end,
    teacher_approved = true,
    updated_at = now()
  returning * into v_request;

  return query
  select
    v_request.id,
    v_request.class_id,
    v_child.id,
    coalesce(nullif(v_child.full_name, ''), nullif(v_child.child_name, ''), nullif(v_child.first_name, ''), 'Learner'),
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

  select * into v_class
  from public.teacher_classes tc
  where tc.id = v_request.class_id
    and tc.teacher_id = v_teacher_id;

  if v_class.id is null then
    raise exception 'Only the class teacher can approve this request.';
  end if;

  update public.class_join_requests cjr
  set
    status = 'approved',
    teacher_approved = true,
    updated_at = now()
  where cjr.id = v_request.id;

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

create or replace function public.decline_class_join_request(
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
  v_teacher_id uuid := auth.uid();
  v_request public.class_join_requests%rowtype;
  v_class public.teacher_classes%rowtype;
begin
  select * into v_request
  from public.class_join_requests cjr
  where cjr.id = p_request_id;

  if v_request.id is null then
    raise exception 'Join request not found.';
  end if;

  select * into v_class
  from public.teacher_classes tc
  where tc.id = v_request.class_id
    and tc.teacher_id = v_teacher_id;

  if v_class.id is null then
    raise exception 'Only the class teacher can decline this request.';
  end if;

  update public.class_join_requests cjr
  set
    status = 'declined',
    updated_at = now()
  where cjr.id = v_request.id;

  return query
  select
    v_request.id,
    v_request.class_id,
    v_request.child_id,
    'declined'::text;
end;
$$;

grant execute on function public.decline_class_join_request(uuid) to authenticated;
