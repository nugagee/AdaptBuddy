-- Automatic parent/ward linking from trusted-adult invites.
-- Children add a trusted adult by email; if that email belongs to a parent,
-- AdaptBuddy links the parent dashboard to the child automatically.

create or replace function public.add_trusted_adult_for_child(
  p_name text,
  p_role text,
  p_email text,
  p_phone text
)
returns public.trusted_adults
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child_id uuid := auth.uid();
  v_child_role text;
  v_adult_profile public.profiles%rowtype;
  v_existing public.trusted_adults%rowtype;
  v_result public.trusted_adults%rowtype;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text := trim(coalesce(p_name, ''));
  v_role text := trim(coalesce(p_role, ''));
  v_phone text := trim(coalesce(p_phone, ''));
  v_status text := 'pending';
begin
  if v_child_id is null then
    raise exception 'You need to be signed in to add a trusted adult.';
  end if;

  select role::text
  into v_child_role
  from public.profiles
  where id = v_child_id;

  if v_child_role is distinct from 'child' then
    raise exception 'Only child accounts can add trusted adults.';
  end if;

  if v_name = '' or v_role = '' or v_email = '' or v_phone = '' then
    raise exception 'Trusted adult name, role, email, and phone are required.';
  end if;

  select *
  into v_adult_profile
  from public.profiles
  where lower(email) = v_email
    and role::text in ('parent', 'teacher', 'admin')
  order by created_at desc
  limit 1;

  if found then
    v_status := 'connected';
  end if;

  select *
  into v_existing
  from public.trusted_adults
  where child_id = v_child_id
    and lower(email) = v_email
  order by created_at desc
  limit 1;

  if v_existing.id is not null then
    update public.trusted_adults
    set
      adult_id = case when v_adult_profile.id is not null then v_adult_profile.id else adult_id end,
      name = v_name,
      role = v_role,
      email = v_email,
      phone = v_phone,
      status = v_status,
      updated_at = now()
    where id = v_existing.id
    returning * into v_result;
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
      v_child_id,
      v_adult_profile.id,
      v_name,
      v_role,
      v_email,
      v_phone,
      v_status
    )
    returning * into v_result;
  end if;

  if v_adult_profile.id is not null and v_adult_profile.role::text = 'parent' then
    insert into public.child_relationships (parent_id, child_id, relationship)
    values (v_adult_profile.id, v_child_id, 'parent')
    on conflict (parent_id, child_id)
    do update set relationship = excluded.relationship;
  end if;

  return v_result;
end;
$$;

grant execute on function public.add_trusted_adult_for_child(text, text, text, text) to authenticated;

create or replace function public.sync_trusted_adult_links_for_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role::text in ('parent', 'teacher', 'admin') then
    update public.trusted_adults
    set
      adult_id = new.id,
      status = 'connected',
      updated_at = now()
    where lower(email) = lower(new.email)
      and (adult_id is null or adult_id = new.id);

    if new.role::text = 'parent' then
      insert into public.child_relationships (parent_id, child_id, relationship)
      select new.id, ta.child_id, 'parent'
      from public.trusted_adults ta
      where lower(ta.email) = lower(new.email)
      on conflict (parent_id, child_id)
      do update set relationship = excluded.relationship;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_sync_trusted_adult_links on public.profiles;
create trigger profiles_sync_trusted_adult_links
  after insert or update on public.profiles
  for each row execute function public.sync_trusted_adult_links_for_profile();

-- Backfill links for accounts and trusted adults that already exist.
update public.trusted_adults ta
set
  adult_id = p.id,
  status = 'connected',
  updated_at = now()
from public.profiles p
where lower(ta.email) = lower(p.email)
  and p.role::text in ('parent', 'teacher', 'admin')
  and (ta.adult_id is null or ta.adult_id = p.id);

insert into public.child_relationships (parent_id, child_id, relationship)
select p.id, ta.child_id, 'parent'
from public.trusted_adults ta
join public.profiles p
  on lower(p.email) = lower(ta.email)
where p.role::text = 'parent'
on conflict (parent_id, child_id)
do update set relationship = excluded.relationship;
