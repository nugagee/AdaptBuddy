import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import { installPronunciationMediaMock } from 'testUtils/pronunciationMediaMock';
import { registerGuidanceMediaBoundary } from '../components/pronunciation/guidanceMediaBoundary';
import PronunciationBuddyPage, { getPronunciationStorageKey } from './PronunciationBuddyPage';
jest.mock('hooks/useAuth', () => { const { useAuthStore: store } = jest.requireActual('store/authStore'); return { useAuth: () => store() }; });
jest.mock('features/child/components/layout/ChildDashboardNavbar', () => () => null);
let browser: ReturnType<typeof installPronunciationMediaMock>;
beforeEach(() => { jest.spyOn(window, 'scrollTo').mockImplementation(() => {}); localStorage.clear(); browser = installPronunciationMediaMock(); prepareReadyChildScope('child-a', ['autism']); });
afterEach(() => { cleanup(); clearReadyChildScope(); browser.restore(); jest.restoreAllMocks(); });
const show = () => render(<MemoryRouter><PronunciationBuddyPage /></MemoryRouter>);
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

test('both approved Honor-inspired experiences are discoverable on the real page without opening automatically', () => {
  show(); expect(screen.getByRole('button', { name: 'Open Calm Bubble' })).toBeEnabled(); expect(screen.getByRole('button', { name: 'Show me how' })).toBeEnabled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(browser.getUserMedia).not.toHaveBeenCalled();
});
test('bubble opening and closing preserve the existing numeric score, history and progress', () => {
  show(); click('I said it myself'); const key = getPronunciationStorageKey('child-a', 'attempts'); const before = localStorage.getItem(key); const progress = useChildProgressStore.getState().completions;
  const launch = screen.getByRole('button', { name: 'Open Calm Bubble' }); launch.focus(); fireEvent.click(launch); expect(screen.getByRole('dialog', { name: 'Calm Bubble' })).toBeInTheDocument();
  click('Close calm moment'); expect(launch).toHaveFocus(); expect(localStorage.getItem(key)).toBe(before); expect(screen.getAllByText(/72%/).length).toBeGreaterThan(0); expect(useChildProgressStore.getState().completions).toEqual(progress);
});
test('opening guidance cancels actual pending capture and stops a late permission stream', async () => {
  let grant!: (stream: unknown) => void; browser.getUserMedia.mockImplementation(() => new Promise(resolve => { grant = resolve; })); show();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Allow temporary recording for this visit' })); click('Record my try'); click('Open Calm Bubble');
  await act(async () => { grant(browser.stream); await Promise.resolve(); });
  expect(browser.track.stop).toHaveBeenCalled(); expect(browser.Recorder.instances).toHaveLength(0); expect(screen.getByRole('dialog', { name: 'Calm Bubble' })).toBeInTheDocument();
});
test('opening a tour deletes the temporary clip and never starts recognition or recording', async () => {
  show(); fireEvent.click(screen.getByRole('checkbox', { name: 'Allow temporary recording for this visit' }));
  await act(async () => { click('Record my try'); await Promise.resolve(); }); click('Stop recording'); expect(screen.getByRole('button', { name: 'Hear my recording' })).toBeEnabled();
  const requested = browser.getUserMedia.mock.calls.length; click('Show me how');
  expect(browser.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-private-clip');
  for (let step = 0; step < 5; step += 1) click('Next step'); click('Finish tour');
  expect(browser.getUserMedia).toHaveBeenCalledTimes(requested); expect(browser.Recognition.instances).toHaveLength(0); expect(screen.getByRole('button', { name: 'Hear my recording' })).toBeDisabled();
});
test('tour steps describe the real controls, preserve unticked agreements and keep scores', () => {
  show(); click('I said it myself'); const before = localStorage.getItem(getPronunciationStorageKey('child-a', 'attempts'));
  const launch = screen.getByRole('button', { name: 'Show me how' }); launch.focus(); fireEvent.click(launch);
  const names = ['Hear an example', 'Choose whether to record', 'Record your own try', 'Stop when you are ready', 'Hear yourself', 'Keep the choice yours'];
  names.forEach((name, index) => { expect(screen.getByRole('heading', { name })).toHaveFocus(); if (index < 5) click('Next step'); });
  click('Back'); expect(screen.getByRole('heading', { name: 'Hear yourself' })).toHaveFocus(); click('Skip tour');
  expect(launch).toHaveFocus(); expect(screen.getByRole('checkbox', { name: 'Allow temporary recording for this visit' })).not.toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Allow browser speech checking for this visit' })).not.toBeChecked();
  expect(browser.getUserMedia).not.toHaveBeenCalled(); expect(browser.synth.speak).not.toHaveBeenCalled(); expect(localStorage.getItem(getPronunciationStorageKey('child-a', 'attempts'))).toBe(before);
});
test('tour traps keyboard focus, hides the background from interaction and restores its attributes', () => {
  const { container } = show(); container.setAttribute('aria-hidden', 'false'); click('Show me how');
  expect(container).toHaveAttribute('inert'); expect(container).toHaveAttribute('aria-hidden', 'true');
  const first = screen.getByRole('button', { name: 'Skip tour' }); const last = screen.getByRole('button', { name: 'Next step' });
  last.focus(); fireEvent.keyDown(last, { key: 'Tab' }); expect(first).toHaveFocus();
  fireEvent.keyDown(first, { key: 'Tab', shiftKey: true }); expect(last).toHaveFocus(); fireEvent.keyDown(last, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(container).not.toHaveAttribute('inert'); expect(container).toHaveAttribute('aria-hidden', 'false');
});
test.each(['bubble', 'tour'] as const)('%s expires on a briefly batched readiness interruption and does not resume', kind => {
  show(); click(kind === 'bubble' ? 'Open Calm Bubble' : 'Show me how');
  act(() => { useChildProgressStore.setState({ hydrationStatus: 'loading' }); useChildProgressStore.setState({ hydrationStatus: 'ready' }); });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(screen.getByText(/Guidance closed because the child session changed/)).toBeInTheDocument();
});
test('switching children dismisses the bubble rather than carrying it into the new session', () => {
  show(); click('Open Calm Bubble'); click('Start calm moment'); act(() => { prepareReadyChildScope('child-b', ['autism']); });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(browser.getUserMedia).not.toHaveBeenCalled(); expect(useChildProgressStore.getState().completions).toHaveLength(0);
});
test('a guest has both visual experiences without new persistent practice data', () => {
  prepareReadyChildScope('guest-child', ['autism']); useAuthStore.setState({ user: null, isGuest: true }); show(); const before = { ...localStorage };
  click('Open Calm Bubble'); click('Start calm moment'); click('Stop'); click('Close calm moment'); click('Show me how'); click('Skip tour');
  expect({ ...localStorage }).toEqual(before); expect(useChildProgressStore.getState().completions).toHaveLength(0);
});
test('unconfirmed media stop prevents opening guidance rather than hiding a live microphone', () => {
  show(); const off = registerGuidanceMediaBoundary('child-a', () => false); click('Open Calm Bubble');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(screen.getByText(/Audio could not be confirmed stopped/)).toBeInTheDocument(); off();
});
test('stale progress prevents guidance launch and no artificial score is recorded', () => {
  show(); act(() => { useChildProgressStore.setState({ ownerId: 'child-b' }); }); click('Show me how');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(localStorage.getItem(getPronunciationStorageKey('child-a', 'attempts'))).toBeNull();
});
test('tour is repeatable and each reopening starts at the first step', () => {
  show(); click('Show me how'); click('Next step'); click('Skip tour'); click('Show me how');
  expect(screen.getByRole('heading', { name: 'Hear an example' })).toHaveFocus(); expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
});
