import { readParentAssignmentSummaries } from './parentAssignmentSummaryService';
import { ParentDashboardService, removeChildFromDashboard } from './parentDashboardService';
import { parentSnapshot } from 'testUtils/parentTaskFixtures';

let mockConfigured = true;
const mockClient = { rpc: jest.fn(), from: jest.fn() };
jest.mock('services/supabase/client', () => ({
  get isSupabaseConfigured() { return mockConfigured; },
  getSupabaseClient: () => mockClient,
}));
// The fixture's auth helper is not needed by these service tests.
jest.mock('store/authStore', () => ({ useAuthStore: { setState: jest.fn() } }));
const row = { assignment_id: 'task-a', child_id: 'child-a', title: 'Read a story', class_id: 'class-a', teacher_id: 'teacher-a',
  created_at: '2026-09-12T10:00:00Z', status: 'completed', assignment_type: 'reading', support_tools: ['read_aloud'], support_used: [] };
const read = () => readParentAssignmentSummaries(['child-a'], new Map([['child-a', 'Child A']]));
beforeEach(() => { jest.resetAllMocks(); mockConfigured = true; mockClient.rpc.mockResolvedValue({ data: [], error: null }); });
afterEach(() => jest.restoreAllMocks());

test('no selected child returns empty without a backend query', async () => {
  await expect(readParentAssignmentSummaries([], new Map())).resolves.toEqual([]);
  expect(mockClient.rpc).not.toHaveBeenCalled();
});
test('missing backend configuration never masquerades as an empty task list', async () => {
  mockConfigured = false; await expect(read()).rejects.toThrow('unavailable'); expect(mockClient.rpc).not.toHaveBeenCalled();
});
test.each(['guest-child', '', '   '])('invalid child scope %s never queries', async id => {
  await expect(readParentAssignmentSummaries([id], new Map())).rejects.toThrow('unavailable'); expect(mockClient.rpc).not.toHaveBeenCalled();
});
test('a real empty result requires a successful RPC and uses no raw-table fallback', async () => {
  await expect(read()).resolves.toEqual([]);
  expect(mockClient.rpc).toHaveBeenCalledWith('parent_assignment_summaries', { p_child_ids: ['child-a'] });
  expect(mockClient.from).not.toHaveBeenCalled();
});
test('maps allowlisted fields without converting suggestions into use', async () => {
  mockClient.rpc.mockResolvedValue({ data: [{ ...row, private_note: 'must not be copied', mood_after_task: null }], error: null });
  const [result] = await read(); expect(result).toEqual(expect.objectContaining({ id: 'task-a', childName: 'Child A', supportTools: ['read_aloud'], supportUsed: [] }));
  expect(result).not.toHaveProperty('private_note'); expect(result.moodAfterTask).toBeUndefined();
});
test('deduplicates the requested child IDs without requesting broader scope', async () => {
  await readParentAssignmentSummaries(['child-a', 'child-a'], new Map());
  expect(mockClient.rpc).toHaveBeenCalledWith('parent_assignment_summaries', { p_child_ids: ['child-a'] });
});
test.each(['function parent_assignment_summaries not found', 'permission denied', 'network error'])('RPC error %s is unavailable with a redacted message', async message => {
  mockClient.rpc.mockResolvedValue({ data: [row], error: { message } });
  await expect(read()).rejects.toThrow('School task summaries are unavailable.'); expect(mockClient.from).not.toHaveBeenCalled();
});
test.each([
  [null], [undefined], [{}], [[row, row]], [[{ ...row, child_id: 'other-child' }]], [[{ ...row, status: 'invented' }]],
  [[{ ...row, assignment_type: 'invented' }]], [[{ ...row, title: 9 }]], [[{ ...row, support_used: 'read_aloud' }]],
  [[{ ...row, support_tools: [null] }]], [[{ ...row, updated_at: 'not-a-date' }]], [[{ ...row, created_at: null }]],
  [[{ ...row, description: { text: 'wrong type' } }]], [Array.from({ length: 51 }, (_, i) => ({ ...row, assignment_id: `t-${i}` }))],
])('rejects malformed, duplicated or out-of-scope response %#', async data => {
  mockClient.rpc.mockResolvedValue({ data, error: null }); await expect(read()).rejects.toThrow('unavailable');
});
test('the same class task for two requested children is not a duplicate', async () => {
  mockClient.rpc.mockResolvedValue({ data: [row, { ...row, child_id: 'child-b' }], error: null });
  await expect(readParentAssignmentSummaries(['child-a', 'child-b'], new Map())).resolves.toHaveLength(2);
});

const stubDashboard = () => {
  jest.spyOn(ParentDashboardService, 'getChildren').mockResolvedValue(parentSnapshot().children);
  for (const method of ['getRecentEntriesForChildren', 'getAlertsForChildren', 'getTrustedAdultsForChildren', 'getMessagesForChildren',
    'getMeetingsForChildren', 'getGoalsForChildren', 'getResourcesForChildren', 'getSignalsForChildren', 'getParentFeedbackThemes', 'getTeacherClassRequestsForChildren']) {
    jest.spyOn(ParentDashboardService as any, method).mockResolvedValue([]);
  }
};
test('a missing assignment RPC keeps the rest of the dashboard but marks tasks unavailable', async () => {
  stubDashboard(); mockClient.rpc.mockResolvedValue({ data: null, error: { message: 'missing schema' } });
  const result = await ParentDashboardService.getDashboardSummary();
  expect(result.children).toHaveLength(1); expect(result.assignmentSummariesStatus).toBe('unavailable'); expect(result.assignmentSummaries).toEqual([]);
});
test('only a successful task request produces an available empty list', async () => {
  stubDashboard(); const result = await ParentDashboardService.getDashboardSummary();
  expect(result.assignmentSummariesStatus).toBe('available'); expect(result.assignmentSummaries).toEqual([]);
});
test('missing global configuration cannot produce a false no-linked-child dashboard', async () => {
  mockConfigured = false; await expect(ParentDashboardService.getDashboardSummary()).rejects.toThrow('unavailable');
  expect(mockClient.from).not.toHaveBeenCalled();
});
test('child-removal projection preserves the unavailable flag', () => {
  const result = removeChildFromDashboard(parentSnapshot({ assignmentSummariesStatus: 'unavailable' }), 'child-a');
  expect(result.assignmentSummariesStatus).toBe('unavailable'); expect(result.assignmentSummaries).toEqual([]);
});
