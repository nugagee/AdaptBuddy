-- Let active class members see their classroom metadata on the child dashboard.

drop policy if exists "Active class members can view their classes" on public.teacher_classes;
create policy "Active class members can view their classes"
  on public.teacher_classes for select
  using (
    exists (
      select 1
      from public.class_memberships cm
      where cm.class_id = teacher_classes.id
        and cm.child_id = auth.uid()
        and cm.status = 'active'
    )
    or exists (
      select 1
      from public.class_memberships cm
      join public.child_relationships cr
        on cr.child_id = cm.child_id
      where cm.class_id = teacher_classes.id
        and cr.parent_id = auth.uid()
        and cm.status = 'active'
    )
  );
