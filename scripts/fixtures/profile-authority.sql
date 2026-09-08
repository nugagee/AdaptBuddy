-- Synthetic fixture reflecting the audited authority boundary, not a production dump.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb->>'sub', '')::uuid
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
grant usage on schema auth, public to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
create type public.user_role as enum ('child', 'parent', 'teacher', 'admin');
create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz, raw_user_meta_data jsonb);
create table auth.sessions (id uuid primary key, user_id uuid references auth.users(id), not_after timestamptz);
-- Each synthetic Auth fixture account gets a session; its ID is reused only in
-- this fixture to make claim setup deterministic. Real Auth tests use real IDs.
create function auth.fixture_session() returns trigger language plpgsql security definer as $$
begin insert into auth.sessions(id,user_id) values(new.id,new.id); return new; end;
$$;
create trigger fixture_session after insert on auth.users for each row execute function auth.fixture_session();
create table public.profiles (
  id uuid primary key references auth.users(id), email text not null,
  role public.user_role not null default 'parent', first_name text default '', last_name text default '',
  full_name text default '', child_name text, email_verified_at timestamptz,
  is_authorized boolean default true, status text default 'active', updated_at timestamptz default now()
);
create function public.handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles(id,email,role) values(new.id,new.email,(new.raw_user_meta_data->>'role')::public.user_role);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create function public.is_admin() returns boolean language sql security definer as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin')
$$;
alter table public.profiles enable row level security;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
create policy own_profile_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy own_profile_update on public.profiles for update to authenticated using(id=auth.uid() or public.is_admin());
create policy own_profile_insert on public.profiles for insert to authenticated with check(id=auth.uid());
