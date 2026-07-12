-- Fix ambiguous column references in link_child_by_buddy_id
-- RETURNS TABLE output names (child_id, buddy_id, relationship, etc.) shadow table columns.
-- #variable_conflict use_column tells PL/pgSQL to prefer table columns when ambiguous.

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
#variable_conflict use_column
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
  from public.profiles p
  where p.id = v_adult_id;

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
  from public.profiles p
  where p.buddy_id = v_buddy_id
    and p.role::text = 'child';

  if v_child.id is null then
    raise exception 'No child profile was found for that Buddy ID.';
  end if;

  insert into public.child_relationships as cr (parent_id, child_id, relationship)
  values (v_adult.id, v_child.id, v_relationship)
  on conflict on constraint child_relationships_parent_id_child_id_key
  do update set relationship = excluded.relationship;

  select *
  into v_existing_adult
  from public.trusted_adults ta
  where ta.child_id = v_child.id
    and (
      ta.adult_id = v_adult.id
      or lower(ta.email) = lower(v_adult.email)
    )
  order by ta.created_at desc
  limit 1;

  if v_existing_adult.id is not null then
    update public.trusted_adults ta
    set
      adult_id = v_adult.id,
      name = coalesce(nullif(v_adult.full_name, ''), nullif(v_adult.first_name, ''), v_adult.email),
      role = v_relationship,
      email = v_adult.email,
      status = 'connected',
      updated_at = now()
    where ta.id = v_existing_adult.id;
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
