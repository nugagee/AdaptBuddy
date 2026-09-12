import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import DysgraphiaTracePathActivity, { TRACE_PATHS } from './DysgraphiaTracePathActivity';

class TestPointerEvent extends MouseEvent {
  pointerId: number;
  isPrimary: boolean;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init); this.pointerId = init.pointerId ?? 1; this.isPrimary = init.isPrimary ?? true;
  }
}
let oldPointer: PropertyDescriptor | undefined;
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-10T10:00:00Z'));
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  oldPointer = Object.getOwnPropertyDescriptor(window, 'PointerEvent');
  Object.defineProperty(window, 'PointerEvent', { configurable: true, value: TestPointerEvent });
  prepareReadyChildScope('child-a', ['dysgraphia']);
});
afterEach(() => {
  cleanup(); clearReadyChildScope(); jest.useRealTimers(); jest.restoreAllMocks();
  Reflect.deleteProperty(document, 'hidden');
  if (oldPointer) Object.defineProperty(window, 'PointerEvent', oldPointer);
  else Reflect.deleteProperty(window, 'PointerEvent');
});
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const finishButton = () => screen.getByRole('button', { name: 'Record path practice' });
const review = () => fireEvent.click(screen.getByRole('checkbox', { name: 'I have explored this path in my own way' }));
const readyStep = () => { click('Explore stop 1'); review(); };
const mount = () => { const done = jest.fn(); render(<DysgraphiaTracePathActivity onComplete={done} />); return done; };
const surface = () => {
  const element = screen.getByRole('img', { name: /Path exploration surface/ });
  jest.spyOn(element, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 400, bottom: 200, width: 400, height: 200, toJSON: () => ({}) });
  return element;
};
const draw = (element: HTMLElement, pointerId = 1) => {
  fireEvent.pointerDown(element, { pointerId, button: 0, clientX: 20, clientY: 20 });
  fireEvent.pointerMove(element, { pointerId, clientX: 80, clientY: 25 });
  fireEvent.pointerUp(element, { pointerId, clientX: 100, clientY: 30 });
};
const hidden = (value: boolean) => {
  Object.defineProperty(document, 'hidden', { configurable: true, value });
  fireEvent(document, new Event('visibilitychange'));
};

test('opening or waiting cannot award practice, and the default route needs no dragging', () => {
  const done = mount();
  expect(screen.getByRole('button', { name: 'Step buttons' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('checkbox')).toBeDisabled();
  act(() => { jest.advanceTimersByTime(600000); });
  expect(finishButton()).toBeDisabled(); expect(done).not.toHaveBeenCalled();
  expect(screen.getByText(/no speed, neatness or accuracy score/i)).toBeInTheDocument();
});

test('one explored stop plus explicit review records partial practice with minimal measured metadata once', () => {
  const done = mount(); click('Explore stop 1');
  expect(finishButton()).toBeDisabled(); review();
  act(() => { jest.advanceTimersByTime(12000); }); click('Record path practice');
  expect(done).toHaveBeenCalledTimes(1);
  expect(done).toHaveBeenCalledWith({ durationMinutes: 0.2 });
  expect(screen.getByRole('status')).toHaveTextContent('Path practice recorded');
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});

test.each(TRACE_PATHS.map(path => path.title))('%s supports the same button route without a precision threshold', title => {
  const done = mount(); click(title); readyStep(); click('Record path practice');
  expect(done).toHaveBeenCalledWith({ durationMinutes: 0 });
});

test('all three stops can be explored, undone and cleared without automatic completion', () => {
  const done = mount(); click('Explore stop 1'); click('Explore stop 2'); click('Explore stop 3');
  expect(screen.getByRole('button', { name: 'All stops explored' })).toBeDisabled();
  expect(done).not.toHaveBeenCalled(); review(); click('Undo last exploration');
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  expect(screen.getByRole('status')).toHaveTextContent('Explored 2 of 3');
  click('Clear this practice'); expect(screen.getByRole('checkbox')).toBeDisabled(); expect(finishButton()).toBeDisabled();
});

test('changing path or method clears both practice and its earlier confirmation', () => {
  mount(); readyStep(); click('Gentle hill'); expect(finishButton()).toBeDisabled();
  expect(screen.getByRole('checkbox')).not.toBeChecked(); readyStep(); click('Draw on the path');
  expect(screen.getByRole('checkbox')).toBeDisabled(); expect(screen.queryByText(/Explored 1 of 3/)).not.toBeInTheDocument();
  click('Step buttons'); expect(screen.getByRole('button', { name: 'Explore stop 1' })).toBeEnabled();
});

test('the guide can be hidden without producing a completion', () => {
  const done = mount(); click('Show dotted guide');
  expect(screen.getByRole('button', { name: 'Show dotted guide' })).toHaveAttribute('aria-pressed', 'false');
  expect(finishButton()).toBeDisabled(); expect(done).not.toHaveBeenCalled();
});

test('keyboard activation performs real exploration and review', async () => {
  const done = mount(); screen.getByRole('button', { name: 'Explore stop 1' }).focus();
  await act(async () => { await userEvent.keyboard('{Enter}'); });
  screen.getByRole('checkbox').focus();
  await act(async () => { await userEvent.keyboard(' '); });
  expect(finishButton()).toBeEnabled(); finishButton().focus();
  await act(async () => { await userEvent.keyboard('{Enter}'); });
  expect(done).toHaveBeenCalledTimes(1);
});

test('a completed drawing away from the guide counts equally and is not stored', () => {
  const done = mount(); const before = { ...localStorage };
  click('Draw on the path'); const target = surface(); draw(target);
  expect(screen.getAllByTestId('trace-stroke')).toHaveLength(1); expect(finishButton()).toBeDisabled();
  review(); click('Record path practice');
  expect(done).toHaveBeenCalledWith({ durationMinutes: 0 });
  expect({ ...localStorage }).toEqual(before); expect(screen.queryByTestId('trace-stroke')).not.toBeInTheDocument();
});

test('a stationary pointer contact cannot masquerade as a completed line', () => {
  mount(); click('Draw on the path'); const target = surface();
  fireEvent.pointerDown(target, { pointerId: 1, clientX: 40, clientY: 100 });
  fireEvent.pointerUp(target, { pointerId: 1, clientX: 40, clientY: 100 });
  expect(screen.queryByTestId('trace-stroke')).not.toBeInTheDocument(); expect(screen.getByRole('checkbox')).toBeDisabled();
});

test.each(['pointerCancel', 'lostPointerCapture'] as const)('%s discards an unfinished gesture without granting practice', type => {
  mount(); click('Draw on the path'); const target = surface();
  fireEvent.pointerDown(target, { pointerId: 1, clientX: 20, clientY: 20 });
  fireEvent.pointerMove(target, { pointerId: 1, clientX: 80, clientY: 20 });
  fireEvent[type](target, { pointerId: 1 });
  fireEvent.pointerUp(target, { pointerId: 1, clientX: 100, clientY: 20 });
  expect(screen.queryByTestId('trace-draft')).not.toBeInTheDocument();
  expect(screen.queryByTestId('trace-stroke')).not.toBeInTheDocument(); expect(finishButton()).toBeDisabled();
});

test('secondary pointers cannot start or finish another pointer\'s drawing', () => {
  mount(); click('Draw on the path'); const target = surface();
  fireEvent.pointerDown(target, { pointerId: 2, isPrimary: false, clientX: 10, clientY: 10 });
  expect(screen.queryByTestId('trace-draft')).not.toBeInTheDocument();
  fireEvent.pointerDown(target, { pointerId: 1, clientX: 20, clientY: 20 });
  fireEvent.pointerMove(target, { pointerId: 2, clientX: 80, clientY: 20 });
  fireEvent.pointerUp(target, { pointerId: 2, clientX: 100, clientY: 20 });
  expect(screen.queryByTestId('trace-stroke')).not.toBeInTheDocument();
  fireEvent.pointerCancel(target, { pointerId: 1 });
});

test('clearing or undoing the last stroke resets its review', () => {
  mount(); click('Draw on the path'); const target = surface(); draw(target); review();
  click('Undo last exploration'); expect(screen.getByRole('checkbox')).toBeDisabled(); expect(finishButton()).toBeDisabled();
  draw(target); review(); click('Clear this practice'); expect(screen.queryByTestId('trace-stroke')).not.toBeInTheDocument(); expect(finishButton()).toBeDisabled();
});

test('in-memory drawing is bounded and can recover by undoing a stroke', () => {
  mount(); click('Draw on the path'); const target = surface();
  for (let i = 0; i < 21; i += 1) draw(target, i + 1);
  expect(screen.getAllByTestId('trace-stroke')).toHaveLength(20);
  expect(screen.getByRole('status')).toHaveTextContent('drawing space is full');
  click('Undo last exploration'); draw(target, 30);
  expect(screen.getAllByTestId('trace-stroke')).toHaveLength(20);
});

test('a single stroke stores at most 200 points', () => {
  mount(); click('Draw on the path'); const target = surface();
  fireEvent.pointerDown(target, { pointerId: 1, clientX: 0, clientY: 0 });
  for (let i = 1; i <= 230; i += 1) fireEvent.pointerMove(target, { pointerId: 1, clientX: i, clientY: 20 });
  fireEvent.pointerUp(target, { pointerId: 1, clientX: 240, clientY: 20 });
  expect(screen.getByTestId('trace-stroke').getAttribute('points')?.split(' ')).toHaveLength(200);
});

test('pausing hides controls, cancels an unfinished gesture and preserves earlier completed exploration', () => {
  mount(); click('Draw on the path'); const target = surface(); draw(target);
  fireEvent.pointerDown(target, { pointerId: 2, clientX: 20, clientY: 20 });
  fireEvent.pointerMove(target, { pointerId: 2, clientX: 80, clientY: 20 });
  click('Pause path practice'); expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Record path practice' })).not.toBeInTheDocument();
  click('Continue path practice'); expect(screen.queryByTestId('trace-draft')).not.toBeInTheDocument();
  expect(screen.getAllByTestId('trace-stroke')).toHaveLength(1);
});

test('hidden tabs discard unfinished drawing and cannot finish through stale DOM references', () => {
  const done = mount(); click('Draw on the path'); const target = surface(); draw(target); review();
  const finish = finishButton(); hidden(true); fireEvent.click(finish); expect(done).not.toHaveBeenCalled(); hidden(false);
  fireEvent.pointerDown(target, { pointerId: 2, clientX: 20, clientY: 20 });
  fireEvent.pointerMove(target, { pointerId: 2, clientX: 80, clientY: 20 });
  hidden(true); hidden(false); fireEvent.pointerUp(target, { pointerId: 2, clientX: 100, clientY: 20 });
  expect(screen.getAllByTestId('trace-stroke')).toHaveLength(1); expect(finishButton()).toBeDisabled();
});

test('visible unpaused duration excludes both explicit pause and hidden-tab time', () => {
  const done = mount(); readyStep(); act(() => { jest.advanceTimersByTime(6000); });
  click('Pause path practice'); act(() => { jest.advanceTimersByTime(60000); }); click('Continue path practice');
  act(() => { jest.advanceTimersByTime(6000); }); hidden(true);
  act(() => { jest.advanceTimersByTime(120000); }); hidden(false);
  act(() => { jest.advanceTimersByTime(6000); }); click('Record path practice');
  expect(done).toHaveBeenCalledWith({ durationMinutes: 0.3 });
});

test('a guest can use the same route with no persistent drawing', () => {
  prepareReadyChildScope('guest-child', ['dysgraphia']); useAuthStore.setState({ user: null, isGuest: true });
  const before = { ...localStorage }; const done = mount(); readyStep(); click('Record path practice');
  expect(done).toHaveBeenCalledTimes(1); expect({ ...localStorage }).toEqual(before);
});

test.each(['owner', 'loading', 'profile'] as const)('%s mismatch prevents launch', failure => {
  if (failure === 'owner') useChildProgressStore.setState({ ownerId: 'child-b' });
  if (failure === 'loading') useChildProgressStore.setState({ hydrationStatus: 'loading' });
  if (failure === 'profile') useAuthStore.setState({ profile: { ...useAuthStore.getState().profile!, neuro_types: ['adhd'] } });
  const done = mount(); expect(screen.queryByRole('img')).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('original child session'); expect(done).not.toHaveBeenCalled();
});

test('an account change removes the drawing and rejects stale completion controls', () => {
  const done = mount(); readyStep(); const stale = finishButton();
  act(() => { prepareReadyChildScope('child-b', ['dysgraphia']); });
  expect(screen.queryByRole('img')).not.toBeInTheDocument(); fireEvent.click(stale); expect(done).not.toHaveBeenCalled();
});

test('a batched readiness interruption permanently invalidates the original practice', () => {
  const done = mount(); readyStep();
  act(() => {
    useChildProgressStore.setState({ hydrationStatus: 'loading' });
    useChildProgressStore.setState({ hydrationStatus: 'ready' });
  });
  expect(screen.queryByRole('img')).not.toBeInTheDocument(); expect(done).not.toHaveBeenCalled();
});

test('removing and restoring the profile cannot revive an old confirmation', () => {
  const done = mount(); readyStep(); const profile = useAuthStore.getState().profile!;
  act(() => {
    useAuthStore.setState({ profile: { ...profile, neuro_types: [] } });
    useAuthStore.setState({ profile });
  });
  expect(screen.queryByRole('img')).not.toBeInTheDocument(); expect(done).not.toHaveBeenCalled();
});

test('unmount releases an active pointer without awarding progress', () => {
  const done = jest.fn(); const { unmount } = render(<DysgraphiaTracePathActivity onComplete={done} />);
  click('Draw on the path'); const target = surface();
  const release = jest.fn();
  Object.defineProperties(target, {
    setPointerCapture: { configurable: true, value: jest.fn() },
    hasPointerCapture: { configurable: true, value: () => true },
    releasePointerCapture: { configurable: true, value: release },
  });
  fireEvent.pointerDown(target, { pointerId: 1, clientX: 20, clientY: 20 });
  unmount(); expect(release).toHaveBeenCalledWith(1); expect(done).not.toHaveBeenCalled();
});
