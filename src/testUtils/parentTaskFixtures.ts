import type { DashboardSummary, ParentAssignmentSummary } from 'features/parent/services/parentDashboardService';
import { useAuthStore } from 'store/authStore';

export const parentTask: ParentAssignmentSummary = {
  id: 'task-a', childId: 'child-a', childName: 'Synthetic child', classId: 'class-a', className: 'Test class',
  schoolName: 'Test school', teacherId: 'teacher-a', teacherName: 'Test teacher', teacherEmail: 'teacher@example.invalid',
  title: 'Practice a short story', description: 'Read one paragraph.', assignmentType: 'reading', supportTools: ['read_aloud'],
  createdAt: '2026-09-12T10:00:00Z', status: 'completed', supportUsed: [], updatedAt: '2026-09-12T11:00:00Z',
};
export const parentSnapshot = (overrides: Partial<DashboardSummary> = {}): DashboardSummary => ({
  children: [{ childId: 'child-a', childName: 'Synthetic child', neurotypes: [], totalEntries: 0, entriesLast7Days: 0,
    totalAlerts: 0, highAlerts: 0, trustedAdultsCount: 0, profileCompletion: 0, wellbeingScore: null, wellbeingChange: null }],
  recentEntries: [], recentAlerts: [], trustedAdults: [], wellbeingTrends: {}, messages: [], meetings: [], goals: [], resources: [],
  childSignals: [], teacherClassRequests: [], assignmentSummaries: [parentTask], assignmentSummariesStatus: 'available',
  aiDigest: { headline: 'No recent check-ins', happyWeekPercentage: null, highestEmotion: '', alertSummary: '', learningProgress: '', suggestion: '', talkingPoints: [] },
  proactiveInsights: [], parentFeedbackThemes: [], ...overrides,
});
export const prepareParentScope = (id = 'parent-a', guest = false) => {
  useAuthStore.setState({ user: guest ? null : { id, aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-09-01T00:00:00Z' },
    profile: { id, email: 'parent@example.invalid', role: 'parent', status: 'active', is_authorized: true,
      first_name: 'Test', last_name: 'Parent', full_name: 'Test Parent', neuro_types: [], onboarding_completed: true,
      created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z' },
    session: null, isGuest: guest, initialized: true, loading: false });
};
export const clearParentScope = () => useAuthStore.setState({ user: null, profile: null, session: null, isGuest: false });
