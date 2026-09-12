import { calmBubbleFrame, CALM_CYCLES, CALM_DURATIONS } from './calmBubbleModel';
import { createCalmCueVoice } from './calmCueVoice';
import { preparePracticeGuidance, registerGuidanceMediaBoundary } from './guidanceMediaBoundary';
import { installPronunciationMediaMock } from 'testUtils/pronunciationMediaMock';

let browser: ReturnType<typeof installPronunciationMediaMock>;
beforeEach(() => { jest.useFakeTimers(); browser = installPronunciationMediaMock(); });
afterEach(() => { browser.restore(); jest.useRealTimers(); });

test.each(CALM_CYCLES)('cycle %d grows and shrinks continuously without a hold phase', cycle => {
  expect(calmBubbleFrame(0, cycle, false)).toEqual(expect.objectContaining({ scale: 0.72, cue: 'Breathe in gently' }));
  expect(calmBubbleFrame(cycle / 2, cycle, false)).toEqual(expect.objectContaining({ scale: 1, cue: 'Breathe out gently' }));
  expect(calmBubbleFrame(cycle, cycle, false).scale).toBeCloseTo(0.72);
  expect(calmBubbleFrame(cycle / 4, cycle, false).scale).toBeCloseTo(0.86);
  expect(calmBubbleFrame(cycle * 3 / 4, cycle, false).scale).toBeCloseTo(0.86);
});
test('untimed is a real option and malformed elapsed values cannot produce invalid transforms', () => {
  expect(CALM_DURATIONS).toEqual([60000, 120000, 0]);
  for (const value of [NaN, Infinity, -50]) expect(calmBubbleFrame(value, 8000, false).scale).toBe(0.72);
});
test('watch mode describes movement rather than instructing breathing', () => {
  expect(calmBubbleFrame(0, 8000, true).cue).toBe('The bubble grows');
  expect(calmBubbleFrame(4000, 8000, true).cue).toBe('The bubble shrinks');
});
test('guidance cannot proceed without the matching page audio boundary', () => {
  const stop = jest.fn(() => true); const off = registerGuidanceMediaBoundary('a', stop);
  expect(preparePracticeGuidance(null)).toBe(false); expect(preparePracticeGuidance('b')).toBe(false); expect(stop).not.toHaveBeenCalled();
  expect(preparePracticeGuidance('a')).toBe(true); expect(stop).toHaveBeenCalledTimes(1); off(); expect(preparePracticeGuidance('a')).toBe(false);
});
test('stale boundary cleanup cannot remove a newer registration', () => {
  const old = registerGuidanceMediaBoundary('a', () => true); const stop = jest.fn(() => true); const off = registerGuidanceMediaBoundary('b', stop);
  old(); expect(preparePracticeGuidance('b')).toBe(true); off();
});
test.each([false, 'throw'] as const)('an unconfirmed stop %s fails closed', result => {
  const off = registerGuidanceMediaBoundary('a', () => { if (result === 'throw') throw new Error('failed'); return false; });
  expect(preparePracticeGuidance('a')).toBe(false); off();
});
test('only fixed optional cues reach a browser-reported local voice and no microphone is called', () => {
  const unavailable = jest.fn(); const voice = createCalmCueVoice(() => true, unavailable);
  voice.speak('private arbitrary phrase'); expect(browser.synth.speak).not.toHaveBeenCalled();
  voice.speak('Breathe in gently'); const utterance = browser.utterance();
  expect(utterance.text).toBe('Breathe in gently'); expect(utterance.voice).toBe(browser.localVoice); expect(utterance.rate).toBe(0.92);
  utterance.onstart?.(); utterance.onend?.(); jest.advanceTimersByTime(10000); expect(unavailable).not.toHaveBeenCalled();
  expect(browser.getUserMedia).not.toHaveBeenCalled(); expect(browser.Recognition.instances).toHaveLength(0); voice.dispose();
});
test('remote-only or missing voices cannot silently become a fallback', () => {
  browser.synth.getVoices.mockReturnValue([{ ...browser.localVoice, localService: false }]); const unavailable = jest.fn();
  const voice = createCalmCueVoice(() => true, unavailable); voice.speak('Breathe in gently');
  expect(browser.synth.speak).not.toHaveBeenCalled(); expect(unavailable).toHaveBeenCalledTimes(1); voice.dispose();
});
test.each(['speaking', 'pending', 'paused'] as const)('other %s narration is not cancelled', key => {
  browser.synth[key] = true; const unavailable = jest.fn(); const voice = createCalmCueVoice(() => true, unavailable);
  voice.speak('Breathe in gently'); expect(unavailable).toHaveBeenCalledTimes(1); expect(browser.synth.cancel).not.toHaveBeenCalled(); expect(browser.synth.speak).not.toHaveBeenCalled(); voice.dispose();
});
test('late voice start is cancelled rather than playing out-of-date breathing guidance', () => {
  const unavailable = jest.fn(); const voice = createCalmCueVoice(() => true, unavailable); voice.speak('Breathe in gently'); const callback = browser.utterance().onstart;
  jest.advanceTimersByTime(900); expect(unavailable).toHaveBeenCalledTimes(1); expect(browser.synth.cancel).toHaveBeenCalled(); callback?.();
  expect(browser.utterance().onstart).toBeNull(); voice.dispose();
});
test('a stuck voice is bounded and pending callbacks cannot revive after disposal', () => {
  const unavailable = jest.fn(); const voice = createCalmCueVoice(() => true, unavailable); voice.speak('Breathe in gently'); browser.utterance().onstart?.();
  jest.advanceTimersByTime(2500); expect(unavailable).toHaveBeenCalledTimes(1); voice.dispose(); voice.speak('Breathe out gently'); expect(browser.synth.speak).toHaveBeenCalledTimes(1);
});
test('hidden or expired sessions never request a spoken prompt', () => {
  let current = false; const voice = createCalmCueVoice(() => current, jest.fn()); voice.speak('Breathe in gently');
  current = true; Object.defineProperty(document, 'hidden', { configurable: true, value: true }); voice.speak('Breathe in gently');
  expect(browser.synth.speak).not.toHaveBeenCalled(); voice.dispose();
});
