-- Weekly Buddy Digest pipeline.
-- Stores delivery preferences and immutable generated digest/evidence snapshots.
-- Email delivery can later be handled by a Supabase Edge Function or server cron
-- that selects weekly_digest_snapshots where status = 'email_ready'.

create table if not exists public.weekly_digest_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null default 'child',
  child_id uuid references public.profiles(id) on delete cascade,
  class_id uuid references public.teacher_classes(id) on delete cascade,
  frequency text not null default 'weekly',
  delivery_method text not null default 'in_app',
  enabled boolean not null default true,
  email_to text,
  timezone text not null default 'Europe/London',
  day_of_week integer not null default 0,
  preferred_hour integer not null default 9,
  last_generated_at timestamptz,
  next_run_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_digest_subscription_scope_check
    check (scope in ('child', 'class', 'platform')),
  constraint weekly_digest_subscription_frequency_check
    check (frequency in ('weekly', 'fortnightly', 'monthly')),
  constraint weekly_digest_subscription_delivery_check
    check (delivery_method in ('in_app', 'email', 'both')),
  constraint weekly_digest_subscription_day_check
    check (day_of_week between 0 and 6),
  constraint weekly_digest_subscription_hour_check
    check (preferred_hour between 0 and 23)
);

create unique index if not exists weekly_digest_subscriptions_target_idx
  on public.weekly_digest_subscriptions (
    user_id,
    scope,
    coalesce(child_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(class_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists weekly_digest_subscriptions_next_run_idx
  on public.weekly_digest_subscriptions(enabled, next_run_at)
  where enabled = true;

create table if not exists public.weekly_digest_snapshots (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid references public.weekly_digest_subscriptions(id) on delete set null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null default 'child',
  child_id uuid references public.profiles(id) on delete set null,
  class_id uuid references public.teacher_classes(id) on delete set null,
  title text not null,
  subject_name text not null,
  window_label text not null,
  priority text not null default 'steady',
  status text not null default 'generated',
  digest jsonb not null default '{}'::jsonb,
  evidence_pack jsonb not null default '{}'::jsonb,
  email_to text,
  email_subject text,
  email_error text,
  generated_at timestamptz not null default now(),
  scheduled_for timestamptz,
  email_ready_at timestamptz,
  emailed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_digest_snapshot_scope_check
    check (scope in ('child', 'class', 'platform')),
  constraint weekly_digest_snapshot_priority_check
    check (priority in ('steady', 'watch', 'urgent')),
  constraint weekly_digest_snapshot_status_check
    check (status in ('draft', 'generated', 'email_ready', 'sent', 'failed', 'archived'))
);

create index if not exists weekly_digest_snapshots_user_created_idx
  on public.weekly_digest_snapshots(user_id, created_at desc);

create index if not exists weekly_digest_snapshots_status_idx
  on public.weekly_digest_snapshots(status, created_at desc);

create or replace function public.set_weekly_digest_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_weekly_digest_subscriptions_updated_at on public.weekly_digest_subscriptions;
create trigger set_weekly_digest_subscriptions_updated_at
  before update on public.weekly_digest_subscriptions
  for each row execute function public.set_weekly_digest_updated_at();

drop trigger if exists set_weekly_digest_snapshots_updated_at on public.weekly_digest_snapshots;
create trigger set_weekly_digest_snapshots_updated_at
  before update on public.weekly_digest_snapshots
  for each row execute function public.set_weekly_digest_updated_at();

alter table public.weekly_digest_subscriptions enable row level security;
alter table public.weekly_digest_snapshots enable row level security;

drop policy if exists "Users can manage own weekly digest subscriptions" on public.weekly_digest_subscriptions;
create policy "Users can manage own weekly digest subscriptions"
  on public.weekly_digest_subscriptions for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can create own weekly digest snapshots" on public.weekly_digest_snapshots;
create policy "Users can create own weekly digest snapshots"
  on public.weekly_digest_snapshots for insert
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can view own weekly digest snapshots" on public.weekly_digest_snapshots;
create policy "Users can view own weekly digest snapshots"
  on public.weekly_digest_snapshots for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Users can update own weekly digest snapshots" on public.weekly_digest_snapshots;
create policy "Users can update own weekly digest snapshots"
  on public.weekly_digest_snapshots for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
