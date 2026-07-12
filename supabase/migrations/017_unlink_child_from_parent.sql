-- Allow parents/teachers to disconnect a linked child from their dashboard.

create or replace function public.unlink_child_from_parent(
  p_child_id uuid
)
returns table (
  child_id uuid,
  child_name text,
  buddy_id text
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
$$;

grant execute on function public.unlink_child_from_parent(uuid) to authenticated;
