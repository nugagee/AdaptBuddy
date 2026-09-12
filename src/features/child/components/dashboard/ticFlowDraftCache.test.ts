import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import { createTicFlowDraftCache } from './ticFlowDraftCache';
import { isFlowDraft } from './touretteSupportContent';

let cache: ReturnType<typeof createTicFlowDraftCache>;
beforeEach(() => { prepareReadyChildScope('child-a', ['tourettes']); cache = createTicFlowDraftCache(); });
afterEach(() => { cache.dispose(); clearReadyChildScope(); });
const draft = () => ({ boardIndex: 0, cards: [0, 1] });

test('a ready original child can keep a bounded draft and reacquire it in the same tab', () => {
  const lease = cache.acquire('child-a');
  expect(cache.write(lease, draft())).toBe(true);
  expect(cache.read(cache.acquire('child-a'))).toEqual(draft());
});

test('stored and returned drafts are copied, not mutable references', () => {
  const lease = cache.acquire('child-a'); const value = draft(); cache.write(lease, value);
  value.cards.push(2); const read = cache.read(lease)!; read.cards.push(2);
  expect(cache.read(lease)).toEqual(draft());
});

test('only board and fixed card indices survive a draft write, never arbitrary properties', () => {
  const lease = cache.acquire('child-a');
  expect(cache.write(lease, { ...draft(), privateText: 'must not be retained', reviewed: true, durationMinutes: 99 })).toBe(true);
  expect(cache.read(lease)).toEqual(draft());
});

test.each([
  null, {}, { boardIndex: -1, cards: [] }, { boardIndex: 3, cards: [0] },
  { boardIndex: 0.5, cards: [0] }, { boardIndex: 0, cards: [3] },
  { boardIndex: 0, cards: [NaN] }, { boardIndex: 0, cards: ['1'] },
  { boardIndex: 0, cards: Array(7).fill(0) }, { boardIndex: 0, cards: new Array(1) },
])('rejects malformed or unbounded draft %# without replacing a valid one', value => {
  const lease = cache.acquire('child-a'); cache.write(lease, draft());
  expect(isFlowDraft(value)).toBe(false); expect(cache.write(lease, value)).toBe(false);
  expect(cache.read(lease)).toEqual(draft());
});

test('an empty scene erases a previous draft', () => {
  const lease = cache.acquire('child-a'); cache.write(lease, draft());
  cache.write(lease, { boardIndex: 1, cards: [] }); expect(cache.read(lease)).toBeNull();
});

test('explicit clear erases the draft without creating progress or persistent storage', () => {
  const before = { ...localStorage, ...sessionStorage }; const lease = cache.acquire('child-a');
  cache.write(lease, draft()); expect(cache.clear(lease)).toBe(true); expect(cache.read(lease)).toBeNull();
  expect({ ...localStorage, ...sessionStorage }).toEqual(before);
  expect(useChildProgressStore.getState().completions).toEqual([]);
});

test.each(['logout', 'loading', 'owner', 'profile'] as const)('%s invalidates the lease and clears the draft without a mounted component', cause => {
  const lease = cache.acquire('child-a'); cache.write(lease, draft());
  const auth = useAuthStore.getState();
  if (cause === 'logout') useAuthStore.setState({ user: null });
  if (cause === 'loading') useChildProgressStore.setState({ hydrationStatus: 'loading' });
  if (cause === 'owner') useChildProgressStore.setState({ ownerId: 'child-b' });
  if (cause === 'profile') useAuthStore.setState({ profile: { ...auth.profile!, neuro_types: [] } });
  prepareReadyChildScope('child-a', ['tourettes']);
  expect(cache.read(lease)).toBeNull(); expect(cache.write(lease, draft())).toBe(false);
  expect(cache.read(cache.acquire('child-a'))).toBeNull();
});

test('another child cannot inherit or overwrite the first child draft through an old lease', () => {
  const first = cache.acquire('child-a'); cache.write(first, draft());
  prepareReadyChildScope('child-b', ['tourettes']); const second = cache.acquire('child-b');
  expect(cache.read(second)).toBeNull(); expect(cache.write(first, draft())).toBe(false);
  cache.write(second, { boardIndex: 2, cards: [2] });
  expect(cache.read(first)).toBeNull(); expect(cache.read(second)).toEqual({ boardIndex: 2, cards: [2] });
});

test('invalid scope acquisition cannot read a valid owner draft', () => {
  const lease = cache.acquire('child-a'); cache.write(lease, draft());
  expect(cache.acquire('child-b')).toBeNull(); expect(cache.read(null)).toBeNull();
  expect(cache.read(lease)).toEqual(draft());
});

test('guest drafts are transient and do not survive leaving and re-entering guest mode', () => {
  prepareReadyChildScope('guest-child', ['tourettes']); useAuthStore.setState({ user: null, isGuest: true });
  const before = { ...localStorage }; const lease = cache.acquire('guest-child');
  expect(cache.write(lease, draft())).toBe(true);
  useAuthStore.setState({ isGuest: false }); useAuthStore.setState({ isGuest: true });
  expect(cache.read(cache.acquire('guest-child'))).toBeNull(); expect({ ...localStorage }).toEqual(before);
});

test('disposing the in-memory cache simulates losing this tab and permits a fresh empty session', () => {
  const lease = cache.acquire('child-a'); cache.write(lease, draft()); cache.dispose();
  expect(cache.read(lease)).toBeNull(); expect(cache.read(cache.acquire('child-a'))).toBeNull();
});
