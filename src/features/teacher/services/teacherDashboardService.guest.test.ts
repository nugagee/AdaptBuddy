import { TeacherDashboardService } from './teacherDashboardService';

it('returns isolated teacher demo data without reading the configured backend', async () => {
  const summary = await TeacherDashboardService.getDashboardSummary({ guest: true });

  expect(summary.totals).toMatchObject({
    classes: 1,
    students: 1,
    pendingRequests: 1,
    supportAlerts: 1,
  });
  expect(summary.classes[0]).toMatchObject({
    id: 'guest-class',
    teacherId: 'guest-teacher',
  });
  expect(summary.students[0]).toMatchObject({
    childId: 'guest-child',
    childName: 'Alex A.',
  });
});
