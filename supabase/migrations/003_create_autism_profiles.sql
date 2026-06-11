-- Autism-specific profile data and trusted-adult links
-- This migration aligns with the existing public.profiles table.

create table if not exists public.trusted_adults (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles(id) on delete cascade,
  adult_id uuid references auth.users(id) on delete set null,
  name text not null,
  role text not null,
  email text not null,
  phone text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trusted_adults_status_check check (status in ('active', 'connected', 'pending'))
);

create index if not exists trusted_adults_child_id_idx on public.trusted_adults(child_id);
create index if not exists trusted_adults_adult_id_idx on public.trusted_adults(adult_id);

create table if not exists public.autism_profiles (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles(id) on delete cascade,
  profile_data jsonb not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(child_id)
);

create index if not exists autism_profiles_child_id_idx on public.autism_profiles(child_id);

alter table public.trusted_adults enable row level security;
alter table public.autism_profiles enable row level security;

drop policy if exists "Children can view own trusted adults" on public.trusted_adults;
create policy "Children can view own trusted adults"
  on public.trusted_adults for select
  using (auth.uid() = child_id);

drop policy if exists "Children can manage own trusted adults" on public.trusted_adults;
create policy "Children can manage own trusted adults"
  on public.trusted_adults for all
  using (auth.uid() = child_id)
  with check (auth.uid() = child_id);

drop policy if exists "Trusted adults can view linked child adults" on public.trusted_adults;
create policy "Trusted adults can view linked child adults"
  on public.trusted_adults for select
  using (adult_id = auth.uid());

drop policy if exists "Children can view own autism profile" on public.autism_profiles;
create policy "Children can view own autism profile"
  on public.autism_profiles for select
  using (auth.uid() = child_id);

drop policy if exists "Children can insert own autism profile" on public.autism_profiles;
create policy "Children can insert own autism profile"
  on public.autism_profiles for insert
  with check (auth.uid() = child_id);

drop policy if exists "Children can update own autism profile" on public.autism_profiles;
create policy "Children can update own autism profile"
  on public.autism_profiles for update
  using (auth.uid() = child_id)
  with check (auth.uid() = child_id);

drop policy if exists "Trusted adults can view child autism profile" on public.autism_profiles;
create policy "Trusted adults can view child autism profile"
  on public.autism_profiles for select
  using (
    exists (
      select 1
      from public.trusted_adults ta
      where ta.child_id = autism_profiles.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  );

drop policy if exists "Trusted adults can update child autism profile" on public.autism_profiles;
create policy "Trusted adults can update child autism profile"
  on public.autism_profiles for update
  using (
    exists (
      select 1
      from public.trusted_adults ta
      where ta.child_id = autism_profiles.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  )
  with check (
    exists (
      select 1
      from public.trusted_adults ta
      where ta.child_id = autism_profiles.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  );

create or replace function public.set_autism_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists autism_profiles_updated_at on public.autism_profiles;
create trigger autism_profiles_updated_at
  before update on public.autism_profiles
  for each row execute function public.set_autism_profiles_updated_at();

create or replace function public.set_trusted_adults_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trusted_adults_updated_at on public.trusted_adults;
create trigger trusted_adults_updated_at
  before update on public.trusted_adults
  for each row execute function public.set_trusted_adults_updated_at();
