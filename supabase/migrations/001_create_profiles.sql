-- Adaptbuddy user profiles (run in Supabase SQL Editor or via CLI)
-- Stores role-specific signup details linked to auth.users

create type public.user_role as enum ('child', 'parent', 'teacher');

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  role public.user_role not null,
  first_name text not null default '',
  last_name text not null default '',
  full_name text not null default '',
  child_name text,
  avatar_url text,
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_email_idx on public.profiles (email);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();

-- Seed profile row when auth user is created (metadata from signUp options.data)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  role_text text := coalesce(meta->>'role', 'parent');
begin
  insert into public.profiles (
    id,
    email,
    role,
    first_name,
    last_name,
    full_name,
    child_name
  )
  values (
    new.id,
    coalesce(new.email, ''),
    role_text::public.user_role,
    coalesce(meta->>'first_name', ''),
    coalesce(meta->>'last_name', ''),
    coalesce(meta->>'full_name', ''),
    nullif(meta->>'child_name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
