import { getSupabaseClient } from 'services/supabase/client';
import { suggestAssignmentSupport } from './assignmentSupportService';

jest.mock('services/supabase/client', () => ({ getSupabaseClient: jest.fn() }));
const session = jest.fn();
const originalFetch = global.fetch;
const input = { classId: 'class-1', title: 'Read a story', description: 'Choose a favourite word.', assignmentType: 'reading' as const };
beforeEach(() => {
  jest.clearAllMocks();
  (getSupabaseClient as jest.Mock).mockReturnValue({ auth: { getSession: session } });
  session.mockResolvedValue({ data: { session: { access_token: 'synthetic-session' } }, error: null });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ source: 'openai', toolIds: ['read_aloud'] }) });
});
afterAll(() => { global.fetch = originalFetch; });

it('whitelists the request fields and keeps the session token in the header', async () => {
  const controller = new AbortController();
  const formWithExtraData = { ...input, studentNames: ['Private student'], journal: 'private text', dueAt: 'tomorrow', supportTools: ['calm_break'] };
  expect(await suggestAssignmentSupport(formWithExtraData, controller.signal)).toEqual(['read_aloud']);
  const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
  expect(url).toBe('/api/assignment-support');
  expect(JSON.parse(options.body)).toEqual(input);
  expect(options.headers.Authorization).toBe('Bearer synthetic-session');
  expect(options.signal).toBe(controller.signal);
});

it('makes no API call without a session or after cancellation', async () => {
  session.mockResolvedValue({ data: { session: null }, error: null });
  await expect(suggestAssignmentSupport(input, new AbortController().signal)).rejects.toThrow(/Sign in/);
  const controller = new AbortController();
  controller.abort();
  await expect(suggestAssignmentSupport(input, controller.signal)).rejects.toThrow(/cancelled/);
  expect(global.fetch).not.toHaveBeenCalled();
});

it.each([
  { source: 'mock', toolIds: ['read_aloud'] },
  { source: 'openai', toolIds: ['unsafe_unknown_tool'] },
  { source: 'openai', toolIds: ['read_aloud', 'read_aloud'] },
])('rejects unverified responses %j', async (result) => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => result });
  await expect(suggestAssignmentSupport(input, new AbortController().signal)).rejects.toThrow(/verify/);
});

it('preserves a clear server error and handles non-JSON development-server responses', async () => {
  (global.fetch as jest.Mock).mockResolvedValue({ ok: false, json: async () => ({ error: 'Please wait a minute.' }) });
  await expect(suggestAssignmentSupport(input, new AbortController().signal)).rejects.toThrow('Please wait a minute.');
  (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => { throw new Error('HTML'); } });
  await expect(suggestAssignmentSupport(input, new AbortController().signal)).rejects.toThrow(/unavailable here/);
});
