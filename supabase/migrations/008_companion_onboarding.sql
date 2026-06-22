-- Companion onboarding flag on profiles (autism-first AI companion flow)
-- Requires: 001_create_profiles.sql, 002_profile_neuro_onboarding.sql
-- If you skipped 003_create_autism_profiles.sql, trusted_adults is created here
-- so mood_check_ins RLS policies can reference it.

alter table public.profiles
  add column if not exists companion_onboarding_completed boolean not null default false;

create index if not exists profiles_companion_onboarding_idx
  on public.profiles (companion_onboarding_completed)
  where role = 'child';

-- Dependency from 003 (safe if 003 was already applied)
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

alter table public.trusted_adults enable row level security;

drop policy if exists "Children can view own trusted adults" on public.trusted_adults;
create policy "Children can view own trusted adults"
  on public.trusted_adults for select
  using (auth.uid() = child_id);

drop policy if exists "Children can manage own trusted adults" on public.trusted_adults;
create policy "Children can manage own trusted adults"
  on public.trusted_adults for all
  using (auth.uid() = child_id)
  with check (auth.uid() = child_id);

-- Companion profile storage (from 003 — safe if already exists)
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

alter table public.autism_profiles enable row level security;

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

-- Mood check-ins for emotional timeline + AI pattern learning
create table if not exists public.mood_check_ins (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles(id) on delete cascade,
  mood text not null,
  note text,
  ai_response text,
  created_at timestamptz not null default now()
);

create index if not exists mood_check_ins_child_id_idx on public.mood_check_ins(child_id);
create index if not exists mood_check_ins_created_at_idx on public.mood_check_ins(created_at desc);

alter table public.mood_check_ins enable row level security;

drop policy if exists "Children manage own mood check-ins" on public.mood_check_ins;
create policy "Children manage own mood check-ins"
  on public.mood_check_ins for all
  using (auth.uid() = child_id)
  with check (auth.uid() = child_id);

drop policy if exists "Trusted adults view child mood check-ins" on public.mood_check_ins;
create policy "Trusted adults view child mood check-ins"
  on public.mood_check_ins for select
  using (
    exists (
      select 1 from public.trusted_adults ta
      where ta.child_id = mood_check_ins.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  );
