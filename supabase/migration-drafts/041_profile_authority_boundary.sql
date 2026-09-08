-- DRAFT ONLY: independently testable containment candidate, not a production migration.
-- Rehearse with Supabase Auth before release. Existing administrators need service-role
-- verification before this change; this does not certify their existing provenance.
-- No profile/relationship rows are deleted or demoted. Unverified admin access stops.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';
lock table auth.users, public.profiles in access exclusive mode;

alter table public.profiles
  add column if not exists admin_verified_at timestamptz,
  add column if not exists admin_verified_by uuid,
  add column if not exists admin_verification_method text;

-- A canonical-email refresh must never run the historical auto-link trigger.
drop trigger if exists profiles_sync_trusted_adult_links on public.profiles;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid()
      and role::text = 'admin' and is_authorized is true and status = 'active'
      and admin_verified_at is not null and admin_verified_by is not null
      and admin_verification_method = 'service_role_bootstrap'
  );
$$;

-- Invoker security is deliberate: a direct authenticated insert is not an Auth
-- trigger insertion, even when the trigger owner has elevated database privileges.
create or replace function public.protect_profile_security_fields()
returns trigger language plpgsql security invoker set search_path = public
as $$
declare
  v_is_service_role boolean := coalesce(auth.jwt()->>'role', '') = 'service_role'
    or (auth.uid() is null and current_user not in ('anon', 'authenticated')
      and coalesce(auth.jwt()->>'role', '') not in ('anon', 'authenticated'));
begin
  if v_is_service_role then return new; end if;
  if tg_op = 'INSERT' then
    raise exception using errcode = '42501', message = 'Profiles are created by the authentication service.';
  end if;
  if new.id is distinct from old.id
     or new.email is distinct from old.email
     or new.email_verified_at is distinct from old.email_verified_at
     or new.role is distinct from old.role
     or new.admin_verified_at is distinct from old.admin_verified_at
     or new.admin_verified_by is distinct from old.admin_verified_by
     or new.admin_verification_method is distinct from old.admin_verification_method then
    raise exception using errcode = '42501', message = 'Profile identity and authorisation fields are server-owned.';
  end if;
  if (new.is_authorized is distinct from old.is_authorized or new.status is distinct from old.status)
     and not (public.is_admin() and auth.uid() <> old.id) then
    raise exception using errcode = '42501', message = 'Account approval requires an authorised administrator.';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_profile_security_fields() from public, anon, authenticated;
drop trigger if exists profiles_protect_security_fields on public.profiles;
create trigger profiles_protect_security_fields before insert or update on public.profiles
for each row execute function public.protect_profile_security_fields();
revoke insert on public.profiles from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_role text := lower(trim(coalesce(meta->>'role', 'parent')));
  safe_role public.user_role;
begin
  safe_role := case requested_role
    when 'child' then 'child'::public.user_role
    when 'teacher' then 'teacher'::public.user_role
    else 'parent'::public.user_role end;
  insert into public.profiles (id, email, email_verified_at, role, first_name, last_name,
    full_name, child_name, is_authorized, status)
  values (new.id, lower(coalesce(new.email, '')), new.email_confirmed_at, safe_role,
    coalesce(meta->>'first_name', ''), coalesce(meta->>'last_name', ''),
    coalesce(meta->>'full_name', ''), nullif(meta->>'child_name', ''),
    safe_role <> 'teacher'::public.user_role,
    case when safe_role = 'teacher'::public.user_role then 'pending' else 'active' end)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.sync_profile_auth_identity()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  update public.profiles set email = lower(coalesce(new.email, '')),
    email_verified_at = new.email_confirmed_at, updated_at = now()
  where id = new.id;
  return new;
end;
$$;
revoke all on function public.sync_profile_auth_identity() from public, anon, authenticated;
drop trigger if exists auth_users_sync_profile_identity on auth.users;
create trigger auth_users_sync_profile_identity after update of email, email_confirmed_at on auth.users
for each row execute function public.sync_profile_auth_identity();

update public.profiles p set email = lower(coalesce(u.email, '')),
  email_verified_at = u.email_confirmed_at, updated_at = now()
from auth.users u where p.id = u.id
  and (p.email is distinct from lower(coalesce(u.email, ''))
    or p.email_verified_at is distinct from u.email_confirmed_at);
commit;
