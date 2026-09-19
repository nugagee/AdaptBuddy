-- Experience survey admin replies on product_feedback.

alter table public.product_feedback
  add column if not exists admin_response text,
  add column if not exists admin_responded_at timestamptz,
  add column if not exists admin_responded_by uuid references public.profiles(id) on delete set null;

create index if not exists product_feedback_source_status_idx
  on public.product_feedback (source_area, status, created_at desc);

create index if not exists product_feedback_admin_response_idx
  on public.product_feedback (admin_responded_at desc nulls last);

-- Users can read admin replies on their own feedback.
drop policy if exists "Users can view own product feedback" on public.product_feedback;
create policy "Users can view own product feedback"
  on public.product_feedback for select
  using (user_id = auth.uid() or public.is_admin());
