import { ChildAssignmentService } from './childAssignmentService';

let mockConfigured = true;
const mockClient = { from: jest.fn() };
const mockQueries: Array<{ table: string; chain: Record<string, any> }> = [];
const mockResults: Array<{ data: unknown; error: unknown }> = [];
jest.mock('services/supabase/client', () => ({
  get isSupabaseConfigured() { return mockConfigured; },
  getSupabaseClient: () => mockClient,
}));
const queue = (data: unknown, error: unknown = null) => { mockResults.push({ data, error }); };
const task = { id: 'task-a', class_id: 'class-a', title: 'Read a short story', description: 'Read one paragraph.', assignment_type: 'reading', support_tools: ['read_aloud'], due_at: null, created_at: '2026-09-12T10:00:00Z' };
const input = { assignmentId: 'task-a', childId: 'child-a', status: 'completed' as const, supportUsed: ['read_aloud'] };
const returned = { assignment_id: 'task-a', child_id: 'child-a', status: 'completed' };

beforeEach(() => {
  jest.resetAllMocks(); mockConfigured = true; mockQueries.length = 0; mockResults.length = 0;
  mockClient.from.mockImplementation((table: string) => {
    const result = mockResults.shift();
    if (!result) throw new Error(`Unexpected synthetic query to ${table}`);
    const chain: Record<string, any> = {};
    for (const method of ['select', 'eq', 'in', 'is', 'order', 'limit', 'upsert', 'update']) {
      chain[method] = jest.fn(() => chain);
    }
    chain.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
    mockQueries.push({ table, chain });
    return chain;
  });
});

test('guest and missing-identity reads never query the backend', async () => {
  mockConfigured = false;
  await expect(ChildAssignmentService.getAssignments('guest-child')).resolves.toEqual([]);
  await expect(ChildAssignmentService.getAssignments('')).resolves.toEqual([]);
  expect(mockClient.from).not.toHaveBeenCalled();
});

test('an unavailable backend is an error for a real child, not an empty inbox', async () => {
  mockConfigured = false;
  await expect(ChildAssignmentService.getAssignments('child-a')).rejects.toThrow('unavailable');
  expect(mockClient.from).not.toHaveBeenCalled();
});

test('no active memberships returns a real empty result after the scoped query', async () => {
  queue([]);
  await expect(ChildAssignmentService.getAssignments('child-a')).resolves.toEqual([]);
  expect(mockQueries).toHaveLength(1);
  expect(mockQueries[0].table).toBe('class_memberships');
  expect(mockQueries[0].chain.eq).toHaveBeenCalledWith('child_id', 'child-a');
  expect(mockQueries[0].chain.eq).toHaveBeenCalledWith('status', 'active');
});

test('loads active-class tasks and child-scoped submissions without duplicate class filters', async () => {
  queue([{ class_id: 'class-a', status: 'active' }, { class_id: 'class-a', status: 'active' }]);
  queue([task]);
  queue([{ assignment_id: 'task-a', status: 'needs_help', support_used: ['teacher_help'], mood_after_task: null }]);
  const result = await ChildAssignmentService.getAssignments('child-a');
  expect(result).toEqual([expect.objectContaining({ id: 'task-a', classId: 'class-a', title: task.title, status: 'needs_help', supportUsed: ['teacher_help'], supportTools: ['read_aloud'] })]);
  expect(mockQueries.map(query => query.table)).toEqual(['class_memberships', 'teacher_assignments', 'assignment_submissions']);
  expect(mockQueries[1].chain.in).toHaveBeenCalledWith('class_id', ['class-a']);
  expect(mockQueries[1].chain.is).toHaveBeenCalledWith('archived_at', null);
  expect(mockQueries[1].chain.limit).toHaveBeenCalledWith(12);
  expect(mockQueries[2].chain.eq).toHaveBeenCalledWith('child_id', 'child-a');
  expect(mockQueries[2].chain.in).toHaveBeenCalledWith('assignment_id', ['task-a']);
});

test('a successful empty task list does not request submissions', async () => {
  queue([{ class_id: 'class-a', status: 'active' }]); queue([]);
  await expect(ChildAssignmentService.getAssignments('child-a')).resolves.toEqual([]);
  expect(mockQueries).toHaveLength(2);
});

test('membership failure is not converted to an empty result', async () => {
  const error = new Error('membership unavailable'); queue(null, error);
  await expect(ChildAssignmentService.getAssignments('child-a')).rejects.toBe(error);
  expect(mockQueries).toHaveLength(1);
});

test('permission failure on assignments does not trigger the legacy query', async () => {
  queue([{ class_id: 'class-a' }]); const error = new Error('permission denied'); queue(null, error);
  await expect(ChildAssignmentService.getAssignments('child-a')).rejects.toBe(error);
  expect(mockQueries).toHaveLength(2);
});

test('retains the narrowly detected legacy archived-column fallback without swallowing later errors', async () => {
  queue([{ class_id: 'class-a' }]); queue(null, { message: 'column archived_at does not exist' }); queue([task]); queue([]);
  await expect(ChildAssignmentService.getAssignments('child-a')).resolves.toEqual([expect.objectContaining({ id: 'task-a', status: 'not_started' })]);
  expect(mockQueries).toHaveLength(4);
  expect(mockQueries[2].chain.select.mock.calls[0][0]).not.toContain('archived_at');
});

test('submission lookup failure is not reported as not-started tasks', async () => {
  queue([{ class_id: 'class-a' }]); queue([task]); const error = new Error('submission unavailable'); queue(null, error);
  await expect(ChildAssignmentService.getAssignments('child-a')).rejects.toBe(error);
});

test('confirms the exact upserted child/task/status before resolving', async () => {
  queue([returned]);
  await expect(ChildAssignmentService.saveProgress(input)).resolves.toBeUndefined();
  expect(mockQueries[0].chain.upsert).toHaveBeenCalledWith(expect.objectContaining({ assignment_id: 'task-a', child_id: 'child-a', status: 'completed', support_used: ['read_aloud'], submitted_at: expect.any(String) }), { onConflict: 'assignment_id,child_id' });
  expect(mockQueries[0].chain.select).toHaveBeenCalledWith('assignment_id, child_id, status');
});

// Wrap each receipt: Jest treats a bare array row as positional arguments.
test.each([
  { name: 'null', data: null },
  { name: 'empty', data: [] },
  { name: 'wrong child', data: [{ ...returned, child_id: 'child-b' }] },
  { name: 'wrong task', data: [{ ...returned, assignment_id: 'other-task' }] },
  { name: 'wrong status', data: [{ ...returned, status: 'in_progress' }] },
  { name: 'duplicate rows', data: [returned, returned] },
])('rejects a missing or mismatched write receipt: $name', async ({ data }) => {
  queue(data);
  await expect(ChildAssignmentService.saveProgress(input)).rejects.toThrow('could not be confirmed');
});

test('does not claim a saved update when Supabase returns an error', async () => {
  const error = new Error('rejected'); queue(null, error);
  await expect(ChildAssignmentService.saveProgress(input)).rejects.toBe(error);
});

test('missing configuration cannot silently resolve a save', async () => {
  mockConfigured = false;
  await expect(ChildAssignmentService.saveProgress(input)).rejects.toThrow('unavailable');
  expect(mockClient.from).not.toHaveBeenCalled();
});

test.each(['', 'guest-child'])('rejects writes for invalid child %j without touching backend', async childId => {
  await expect(ChildAssignmentService.saveProgress({ ...input, childId })).rejects.toThrow('signed-in child');
  expect(mockClient.from).not.toHaveBeenCalled();
});

test('rejects missing assignment identity and invalid runtime status before queries', async () => {
  await expect(ChildAssignmentService.saveProgress({ ...input, assignmentId: '' })).rejects.toThrow('teacher task');
  await expect(ChildAssignmentService.saveProgress({ ...input, status: 'invented' as any })).rejects.toThrow('Unknown task status');
  expect(mockClient.from).not.toHaveBeenCalled();
});

test('optional mood uses a narrow completed-row update without resetting supports, status or submission time', async () => {
  queue([returned]);
  await expect(ChildAssignmentService.saveMoodAfterTask({ assignmentId: 'task-a', childId: 'child-a', moodAfterTask: 'calm' })).resolves.toBeUndefined();
  const query = mockQueries[0];
  expect(query.table).toBe('assignment_submissions');
  expect(query.chain.update).toHaveBeenCalledWith({ mood_after_task: 'calm' });
  expect(query.chain.eq).toHaveBeenCalledWith('assignment_id', 'task-a');
  expect(query.chain.eq).toHaveBeenCalledWith('child_id', 'child-a');
  expect(query.chain.in).toHaveBeenCalledWith('status', ['completed', 'submitted']);
  expect(query.chain.upsert).not.toHaveBeenCalled();
});

test('a no-match optional mood update is not success', async () => {
  queue([]);
  await expect(ChildAssignmentService.saveMoodAfterTask({ assignmentId: 'task-a', childId: 'child-a', moodAfterTask: 'good' })).rejects.toThrow('could not be confirmed');
});

test('optional mood errors are surfaced and invalid feelings or guests never write', async () => {
  await expect(ChildAssignmentService.saveMoodAfterTask({ assignmentId: 'task-a', childId: 'guest-child', moodAfterTask: 'good' })).rejects.toThrow('signed-in child');
  await expect(ChildAssignmentService.saveMoodAfterTask({ assignmentId: 'task-a', childId: 'child-a', moodAfterTask: 'arbitrary private text' })).rejects.toThrow('listed task feeling');
  expect(mockClient.from).not.toHaveBeenCalled();
  const error = new Error('write unavailable'); queue(null, error);
  await expect(ChildAssignmentService.saveMoodAfterTask({ assignmentId: 'task-a', childId: 'child-a', moodAfterTask: 'good' })).rejects.toBe(error);
});
