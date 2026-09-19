-- Break profiles ↔ teacher_classes RLS recursion.
-- profiles "Class teachers can view class child profiles" reads teacher_classes,
-- whose "Teachers can manage own classes" policy queried profiles directly under RLS,
-- re-entering profiles policies (Postgres 42P17) and blocking sign-in profile loads.

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select role::text
  from public.profiles
  where id = auth.uid()
$$;

revoke all on function public.current_profile_role() from public;
grant execute on function public.current_profile_role() to authenticated;

drop policy if exists "Teachers can manage own classes" on public.teacher_classes;

create policy "Teachers can manage own classes"
  on public.teacher_classes
  for all
  using (
    teacher_id = auth.uid()
    or public.is_admin()
  )
  with check (
    teacher_id = auth.uid()
    and public.current_profile_role() in ('teacher', 'admin')
  );

-- product_feedback used the same direct profiles admin check pattern.
drop policy if exists "Admins can view product feedback" on public.product_feedback;
create policy "Admins can view product feedback"
  on public.product_feedback
  for select
  using (public.is_admin());

drop policy if exists "Admins can update product feedback" on public.product_feedback;
create policy "Admins can update product feedback"
  on public.product_feedback
  for update
  using (public.is_admin())
  with check (public.is_admin());
