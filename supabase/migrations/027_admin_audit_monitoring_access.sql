-- Admin audit monitoring access.
-- Gives administrator accounts read-only RLS visibility across the live
-- child-parent-teacher support loop without changing parent/teacher permissions.

do $$
declare
  audit_table text;
  policy_name text;
begin
  foreach audit_table in array array[
    'teacher_classes',
    'class_join_requests',
    'class_memberships',
    'teacher_assignments',
    'assignment_submissions',
    'journal_entries',
    'alerts',
    'parent_teacher_messages',
    'care_meetings'
  ]
  loop
    if to_regclass('public.' || audit_table) is not null then
      policy_name := 'Admins can audit ' || audit_table;
      execute format('drop policy if exists %I on public.%I', policy_name, audit_table);
      execute format(
        'create policy %I on public.%I for select using (public.is_admin())',
        policy_name,
        audit_table
      );
    end if;
  end loop;
end $$;
