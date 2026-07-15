-- Persistent in-app notification receipts and acknowledgement trail.
-- Existing alerts/messages/meetings/requests remain the source of truth; these
-- rows store each signed-in user's response state for the notification centre.

create table if not exists public.support_notification_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  status text not null default 'unread',
  note text,
  seen_at timestamptz,
  responded_at timestamptz,
  escalated_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_notification_status_check
    check (status in ('unread', 'seen', 'responded', 'escalated', 'resolved')),
  constraint support_notification_source_check
    check (source_type in (
      'alert',
      'journal_signal',
      'teacher_message',
      'care_meeting',
      'class_request',
      'assignment_help'
    )),
  unique(user_id, source_type, source_id)
);

create index if not exists support_notification_receipts_user_status_idx
  on public.support_notification_receipts(user_id, status, updated_at desc);

create table if not exists public.support_notification_events (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid references public.support_notification_receipts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_type text not null,
  source_id uuid not null,
  status text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint support_notification_events_status_check
    check (status in ('unread', 'seen', 'responded', 'escalated', 'resolved')),
  constraint support_notification_events_source_check
    check (source_type in (
      'alert',
      'journal_signal',
      'teacher_message',
      'care_meeting',
      'class_request',
      'assignment_help'
    ))
);

create index if not exists support_notification_events_user_created_idx
  on public.support_notification_events(user_id, created_at desc);

create or replace function public.set_support_notification_receipt_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists support_notification_receipts_updated_at on public.support_notification_receipts;
create trigger support_notification_receipts_updated_at
  before update on public.support_notification_receipts
  for each row execute function public.set_support_notification_receipt_updated_at();

alter table public.support_notification_receipts enable row level security;
alter table public.support_notification_events enable row level security;

drop policy if exists "Users can manage own notification receipts" on public.support_notification_receipts;
create policy "Users can manage own notification receipts"
  on public.support_notification_receipts for all
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

drop policy if exists "Users can create own notification events" on public.support_notification_events;
create policy "Users can create own notification events"
  on public.support_notification_events for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can view own notification events" on public.support_notification_events;
create policy "Users can view own notification events"
  on public.support_notification_events for select
  using (user_id = auth.uid() or public.is_admin());
