-- DRAFT ONLY: safeguarding access guardrails, phase 1.
-- Do not apply this proposal until the historical RLS audit and staged rehearsal pass.
--
-- This migration deliberately fails closed:
--   * trusted adults remain pending until the matching account accepts;
--   * historical auto-connected links are quarantined for operator review;
--   * generic Buddy ID linking no longer creates an authorised relationship;
--   * class membership can only become active after evidenced parent and teacher approval;
--   * direct browser writes cannot manufacture approval state.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

lock table
  auth.users,
  public.profiles,
  public.trusted_adults,
  public.child_relationships,
  public.class_join_requests,
  public.class_memberships
in access exclusive mode;

alter table public.trusted_adults
  add column if not exists accepted_at timestamptz,
  add column if not exists accepted_by uuid,
  add column if not exists acceptance_method text,
  add column if not exists guardian_verified_at timestamptz,
  add column if not exists guardian_verified_by uuid,
  add column if not exists guardian_verification_method text;

-- Stop the legacy profile trigger before reconciling canonical auth emails;
-- otherwise that maintenance update could create more automatic links.
drop trigger if exists profiles_sync_trusted_adult_links on public.profiles;
drop function if exists public.sync_trusted_adult_links_for_profile();

update public.profiles profile
set
  email = lower(auth_user.email),
  email_verified_at = auth_user.email_confirmed_at,
  updated_at = now()
from auth.users auth_user
where profile.id = auth_user.id
  and auth_user.email is not null
  and (
    profile.email is distinct from lower(auth_user.email)
    or profile.email_verified_at is distinct from auth_user.email_confirmed_at
  );

-- Profile role, account status, authorisation, and canonical email are security
-- fields. Earlier policies allowed a signed-in user to update their own row
-- without preventing a role change to admin or an email change that could match
-- somebody else's trusted-adult invitation.
alter table public.profiles
  add column if not exists admin_verified_at timestamptz,
  add column if not exists admin_verified_by uuid,
  add column if not exists admin_verification_method text;

create table if not exists public.safeguarding_admin_quarantine (
  profile_id uuid primary key,
  email text not null,
  snapshot jsonb not null default '{}'::jsonb,
  reason text not null,
  quarantined_at timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.safeguarding_admin_quarantine enable row level security;
revoke all on table public.safeguarding_admin_quarantine from public, anon, authenticated;

create table if not exists public.safeguarding_state_quarantine (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_id uuid not null,
  reason text not null,
  snapshot jsonb not null,
  quarantined_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (source_table, source_id, reason)
);

alter table public.safeguarding_state_quarantine enable row level security;
revoke all on table public.safeguarding_state_quarantine from public, anon, authenticated;

insert into public.safeguarding_state_quarantine (
  source_table,
  source_id,
  reason,
  snapshot
)
select
  'trusted_adults',
  trusted_adult.id,
  'legacy_connected_without_complete_acceptance',
  to_jsonb(trusted_adult)
from public.trusted_adults trusted_adult
where trusted_adult.status in ('active', 'connected')
  and (
    trusted_adult.adult_id is not null
    and trusted_adult.accepted_at is not null
    and trusted_adult.accepted_by is not null
    and trusted_adult.accepted_by = trusted_adult.adult_id
    and trusted_adult.acceptance_method is not null
    and trusted_adult.acceptance_method = 'account_email'
    and (
      (
        trusted_adult.guardian_verified_at is null
        and trusted_adult.guardian_verified_by is null
        and trusted_adult.guardian_verification_method is null
      )
      or
      (
        trusted_adult.guardian_verified_at is not null
        and trusted_adult.guardian_verified_by is not null
        and trusted_adult.guardian_verification_method is not null
        and trusted_adult.guardian_verification_method in ('manual_admin', 'verified_provider')
      )
    )
  ) is not true
on conflict (source_table, source_id, reason) do nothing;

insert into public.safeguarding_state_quarantine (
  source_table,
  source_id,
  reason,
  snapshot
)
select
  'trusted_adults',
  trusted_adult.id,
  'legacy_pending_with_bound_identity_or_evidence',
  to_jsonb(trusted_adult)
from public.trusted_adults trusted_adult
where trusted_adult.status = 'pending'
  and (
    trusted_adult.adult_id is not null
    or trusted_adult.accepted_at is not null
    or trusted_adult.accepted_by is not null
    or trusted_adult.acceptance_method is not null
    or trusted_adult.guardian_verified_at is not null
    or trusted_adult.guardian_verified_by is not null
    or trusted_adult.guardian_verification_method is not null
  )
on conflict (source_table, source_id, reason) do nothing;

insert into public.safeguarding_state_quarantine (
  source_table,
  source_id,
  reason,
  snapshot
)
select
  'class_join_requests',
  join_request.id,
  'legacy_approval_requires_revalidation',
  to_jsonb(join_request)
from public.class_join_requests join_request
where join_request.parent_approved = true
   or join_request.teacher_approved = true
   or join_request.status = 'approved'
on conflict (source_table, source_id, reason) do nothing;

insert into public.safeguarding_state_quarantine (
  source_table,
  source_id,
  reason,
  snapshot
)
select
  'class_memberships',
  membership.id,
  'legacy_active_membership_requires_revalidation',
  to_jsonb(membership)
from public.class_memberships membership
where membership.status = 'active'
on conflict (source_table, source_id, reason) do nothing;

insert into public.safeguarding_admin_quarantine (
  profile_id,
  email,
  snapshot,
  reason
)
select
  id,
  email,
  jsonb_build_object(
    'role', role::text,
    'is_authorized', is_authorized,
    'status', status,
    'created_at', created_at
  ),
  'legacy_admin_missing_privileged_verification'
from public.profiles
where role::text = 'admin'
  and admin_verified_at is null
on conflict (profile_id) do nothing;

-- Existing admin rows have no trustworthy provenance because signup metadata
-- and self-service profile updates previously accepted privileged values. They
-- must be re-enabled with the service-role bootstrap after this migration.
update public.profiles
set
  role = 'parent',
  is_authorized = false,
  status = 'pending',
  admin_verified_at = null,
  admin_verified_by = null,
  admin_verification_method = null,
  updated_at = now()
where role::text = 'admin'
  and admin_verified_at is null;

alter table public.profiles
  drop constraint if exists profiles_active_admin_verification_check;

alter table public.profiles
  add constraint profiles_active_admin_verification_check
  check ((
      role::text <> 'admin'
      or is_authorized is not true
      or status <> 'active'
      or (
        admin_verified_at is not null
        and admin_verified_by is not null
        and admin_verification_method is not null
        and admin_verification_method = 'service_role_bootstrap'
      )
    ) is true);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role::text = 'admin'
      and is_authorized = true
      and status = 'active'
      and admin_verified_at is not null
      and admin_verified_by is not null
      and admin_verification_method = 'service_role_bootstrap'
  );
$$;

create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_service_role boolean := coalesce(auth.jwt()->>'role', '') = 'service_role';
begin
  if tg_op = 'UPDATE' then
    if auth.uid() = old.id
       and (
         new.id is distinct from old.id
         or new.email is distinct from old.email
         or new.email_verified_at is distinct from old.email_verified_at
         or new.role is distinct from old.role
         or new.is_authorized is distinct from old.is_authorized
         or new.status is distinct from old.status
         or new.admin_verified_at is distinct from old.admin_verified_at
         or new.admin_verified_by is distinct from old.admin_verified_by
         or new.admin_verification_method is distinct from old.admin_verification_method
       ) then
      raise exception using
        errcode = '42501',
        message = 'Profile identity and authorisation fields cannot be changed from a user session.';
    end if;

    if new.role::text = 'admin'
       and new.is_authorized = true
       and new.status = 'active'
       and not v_is_service_role
       and (
         new.role is distinct from old.role
         or new.is_authorized is distinct from old.is_authorized
         or new.status is distinct from old.status
         or new.admin_verified_at is distinct from old.admin_verified_at
         or new.admin_verified_by is distinct from old.admin_verified_by
         or new.admin_verification_method is distinct from old.admin_verification_method
       ) then
      raise exception using
        errcode = '42501',
        message = 'Active administrators can only be bootstrapped with the service role.';
    end if;
  elsif new.role::text = 'admin'
        and new.is_authorized = true
        and new.status = 'active'
        and not v_is_service_role then
    raise exception using
      errcode = '42501',
      message = 'Active administrators can only be bootstrapped with the service role.';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_profile_security_fields() from public, anon, authenticated;

drop trigger if exists profiles_protect_security_fields on public.profiles;
create trigger profiles_protect_security_fields
  before insert or update on public.profiles
  for each row execute function public.protect_profile_security_fields();

-- Auth signup metadata may request an ordinary product role, but it may never
-- create an admin profile. Admins are bootstrapped only with a service-role key.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_role text := lower(trim(coalesce(meta->>'role', 'parent')));
  safe_role public.user_role;
begin
  safe_role := case requested_role
    when 'child' then 'child'::public.user_role
    when 'teacher' then 'teacher'::public.user_role
    else 'parent'::public.user_role
  end;

  insert into public.profiles (
    id,
    email,
    role,
    first_name,
    last_name,
    full_name,
    child_name,
    is_authorized,
    status
  )
  values (
    new.id,
    lower(coalesce(new.email, '')),
    safe_role,
    coalesce(meta->>'first_name', ''),
    coalesce(meta->>'last_name', ''),
    coalesce(meta->>'full_name', ''),
    nullif(meta->>'child_name', ''),
    safe_role <> 'teacher'::public.user_role,
    case
      when safe_role = 'teacher'::public.user_role then 'pending'
      else 'active'
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create index if not exists trusted_adults_pending_adult_idx
  on public.trusted_adults(adult_id, status);

create table if not exists public.safeguarding_link_quarantine (
  id uuid primary key default gen_random_uuid(),
  source_relationship_id uuid unique,
  trusted_adult_id uuid references public.trusted_adults(id) on delete set null,
  adult_id uuid,
  child_id uuid,
  relationship text,
  reason text not null,
  snapshot jsonb not null default '{}'::jsonb,
  quarantined_at timestamptz not null default now(),
  restored_at timestamptz
);

alter table public.safeguarding_link_quarantine enable row level security;
revoke all on table public.safeguarding_link_quarantine from public, anon, authenticated;

comment on table public.safeguarding_link_quarantine is
  'Recoverable audit snapshot of legacy links removed because explicit adult acceptance was not recorded.';

-- Quarantine only relationships that lack complete acceptance evidence. On the
-- first run the new evidence columns are empty, while a safe rerun preserves
-- valid relationships created by the new acceptance RPC.
insert into public.safeguarding_link_quarantine (
  source_relationship_id,
  trusted_adult_id,
  adult_id,
  child_id,
  relationship,
  reason,
  snapshot
)
select
  cr.id,
  matched_adult.id,
  cr.parent_id,
  cr.child_id,
  cr.relationship,
  'legacy_link_missing_explicit_acceptance',
  jsonb_build_object(
    'trusted_adult_status', matched_adult.status,
    'trusted_adult_email', matched_adult.email,
    'relationship_created_at', cr.created_at
  )
from public.child_relationships cr
left join lateral (
  select ta.id, ta.status, ta.email
  from public.trusted_adults ta
  where ta.child_id = cr.child_id
    and ta.adult_id = cr.parent_id
  order by ta.created_at desc
  limit 1
) matched_adult on true
where not exists (
  select 1
  from public.trusted_adults accepted_adult
  where accepted_adult.child_id = cr.child_id
    and accepted_adult.adult_id = cr.parent_id
    and accepted_adult.status in ('active', 'connected')
    and accepted_adult.accepted_at is not null
    and accepted_adult.accepted_by = cr.parent_id
    and accepted_adult.acceptance_method = 'account_email'
    and lower(accepted_adult.role) = lower(cr.relationship)
)
on conflict (source_relationship_id) do nothing;

delete from public.child_relationships relationship
where not exists (
  select 1
  from public.trusted_adults accepted_adult
  where accepted_adult.child_id = relationship.child_id
    and accepted_adult.adult_id = relationship.parent_id
    and accepted_adult.status in ('active', 'connected')
    and accepted_adult.accepted_at is not null
    and accepted_adult.accepted_by = relationship.parent_id
    and accepted_adult.acceptance_method = 'account_email'
    and lower(accepted_adult.role) = lower(relationship.relationship)
);
revoke all on table public.child_relationships from public, anon, authenticated;
grant select on table public.child_relationships to authenticated;

update public.trusted_adults
set
  adult_id = null,
  status = 'pending',
  accepted_at = null,
  accepted_by = null,
  acceptance_method = null,
  guardian_verified_at = null,
  guardian_verified_by = null,
  guardian_verification_method = null,
  updated_at = now()
where status in ('active', 'connected')
  and (
    adult_id is not null
    and accepted_at is not null
    and accepted_by is not null
    and accepted_by = adult_id
    and acceptance_method is not null
    and acceptance_method = 'account_email'
    and (
      (
        guardian_verified_at is null
        and guardian_verified_by is null
        and guardian_verification_method is null
      )
      or
      (
        guardian_verified_at is not null
        and guardian_verified_by is not null
        and guardian_verification_method is not null
        and guardian_verification_method in ('manual_admin', 'verified_provider')
      )
    )
  ) is not true;

update public.trusted_adults
set
  adult_id = null,
  accepted_at = null,
  accepted_by = null,
  acceptance_method = null,
  guardian_verified_at = null,
  guardian_verified_by = null,
  guardian_verification_method = null,
  updated_at = now()
where status = 'pending';

with ranked_duplicates as (
  select
    id,
    row_number() over (
      partition by child_id, lower(email)
      order by created_at, id
    ) as duplicate_rank
  from public.trusted_adults
)
insert into public.safeguarding_state_quarantine (
  source_table,
  source_id,
  reason,
  snapshot
)
select
  'trusted_adults',
  trusted_adult.id,
  'duplicate_child_email_invitation',
  to_jsonb(trusted_adult)
from public.trusted_adults trusted_adult
join ranked_duplicates ranked on ranked.id = trusted_adult.id
where ranked.duplicate_rank > 1
on conflict (source_table, source_id, reason) do nothing;

with ranked_duplicates as (
  select
    id,
    row_number() over (
      partition by child_id, lower(email)
      order by created_at, id
    ) as duplicate_rank
  from public.trusted_adults
)
delete from public.trusted_adults trusted_adult
using ranked_duplicates ranked
where ranked.id = trusted_adult.id
  and ranked.duplicate_rank > 1;

create unique index if not exists trusted_adults_child_email_unique_idx
  on public.trusted_adults(child_id, lower(email));

create unique index if not exists trusted_adults_child_adult_unique_idx
  on public.trusted_adults(child_id, adult_id)
  where adult_id is not null;

alter table public.trusted_adults
  drop constraint if exists trusted_adults_verified_status_check;

alter table public.trusted_adults
  add constraint trusted_adults_verified_status_check
  check ((
    (
      status = 'pending'
      and adult_id is null
      and accepted_at is null
      and accepted_by is null
      and acceptance_method is null
      and guardian_verified_at is null
      and guardian_verified_by is null
      and guardian_verification_method is null
    )
    or
    (
      status in ('active', 'connected')
      and adult_id is not null
      and accepted_at is not null
      and accepted_by is not null
      and accepted_by = adult_id
      and acceptance_method is not null
      and acceptance_method = 'account_email'
      and (
        (
          guardian_verified_at is null
          and guardian_verified_by is null
          and guardian_verification_method is null
        )
        or
        (
          guardian_verified_at is not null
          and guardian_verified_by is not null
          and guardian_verification_method is not null
          and guardian_verification_method in ('manual_admin', 'verified_provider')
        )
      )
    )
  ) is true);

create or replace function public.demote_trusted_adult_on_identity_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.adult_id is null
     or (old.adult_id is not null and new.adult_id is distinct from old.adult_id) then
    new.status := 'pending';
    new.accepted_at := null;
    new.accepted_by := null;
    new.acceptance_method := null;
    new.guardian_verified_at := null;
    new.guardian_verified_by := null;
    new.guardian_verification_method := null;
  end if;

  return new;
end;
$$;

revoke all on function public.demote_trusted_adult_on_identity_change() from public, anon, authenticated;

drop trigger if exists trusted_adults_demote_on_identity_change on public.trusted_adults;
create trigger trusted_adults_demote_on_identity_change
  before update of adult_id on public.trusted_adults
  for each row execute function public.demote_trusted_adult_on_identity_change();

drop policy if exists "Children can manage own trusted adults" on public.trusted_adults;
revoke all on table public.trusted_adults from public, anon, authenticated;
grant select on table public.trusted_adults to authenticated;

create or replace function public.enforce_child_relationship_acceptance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.trusted_adults accepted_adult
    where accepted_adult.child_id = new.child_id
      and accepted_adult.adult_id = new.parent_id
      and accepted_adult.status in ('active', 'connected')
      and accepted_adult.accepted_at is not null
      and accepted_adult.accepted_by = new.parent_id
      and accepted_adult.acceptance_method = 'account_email'
      and lower(accepted_adult.role) = lower(new.relationship)
  ) then
    raise exception using
      errcode = '42501',
      message = 'A child relationship requires matching trusted-adult acceptance evidence.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_child_relationship_acceptance() from public, anon, authenticated;

drop trigger if exists child_relationships_require_acceptance on public.child_relationships;
create trigger child_relationships_require_acceptance
  before insert or update on public.child_relationships
  for each row execute function public.enforce_child_relationship_acceptance();

create or replace function public.remove_relationship_when_acceptance_ends()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.adult_id is not null then
    delete from public.child_relationships relationship
    where relationship.parent_id = old.adult_id
      and relationship.child_id = old.child_id;

    return old;
  end if;

  if old.adult_id is not null
     and (
       new.adult_id is distinct from old.adult_id
       or new.child_id is distinct from old.child_id
       or new.status not in ('active', 'connected')
       or new.accepted_at is null
       or new.accepted_by is distinct from new.adult_id
       or new.acceptance_method is distinct from 'account_email'
     ) then
    delete from public.child_relationships relationship
    where relationship.parent_id = old.adult_id
      and relationship.child_id = old.child_id;
  end if;

  return new;
end;
$$;

revoke all on function public.remove_relationship_when_acceptance_ends() from public, anon, authenticated;

drop trigger if exists trusted_adults_remove_relationship on public.trusted_adults;
create trigger trusted_adults_remove_relationship
  after update or delete on public.trusted_adults
  for each row execute function public.remove_relationship_when_acceptance_ends();

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
  v_existing public.trusted_adults%rowtype;
  v_result public.trusted_adults%rowtype;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_name text := trim(coalesce(p_name, ''));
  v_role text := lower(trim(coalesce(p_role, '')));
  v_phone text := trim(coalesce(p_phone, ''));
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

  if v_role not in ('parent', 'guardian', 'grandparent', 'carer') then
    raise exception 'Choose parent, guardian, grandparent, or carer for this Phase 1 invitation.';
  end if;

  select *
  into v_existing
  from public.trusted_adults
  where child_id = v_child_id
    and lower(email) = v_email
  order by created_at desc
  limit 1
  for update;

  if v_existing.id is not null
     and v_existing.status in ('active', 'connected')
     and v_existing.accepted_at is not null then
    return v_existing;
  end if;

  if v_existing.id is not null then
    if v_existing.adult_id is not null then
      delete from public.child_relationships relationship
      where relationship.child_id = v_child_id
        and relationship.parent_id = v_existing.adult_id;
    end if;

    update public.trusted_adults
    set
      adult_id = null,
      name = v_name,
      role = v_role,
      email = v_email,
      phone = v_phone,
      status = 'pending',
      accepted_at = null,
      accepted_by = null,
      acceptance_method = null,
      guardian_verified_at = null,
      guardian_verified_by = null,
      guardian_verification_method = null,
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
      null,
      v_name,
      v_role,
      v_email,
      v_phone,
      'pending'
    )
    returning * into v_result;
  end if;

  return v_result;
end;
$$;

revoke all on function public.add_trusted_adult_for_child(text, text, text, text) from public, anon;
grant execute on function public.add_trusted_adult_for_child(text, text, text, text) to authenticated;

create or replace function public.accept_trusted_adult_invitation(
  p_invitation_id uuid
)
returns public.trusted_adults
language plpgsql
security definer
set search_path = public
as $$
declare
  v_adult_id uuid := auth.uid();
  v_adult public.profiles%rowtype;
  v_auth_email text;
  v_auth_email_confirmed_at timestamptz;
  v_invitation public.trusted_adults%rowtype;
  v_result public.trusted_adults%rowtype;
begin
  if v_adult_id is null then
    raise exception 'You need to be signed in to accept this invitation.';
  end if;

  select *
  into v_adult
  from public.profiles
  where id = v_adult_id;

  select lower(email), email_confirmed_at
  into v_auth_email, v_auth_email_confirmed_at
  from auth.users
  where id = v_adult_id;

  if v_adult.id is null
     or v_adult.role::text <> 'parent'
     or v_adult.is_authorized is not true
     or v_adult.status <> 'active' then
    raise exception 'Phase 1 only allows active, authorised parent accounts to accept trusted-adult invitations.';
  end if;

  if v_auth_email is null
     or v_auth_email_confirmed_at is null
     or lower(v_adult.email) <> v_auth_email then
    raise exception 'Confirm the account email before accepting a trusted-adult invitation.';
  end if;

  select *
  into v_invitation
  from public.trusted_adults
  where id = p_invitation_id
  for update;

  if v_invitation.id is null then
    raise exception 'Trusted-adult invitation not found.';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'This trusted-adult invitation is no longer pending.';
  end if;

  if v_invitation.adult_id is not null and v_invitation.adult_id <> v_adult_id then
    raise exception 'This trusted-adult invitation belongs to another account.';
  end if;

  if lower(v_invitation.email) <> v_auth_email then
    raise exception 'Sign in with the email address that received this trusted-adult invitation.';
  end if;

  update public.trusted_adults
  set
    adult_id = v_adult_id,
    status = 'connected',
    accepted_at = now(),
    accepted_by = v_adult_id,
    acceptance_method = 'account_email',
    guardian_verified_at = null,
    guardian_verified_by = null,
    guardian_verification_method = null,
    updated_at = now()
  where id = v_invitation.id
  returning * into v_result;

  -- child_relationships remains the canonical parent-dashboard access edge in
  -- older policies. Recreate it only after the invited account has supplied
  -- matching, confirmed-email acceptance evidence.
  insert into public.child_relationships as relationship (
    parent_id,
    child_id,
    relationship
  )
  values (
    v_adult_id,
    v_invitation.child_id,
    lower(v_invitation.role)
  )
  on conflict (parent_id, child_id)
  do update set relationship = excluded.relationship;

  return v_result;
end;
$$;

revoke all on function public.accept_trusted_adult_invitation(uuid) from public, anon;
grant execute on function public.accept_trusted_adult_invitation(uuid) to authenticated;

create or replace function public.revoke_trusted_adult_for_child(
  p_invitation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_child_id uuid := auth.uid();
  v_child_role text;
  v_invitation public.trusted_adults%rowtype;
begin
  if v_child_id is null then
    raise exception 'You need to be signed in to remove a trusted adult.';
  end if;

  select role::text
  into v_child_role
  from public.profiles
  where id = v_child_id;

  if v_child_role is distinct from 'child' then
    raise exception 'Only the child account can remove its trusted adult.';
  end if;

  select *
  into v_invitation
  from public.trusted_adults
  where id = p_invitation_id
    and child_id = v_child_id
  for update;

  if v_invitation.id is null then
    raise exception 'Trusted-adult invitation not found for this child.';
  end if;

  if v_invitation.adult_id is not null then
    update public.class_memberships membership
    set status = 'paused', updated_at = now()
    where membership.child_id = v_child_id
      and membership.status = 'active'
      and exists (
        select 1
        from public.class_join_requests join_request
        where join_request.class_id = membership.class_id
          and join_request.child_id = membership.child_id
          and join_request.parent_approved_by = v_invitation.adult_id
      );

    update public.class_join_requests
    set
      parent_approved = false,
      parent_approved_by = null,
      parent_approved_at = null,
      teacher_approved = false,
      teacher_approved_by = null,
      teacher_approved_at = null,
      approved_at = null,
      status = case
        when status in ('declined', 'cancelled') then status
        else 'pending'
      end,
      updated_at = now()
    where child_id = v_child_id
      and parent_approved_by = v_invitation.adult_id;

    delete from public.child_relationships
    where child_id = v_child_id
      and parent_id = v_invitation.adult_id;
  end if;

  delete from public.trusted_adults
  where child_id = v_child_id
    and (
      id = v_invitation.id
      or (
        v_invitation.adult_id is not null
        and adult_id = v_invitation.adult_id
      )
    );

  return true;
end;
$$;

revoke all on function public.revoke_trusted_adult_for_child(uuid) from public, anon;
grant execute on function public.revoke_trusted_adult_for_child(uuid) to authenticated;

-- The legacy generic Buddy ID RPC authorised parents, teachers, and admins
-- immediately. Keep its signature stable for existing clients but fail closed
-- until it is replaced by an explicit request/acceptance journey.
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
begin
  raise exception using
    errcode = '42501',
    message = 'Direct Buddy ID linking is disabled until the child/trusted-adult approval flow is completed.';
end;
$$;

revoke all on function public.link_child_by_buddy_id(text, text) from public, anon;
grant execute on function public.link_child_by_buddy_id(text, text) to authenticated;

-- Browser clients must use the audited security-definer request/approval RPCs.
drop policy if exists "Class request creators can insert requests" on public.class_join_requests;
drop policy if exists "Class teachers can update join requests" on public.class_join_requests;
drop policy if exists "Linked parents can update class join requests" on public.class_join_requests;
revoke all on table public.class_join_requests from public, anon, authenticated;
grant select on table public.class_join_requests to authenticated;

drop policy if exists "Class teachers can create memberships" on public.class_memberships;
drop policy if exists "Class teachers can update memberships" on public.class_memberships;
revoke all on table public.class_memberships from public, anon, authenticated;
grant select on table public.class_memberships to authenticated;

-- Remove every parent approval that lacks current accepted and privileged
-- guardian-verification evidence. Preserve terminal request states.
update public.class_join_requests
set
  parent_approved = false,
  parent_approved_by = null,
  parent_approved_at = null,
  approved_at = null,
  status = case
    when status in ('declined', 'cancelled') then status
    when teacher_approved then 'pending_parent'
    else 'pending'
  end,
  updated_at = now()
where parent_approved = true
  and not exists (
    select 1
    from public.profiles parent_profile
    join public.trusted_adults guardian
      on guardian.adult_id = parent_profile.id
     and guardian.child_id = class_join_requests.child_id
    where parent_profile.id = class_join_requests.parent_approved_by
      and parent_profile.role::text = 'parent'
      and parent_profile.is_authorized = true
      and parent_profile.status = 'active'
      and guardian.status in ('active', 'connected')
      and lower(guardian.role) in ('parent', 'guardian', 'grandparent', 'carer')
      and guardian.accepted_at is not null
      and guardian.accepted_by = parent_profile.id
      and guardian.guardian_verified_at is not null
      and guardian.guardian_verified_by is not null
      and guardian.guardian_verification_method in ('manual_admin', 'verified_provider')
  );

-- Likewise, retain teacher approval only when it was recorded by the active,
-- authorised owner of the class. Preserve declined/cancelled decisions.
update public.class_join_requests
set
  teacher_approved = false,
  teacher_approved_by = null,
  teacher_approved_at = null,
  approved_at = null,
  status = case
    when status in ('declined', 'cancelled') then status
    when parent_approved then 'pending_teacher'
    else 'pending'
  end,
  updated_at = now()
where teacher_approved = true
  and not exists (
    select 1
    from public.teacher_classes teacher_class
    join public.profiles teacher_profile
      on teacher_profile.id = teacher_class.teacher_id
    where teacher_class.id = class_join_requests.class_id
      and teacher_class.teacher_id = class_join_requests.teacher_approved_by
      and teacher_profile.is_authorized = true
      and teacher_profile.status = 'active'
      and (
        teacher_profile.role::text = 'teacher'
        or (
          teacher_profile.role::text = 'admin'
          and teacher_profile.admin_verified_at is not null
          and teacher_profile.admin_verified_by is not null
          and teacher_profile.admin_verification_method = 'service_role_bootstrap'
        )
      )
  );

update public.class_join_requests
set
  approved_at = null,
  status = case
    when status in ('declined', 'cancelled') then status
    when teacher_approved then 'pending_parent'
    when parent_approved then 'pending_teacher'
    else 'pending'
  end,
  updated_at = now()
where status = 'approved'
  and (
    parent_approved is not true
    or parent_approved_by is null
    or parent_approved_at is null
    or teacher_approved is not true
    or teacher_approved_by is null
    or teacher_approved_at is null
    or approved_at is null
  );

create or replace function public.enforce_class_join_request_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.parent_approved then
    if new.parent_approved_by is null
       or new.parent_approved_at is null
       or not exists (
         select 1
         from public.profiles p
         join public.trusted_adults ta
           on ta.adult_id = p.id
          and ta.child_id = new.child_id
         where p.id = new.parent_approved_by
           and p.role::text = 'parent'
           and p.is_authorized = true
           and p.status = 'active'
           and ta.status in ('active', 'connected')
           and lower(ta.role) in ('parent', 'guardian', 'grandparent', 'carer')
           and ta.accepted_at is not null
           and ta.accepted_by = p.id
           and ta.guardian_verified_at is not null
           and ta.guardian_verified_by is not null
           and ta.guardian_verification_method in ('manual_admin', 'verified_provider')
       ) then
      raise exception 'A linked parent account must explicitly approve this class request.';
    end if;
  end if;

  if new.teacher_approved then
    if new.teacher_approved_by is null
       or new.teacher_approved_at is null
       or not exists (
         select 1
         from public.teacher_classes tc
         join public.profiles teacher_profile
           on teacher_profile.id = tc.teacher_id
         where tc.id = new.class_id
           and tc.teacher_id = new.teacher_approved_by
           and teacher_profile.is_authorized = true
           and teacher_profile.status = 'active'
           and (
             teacher_profile.role::text = 'teacher'
             or (
               teacher_profile.role::text = 'admin'
               and teacher_profile.admin_verified_at is not null
               and teacher_profile.admin_verified_by is not null
               and teacher_profile.admin_verification_method = 'service_role_bootstrap'
             )
           )
       ) then
      raise exception 'The class teacher must explicitly approve this class request.';
    end if;
  end if;

  if new.parent_approved
     and new.teacher_approved
     and new.parent_approved_by = new.teacher_approved_by then
    raise exception 'Parent and teacher approval must come from different accounts.';
  end if;

  if new.status = 'approved'
     and (
       new.parent_approved is not true
       or new.parent_approved_at is null
       or new.teacher_approved is not true
       or new.teacher_approved_at is null
       or new.approved_at is null
     ) then
    raise exception 'Class membership requires complete parent and teacher approval evidence.';
  end if;

  return new;
end;
$$;

drop trigger if exists class_join_requests_enforce_approval on public.class_join_requests;
create trigger class_join_requests_enforce_approval
  before insert or update on public.class_join_requests
  for each row execute function public.enforce_class_join_request_approval();

create or replace function public.enforce_class_membership_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and (
       new.class_id is distinct from old.class_id
       or new.child_id is distinct from old.child_id
       or new.teacher_id is distinct from old.teacher_id
     ) then
    raise exception 'Active membership identity fields cannot be changed.';
  end if;

  if new.status = 'active' and not exists (
    select 1
    from public.class_join_requests cjr
    join public.profiles parent_profile
      on parent_profile.id = cjr.parent_approved_by
     and parent_profile.role::text = 'parent'
     and parent_profile.is_authorized = true
     and parent_profile.status = 'active'
    join public.profiles teacher_profile
      on teacher_profile.id = cjr.teacher_approved_by
     and teacher_profile.is_authorized = true
     and teacher_profile.status = 'active'
     and (
       teacher_profile.role::text = 'teacher'
       or (
         teacher_profile.role::text = 'admin'
         and teacher_profile.admin_verified_at is not null
         and teacher_profile.admin_verified_by is not null
         and teacher_profile.admin_verification_method = 'service_role_bootstrap'
       )
     )
    join public.trusted_adults guardian
      on guardian.child_id = cjr.child_id
     and guardian.adult_id = cjr.parent_approved_by
     and guardian.status in ('active', 'connected')
     and lower(guardian.role) in ('parent', 'guardian', 'grandparent', 'carer')
     and guardian.accepted_at is not null
     and guardian.accepted_by = cjr.parent_approved_by
     and guardian.guardian_verified_at is not null
     and guardian.guardian_verified_by is not null
     and guardian.guardian_verification_method in ('manual_admin', 'verified_provider')
    where cjr.class_id = new.class_id
      and cjr.child_id = new.child_id
      and cjr.status = 'approved'
      and cjr.parent_approved = true
      and cjr.parent_approved_at is not null
      and cjr.teacher_approved = true
      and cjr.teacher_approved_by = new.teacher_id
      and cjr.parent_approved_by <> cjr.teacher_approved_by
      and cjr.teacher_approved_at is not null
      and cjr.approved_at is not null
      and cjr.visibility_settings = new.visibility_settings
  ) then
    raise exception 'Active class membership requires recorded parent and teacher approval.';
  end if;

  return new;
end;
$$;

drop trigger if exists class_memberships_enforce_approval on public.class_memberships;
create trigger class_memberships_enforce_approval
  before insert or update on public.class_memberships
  for each row execute function public.enforce_class_membership_approval();

-- Pause legacy active memberships that do not have complete approval evidence.
-- Pausing is recoverable and avoids granting teacher access from incomplete rows.
update public.class_memberships cm
set status = 'paused', updated_at = now()
where cm.status = 'active'
  and not exists (
    select 1
    from public.class_join_requests cjr
    join public.profiles parent_profile
      on parent_profile.id = cjr.parent_approved_by
     and parent_profile.role::text = 'parent'
     and parent_profile.is_authorized = true
     and parent_profile.status = 'active'
    join public.profiles teacher_profile
      on teacher_profile.id = cjr.teacher_approved_by
     and teacher_profile.is_authorized = true
     and teacher_profile.status = 'active'
     and (
       teacher_profile.role::text = 'teacher'
       or (
         teacher_profile.role::text = 'admin'
         and teacher_profile.admin_verified_at is not null
         and teacher_profile.admin_verified_by is not null
         and teacher_profile.admin_verification_method = 'service_role_bootstrap'
       )
     )
    join public.trusted_adults guardian
      on guardian.child_id = cjr.child_id
     and guardian.adult_id = cjr.parent_approved_by
     and guardian.status in ('active', 'connected')
     and lower(guardian.role) in ('parent', 'guardian', 'grandparent', 'carer')
     and guardian.accepted_at is not null
     and guardian.accepted_by = cjr.parent_approved_by
     and guardian.guardian_verified_at is not null
     and guardian.guardian_verified_by is not null
     and guardian.guardian_verification_method in ('manual_admin', 'verified_provider')
    where cjr.class_id = cm.class_id
      and cjr.child_id = cm.child_id
      and cjr.status = 'approved'
      and cjr.parent_approved = true
      and cjr.parent_approved_at is not null
      and cjr.teacher_approved = true
      and cjr.teacher_approved_by = cm.teacher_id
      and cjr.parent_approved_by <> cjr.teacher_approved_by
      and cjr.teacher_approved_at is not null
      and cjr.approved_at is not null
      and cjr.visibility_settings = cm.visibility_settings
  );

commit;
