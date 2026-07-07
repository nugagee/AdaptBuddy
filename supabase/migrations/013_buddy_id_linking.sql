-- Buddy ID linking
-- Gives every child a friendly private code such as AB-7K4M-23.
-- Parents/teachers can link to a child by code without handling UUIDs.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists buddy_id text;

create or replace function public.normalize_buddy_id(p_buddy_id text)
returns text
language plpgsql
immutable
as $$
declare
  v_clean text := upper(regexp_replace(coalesce(p_buddy_id, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if v_clean ~ '^AB[A-Z0-9]{6}$' then
    return 'AB-' || substr(v_clean, 3, 4) || '-' || substr(v_clean, 7, 2);
  end if;

  if v_clean ~ '^[A-Z0-9]{6}$' then
    return 'AB-' || substr(v_clean, 1, 4) || '-' || substr(v_clean, 5, 2);
  end if;

  return null;
end;
$$;

create or replace function public.generate_buddy_id()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i integer;
begin
  loop
    v_code := 'AB-';

    for i in 1..4 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
    end loop;

    v_code := v_code || '-';

    for i in 1..2 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::integer, 1);
    end loop;

    exit when not exists (
      select 1
      from public.profiles p
      where p.buddy_id = v_code
    );
  end loop;

  return v_code;
end;
$$;

create or replace function public.set_profile_buddy_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role::text = 'child' then
    if new.buddy_id is null or trim(new.buddy_id) = '' then
      new.buddy_id := public.generate_buddy_id();
    else
      new.buddy_id := public.normalize_buddy_id(new.buddy_id);
    end if;

    if new.buddy_id is null then
      raise exception 'Buddy ID must use the format AB-XXXX-XX.';
    end if;
  else
    new.buddy_id := null;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_set_buddy_id on public.profiles;
create trigger profiles_set_buddy_id
  before insert or update of role, buddy_id on public.profiles
  for each row execute function public.set_profile_buddy_id();

update public.profiles
set buddy_id = public.generate_buddy_id()
where role::text = 'child'
  and buddy_id is null;

create unique index if not exists profiles_buddy_id_unique_idx
  on public.profiles (buddy_id)
  where buddy_id is not null;

alter table public.profiles
  drop constraint if exists profiles_buddy_id_format_check;

alter table public.profiles
  add constraint profiles_buddy_id_format_check
  check (buddy_id is null or buddy_id ~ '^AB-[A-Z0-9]{4}-[A-Z0-9]{2}$');

alter table public.child_relationships
  drop constraint if exists child_relationships_relationship_check;

alter table public.child_relationships
  add constraint child_relationships_relationship_check
  check (relationship in ('parent', 'guardian', 'grandparent', 'carer', 'teacher', 'therapist', 'support_worker'));

create or replace function public.link_child_by_buddy_id(
  p_buddy_id text,
  p_relationship text default 'parent'
)
returns table (
  child_id uuid,
  child_name text,
  buddy_id text,
  relationship text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adult_id uuid := auth.uid();
  v_adult public.profiles%rowtype;
  v_child public.profiles%rowtype;
  v_buddy_id text := public.normalize_buddy_id(p_buddy_id);
  v_relationship text := lower(trim(coalesce(p_relationship, 'parent')));
  v_existing_adult public.trusted_adults%rowtype;
begin
  if v_adult_id is null then
    raise exception 'You need to be signed in to link a child.';
  end if;

  if v_buddy_id is null then
    raise exception 'Enter a valid Buddy ID like AB-7K4M-23.';
  end if;

  select *
  into v_adult
  from public.profiles
  where id = v_adult_id;

  if v_adult.id is null then
    raise exception 'Your profile could not be found.';
  end if;

  if v_adult.role::text not in ('parent', 'teacher', 'admin') then
    raise exception 'Only parent, teacher, or admin accounts can link a child by Buddy ID.';
  end if;

  if v_relationship not in ('parent', 'guardian', 'grandparent', 'carer', 'teacher', 'therapist', 'support_worker') then
    v_relationship := case
      when v_adult.role::text = 'teacher' then 'teacher'
      else 'parent'
    end;
  end if;

  select *
  into v_child
  from public.profiles
  where buddy_id = v_buddy_id
    and role::text = 'child';

  if v_child.id is null then
    raise exception 'No child profile was found for that Buddy ID.';
  end if;

  insert into public.child_relationships (parent_id, child_id, relationship)
  values (v_adult.id, v_child.id, v_relationship)
  on conflict (parent_id, child_id)
  do update set relationship = excluded.relationship;

  select *
  into v_existing_adult
  from public.trusted_adults
  where child_id = v_child.id
    and (
      adult_id = v_adult.id
      or lower(email) = lower(v_adult.email)
    )
  order by created_at desc
  limit 1;

  if v_existing_adult.id is not null then
    update public.trusted_adults
    set
      adult_id = v_adult.id,
      name = coalesce(nullif(v_adult.full_name, ''), nullif(v_adult.first_name, ''), v_adult.email),
      role = v_relationship,
      email = v_adult.email,
      status = 'connected',
      updated_at = now()
    where id = v_existing_adult.id;
  else
    insert into public.trusted_adults (
      child_id,
      adult_id,
      name,
      role,
      email,
      phone,
      status
    )
    values (
      v_child.id,
      v_adult.id,
      coalesce(nullif(v_adult.full_name, ''), nullif(v_adult.first_name, ''), v_adult.email),
      v_relationship,
      v_adult.email,
      '',
      'connected'
    );
  end if;

  return query
  select
    v_child.id,
    coalesce(nullif(v_child.full_name, ''), nullif(v_child.child_name, ''), nullif(v_child.first_name, ''), 'Child'),
    v_child.buddy_id,
    v_relationship,
    now();
end;
$$;

grant execute on function public.link_child_by_buddy_id(text, text) to authenticated;

create or replace view public.parent_dashboard_summary
with (security_invoker = true) as
select
  cp.id as child_id,
  coalesce(nullif(cp.full_name, ''), nullif(cp.child_name, ''), nullif(cp.first_name, ''), 'Child') as child_name,
  cp.age,
  cp.neuro_types as neurotypes,
  count(distinct je.id) as total_entries,
  count(distinct je.id) filter (where je.created_at > now() - interval '7 days') as entries_last_7_days,
  count(distinct a.id) as total_alerts,
  count(distinct a.id) filter (where a.risk_level = 'high' and a.acknowledged_at is null) as high_alerts,
  count(distinct ta_count.id) filter (where ta_count.status in ('active', 'connected')) as trusted_adults_count,
  least(
    100,
    (case when cp.onboarding_completed then 25 else 0 end) +
    (case when coalesce(cp.companion_onboarding_completed, false) then 20 else 0 end) +
    (case when cardinality(coalesce(cp.neuro_types, '{}'::text[])) > 0 then 20 else 0 end) +
    (case when bool_or(ap.id is not null) then 20 else 0 end) +
    (case when count(distinct ta_count.id) filter (where ta_count.status in ('active', 'connected')) > 0 then 15 else 0 end)
  ) as profile_completion,
  cp.buddy_id as buddy_id
from public.profiles cp
left join public.journal_entries je
  on je.child_id = cp.id
  and je.is_shared = true
left join public.alerts a
  on a.child_id = cp.id
left join public.trusted_adults ta_count
  on ta_count.child_id = cp.id
left join public.autism_profiles ap
  on ap.child_id = cp.id
where cp.role::text = 'child'
  and (
    exists (
      select 1
      from public.child_relationships cr
      where cr.child_id = cp.id
        and cr.parent_id = auth.uid()
    )
    or exists (
      select 1
      from public.trusted_adults ta
      where ta.child_id = cp.id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  )
group by
  cp.id,
  cp.buddy_id,
  cp.full_name,
  cp.child_name,
  cp.first_name,
  cp.age,
  cp.neuro_types,
  cp.onboarding_completed,
  cp.companion_onboarding_completed;

grant select on public.parent_dashboard_summary to authenticated;
