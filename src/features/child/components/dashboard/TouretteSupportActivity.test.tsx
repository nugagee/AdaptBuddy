import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import TouretteSupportActivity from './TouretteSupportActivity';
import { ticFlowDraftCache } from './ticFlowDraftCache';
import { BREAK_MESSAGES, FLOW_BOARDS, TOURETTE_SUPPORT_IDS, type TouretteSupportId } from './touretteSupportContent';

beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-11T09:00:00Z'));
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  ticFlowDraftCache.dispose(); prepareReadyChildScope('child-a', ['tourettes']);
});
afterEach(() => { cleanup(); ticFlowDraftCache.dispose(); clearReadyChildScope(); jest.useRealTimers(); Reflect.deleteProperty(document, 'hidden'); });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const review = () => fireEvent.click(screen.getByRole('checkbox'));
const mount = (activityId: TouretteSupportId = 'tourettes-flex-flow') => {
  const done = jest.fn(); const view = render(<TouretteSupportActivity activityId={activityId} onComplete={done} />);
  return { done, ...view };
};
const cards = () => screen.queryAllByTestId('tic-flow-card').map(card => card.textContent);
const addAndReview = () => { click('Add Star'); review(); };
const passReady = () => { click('Show break card'); click('Back to my choices'); review(); };

test.each(TOURETTE_SUPPORT_IDS)('%s allows a break immediately but opening or waiting never awards progress', id => {
  const { done } = mount(id); expect(screen.getByRole('checkbox')).toBeDisabled();
  act(() => { jest.advanceTimersByTime(600000); });
  click('Show break card'); expect(screen.getByRole('region', { name: 'Break support card' })).toBeInTheDocument();
  expect(done).not.toHaveBeenCalled();
});

test.each(FLOW_BOARDS.map(board => [board.title, board.cards[0].label]))('partial creative practice in %s needs a card and explicit review', (title, label) => {
  const { done } = mount(); click(title); click(`Add ${label}`);
  expect(screen.getByRole('button', { name: 'Record creative practice' })).toBeDisabled();
  review(); click('Record creative practice'); expect(done).toHaveBeenCalledWith({ durationMinutes: 0 });
  expect(done).toHaveBeenCalledTimes(1); expect(screen.queryByRole('list')).not.toBeInTheDocument();
  expect(ticFlowDraftCache.read(ticFlowDraftCache.acquire('child-a'))).toBeNull();
});

test('reordering, removing and undoing cards preserve explicit-review requirements', () => {
  mount(); click('Add Star'); click('Add Moon'); review();
  click('Move Moon card 2 left'); expect(cards()[0]).toContain('Moon'); expect(screen.getByRole('checkbox')).not.toBeChecked();
  click('Remove Star card 2'); expect(cards()).toHaveLength(1);
  click('Undo scene change'); expect(cards()).toHaveLength(2); click('Undo scene change'); expect(cards()[0]).toContain('Star');
});

test('scene changes clear the old layout and undo can restore it without restoring its review', () => {
  mount(); addAndReview(); click('Garden scene'); expect(cards()).toEqual([]); expect(screen.getByRole('checkbox')).toBeDisabled();
  click('Undo scene change'); expect(cards()[0]).toContain('Star'); expect(screen.getByRole('checkbox')).not.toBeChecked();
});

test('card storage is bounded and repeated cards remain separately labelled for controls', () => {
  mount(); for (let i = 0; i < 6; i += 1) click('Add Star');
  expect(cards()).toHaveLength(6); expect(screen.getByRole('button', { name: 'Add Moon' })).toBeDisabled();
  click('Remove Star card 6'); expect(cards()).toHaveLength(5); expect(screen.getByRole('button', { name: 'Add Moon' })).toBeEnabled();
});

test('pausing and an embedded break preserve the scene, but never preserve final review', () => {
  mount(); addAndReview(); click('Pause at any time');
  expect(screen.queryByRole('button', { name: 'Add Star' })).not.toBeInTheDocument();
  click('Show break card'); click('Back to my choices');
  expect(screen.getByRole('button', { name: 'Continue at my pace' })).toBeInTheDocument();
  click('Continue at my pace'); expect(cards()[0]).toContain('Star'); expect(screen.getByRole('checkbox')).not.toBeChecked();
});

test('closing and reopening restores the same-tab draft but not old review or old time', () => {
  const first = mount(); addAndReview(); act(() => { jest.advanceTimersByTime(60000); }); first.unmount();
  const second = mount(); expect(cards()[0]).toContain('Star'); expect(screen.getByRole('checkbox')).not.toBeChecked();
  expect(screen.getByText(/Your unfinished scene is back/)).toBeInTheDocument();
  review(); act(() => { jest.advanceTimersByTime(6000); }); click('Record creative practice');
  expect(first.done).not.toHaveBeenCalled(); expect(second.done).toHaveBeenCalledWith({ durationMinutes: 0.1 });
});

test('erase removes the visible and cached draft without affecting already recorded progress', () => {
  mount(); addAndReview(); click("Erase this tab's draft"); expect(cards()).toEqual([]);
  expect(ticFlowDraftCache.read(ticFlowDraftCache.acquire('child-a'))).toBeNull();
  expect(useChildProgressStore.getState().completions).toEqual([]);
});

test('keyboard controls add and review a card without a drag or timing task', async () => {
  const { done } = mount(); screen.getByRole('button', { name: 'Add Star' }).focus();
  await act(async () => { await userEvent.keyboard('{Enter}'); });
  screen.getByRole('checkbox').focus(); await act(async () => { await userEvent.keyboard(' '); });
  screen.getByRole('button', { name: 'Record creative practice' }).focus();
  await act(async () => { await userEvent.keyboard('{Enter}'); }); expect(done).toHaveBeenCalledTimes(1);
});

test.each(BREAK_MESSAGES)('the optional support wording %s can be shown without giving a reason', message => {
  const { done } = mount('tourettes-tic-break'); click(message); click('Show break card');
  expect(screen.getByRole('heading', { name: message })).toHaveFocus();
  expect(screen.getByText(/sends no message and does not grant permission/)).toBeInTheDocument();
  expect(done).not.toHaveBeenCalled(); click('Back to my choices');
  expect(screen.getByRole('button', { name: 'Show break card' })).toHaveFocus();
  review(); click('Record support-card use'); expect(done).toHaveBeenCalledTimes(1);
});

test('changing the selected pass wording invalidates earlier showing and confirmation', () => {
  mount('tourettes-tic-break'); passReady(); click(BREAK_MESSAGES[1]);
  expect(screen.getByRole('checkbox')).toBeDisabled(); expect(screen.getByRole('button', { name: 'Record support-card use' })).toBeDisabled();
});

test('a pass may stay open indefinitely without automatic return or reward', () => {
  const { done } = mount('tourettes-tic-break'); click('Show break card');
  act(() => { jest.advanceTimersByTime(3600000); });
  expect(screen.getByRole('region', { name: 'Break support card' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Record support-card use' })).not.toBeInTheDocument(); expect(done).not.toHaveBeenCalled();
});

test('pass and pause time are excluded instead of being reported as exercise or break duration', () => {
  const { done } = mount('tourettes-tic-break'); act(() => { jest.advanceTimersByTime(6000); });
  click('Show break card'); act(() => { jest.advanceTimersByTime(120000); }); click('Back to my choices');
  click('Pause at any time'); act(() => { jest.advanceTimersByTime(60000); }); click('Continue at my pace');
  review(); act(() => { jest.advanceTimersByTime(6000); }); click('Record support-card use');
  expect(done).toHaveBeenCalledWith({ durationMinutes: 0.2 });
});

test('hidden tabs pause, never resume automatically, and preserve the scene while excluding time', () => {
  const { done } = mount(); addAndReview(); act(() => { jest.advanceTimersByTime(6000); });
  Object.defineProperty(document, 'hidden', { configurable: true, value: true }); fireEvent(document, new Event('visibilitychange'));
  act(() => { jest.advanceTimersByTime(60000); });
  Object.defineProperty(document, 'hidden', { configurable: true, value: false }); fireEvent(document, new Event('visibilitychange'));
  expect(screen.getByRole('button', { name: 'Continue at my pace' })).toBeInTheDocument();
  click('Continue at my pace'); expect(cards()[0]).toContain('Star'); review();
  act(() => { jest.advanceTimersByTime(6000); }); click('Record creative practice');
  expect(done).toHaveBeenCalledWith({ durationMinutes: 0.2 });
});

test('window blur pauses without discarding the layout', () => {
  mount(); click('Add Star'); fireEvent(window, new Event('blur'));
  expect(screen.getByRole('button', { name: 'Continue at my pace' })).toBeInTheDocument(); click('Continue at my pace');
  expect(cards()[0]).toContain('Star');
});

test.each(TOURETTE_SUPPORT_IDS)('a stale completion control cannot award %s after account changes', id => {
  const { done } = mount(id);
  if (id === 'tourettes-flex-flow') addAndReview(); else passReady();
  const stale = screen.getByRole('button', { name: id === 'tourettes-flex-flow' ? 'Record creative practice' : 'Record support-card use' });
  act(() => { prepareReadyChildScope('child-b', ['tourettes']); });
  fireEvent.click(stale); expect(done).not.toHaveBeenCalled(); expect(screen.getByRole('status')).toHaveTextContent('original child session');
});

test.each(['loading', 'profile'] as const)('a brief batched %s interruption cannot revive draft, review or card state', reason => {
  const { done } = mount(); addAndReview();
  const profile = useAuthStore.getState().profile!;
  act(() => {
    if (reason === 'loading') {
      useChildProgressStore.setState({ hydrationStatus: 'loading' }); useChildProgressStore.setState({ hydrationStatus: 'ready' });
    } else { useAuthStore.setState({ profile: { ...profile, neuro_types: [] } }); useAuthStore.setState({ profile }); }
  });
  expect(screen.queryByRole('list')).not.toBeInTheDocument(); expect(done).not.toHaveBeenCalled();
  expect(ticFlowDraftCache.read(ticFlowDraftCache.acquire('child-a'))).toBeNull();
});

test.each(['owner', 'profile'] as const)('invalid initial %s cannot launch either hidden content or a pass', reason => {
  if (reason === 'owner') useChildProgressStore.setState({ ownerId: 'child-b' });
  else useAuthStore.setState({ profile: { ...useAuthStore.getState().profile!, neuro_types: ['adhd'] } });
  mount(); expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('changing activity IDs in a reused component invalidates the old activity', () => {
  const { done, rerender } = mount(); addAndReview();
  rerender(<TouretteSupportActivity activityId="tourettes-tic-break" onComplete={done} />);
  expect(screen.queryByRole('button')).not.toBeInTheDocument(); expect(done).not.toHaveBeenCalled();
});

test('guest drafts can resume in memory without writing browser storage', () => {
  prepareReadyChildScope('guest-child', ['tourettes']); useAuthStore.setState({ user: null, isGuest: true });
  const before = { ...localStorage }; const first = mount(); click('Add Star'); first.unmount();
  const second = mount(); expect(cards()[0]).toContain('Star'); review(); click('Record creative practice');
  expect(second.done).toHaveBeenCalledTimes(1); expect({ ...localStorage }).toEqual(before);
});

test('repeated completion clicks cannot create multiple callbacks', () => {
  const { done } = mount(); addAndReview(); const finish = screen.getByRole('button', { name: 'Record creative practice' });
  fireEvent.click(finish); fireEvent.click(finish); expect(done).toHaveBeenCalledTimes(1);
});

test('a pass does not retain its selected phrase after closing', () => {
  const first = mount('tourettes-tic-break'); click(BREAK_MESSAGES[2]); click('Show break card'); first.unmount();
  mount('tourettes-tic-break'); click('Show break card');
  expect(screen.getByRole('heading', { name: BREAK_MESSAGES[0] })).toBeInTheDocument();
});
