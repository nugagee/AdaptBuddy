import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { prepareReadyChildScope, clearReadyChildScope } from 'testUtils/readyChildScope';
import { emitSpeechEvent, installAuditorySpeechMock, LOCAL_TEST_VOICE } from 'testUtils/auditorySpeechMock';
import AuditoryPracticeActivity from './AuditoryPracticeActivity';
import { AUDITORY_PRACTICE_IDS, CAPTION_EXAMPLES, type AuditoryPracticeId } from './auditoryPracticeContent';

let speech: ReturnType<typeof installAuditorySpeechMock>;
beforeEach(() => {
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-09-11T09:00:00Z'));
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  prepareReadyChildScope('child-a', ['auditory']); speech = installAuditorySpeechMock();
});
afterEach(() => { cleanup(); clearReadyChildScope(); speech.restore(); Reflect.deleteProperty(document, 'hidden'); jest.useRealTimers(); });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const review = (name: string) => fireEvent.click(screen.getByRole('checkbox', { name }));
const hidden = (value: boolean) => {
  Object.defineProperty(document, 'hidden', { configurable: true, value }); fireEvent(document, new Event('visibilitychange'));
};
const mount = (id: AuditoryPracticeId = 'auditory-caption-match') => {
  const done = jest.fn(); const result = render(<AuditoryPracticeActivity activityId={id} onComplete={done} />);
  return { done, ...result };
};
const captionReady = (label = 'A cat sleeping on a mat') => {
  click(label); click('Check my match'); review('I compared my card with the caption');
};
const instructionReady = () => { click('I explored this instruction'); review('I reviewed the instructions I explored'); };

test.each(AUDITORY_PRACTICE_IDS)('%s never auto-plays or awards completion for opening and waiting', id => {
  const { done } = mount(id); act(() => { jest.advanceTimersByTime(60000); });
  expect(speech.synth.speak).not.toHaveBeenCalled(); expect(done).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: id === 'auditory-caption-match' ? 'Record caption practice' : 'Record instruction practice' })).toBeDisabled();
});

test.each(CAPTION_EXAMPLES.map((example, index) => ({ example, index })))('caption $index gives truthful matching feedback and requires review', ({ example, index }) => {
  const { done } = mount(); click(`Example ${index + 1}`);
  const answer = example.choices.find(choice => choice.id === example.answerId)!;
  click(answer.label); expect(screen.getByRole('checkbox')).toBeDisabled(); click('Check my match');
  expect(screen.getByRole('status', { name: 'Caption comparison' })).toHaveTextContent('Your card matches the caption.');
  expect(screen.getByRole('button', { name: 'Record caption practice' })).toBeDisabled();
  review('I compared my card with the caption'); click('Record caption practice');
  expect(done).toHaveBeenCalledWith({ durationMinutes: 0 }); expect(done).toHaveBeenCalledTimes(1);
});

test('a different caption choice gets corrective feedback and equal reviewed-practice credit', () => {
  const { done } = mount(); captionReady('A dog running by a tree');
  expect(screen.getByRole('status', { name: 'Caption comparison' })).toHaveTextContent('A different card matches this caption.');
  click('Record caption practice'); expect(done).toHaveBeenCalledWith({ durationMinutes: 0 });
});

test('changed caption choices, examples and reset cannot reuse an earlier review', () => {
  mount(); captionReady(); click('A dog running by a tree');
  expect(screen.getByRole('checkbox')).not.toBeChecked(); expect(screen.getByRole('checkbox')).toBeDisabled();
  captionReady(); click('Example 2'); expect(screen.getByRole('button', { name: 'Record caption practice' })).toBeDisabled();
  click('A book going into a bag'); click('Check my match'); review('I compared my card with the caption');
  click('Reset caption practice'); expect(screen.getByRole('checkbox')).toBeDisabled();
});

test('caption text is visible by default and can be restored without listening', () => {
  mount(); expect(screen.getByLabelText('Caption transcript')).toHaveTextContent(CAPTION_EXAMPLES[0].caption);
  click('Show caption text'); expect(screen.queryByLabelText('Caption transcript')).not.toBeInTheDocument();
  click('Show caption text'); expect(screen.getByLabelText('Caption transcript')).toBeInTheDocument();
  expect(speech.synth.speak).not.toHaveBeenCalled();
});

test('missing local speech never blocks the text route', () => {
  speech.synth.getVoices.mockReturnValue([]); const { done } = mount();
  expect(screen.getByRole('button', { name: 'Play caption' })).toBeDisabled();
  captionReady(); click('Record caption practice'); expect(done).toHaveBeenCalledTimes(1);
});

test('voices arriving later enable explicit play without autoplay or remote fallback', () => {
  speech.synth.getVoices.mockReturnValue([]); mount();
  speech.synth.getVoices.mockReturnValue([LOCAL_TEST_VOICE]); act(() => { speech.synth.dispatchEvent(new Event('voiceschanged')); });
  expect(screen.getByRole('button', { name: 'Play caption' })).toBeEnabled(); expect(speech.synth.speak).not.toHaveBeenCalled();
  click('Play caption'); expect(speech.utterance().voice).toBe(LOCAL_TEST_VOICE);
});

test('rate changes stop audio without replaying until the child presses Play', () => {
  mount(); click('Play caption'); expect(speech.utterance().rate).toBe(0.75);
  fireEvent.change(screen.getByLabelText('Optional speech rate'), { target: { value: '0.6' } });
  expect(speech.synth.cancel).toHaveBeenCalledTimes(1); expect(speech.synth.speak).toHaveBeenCalledTimes(1);
  click('Play caption'); expect(speech.utterance().rate).toBe(0.6);
});

test('speech ending or failing does not produce a practice completion', () => {
  const { done } = mount(); click('Play caption'); act(() => { emitSpeechEvent(speech.utterance(), 'onend'); });
  expect(done).not.toHaveBeenCalled(); expect(screen.getByRole('button', { name: 'Record caption practice' })).toBeDisabled();
  click('Play caption'); act(() => { emitSpeechEvent(speech.utterance(), 'onerror'); });
  expect(screen.getByRole('status', { name: 'Audio status' })).toHaveTextContent('could not play');
  expect(done).not.toHaveBeenCalled();
});

test('stopping and changing an example cancel only owned audio', () => {
  mount(); click('Play caption'); click('Stop audio'); expect(speech.synth.cancel).toHaveBeenCalledTimes(1);
  click('Play caption'); click('Example 2'); expect(speech.synth.cancel).toHaveBeenCalledTimes(2);
  expect(screen.getByLabelText('Caption transcript')).toHaveTextContent(CAPTION_EXAMPLES[1].caption);
});

test('instructions support exact key words, overview and partial text-only practice', () => {
  const { done } = mount('auditory-slow-speech');
  const current = screen.getByRole('region', { name: 'Current instruction' });
  expect(within(current).getByText('paper').tagName).toBe('STRONG');
  click('Highlight key words'); expect(current.querySelector('strong')).toBeNull();
  click('Show all instructions'); expect(within(screen.getByRole('list', { name: 'All instructions' })).getAllByRole('listitem')).toHaveLength(3);
  instructionReady(); click('Record instruction practice'); expect(done).toHaveBeenCalledWith({ durationMinutes: 0 });
  expect(speech.synth.speak).not.toHaveBeenCalled();
});

test('instruction navigation stops old speech but never marks the new step explored automatically', () => {
  mount('auditory-slow-speech'); click('Play instruction'); click('Next instruction');
  expect(speech.synth.cancel).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('heading', { name: 'Instruction 2 of 3' })).toBeInTheDocument();
  expect(screen.getByRole('checkbox')).toBeDisabled(); click('I explored this instruction');
  expect(screen.getByRole('button', { name: 'This instruction is explored' })).toBeDisabled();
  click('Previous instruction'); expect(screen.getByRole('button', { name: 'I explored this instruction' })).toBeEnabled();
});

test('example/reset changes clear instruction acknowledgements and old review', () => {
  mount('auditory-slow-speech'); instructionReady(); click('A reading space');
  expect(screen.getByRole('checkbox')).toBeDisabled(); instructionReady(); click('Reset instruction practice');
  expect(screen.getByRole('button', { name: 'Record instruction practice' })).toBeDisabled();
});

test('keyboard-only caption selection, checking, review and completion work', async () => {
  const { done } = mount(); screen.getByRole('button', { name: 'A cat sleeping on a mat' }).focus();
  await act(async () => { await userEvent.keyboard('{Enter}'); });
  screen.getByRole('button', { name: 'Check my match' }).focus(); await act(async () => { await userEvent.keyboard('{Enter}'); });
  screen.getByRole('checkbox').focus(); await act(async () => { await userEvent.keyboard(' '); });
  screen.getByRole('button', { name: 'Record caption practice' }).focus(); await act(async () => { await userEvent.keyboard('{Enter}'); });
  expect(done).toHaveBeenCalledTimes(1);
});

test('pause retains answers, hides/disables controls and stops speech without auto-resume', () => {
  const { done } = mount(); captionReady(); click('Play caption'); click('Pause communication practice');
  expect(speech.synth.cancel).toHaveBeenCalledTimes(1); expect(screen.queryByRole('button', { name: 'Record caption practice' })).not.toBeInTheDocument();
  click('Continue communication practice'); expect(screen.getByRole('checkbox')).toBeChecked();
  expect(speech.synth.speak).toHaveBeenCalledTimes(1); expect(done).not.toHaveBeenCalled();
});

test.each(['hidden', 'blur'])('%s stops narration without automatically replaying it', reason => {
  mount(); click('Play caption');
  if (reason === 'hidden') { hidden(true); hidden(false); } else fireEvent(window, new Event('blur'));
  expect(speech.synth.cancel).toHaveBeenCalledTimes(1); expect(speech.synth.speak).toHaveBeenCalledTimes(1);
});

test('measured session time excludes pause and hidden time and resists wall-clock adjustment', () => {
  const { done } = mount(); captionReady(); act(() => { jest.advanceTimersByTime(6000); });
  click('Pause communication practice'); act(() => { jest.advanceTimersByTime(60000); }); click('Continue communication practice');
  hidden(true); act(() => { jest.advanceTimersByTime(120000); }); hidden(false);
  act(() => { jest.setSystemTime(new Date('2025-01-01T00:00:00Z')); jest.advanceTimersByTime(6000); });
  click('Record caption practice'); expect(done).toHaveBeenCalledWith({ durationMinutes: 0.2 });
});

test('guest choices and voice preferences do not add persistent storage or extra completion fields', () => {
  prepareReadyChildScope('guest-child', ['auditory']); useAuthStore.setState({ user: null, isGuest: true });
  const before = { ...localStorage }; const { done } = mount(); captionReady(); click('Record caption practice');
  expect(done).toHaveBeenCalledWith({ durationMinutes: 0 }); expect({ ...localStorage }).toEqual(before);
});

test.each(['owner', 'loading', 'profile'] as const)('%s mismatch prevents launch and audio', reason => {
  if (reason === 'owner') useChildProgressStore.setState({ ownerId: 'child-b' });
  if (reason === 'loading') useChildProgressStore.setState({ hydrationStatus: 'loading' });
  if (reason === 'profile') useAuthStore.setState({ profile: { ...useAuthStore.getState().profile!, neuro_types: ['adhd'] } });
  const { done } = mount(); expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(speech.synth.speak).not.toHaveBeenCalled(); expect(done).not.toHaveBeenCalled();
});

test('account switching cancels current audio immediately and rejects stale completion', () => {
  const { done } = mount(); captionReady(); click('Play caption'); const old = speech.utterance(); const late = old.onend!;
  const finish = screen.getByRole('button', { name: 'Record caption practice' });
  act(() => { prepareReadyChildScope('child-b', ['auditory']); });
  expect(speech.synth.cancel).toHaveBeenCalledTimes(1); expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  act(() => { late.call(old, {} as SpeechSynthesisEvent); }); fireEvent.click(finish); expect(done).not.toHaveBeenCalled();
});

test('batched readiness loss is latched and stops narration even if immediately restored', () => {
  const { done } = mount(); captionReady(); click('Play caption');
  act(() => { useChildProgressStore.setState({ hydrationStatus: 'loading' }); useChildProgressStore.setState({ hydrationStatus: 'ready' }); });
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument(); expect(speech.synth.cancel).toHaveBeenCalledTimes(1); expect(done).not.toHaveBeenCalled();
});

test('changing the mounted activity identifier cannot carry choices or narration into the new tool', () => {
  const { done, rerender } = mount(); captionReady(); click('Play caption');
  rerender(<AuditoryPracticeActivity activityId="auditory-slow-speech" onComplete={done} />);
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument(); expect(speech.synth.cancel).toHaveBeenCalledTimes(1); expect(done).not.toHaveBeenCalled();
});

test('closing the tool cancels its speech and discards choices', () => {
  const { done, unmount } = mount(); captionReady(); click('Play caption'); unmount();
  expect(speech.synth.cancel).toHaveBeenCalledTimes(1); expect(done).not.toHaveBeenCalled();
  mount(); expect(screen.getByRole('checkbox')).toBeDisabled();
});
