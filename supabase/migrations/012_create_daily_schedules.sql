-- Daily visual schedules for the Autism Now / Next / Later board.
-- Uses public.profiles for child accounts, matching the current AdaptBuddy schema.

create extension if not exists pgcrypto;

create table if not exists public.daily_schedules (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  activities jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(child_id, date)
);

create index if not exists daily_schedules_child_date_idx
  on public.daily_schedules(child_id, date desc);

alter table public.daily_schedules enable row level security;

drop policy if exists "Children can view own daily schedules" on public.daily_schedules;
create policy "Children can view own daily schedules"
  on public.daily_schedules for select
  using (child_id = auth.uid());

drop policy if exists "Children can insert own daily schedules" on public.daily_schedules;
create policy "Children can insert own daily schedules"
  on public.daily_schedules for insert
  with check (child_id = auth.uid());

drop policy if exists "Children can update own daily schedules" on public.daily_schedules;
create policy "Children can update own daily schedules"
  on public.daily_schedules for update
  using (child_id = auth.uid())
  with check (child_id = auth.uid());

drop policy if exists "Linked adults can view child daily schedules" on public.daily_schedules;
create policy "Linked adults can view child daily schedules"
  on public.daily_schedules for select
  using (
    exists (
      select 1
      from public.child_relationships cr
      where cr.child_id = daily_schedules.child_id
        and cr.parent_id = auth.uid()
    )
    or exists (
      select 1
      from public.trusted_adults ta
      where ta.child_id = daily_schedules.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  );

drop policy if exists "Linked adults can insert child daily schedules" on public.daily_schedules;
create policy "Linked adults can insert child daily schedules"
  on public.daily_schedules for insert
  with check (
    exists (
      select 1
      from public.child_relationships cr
      where cr.child_id = daily_schedules.child_id
        and cr.parent_id = auth.uid()
    )
    or exists (
      select 1
      from public.trusted_adults ta
      where ta.child_id = daily_schedules.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  );

drop policy if exists "Linked adults can update child daily schedules" on public.daily_schedules;
create policy "Linked adults can update child daily schedules"
  on public.daily_schedules for update
  using (
    exists (
      select 1
      from public.child_relationships cr
      where cr.child_id = daily_schedules.child_id
        and cr.parent_id = auth.uid()
    )
    or exists (
      select 1
      from public.trusted_adults ta
      where ta.child_id = daily_schedules.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  )
  with check (
    exists (
      select 1
      from public.child_relationships cr
      where cr.child_id = daily_schedules.child_id
        and cr.parent_id = auth.uid()
    )
    or exists (
      select 1
      from public.trusted_adults ta
      where ta.child_id = daily_schedules.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  );

create or replace function public.set_daily_schedules_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_schedules_updated_at on public.daily_schedules;
create trigger daily_schedules_updated_at
  before update on public.daily_schedules
  for each row execute function public.set_daily_schedules_updated_at();
