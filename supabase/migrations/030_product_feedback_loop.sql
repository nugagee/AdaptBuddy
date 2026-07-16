-- Product feedback loop for parents, teachers, children, and administrators.
-- This stores experience feedback about AdaptBuddy itself, not private journal content.

create table if not exists public.product_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  user_role text not null default 'parent',
  child_id uuid references public.profiles(id) on delete set null,
  source_area text not null default 'general',
  feedback_type text not null default 'idea',
  rating integer not null default 4,
  feedback_text text not null,
  sentiment text not null default 'neutral',
  themes jsonb not null default '[]'::jsonb,
  status text not null default 'new',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_feedback_role_check
    check (user_role in ('child', 'parent', 'teacher', 'admin')),
  constraint product_feedback_type_check
    check (feedback_type in ('idea', 'confusing', 'bug', 'safety', 'delight')),
  constraint product_feedback_rating_check
    check (rating between 1 and 5),
  constraint product_feedback_sentiment_check
    check (sentiment in ('positive', 'neutral', 'concerned')),
  constraint product_feedback_status_check
    check (status in ('new', 'reviewing', 'planned', 'shipped', 'closed'))
);

create index if not exists product_feedback_created_idx
  on public.product_feedback(created_at desc);

create index if not exists product_feedback_user_created_idx
  on public.product_feedback(user_id, created_at desc);

create index if not exists product_feedback_source_created_idx
  on public.product_feedback(source_area, created_at desc);

create or replace function public.set_product_feedback_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_product_feedback_updated_at on public.product_feedback;
create trigger set_product_feedback_updated_at
  before update on public.product_feedback
  for each row execute function public.set_product_feedback_updated_at();

alter table public.product_feedback enable row level security;

drop policy if exists "Users can create own product feedback" on public.product_feedback;
create policy "Users can create own product feedback"
  on public.product_feedback for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can view own product feedback" on public.product_feedback;
create policy "Users can view own product feedback"
  on public.product_feedback for select
  using (user_id = auth.uid());

drop policy if exists "Admins can view product feedback" on public.product_feedback;
create policy "Admins can view product feedback"
  on public.product_feedback for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and coalesce(p.is_authorized, true) = true
    )
  );

drop policy if exists "Admins can update product feedback" on public.product_feedback;
create policy "Admins can update product feedback"
  on public.product_feedback for update
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and coalesce(p.is_authorized, true) = true
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and coalesce(p.is_authorized, true) = true
    )
  );
