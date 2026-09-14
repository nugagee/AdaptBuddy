import { useAuthStore } from 'store/authStore';
import type { TeacherAssignment, TeacherAssignmentLearnerProgress, TeacherDashboardSummary } from 'features/teacher/services/teacherDashboardService';
export const teacherLearner = (extra: Partial<TeacherAssignmentLearnerProgress> = {}): TeacherAssignmentLearnerProgress => ({
  childId: 'child-a', childName: 'Synthetic learner', buddyId: null, neurotypes: [], status: 'completed',
  hasRecordedUpdate: true, supportUsed: [], updatedAt: '2026-09-13T09:00:00Z', ...extra,
});
export const teacherTask = (extra: Partial<TeacherAssignment> = {}): TeacherAssignment => ({
  id: 'task-a', classId: 'class-a', teacherId: 'teacher-a', title: 'Read one paragraph', assignmentType: 'reading',
  supportTools: ['read_aloud'], createdAt: '2026-09-13T08:00:00Z', dueAt: '2026-09-13T12:00:00Z',
  progress: { assignedCount: 1, notStarted: 0, inProgress: 0, needsHelp: 0, completed: 1, submitted: 0 },
  learnerProgress: [teacherLearner()], ...extra,
});
export const teacherSnapshot = (extra: Partial<TeacherDashboardSummary> = {}): TeacherDashboardSummary => ({
  classes: [{ id: 'class-a', teacherId: 'teacher-a', className: 'Synthetic class', schoolName: 'Test school', classCode: 'TEST', subject: 'Reading',
    yearGroup: '4', createdAt: '2026-09-01T00:00:00Z', studentCount: 1, pendingRequests: 0, assignmentsDue: 1 }],
  students: [{ membershipId: 'member-a', classId: 'class-a', childId: 'child-a', childName: 'Synthetic learner', buddyId: null, neurotypes: [],
    visibilitySettings: { childName: true, neuroProfile: false, academicTasks: true, dailyMood: 'hidden', worryDiaryText: false, safeguardingAlerts: false, personalNotes: false },
    status: 'active', joinedAt: '2026-09-01T00:00:00Z', completionSummary: '1 recorded task' }],
  assignments: [teacherTask()], joinRequests: [], liveSignals: [], familyMessages: [], careMeetings: [],
  totals: { classes: 1, students: 1, pendingRequests: 0, supportAlerts: 0, assignmentsDue: 1, unreadMessages: 0, meetingRequests: 0 }, ...extra,
});
export const prepareTeacherReportScope = (id = 'teacher-a', guest = false) => useAuthStore.setState({
  user: guest ? null : { id, aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-09-01T00:00:00Z', email_confirmed_at: '2026-09-01T00:00:00Z' },
  profile: { id, email: 'teacher@example.invalid', role: 'teacher', status: 'active', is_authorized: true, first_name: 'Test', last_name: 'Teacher', full_name: 'Test Teacher',
    neuro_types: [], onboarding_completed: true, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
  isGuest: guest, session: null, loading: false, initialized: true,
});
export const clearTeacherReportScope = () => useAuthStore.setState({ user: null, profile: null, isGuest: false, session: null });
