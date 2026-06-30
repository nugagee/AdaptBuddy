-- Parent dashboard AI + care coordination layer
-- Adds messaging, meetings, goals, resources, parent-child signals, and feedback.

create table if not exists public.parent_teacher_messages (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete set null,
  body text not null,
  urgency text not null default 'normal',
  ai_summary text,
  ai_talking_points text[] not null default '{}',
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint parent_teacher_messages_urgency_check
    check (urgency in ('normal', 'support', 'urgent'))
);

create index if not exists parent_teacher_messages_child_created_idx
  on public.parent_teacher_messages(child_id, created_at desc);

create table if not exists public.care_meetings (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  meeting_type text not null default 'parent_teacher',
  status text not null default 'requested',
  urgency text not null default 'routine',
  proposed_times jsonb not null default '[]'::jsonb,
  scheduled_at timestamptz,
  agenda jsonb not null default '[]'::jsonb,
  notes text,
  action_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint care_meetings_status_check
    check (status in ('requested', 'scheduled', 'completed', 'cancelled')),
  constraint care_meetings_urgency_check
    check (urgency in ('routine', 'soon', 'urgent'))
);

create index if not exists care_meetings_child_created_idx
  on public.care_meetings(child_id, created_at desc);

create table if not exists public.support_goals (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text not null default 'wellbeing',
  description text,
  progress integer not null default 0,
  status text not null default 'active',
  target_date date,
  ai_suggestion jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_goals_progress_check check (progress between 0 and 100),
  constraint support_goals_status_check check (status in ('active', 'paused', 'completed'))
);

create index if not exists support_goals_child_status_idx
  on public.support_goals(child_id, status);

create table if not exists public.parent_resource_recommendations (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  resource_type text not null default 'article',
  url text,
  summary text not null,
  neurotypes text[] not null default '{}',
  reason text,
  reading_level text not null default 'parent',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint parent_resource_recommendations_type_check
    check (resource_type in ('article', 'video', 'worksheet', 'strategy', 'printable')),
  constraint parent_resource_recommendations_level_check
    check (reading_level in ('child', 'parent', 'teacher', 'clinician'))
);

create index if not exists parent_resource_recommendations_child_idx
  on public.parent_resource_recommendations(child_id, created_at desc);

create table if not exists public.parent_child_signals (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.profiles(id) on delete cascade,
  emotion text not null,
  color text not null default 'blue',
  note text,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);

create index if not exists parent_child_signals_child_created_idx
  on public.parent_child_signals(child_id, created_at desc);

create table if not exists public.parent_feedback (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  child_id uuid references public.profiles(id) on delete set null,
  feedback_text text not null,
  sentiment text not null default 'neutral',
  themes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint parent_feedback_sentiment_check
    check (sentiment in ('positive', 'neutral', 'concerned'))
);

create index if not exists parent_feedback_parent_created_idx
  on public.parent_feedback(parent_id, created_at desc);

alter table public.parent_teacher_messages enable row level security;
alter table public.care_meetings enable row level security;
alter table public.support_goals enable row level security;
alter table public.parent_resource_recommendations enable row level security;
alter table public.parent_child_signals enable row level security;
alter table public.parent_feedback enable row level security;

create or replace function public.set_parent_coordination_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists care_meetings_updated_at on public.care_meetings;
create trigger care_meetings_updated_at
  before update on public.care_meetings
  for each row execute function public.set_parent_coordination_updated_at();

drop trigger if exists support_goals_updated_at on public.support_goals;
create trigger support_goals_updated_at
  before update on public.support_goals
  for each row execute function public.set_parent_coordination_updated_at();

drop policy if exists "Linked adults can view parent teacher messages" on public.parent_teacher_messages;
create policy "Linked adults can view parent teacher messages"
  on public.parent_teacher_messages for select
  using (
    sender_id = auth.uid()
    or recipient_id = auth.uid()
    or exists (
      select 1 from public.child_relationships cr
      where cr.child_id = parent_teacher_messages.child_id
        and cr.parent_id = auth.uid()
    )
    or exists (
      select 1 from public.trusted_adults ta
      where ta.child_id = parent_teacher_messages.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  );

drop policy if exists "Linked adults can create parent teacher messages" on public.parent_teacher_messages;
create policy "Linked adults can create parent teacher messages"
  on public.parent_teacher_messages for insert
  with check (
    sender_id = auth.uid()
    and (
      exists (
        select 1 from public.child_relationships cr
        where cr.child_id = parent_teacher_messages.child_id
          and cr.parent_id = auth.uid()
      )
      or exists (
        select 1 from public.trusted_adults ta
        where ta.child_id = parent_teacher_messages.child_id
          and ta.adult_id = auth.uid()
          and ta.status in ('active', 'connected')
      )
    )
  );

drop policy if exists "Linked adults can update message read status" on public.parent_teacher_messages;
create policy "Linked adults can update message read status"
  on public.parent_teacher_messages for update
  using (sender_id = auth.uid() or recipient_id = auth.uid())
  with check (sender_id = auth.uid() or recipient_id = auth.uid());

drop policy if exists "Linked adults can manage care meetings" on public.care_meetings;
create policy "Linked adults can manage care meetings"
  on public.care_meetings for all
  using (
    requested_by = auth.uid()
    or assigned_to = auth.uid()
    or exists (
      select 1 from public.child_relationships cr
      where cr.child_id = care_meetings.child_id
        and cr.parent_id = auth.uid()
    )
    or exists (
      select 1 from public.trusted_adults ta
      where ta.child_id = care_meetings.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  )
  with check (
    requested_by = auth.uid()
    and (
      exists (
        select 1 from public.child_relationships cr
        where cr.child_id = care_meetings.child_id
          and cr.parent_id = auth.uid()
      )
      or exists (
        select 1 from public.trusted_adults ta
        where ta.child_id = care_meetings.child_id
          and ta.adult_id = auth.uid()
          and ta.status in ('active', 'connected')
      )
    )
  );

drop policy if exists "Linked adults can manage support goals" on public.support_goals;
create policy "Linked adults can manage support goals"
  on public.support_goals for all
  using (
    exists (
      select 1 from public.child_relationships cr
      where cr.child_id = support_goals.child_id
        and cr.parent_id = auth.uid()
    )
    or exists (
      select 1 from public.trusted_adults ta
      where ta.child_id = support_goals.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  )
  with check (created_by = auth.uid());

drop policy if exists "Linked adults can view resource recommendations" on public.parent_resource_recommendations;
create policy "Linked adults can view resource recommendations"
  on public.parent_resource_recommendations for select
  using (
    exists (
      select 1 from public.child_relationships cr
      where cr.child_id = parent_resource_recommendations.child_id
        and cr.parent_id = auth.uid()
    )
    or exists (
      select 1 from public.trusted_adults ta
      where ta.child_id = parent_resource_recommendations.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  );

drop policy if exists "Linked adults can create resource recommendations" on public.parent_resource_recommendations;
create policy "Linked adults can create resource recommendations"
  on public.parent_resource_recommendations for insert
  with check (
    created_by = auth.uid()
    and (
      exists (
        select 1 from public.child_relationships cr
        where cr.child_id = parent_resource_recommendations.child_id
          and cr.parent_id = auth.uid()
      )
      or exists (
        select 1 from public.trusted_adults ta
        where ta.child_id = parent_resource_recommendations.child_id
          and ta.adult_id = auth.uid()
          and ta.status in ('active', 'connected')
      )
    )
  );

drop policy if exists "Children can create parent signals" on public.parent_child_signals;
create policy "Children can create parent signals"
  on public.parent_child_signals for insert
  with check (child_id = auth.uid());

drop policy if exists "Children can view own parent signals" on public.parent_child_signals;
create policy "Children can view own parent signals"
  on public.parent_child_signals for select
  using (child_id = auth.uid());

drop policy if exists "Linked adults can view parent signals" on public.parent_child_signals;
create policy "Linked adults can view parent signals"
  on public.parent_child_signals for select
  using (
    exists (
      select 1 from public.child_relationships cr
      where cr.child_id = parent_child_signals.child_id
        and cr.parent_id = auth.uid()
    )
    or exists (
      select 1 from public.trusted_adults ta
      where ta.child_id = parent_child_signals.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  );

drop policy if exists "Linked adults can mark parent signals seen" on public.parent_child_signals;
create policy "Linked adults can mark parent signals seen"
  on public.parent_child_signals for update
  using (
    exists (
      select 1 from public.child_relationships cr
      where cr.child_id = parent_child_signals.child_id
        and cr.parent_id = auth.uid()
    )
    or exists (
      select 1 from public.trusted_adults ta
      where ta.child_id = parent_child_signals.child_id
        and ta.adult_id = auth.uid()
        and ta.status in ('active', 'connected')
    )
  )
  with check (true);

drop policy if exists "Parents can manage own feedback" on public.parent_feedback;
create policy "Parents can manage own feedback"
  on public.parent_feedback for all
  using (parent_id = auth.uid())
  with check (parent_id = auth.uid());
