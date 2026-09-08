-- Synthetic schema fixture derived from catalog definitions, with no real records.
create table public.trusted_adults (
  id uuid primary key default gen_random_uuid() not null,
  child_id uuid not null,
  adult_id uuid,
  name text not null,
  role text not null,
  email text not null,
  phone text not null,
  status text default 'pending'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);
alter table public.trusted_adults enable row level security;
create table public.class_memberships (
  id uuid primary key default gen_random_uuid() not null,
  class_id uuid not null,
  child_id uuid not null,
  teacher_id uuid not null,
  visibility_settings jsonb default jsonb_build_object('childName', false, 'neuroProfile', true, 'dailyMood', 'summary', 'worryDiaryText', false, 'safeguardingAlerts', true, 'academicTasks', true, 'personalNotes', false) not null,
  status text default 'active'::text not null,
  joined_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);
alter table public.class_memberships enable row level security;
create table public.class_join_requests (
  id uuid primary key default gen_random_uuid() not null,
  class_id uuid not null,
  child_id uuid not null,
  requested_by uuid not null,
  request_method text default 'buddy_id'::text not null,
  status text default 'pending'::text not null,
  parent_approved boolean default false not null,
  teacher_approved boolean default false not null,
  visibility_settings jsonb default jsonb_build_object('childName', false, 'neuroProfile', true, 'dailyMood', 'summary', 'worryDiaryText', false, 'safeguardingAlerts', true, 'academicTasks', true, 'personalNotes', false) not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  requested_buddy_id text,
  teacher_approved_by uuid,
  teacher_approved_at timestamp with time zone,
  parent_approved_by uuid,
  parent_approved_at timestamp with time zone,
  approved_at timestamp with time zone,
  declined_by uuid,
  declined_at timestamp with time zone
);
alter table public.class_join_requests enable row level security;
create table public.mood_check_ins (
  id uuid primary key default gen_random_uuid() not null,
  child_id uuid not null,
  mood text not null,
  note text,
  ai_response text,
  created_at timestamp with time zone default now() not null
);
alter table public.mood_check_ins enable row level security;
alter table profiles add column created_at timestamptz default now(), add column buddy_id text;
create table child_relationships (id uuid primary key default gen_random_uuid(), parent_id uuid, child_id uuid,
  relationship text, created_at timestamptz default now(), unique(parent_id,child_id));
alter table child_relationships enable row level security;
create table teacher_classes (id uuid primary key default gen_random_uuid(), teacher_id uuid);
grant all on all tables in schema public to authenticated, service_role;
create policy child_and_adult_select on trusted_adults for select to authenticated using(child_id=auth.uid() or adult_id=auth.uid());
create policy child_write on trusted_adults for all to authenticated using(child_id=auth.uid()) with check(child_id=auth.uid());
create policy relationship_select on child_relationships for select to authenticated using(child_id=auth.uid() or parent_id=auth.uid());
create policy mood_child on mood_check_ins for all to authenticated using(child_id=auth.uid()) with check(child_id=auth.uid());
create policy "Trusted adults view child mood check-ins" on mood_check_ins for select to authenticated using(exists(
  select 1 from trusted_adults where child_id=mood_check_ins.child_id and adult_id=auth.uid() and status='connected'));
CREATE OR REPLACE FUNCTION public.unlink_child_from_parent(p_child_id uuid)
 RETURNS TABLE(child_id uuid, child_name text, buddy_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
declare
  v_adult_id uuid := auth.uid();
  v_adult public.profiles%rowtype;
  v_child public.profiles%rowtype;
  v_is_linked boolean;
begin
  if v_adult_id is null then
    raise exception 'You need to be signed in to remove a child.';
  end if;

  select *
  into v_adult
  from public.profiles p
  where p.id = v_adult_id;

  if v_adult.id is null then
    raise exception 'Your profile could not be found.';
  end if;

  if v_adult.role::text not in ('parent', 'teacher', 'admin') then
    raise exception 'Only parent, teacher, or admin accounts can remove a linked child.';
  end if;

  select *
  into v_child
  from public.profiles p
  where p.id = p_child_id
    and p.role::text = 'child';

  if v_child.id is null then
    raise exception 'Child profile not found.';
  end if;

  select exists (
    select 1
    from public.child_relationships cr
    where cr.parent_id = v_adult_id
      and cr.child_id = p_child_id
  )
  or exists (
    select 1
    from public.trusted_adults ta
    where ta.child_id = p_child_id
      and ta.adult_id = v_adult_id
      and ta.status in ('active', 'connected')
  )
  into v_is_linked;

  if not v_is_linked then
    raise exception 'This child is not linked to your account.';
  end if;

  delete from public.child_relationships cr
  where cr.parent_id = v_adult_id
    and cr.child_id = p_child_id;

  delete from public.trusted_adults ta
  where ta.child_id = p_child_id
    and (
      ta.adult_id = v_adult_id
      or lower(ta.email) = lower(v_adult.email)
    );

  return query
  select
    v_child.id,
    coalesce(nullif(v_child.full_name, ''), nullif(v_child.child_name, ''), nullif(v_child.first_name, ''), 'Child'),
    v_child.buddy_id;
end;
$function$
;

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles(id) on delete cascade,
  emotion text,
  text text,
  audio_url text,
  ai_analysis jsonb,
  risk_level text not null default 'low',
  is_shared boolean not null default true,
  created_at timestamptz not null default now(),
  constraint journal_entries_risk_level_check
    check (risk_level in ('low', 'medium', 'high'))
);


create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid references public.journal_entries(id) on delete set null,
  child_id uuid not null references public.profiles(id) on delete cascade,
  risk_level text not null default 'low',
  notified_adults uuid[] not null default '{}',
  acknowledged_by uuid references public.profiles(id) on delete set null,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  constraint alerts_risk_level_check
    check (risk_level in ('low', 'medium', 'high'))
);


create table if not exists public.parent_child_signals (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles(id) on delete cascade,
  emotion text not null,
  color text not null default 'blue',
  note text,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);
