import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useUiStore } from 'store/uiStore';
import { installPronunciationMediaMock } from 'testUtils/pronunciationMediaMock';
import CalmBubble from './CalmBubble';

let browser: ReturnType<typeof installPronunciationMediaMock>;
beforeEach(() => { jest.spyOn(window, 'scrollTo').mockImplementation(() => {}); jest.useFakeTimers(); browser = installPronunciationMediaMock(); useUiStore.setState({ reducedMotion: false }); });
afterEach(() => { cleanup(); browser.restore(); useUiStore.setState({ reducedMotion: false }); jest.restoreAllMocks(); jest.useRealTimers(); });
const show = (isCurrent = () => true) => { const close = jest.fn(); render(<CalmBubble isCurrent={isCurrent} onClose={close} />); return close; };
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const advance = (time: number) => act(() => { jest.advanceTimersByTime(time); });

test('opening is silent, still at rest, and never accesses a microphone', () => {
  show(); advance(10000); expect(screen.getByRole('status')).toHaveTextContent('A moment for you');
  expect(browser.synth.speak).not.toHaveBeenCalled(); expect(browser.getUserMedia).not.toHaveBeenCalled(); expect(browser.Recognition.instances).toHaveLength(0);
  expect(screen.getByRole('button', { name: 'Pause' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled();
});
test('explicit start produces grow/shrink cues and the visible optional timer', () => {
  show(); click('Start calm moment'); expect(screen.getByRole('status')).toHaveTextContent('Breathe in gently'); advance(4000);
  expect(screen.getByRole('status')).toHaveTextContent('Breathe out gently'); expect(screen.getByText('0:56 of chosen time remaining')).toBeInTheDocument();
});
test('pause freezes time; continuing preserves remaining time but restarts a gentle visual cycle', () => {
  show(); click('Start calm moment'); advance(6000); click('Pause'); advance(30000);
  expect(screen.getByText('0:54 of chosen time remaining')).toBeInTheDocument(); click('Continue calm moment');
  expect(screen.getByRole('status')).toHaveTextContent('Breathe in gently'); advance(4000); expect(screen.getByText('0:50 of chosen time remaining')).toBeInTheDocument();
});
test.each(['visibilitychange', 'blur', 'pagehide'] as const)('%s pauses without automatic return', event => {
  show(); click('Start calm moment'); advance(6000);
  if (event === 'visibilitychange') { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); fireEvent(document, new Event(event)); }
  else fireEvent(window, new Event(event));
  advance(30000); Object.defineProperty(document, 'hidden', { configurable: true, value: false }); fireEvent(document, new Event('visibilitychange'));
  expect(screen.getByRole('button', { name: 'Continue calm moment' })).toBeEnabled(); expect(screen.getByText('0:54 of chosen time remaining')).toBeInTheDocument();
});
test('a finite chosen duration ends gently with no automatic new session or audio', () => {
  show(); click('Start calm moment'); advance(60000);
  expect(screen.getByRole('status')).toHaveTextContent('Your chosen time has ended'); expect(screen.getByRole('button', { name: 'Start again' })).toBeEnabled();
  advance(30000); expect(screen.getByText('0:00 of chosen time remaining')).toBeInTheDocument(); expect(browser.synth.speak).not.toHaveBeenCalled();
});
test('the two-minute choice uses its actual duration', () => {
  show(); fireEvent.change(screen.getByRole('combobox', { name: 'Session length' }), { target: { value: '120000' } }); click('Start calm moment'); advance(60000);
  expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled(); expect(screen.getByText('1:00 of chosen time remaining')).toBeInTheDocument(); advance(60000);
  expect(screen.getByRole('status')).toHaveTextContent('Your chosen time has ended');
});
test('untimed continues until the user stops, and no completion record is created', () => {
  show(); const before = { ...localStorage }; fireEvent.change(screen.getByRole('combobox', { name: 'Session length' }), { target: { value: '0' } }); click('Start calm moment'); advance(180000);
  expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled(); click('Stop'); advance(10000); expect(screen.getByRole('status')).toHaveTextContent('Stopped. Your choice.'); expect({ ...localStorage }).toEqual(before);
});
test('watch-only uses movement descriptions, not breathing instructions', () => {
  show(); fireEvent.click(screen.getByRole('checkbox', { name: 'Just watch the bubble' })); click('Start calm moment');
  expect(screen.getByRole('status')).toHaveTextContent('The bubble grows'); advance(4000); expect(screen.getByRole('status')).toHaveTextContent('The bubble shrinks');
});
test('setup is locked during a running moment and changing a paused setup clears old elapsed time', () => {
  show(); click('Start calm moment'); advance(5000); expect(screen.getByRole('combobox', { name: 'Visual circle pace' })).toBeDisabled();
  click('Pause'); fireEvent.change(screen.getByRole('combobox', { name: 'Visual circle pace' }), { target: { value: '6000' } });
  expect(screen.getByRole('button', { name: 'Start calm moment' })).toBeEnabled(); expect(screen.getByText('1:00 of chosen time remaining')).toBeInTheDocument();
});
test('still visual can be enabled immediately without interrupting accessible text prompts', () => {
  show(); click('Start calm moment'); fireEvent.click(screen.getByRole('checkbox', { name: 'Still visual' }));
  expect(screen.getByTestId('calm-bubble').parentElement).toHaveAttribute('data-still', 'true'); advance(4000);
  expect(screen.getByRole('status')).toHaveTextContent('Breathe out gently');
});
test('global Calm Motion cannot be overridden by turning the local still setting off', () => {
  useUiStore.setState({ reducedMotion: true }); show(); click('Start calm moment');
  expect(screen.getByTestId('calm-bubble').parentElement).toHaveAttribute('data-still', 'true');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Still visual' })); fireEvent.click(screen.getByRole('checkbox', { name: 'Still visual' }));
  expect(screen.getByTestId('calm-bubble').parentElement).toHaveAttribute('data-still', 'true');
});
test('spoken prompts require opting in and explicit start; unchecking cancels owned speech', () => {
  show(); fireEvent.click(screen.getByRole('checkbox', { name: 'Spoken prompts (optional)' })); expect(browser.synth.speak).not.toHaveBeenCalled();
  click('Start calm moment'); expect(browser.utterance().text).toBe('Breathe in gently');
  fireEvent.click(screen.getByRole('checkbox', { name: 'Spoken prompts (optional)' })); expect(browser.synth.cancel).toHaveBeenCalled(); expect(browser.getUserMedia).not.toHaveBeenCalled();
});
test('a missing local voice disables only audio and preserves the visible experience', () => {
  browser.synth.getVoices.mockReturnValue([]); show(); fireEvent.click(screen.getByRole('checkbox', { name: 'Spoken prompts (optional)' })); click('Start calm moment');
  expect(screen.getByRole('checkbox', { name: 'Spoken prompts (optional)' })).not.toBeChecked(); expect(screen.getByText(/An on-device English voice is not ready/)).toBeInTheDocument(); expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();
});
test('Escape and the visible close button are available without completing the activity', () => {
  const close = show(); fireEvent.keyDown(document, { key: 'Escape' }); expect(close).toHaveBeenCalledTimes(1); click('Close calm moment'); expect(close).toHaveBeenCalledTimes(2);
});
test('an invalidated owner cannot restart, and active time pauses on the next tick', () => {
  let valid = true; show(() => valid); click('Start calm moment'); advance(1000); valid = false; advance(50);
  expect(screen.getByRole('button', { name: 'Continue calm moment' })).toBeEnabled(); click('Continue calm moment'); expect(screen.getByRole('button', { name: 'Pause' })).toBeDisabled();
});
test('unmount cancels all owned speech and timer work', () => {
  show(); fireEvent.click(screen.getByRole('checkbox', { name: 'Spoken prompts (optional)' })); click('Start calm moment'); const calls = browser.synth.speak.mock.calls.length;
  cleanup(); advance(90000); expect(browser.synth.speak).toHaveBeenCalledTimes(calls); expect(browser.synth.cancel).toHaveBeenCalled();
});
