import { createAuditorySpeechController, type AuditorySpeechController } from './auditorySpeechController';
import { CAPTION_EXAMPLES } from './auditoryPracticeContent';
import { emitSpeechEvent, installAuditorySpeechMock, LOCAL_TEST_VOICE } from 'testUtils/auditorySpeechMock';

let harness: ReturnType<typeof installAuditorySpeechMock>;
let controller: AuditorySpeechController;
let allowed: boolean;
const notify = jest.fn();
const text = CAPTION_EXAMPLES[0].caption;
beforeEach(() => {
  jest.useFakeTimers(); notify.mockReset(); allowed = true;
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  harness = installAuditorySpeechMock();
  controller = createAuditorySpeechController(() => allowed, notify);
});
afterEach(() => { controller.dispose(); harness.restore(); Reflect.deleteProperty(document, 'hidden'); jest.useRealTimers(); });

test('construction and availability checks never start or cancel audio', () => {
  expect(controller.available()).toBe(true);
  expect(harness.synth.speak).not.toHaveBeenCalled(); expect(harness.synth.cancel).not.toHaveBeenCalled();
});

test('explicit playback uses the exact fixed text, local voice and supported rate', () => {
  controller.play(text, 0.75);
  expect(harness.utterance()).toEqual(expect.objectContaining({ text, voice: LOCAL_TEST_VOICE, lang: 'en-GB', rate: 0.75 }));
  expect(notify).toHaveBeenLastCalledWith('requested');
  emitSpeechEvent(harness.utterance(), 'onstart'); expect(notify).toHaveBeenLastCalledWith('playing');
  emitSpeechEvent(harness.utterance(), 'onend'); expect(notify).toHaveBeenLastCalledWith('finished');
  jest.advanceTimersByTime(60000); expect(notify).toHaveBeenLastCalledWith('finished');
});

test.each([
  { name: 'absent', voices: [] as SpeechSynthesisVoice[] },
  { name: 'remote', voices: [{ ...LOCAL_TEST_VOICE, localService: false }] },
  { name: 'wrong-language', voices: [{ ...LOCAL_TEST_VOICE, lang: 'fr-FR' }] },
])('never falls back to $name voices', ({ voices }) => {
  harness.synth.getVoices.mockReturnValue(voices);
  expect(controller.available()).toBe(false); controller.play(text, 0.75);
  expect(harness.synth.speak).not.toHaveBeenCalled(); expect(notify).toHaveBeenLastCalledWith('unavailable');
});

test('a remote default voice is ignored when a local English voice is available', () => {
  harness.synth.getVoices.mockReturnValue([{ ...LOCAL_TEST_VOICE, localService: false, voiceURI: 'remote' }, LOCAL_TEST_VOICE]);
  controller.play(text, 1); expect(harness.utterance().voice).toBe(LOCAL_TEST_VOICE);
});

test.each(['speaking', 'pending', 'paused'] as const)('does not interrupt unrelated narration when engine is %s', key => {
  harness.synth[key] = true; controller.play(text, 0.75);
  expect(harness.synth.speak).not.toHaveBeenCalled(); expect(harness.synth.cancel).not.toHaveBeenCalled();
  expect(notify).toHaveBeenLastCalledWith('busy');
});

test('arbitrary child text and unsupported rates cannot reach the speech engine', () => {
  controller.play('Private words from a child', 0.75);
  controller.play(text, 20); controller.play(text, NaN);
  expect(harness.synth.speak).not.toHaveBeenCalled();
});

test('unavailable browser APIs and failing voice enumeration remain text-only', () => {
  harness.synth.getVoices.mockImplementation(() => { throw new Error('unavailable'); });
  expect(controller.available()).toBe(false); controller.play(text, 0.75);
  expect(notify).toHaveBeenLastCalledWith('unavailable');
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: undefined });
  expect(controller.available()).toBe(false); controller.play(text, 0.75);
  expect(harness.synth.speak).not.toHaveBeenCalled();
});

test('synchronous speech failure produces no playing or success claim', () => {
  harness.synth.speak.mockImplementation(() => { throw new Error('blocked'); });
  controller.play(text, 0.75); expect(notify).toHaveBeenLastCalledWith('error');
  expect(notify).not.toHaveBeenCalledWith('playing');
});

test('asynchronous failure clears pending timers and permits deliberate retry', () => {
  controller.play(text, 0.75); emitSpeechEvent(harness.utterance(), 'onerror');
  expect(notify).toHaveBeenLastCalledWith('error');
  jest.advanceTimersByTime(60000); expect(notify).toHaveBeenLastCalledWith('error');
  controller.play(text, 0.6); expect(harness.synth.speak).toHaveBeenCalledTimes(2);
});

test('a missing start event expires without counting it as completed audio', () => {
  controller.play(text, 0.75); jest.advanceTimersByTime(8000);
  expect(harness.synth.cancel).toHaveBeenCalledTimes(1); expect(notify).toHaveBeenLastCalledWith('timeout');
  expect(notify).not.toHaveBeenCalledWith('finished');
});

test('audio which never ends is bounded by a watchdog', () => {
  controller.play(text, 0.75); emitSpeechEvent(harness.utterance(), 'onstart');
  jest.advanceTimersByTime(45000); expect(notify).toHaveBeenLastCalledWith('timeout');
});

test('stopping invalidates saved callbacks and does not cancel unrelated speech later', () => {
  controller.play(text, 0.75); const late = harness.utterance().onend!;
  controller.stop(); expect(notify).toHaveBeenLastCalledWith('stopped');
  late.call(harness.utterance(), {} as SpeechSynthesisEvent);
  expect(notify).toHaveBeenLastCalledWith('stopped');
  controller.stop(); expect(harness.synth.cancel).toHaveBeenCalledTimes(1);
});

test('replay discards old utterance callbacks without completing the new one', () => {
  controller.play(text, 0.75); const old = harness.utterance(); const late = old.onend!;
  controller.play(text, 0.6); late.call(old, {} as SpeechSynthesisEvent);
  expect(harness.synth.speak).toHaveBeenCalledTimes(2); expect(notify).toHaveBeenLastCalledWith('requested');
});

test('permission or visibility loss prevents play and rejects late start callbacks', () => {
  allowed = false; controller.play(text, 0.75); expect(harness.synth.speak).not.toHaveBeenCalled();
  allowed = true; controller.play(text, 0.75); allowed = false;
  emitSpeechEvent(harness.utterance(), 'onstart'); expect(notify).toHaveBeenLastCalledWith('stopped');
  allowed = true; Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  controller.play(text, 0.75); expect(harness.synth.speak).toHaveBeenCalledTimes(1);
});

test('removing the active local voice stops it without switching to a remote service', () => {
  controller.play(text, 0.75); harness.synth.getVoices.mockReturnValue([{ ...LOCAL_TEST_VOICE, localService: false }]);
  controller.refresh(); expect(notify).toHaveBeenLastCalledWith('unavailable');
  expect(harness.synth.cancel).toHaveBeenCalledTimes(1); expect(harness.synth.speak).toHaveBeenCalledTimes(1);
});

test('stop failure is reported honestly and cannot immediately launch another utterance', () => {
  controller.play(text, 0.75); harness.synth.cancel.mockImplementation(() => { throw new Error('device error'); });
  controller.play(text, 0.6);
  expect(notify).toHaveBeenLastCalledWith('stop-error'); expect(harness.synth.speak).toHaveBeenCalledTimes(1);
});

test('dispose cancels owned audio, removes callbacks/timers and blocks future playback', () => {
  controller.play(text, 0.75); const late = harness.utterance().onstart!; const count = notify.mock.calls.length;
  controller.dispose(); late.call(harness.utterance(), {} as SpeechSynthesisEvent);
  jest.advanceTimersByTime(60000); controller.play(text, 0.75);
  expect(notify).toHaveBeenCalledTimes(count); expect(harness.synth.speak).toHaveBeenCalledTimes(1);
  expect(controller.available()).toBe(false);
});
