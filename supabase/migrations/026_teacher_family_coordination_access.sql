-- Teacher family coordination access.
-- Lets approved class teachers view and create parent-teacher messages and
-- manage meeting requests for learners with active class memberships.

drop policy if exists "Class teachers can view parent teacher messages" on public.parent_teacher_messages;
create policy "Class teachers can view parent teacher messages"
  on public.parent_teacher_messages for select
  using (
    exists (
      select 1
      from public.class_memberships cm
      join public.teacher_classes tc
        on tc.id = cm.class_id
      where cm.child_id = parent_teacher_messages.child_id
        and cm.status = 'active'
        and tc.teacher_id = auth.uid()
    )
  );

drop policy if exists "Class teachers can create parent teacher messages" on public.parent_teacher_messages;
create policy "Class teachers can create parent teacher messages"
  on public.parent_teacher_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1
      from public.class_memberships cm
      join public.teacher_classes tc
        on tc.id = cm.class_id
      where cm.child_id = parent_teacher_messages.child_id
        and cm.status = 'active'
        and tc.teacher_id = auth.uid()
    )
  );

drop policy if exists "Class teachers can update parent teacher messages" on public.parent_teacher_messages;
create policy "Class teachers can update parent teacher messages"
  on public.parent_teacher_messages for update
  using (
    sender_id = auth.uid()
    or recipient_id = auth.uid()
    or exists (
      select 1
      from public.class_memberships cm
      join public.teacher_classes tc
        on tc.id = cm.class_id
      where cm.child_id = parent_teacher_messages.child_id
        and cm.status = 'active'
        and tc.teacher_id = auth.uid()
    )
  )
  with check (
    sender_id = auth.uid()
    or recipient_id = auth.uid()
    or exists (
      select 1
      from public.class_memberships cm
      join public.teacher_classes tc
        on tc.id = cm.class_id
      where cm.child_id = parent_teacher_messages.child_id
        and cm.status = 'active'
        and tc.teacher_id = auth.uid()
    )
  );

drop policy if exists "Class teachers can view care meetings" on public.care_meetings;
create policy "Class teachers can view care meetings"
  on public.care_meetings for select
  using (
    exists (
      select 1
      from public.class_memberships cm
      join public.teacher_classes tc
        on tc.id = cm.class_id
      where cm.child_id = care_meetings.child_id
        and cm.status = 'active'
        and tc.teacher_id = auth.uid()
    )
  );

drop policy if exists "Class teachers can create care meetings" on public.care_meetings;
create policy "Class teachers can create care meetings"
  on public.care_meetings for insert
  with check (
    requested_by = auth.uid()
    and exists (
      select 1
      from public.class_memberships cm
      join public.teacher_classes tc
        on tc.id = cm.class_id
      where cm.child_id = care_meetings.child_id
        and cm.status = 'active'
        and tc.teacher_id = auth.uid()
    )
  );

drop policy if exists "Class teachers can update care meetings" on public.care_meetings;
create policy "Class teachers can update care meetings"
  on public.care_meetings for update
  using (
    requested_by = auth.uid()
    or assigned_to = auth.uid()
    or exists (
      select 1
      from public.class_memberships cm
      join public.teacher_classes tc
        on tc.id = cm.class_id
      where cm.child_id = care_meetings.child_id
        and cm.status = 'active'
        and tc.teacher_id = auth.uid()
    )
  )
  with check (
    requested_by = auth.uid()
    or assigned_to = auth.uid()
    or exists (
      select 1
      from public.class_memberships cm
      join public.teacher_classes tc
        on tc.id = cm.class_id
      where cm.child_id = care_meetings.child_id
        and cm.status = 'active'
        and tc.teacher_id = auth.uid()
    )
  );
