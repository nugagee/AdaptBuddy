import { createPronunciationMediaController, CLIP_LIMIT_MS, CLIP_LIMIT_BYTES, microphoneErrorMessage } from './pronunciationMediaController';
import { installPronunciationMediaMock } from 'testUtils/pronunciationMediaMock';
let browser: ReturnType<typeof installPronunciationMediaMock>;
let media: ReturnType<typeof createPronunciationMediaController>;
let valid: boolean;
let results: jest.Mock;
beforeEach(() => { jest.useFakeTimers(); browser = installPronunciationMediaMock(); valid = true; results = jest.fn(); media = createPronunciationMediaController({ isCurrent: () => valid, onState: jest.fn(), onRecognised: results }); });
afterEach(() => { media.dispose(); browser.restore(); jest.useRealTimers(); jest.restoreAllMocks(); });
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test('initialisation and missing agreements do not request microphone or speech access', async () => {
  await media.record(false); media.check(false); expect(browser.getUserMedia).not.toHaveBeenCalled(); expect(browser.Recognition.instances).toHaveLength(0); expect(browser.synth.speak).not.toHaveBeenCalled();
});
test('permission request is not labelled as recording; only onstart marks the active recorder', async () => {
  browser.config.autoStart = false; const pending = media.record(true); expect(media.getState().mode).toBe('requesting-recording');
  await pending; expect(media.getState().mode).toBe('requesting-recording'); browser.recorder().onstart?.(); expect(media.getState().mode).toBe('recording');
  expect(browser.getUserMedia).toHaveBeenCalledWith({ audio: true, video: false });
});
test('Stop creates a temporary clip, releases tracks and does not produce a score or autoplay', async () => {
  await media.record(true); media.stop(); expect(media.getState().clipUrl).toBe('blob:synthetic-private-clip'); expect(browser.track.stop).toHaveBeenCalled();
  expect(browser.Player.instances).toHaveLength(0); expect(results).not.toHaveBeenCalled();
});
test('an unapproved pending request can be cancelled and a late stream is immediately stopped', async () => {
  let resolve!: (stream: unknown) => void; browser.getUserMedia.mockReturnValue(new Promise(done => { resolve = done; }));
  const pending = media.record(true); media.cancel(); resolve(browser.stream); await pending;
  expect(browser.track.stop).toHaveBeenCalled(); expect(browser.Recorder.instances).toHaveLength(0); expect(media.getState().clipUrl).toBeNull();
});
test('permission timeout also rejects a late stream without recording', async () => {
  let resolve!: (stream: unknown) => void; browser.getUserMedia.mockReturnValue(new Promise(done => { resolve = done; }));
  const pending = media.record(true); jest.advanceTimersByTime(21000); expect(media.getState().message).toMatch(/not completed in time/);
  resolve(browser.stream); await pending; expect(browser.track.stop).toHaveBeenCalled(); expect(browser.Recorder.instances).toHaveLength(0);
});
test.each(['NotAllowedError', 'NotFoundError', 'NotReadableError'])('%s is explained and does not create a score', async name => {
  browser.getUserMedia.mockRejectedValue({ name }); await media.record(true); expect(media.getState().error).toBe(true);
  expect(media.getState().message).toBe(microphoneErrorMessage({ name })); expect(results).not.toHaveBeenCalled();
});
test('missing recording capability leaves a usable text path', async () => {
  Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: undefined }); await media.record(true);
  expect(browser.getUserMedia).not.toHaveBeenCalled(); expect(media.getState().message).toMatch(/not available/);
});
test('insecure connection does not request a microphone', async () => {
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false }); await media.record(true); expect(browser.getUserMedia).not.toHaveBeenCalled();
});
test('a recorder constructor failure releases the acquired track', async () => {
  browser.config.failRecorder = true; await media.record(true); expect(browser.track.stop).toHaveBeenCalled(); expect(media.getState().error).toBe(true);
});
test('a recorder which never starts is stopped after its startup deadline', async () => {
  browser.config.autoStart = false; await media.record(true); jest.advanceTimersByTime(5000);
  expect(browser.track.stop).toHaveBeenCalled(); expect(media.getState().clipUrl).toBeNull(); expect(results).not.toHaveBeenCalled();
});
test('the clip duration limit stops capture but never marks practice complete', async () => {
  await media.record(true); jest.advanceTimersByTime(CLIP_LIMIT_MS); expect(browser.recorder().stop).toHaveBeenCalled(); expect(browser.track.stop).toHaveBeenCalled(); expect(results).not.toHaveBeenCalled();
});
test('oversized data is discarded and capture stops', async () => {
  await media.record(true); browser.recorder().ondataavailable?.({ data: new Blob(['a'.repeat(CLIP_LIMIT_BYTES + 1)]) });
  expect(media.getState().clipUrl).toBeNull(); expect(browser.track.stop).toHaveBeenCalled(); expect(media.getState().message).toMatch(/size limit/);
});
test('empty audio is not accepted as practice or a replay clip', async () => {
  await media.record(true); browser.recorder().finish(0); expect(media.getState().clipUrl).toBeNull(); expect(results).not.toHaveBeenCalled();
});
test('missing stop data cannot leave the microphone open indefinitely', async () => {
  browser.config.autoStop = false; await media.record(true); media.stop(); expect(browser.track.stop).toHaveBeenCalled(); jest.advanceTimersByTime(5000); expect(media.getState().mode).toBe('idle'); expect(media.getState().clipUrl).toBeNull();
});
test('disconnection and recorder errors delete unfinished clips', async () => {
  await media.record(true); browser.track.onended?.(); expect(media.getState().message).toMatch(/disconnected/); expect(media.getState().clipUrl).toBeNull();
  await media.record(true); browser.recorder().onerror?.(); expect(media.getState().clipUrl).toBeNull(); expect(browser.track.stop).toHaveBeenCalled();
});
test('old recording callbacks cannot resurrect deleted audio', async () => {
  await media.record(true); const data = browser.recorder().ondataavailable!; const stop = browser.recorder().onstop!; media.cancel();
  data({ data: new Blob(['stale']) }); stop(); expect(browser.createObjectURL).not.toHaveBeenCalled();
});
test('replay uses the local clip and only becomes playing on a playback event', async () => {
  await media.record(true); media.stop(); media.replay(); expect(browser.player().src).toBe('blob:synthetic-private-clip'); expect(media.getState().mode).toBe('requesting-replay');
  browser.player().onplaying?.(); expect(media.getState().mode).toBe('replaying'); browser.player().onended?.(); expect(media.getState().mode).toBe('idle'); expect(media.getState().clipUrl).not.toBeNull(); expect(results).not.toHaveBeenCalled();
});
test('replay rejection is recoverable and does not erase practice history', async () => {
  await media.record(true); media.stop(); browser.config.rejectPlay = true;
  media.replay(); await flush(); expect(media.getState().error).toBe(true); expect(media.getState().clipUrl).not.toBeNull(); expect(results).not.toHaveBeenCalled();
});
test('deletion revokes the clip URL, stops playback and detaches callbacks', async () => {
  await media.record(true); media.stop(); media.replay(); const player = browser.player(); media.cancel(true);
  expect(player.pause).toHaveBeenCalled(); expect(player.onended).toBeNull(); expect(browser.revokeObjectURL).toHaveBeenCalledWith('blob:synthetic-private-clip'); expect(media.getState().clipUrl).toBeNull();
});
test('new recording replaces the old temporary clip rather than relabelling it', async () => {
  await media.record(true); media.stop(); await media.record(true); expect(browser.revokeObjectURL).toHaveBeenCalled(); expect(media.getState().clipUrl).toBeNull();
});
test('example speech works without microphone agreement and only with local English voices', () => {
  media.speak('Thank you'); expect(browser.synth.speak).toHaveBeenCalledTimes(1); expect(browser.utterance().voice).toBe(browser.localVoice);
  expect(browser.getUserMedia).not.toHaveBeenCalled(); expect(browser.Recognition.instances).toHaveLength(0);
  expect(media.getState().mode).toBe('requesting-voice'); browser.utterance().onstart?.(); expect(media.getState().mode).toBe('speaking'); browser.utterance().onend?.(); expect(media.getState().mode).toBe('idle');
});
test.each(['remote', 'other-language', 'missing'])('%s voices do not silently use a remote service', kind => {
  browser.synth.getVoices.mockReturnValue(kind === 'missing' ? [] : [{ ...browser.localVoice, localService: kind !== 'remote', lang: kind === 'other-language' ? 'fr-FR' : 'en-GB' }]);
  media.speak('Hello'); expect(browser.synth.speak).not.toHaveBeenCalled(); expect(media.getState().message).toMatch(/No on-device English/);
});
test('existing narration is not cancelled by a new request from this tool', async () => {
  browser.synth.speaking = true; media.speak('Hello'); await media.record(true); expect(browser.synth.cancel).not.toHaveBeenCalled(); expect(browser.getUserMedia).not.toHaveBeenCalled();
});
test('invalid rates and unbounded text never reach the voice engine', () => {
  media.speak('Hello', 4); media.speak('x'.repeat(241)); media.speak(''); expect(browser.synth.speak).not.toHaveBeenCalled();
});
test('stalled voice startup is cancellable and stale callbacks do not restart it', () => {
  media.speak('Hello'); const start = browser.utterance().onstart!; jest.advanceTimersByTime(8000); start(); expect(media.getState().mode).toBe('idle'); expect(browser.synth.cancel).toHaveBeenCalled();
});
test('word checking distinguishes awaiting access from confirmed microphone capture', () => {
  media.check(true); expect(media.getState().mode).toBe('requesting-check'); browser.recognition().onaudiostart?.(); expect(media.getState().mode).toBe('checking');
});
test('only a final nonempty result produces one word-check callback', () => {
  media.check(true); const item = browser.recognition(); item.onresult?.({ results: [{ isFinal: false, 0: { transcript: 'interim' } }] }); expect(results).not.toHaveBeenCalled();
  item.onresult?.({ results: [{ isFinal: true, 0: { transcript: 'hello' } }] }); const end = item.onend!; end(); end(); expect(results).toHaveBeenCalledTimes(1); expect(results).toHaveBeenCalledWith('hello');
});
test('no-speech and empty final results do not add misleading zero scores', () => {
  media.check(true); browser.recognition().onend?.(); expect(results).not.toHaveBeenCalled(); expect(media.getState().message).toMatch(/No new score/);
  media.check(true); browser.recognition().onerror?.({ error: 'no-speech' }); expect(results).not.toHaveBeenCalled();
});
test('browser check permission denial and network failure have different explanations', () => {
  media.check(true); browser.recognition().onerror?.({ error: 'not-allowed' }); expect(media.getState().message).toMatch(/permission/);
  media.check(true); browser.recognition().onerror?.({ error: 'network' }); expect(media.getState().message).toMatch(/could not connect/);
});
test('word checking can be unsupported while record-and-replay remains available', async () => {
  Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: undefined }); media.check(true); expect(media.getState().message).toMatch(/unavailable/);
  await media.record(true); expect(media.getState().mode).toBe('recording');
});
test('starting another audio mode cancels the old browser check and its stale result', async () => {
  media.check(true); const item = browser.recognition(); const end = item.onend!; await media.record(true); end(); expect(item.abort).toHaveBeenCalled(); expect(results).not.toHaveBeenCalled();
});
test('word checking has a bounded timeout and a stop-result timeout', () => {
  media.check(true); jest.advanceTimersByTime(45000); expect(browser.recognition().abort).toHaveBeenCalled(); expect(results).not.toHaveBeenCalled();
  media.check(true); browser.recognition().onaudiostart?.(); media.stop(); jest.advanceTimersByTime(5000); expect(results).not.toHaveBeenCalled();
});
test('scope loss and disposal stop pending streams and prevent delayed scoring', async () => {
  media.check(true); const end = browser.recognition().onend!; valid = false; media.dispose(); end(); await media.record(true); expect(results).not.toHaveBeenCalled(); expect(browser.getUserMedia).not.toHaveBeenCalled();
});
test('hidden pages cannot start a media action', async () => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: true }); await media.record(true); media.check(true); media.speak('Hello'); expect(browser.getUserMedia).not.toHaveBeenCalled(); expect(browser.synth.speak).not.toHaveBeenCalled();
});
test('audio clips and recognised text are not written to browser storage', async () => {
  const spy = jest.spyOn(Storage.prototype, 'setItem'); await media.record(true); media.stop(); media.replay(); await flush(); media.cancel();
  media.check(true); browser.recognition().onresult?.({ results: [{ isFinal: true, 0: { transcript: 'private words' } }] }); browser.recognition().onend?.(); expect(spy).not.toHaveBeenCalled();
});
