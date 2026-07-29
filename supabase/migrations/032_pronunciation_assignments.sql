-- Allow teachers to publish pronunciation practice assignments.

alter table public.teacher_assignments
  drop constraint if exists teacher_assignments_type_check;

alter table public.teacher_assignments
  add constraint teacher_assignments_type_check
  check (assignment_type in (
    'reading',
    'maths',
    'writing',
    'pronunciation',
    'calm_break',
    'visual_routine',
    'social_story',
    'task'
  ));
