import React, { createRef } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { useUiStore } from 'store/uiStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import { installPronunciationMediaMock } from 'testUtils/pronunciationMediaMock';
import PronunciationAudioStudio, { type PronunciationAudioHandle } from './PronunciationAudioStudio';
import PronunciationPromptCards from './PronunciationPromptCards';
let browser: ReturnType<typeof installPronunciationMediaMock>;
beforeEach(() => { jest.useFakeTimers(); browser = installPronunciationMediaMock(); prepareReadyChildScope('child-a', ['autism']); useUiStore.setState({ reducedMotion: false }); });
afterEach(() => { cleanup(); clearReadyChildScope(); browser.restore(); jest.useRealTimers(); jest.restoreAllMocks(); });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const agree = (name = 'Allow temporary recording for this visit') => fireEvent.click(screen.getByRole('checkbox', { name }));
const record = async () => { agree(); await act(async () => { click('Record my try'); await Promise.resolve(); }); };
const mount = () => { const result = jest.fn(); const ref = createRef<PronunciationAudioHandle>(); const view = render(<PronunciationAudioStudio ref={ref} ownerId="child-a" itemId="hello" phrase="Hello" onRecognised={result} />); return { ...view, result, ref }; };

test('both microphone features begin off and agreements do not pretend browser permission was granted', () => {
  mount(); expect(screen.getByRole('button', { name: 'Record my try' })).toBeDisabled(); expect(screen.getByRole('button', { name: 'Use mic' })).toBeDisabled();
  agree(); expect(browser.getUserMedia).not.toHaveBeenCalled(); expect(screen.getByText('Microphone off')).toBeInTheDocument(); expect(screen.queryByText('Mic enabled')).not.toBeInTheDocument();
});
test('hearing an example needs neither microphone agreement nor recording', () => {
  mount(); click('Slow'); expect(browser.synth.speak).toHaveBeenCalledTimes(1); expect(browser.getUserMedia).not.toHaveBeenCalled(); expect(browser.Recognition.instances).toHaveLength(0);
});
test('record stop replay delete runs through actual controls without an automatic practice result', async () => {
  const { result } = mount(); await record(); expect(screen.getByText('Microphone recording')).toBeInTheDocument(); click('Stop recording');
  expect(browser.track.stop).toHaveBeenCalled(); click('Hear my recording'); expect(browser.player().play).toHaveBeenCalled(); click('Delete recording');
  expect(screen.getByRole('button', { name: 'Hear my recording' })).toBeDisabled(); expect(browser.revokeObjectURL).toHaveBeenCalled(); expect(result).not.toHaveBeenCalled();
});
test('browser checking needs its separate opt-in and reports final words once', () => {
  const { result } = mount(); agree(); expect(screen.getByRole('button', { name: 'Use mic' })).toBeDisabled();
  agree('Allow browser speech checking for this visit'); click('Use mic'); expect(screen.queryByText('Microphone checking words')).not.toBeInTheDocument();
  act(() => { browser.recognition().onaudiostart?.(); }); expect(screen.getByText('Microphone checking words')).toBeInTheDocument();
  act(() => { browser.recognition().onresult?.({ results: [{ isFinal: true, 0: { transcript: 'hello' } }] }); browser.recognition().onend?.(); });
  expect(result).toHaveBeenCalledWith('hello'); expect(screen.getByText('What the browser heard this visit')).toBeInTheDocument();
});
test('a permission prompt which blurs the window can still be answered', async () => {
  let resolve!: (value: unknown) => void; browser.getUserMedia.mockReturnValue(new Promise(done => { resolve = done; })); mount(); agree(); click('Record my try');
  fireEvent(window, new Event('blur')); await act(async () => { resolve(browser.stream); await Promise.resolve(); });
  expect(screen.getByText('Microphone recording')).toBeInTheDocument();
});
test('revoking recording agreement while permission is pending rejects the late stream', async () => {
  let resolve!: (value: unknown) => void; browser.getUserMedia.mockReturnValue(new Promise(done => { resolve = done; })); mount(); agree(); click('Record my try'); agree();
  await act(async () => { resolve(browser.stream); await Promise.resolve(); }); expect(browser.track.stop).toHaveBeenCalled(); expect(browser.Recorder.instances).toHaveLength(0);
});
test('turning the microphone options off stops capture and does not turn it back on automatically', async () => {
  mount(); await record(); click('Turn microphone options off'); expect(browser.track.stop).toHaveBeenCalled();
  expect(screen.getAllByRole('checkbox').every(box => !(box as HTMLInputElement).checked)).toBe(true); expect(screen.getByRole('button', { name: 'Record my try' })).toBeDisabled();
});
test('item changes revoke a clip and require fresh recording agreement', async () => {
  const { rerender, result } = mount(); await record(); click('Stop recording');
  rerender(<PronunciationAudioStudio ownerId="child-a" itemId="thanks" phrase="Thank you" onRecognised={result} />);
  expect(browser.revokeObjectURL).toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Hear my recording' })).toBeDisabled(); expect(screen.getByRole('checkbox', { name: 'Allow temporary recording for this visit' })).not.toBeChecked();
});
test('same-id phrase changes also invalidate recording state', async () => {
  const { rerender, result } = mount(); await record(); rerender(<PronunciationAudioStudio ownerId="child-a" itemId="hello" phrase="Changed text" onRecognised={result} />);
  expect(browser.track.stop).toHaveBeenCalled(); expect(screen.getByText('Microphone off')).toBeInTheDocument();
});
test('account switch clears audio synchronously and rejects the saved browser result callback', () => {
  const { result } = mount(); agree('Allow browser speech checking for this visit'); click('Use mic'); const handler = browser.recognition().onresult!;
  act(() => { prepareReadyChildScope('child-b', ['autism']); });
  act(() => { handler({ results: [{ isFinal: true, 0: { transcript: 'old child' } }] }); });
  expect(browser.recognition().abort).toHaveBeenCalled(); expect(result).not.toHaveBeenCalled(); expect(screen.queryByText('old child')).not.toBeInTheDocument();
});
test('a brief batched readiness loss permanently expires the original audio session', async () => {
  mount(); await record(); act(() => { useChildProgressStore.setState({ hydrationStatus: 'loading' }); useChildProgressStore.setState({ hydrationStatus: 'ready' }); });
  expect(browser.track.stop).toHaveBeenCalled(); expect(screen.getByText('Audio controls paused for privacy')).toBeInTheDocument();
});
test('initial loading is not treated as an expired session', () => {
  useChildProgressStore.setState({ hydrationStatus: 'loading' }); mount(); expect(screen.getByRole('button', { name: 'Slow' })).toBeDisabled();
  act(() => { useChildProgressStore.setState({ hydrationStatus: 'ready' }); }); expect(screen.getByRole('button', { name: 'Slow' })).toBeEnabled();
});
test('hiding the page deletes a clip and does not replay or record on return', async () => {
  mount(); await record(); click('Stop recording'); Object.defineProperty(document, 'hidden', { configurable: true, value: true }); fireEvent(document, new Event('visibilitychange'));
  Object.defineProperty(document, 'hidden', { configurable: true, value: false }); fireEvent(document, new Event('visibilitychange'));
  expect(browser.revokeObjectURL).toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Hear my recording' })).toBeDisabled(); expect(browser.getUserMedia).toHaveBeenCalledTimes(1);
});
test('leaving the page clears a replay clip and stops playback', async () => {
  const { unmount } = mount(); await record(); click('Stop recording'); click('Hear my recording'); unmount();
  expect(browser.player().pause).toHaveBeenCalled(); expect(browser.revokeObjectURL).toHaveBeenCalled();
});
test('guest recording never creates persistent clip or agreement storage', async () => {
  prepareReadyChildScope('guest-child', ['autism']); useAuthStore.setState({ user: null, isGuest: true }); const before = { ...localStorage };
  render(<PronunciationAudioStudio ownerId="guest-child" itemId="hello" phrase="Hello" onRecognised={jest.fn()} />); await record(); click('Stop recording');
  expect({ ...localStorage }).toEqual(before);
});
test('the imperative shortcut focuses controls and never turns on the mic', () => {
  const { ref } = mount(); act(() => { ref.current?.focus(); }); expect(screen.getByRole('heading', { name: 'Hear, record and practise' })).toHaveFocus(); expect(browser.getUserMedia).not.toHaveBeenCalled();
});
test('all four prompt icons have actual keyboard-accessible actions', async () => {
  const actions = [jest.fn(), jest.fn(), jest.fn(), jest.fn()];
  render(<PronunciationPromptCards onHear={actions[0]} onSay={actions[1]} onRetry={actions[2]} onWords={actions[3]} />);
  screen.getByRole('button', { name: 'Hear it' }).focus(); await act(async () => { await userEvent.keyboard('{Enter}'); });
  click('Say it'); click('Try again'); click('Keep words'); actions.forEach(action => expect(action).toHaveBeenCalledTimes(1));
});
test('Calm Motion is reflected by both the audio controls and shortcut cards', () => {
  const { container } = render(<><PronunciationAudioStudio ownerId="child-a" itemId="hello" phrase="Hello" onRecognised={jest.fn()} /><PronunciationPromptCards onHear={jest.fn()} onSay={jest.fn()} onRetry={jest.fn()} onWords={jest.fn()} /></>);
  act(() => { useUiStore.setState({ reducedMotion: true }); });
  expect(container.querySelectorAll('.pronunciation-motion[data-calm="true"]')).toHaveLength(2);
});
