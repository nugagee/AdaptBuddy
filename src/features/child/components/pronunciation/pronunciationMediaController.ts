export type PronunciationMediaMode = 'idle' | 'requesting-recording' | 'recording' | 'finishing-recording' | 'requesting-replay' | 'replaying' | 'requesting-check' | 'checking' | 'requesting-voice' | 'speaking';
export interface PronunciationMediaState {
  mode: PronunciationMediaMode;
  message: string;
  error: boolean;
  clipUrl: string | null;
  transcript: string;
}
export interface RecognitionLike {
  continuous: boolean; interimResults: boolean; lang: string; maxAlternatives?: number;
  onaudiostart: (() => void) | null; onaudioend: (() => void) | null;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void; abort?: () => void;
}
type RecognitionWindow = Window & { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
export const CLIP_LIMIT_MS = 30000;
export const CLIP_LIMIT_BYTES = 4 * 1024 * 1024;
const REQUEST_LIMIT_MS = 20000;
export const EMPTY_MEDIA_STATE: PronunciationMediaState = { mode: 'idle', message: 'Microphone off. Hearing an example does not need microphone permission.', error: false, clipUrl: null, transcript: '' };

export const microphoneErrorMessage = (error: unknown) => {
  const value = error as { name?: string; error?: string } | null;
  switch (value?.error ?? value?.name) {
    case 'NotAllowedError': case 'PermissionDeniedError': case 'not-allowed': case 'service-not-allowed':
      return 'Microphone permission was not granted. Check this site’s microphone setting and your device settings, then try again. Private practice still works.';
    case 'NotFoundError': case 'DevicesNotFoundError': case 'audio-capture':
      return 'No usable microphone was found. Check that a microphone is connected and available. You can still practise privately.';
    case 'NotReadableError': case 'TrackStartError':
      return 'The microphone may be busy in another app. Close that recording or call, then try again.';
    case 'network': return 'The browser speech-check service could not connect. Temporary record-and-replay and private practice are separate options.';
    case 'no-speech': return 'The browser did not return speech this time. No new score was added. You can try again or use a self-check.';
    case 'language-not-supported': return 'This browser cannot check English speech right now. Record-and-replay or private practice may still work.';
    default: return 'This audio action did not finish. Your score was not changed. Try again or use private practice.';
  }
};

/** One active media operation; audio and transcripts never enter storage or app API calls. */
export function createPronunciationMediaController(options: {
  isCurrent: () => boolean;
  onState: (state: PronunciationMediaState) => void;
  onRecognised: (text: string) => void;
}) {
  let disposed = false;
  let generation = 0;
  let state: PronunciationMediaState = { ...EMPTY_MEDIA_STATE };
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let recognition: RecognitionLike | null = null;
  let audio: HTMLAudioElement | null = null;
  let utterance: SpeechSynthesisUtterance | null = null;
  let utteranceEngine: SpeechSynthesis | null = null;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const current = () => !disposed && options.isCurrent() && !document.hidden;
  const active = (token: number) => token === generation && current();
  const emit = (next: Partial<PronunciationMediaState>) => {
    state = { ...state, ...next };
    if (!disposed && options.isCurrent()) options.onState({ ...state });
  };
  const clearTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
  const later = (fn: () => void, ms: number) => { const timer = setTimeout(fn, ms); timers.add(timer); return timer; };
  const stopTracks = () => {
    const old = stream; stream = null;
    old?.getTracks().forEach(track => { track.onended = null; try { track.stop(); } catch { /* Browser may have already ended it. */ } });
  };
  const detachRecorder = (item: MediaRecorder) => { item.onstart = null; item.ondataavailable = null; item.onstop = null; item.onerror = null; };
  const detachRecognition = (item: RecognitionLike) => { item.onaudiostart = null; item.onaudioend = null; item.onresult = null; item.onerror = null; item.onend = null; };
  const eraseClip = () => {
    if (state.clipUrl) { try { URL.revokeObjectURL(state.clipUrl); } catch { /* Nothing else retains the clip. */ } }
    state = { ...state, clipUrl: null };
  };
  const halt = (): boolean => {
    generation += 1; clearTimers();
    let stopped = true;
    const oldRecorder = recorder; recorder = null;
    if (oldRecorder) { detachRecorder(oldRecorder); try { if (oldRecorder.state !== 'inactive') oldRecorder.stop(); } catch { /* Tracks are stopped below too. */ } }
    stopTracks();
    const oldRecognition = recognition; recognition = null;
    if (oldRecognition) { detachRecognition(oldRecognition); try { if (oldRecognition.abort) oldRecognition.abort(); else oldRecognition.stop(); } catch { stopped = false; } }
    const oldAudio = audio; audio = null;
    if (oldAudio) { oldAudio.onplaying = null; oldAudio.onended = null; oldAudio.onerror = null; try { oldAudio.pause(); oldAudio.removeAttribute('src'); oldAudio.load(); } catch { stopped = false; } }
    const oldUtterance = utterance; const engine = utteranceEngine; utterance = null; utteranceEngine = null;
    if (oldUtterance) { oldUtterance.onstart = null; oldUtterance.onend = null; oldUtterance.onerror = null; try { engine?.cancel(); } catch { stopped = false; } }
    return stopped;
  };
  const cancel = (deleteClip = true, message = 'Microphone off. AdaptBuddy stopped its audio. No replay clip was uploaded.') => {
    const stopped = halt(); if (deleteClip) eraseClip();
    emit({ mode: 'idle', transcript: '', error: !stopped, message: stopped ? message : 'The browser did not confirm audio stopped. Close this page to stop it; do not start another recording.' });
    return stopped;
  };
  const fail = (message: string, deleteClip = false) => { halt(); if (deleteClip) eraseClip(); emit({ mode: 'idle', error: true, message }); };
  const begin = (deleteClip = false): number | null => {
    if (!current()) return null;
    if (!cancel(deleteClip)) return null;
    // Do not record over narration owned by another component or app context.
    try { if (window.speechSynthesis?.speaking || window.speechSynthesis?.pending || window.speechSynthesis?.paused) { emit({ error: true, message: 'Another voice is playing or paused. Stop that narration before starting this audio action.' }); return null; } } catch { /* Speech synthesis is optional. */ }
    return generation;
  };
  const recordingAvailable = () => Boolean(window.isSecureContext !== false && typeof navigator.mediaDevices?.getUserMedia === 'function' && typeof window.MediaRecorder === 'function' && typeof URL.createObjectURL === 'function');
  const recognitionConstructor = () => (window as RecognitionWindow).SpeechRecognition ?? (window as RecognitionWindow).webkitSpeechRecognition;

  const stopRecording = () => {
    const item = recorder; const token = generation;
    if (!item || !active(token) || state.mode !== 'recording') return;
    clearTimers(); emit({ mode: 'finishing-recording', message: 'Microphone stopping. Preparing your temporary clip…' });
    later(() => { if (active(token) && recorder === item) fail('The recording could not be prepared. The microphone has been stopped and the unfinished clip deleted.', true); }, 5000);
    try { item.stop(); stopTracks(); }
    catch { fail('The recording could not finish. The microphone has been stopped; try a new recording.', true); }
  };
  const record = async (consent: boolean) => {
    if (!consent || !current()) return;
    const token = begin(true); if (token === null) return;
    if (!recordingAvailable()) { emit({ error: true, message: 'Temporary recording is not available in this browser or connection. Use a secure browser page, or practise privately.' }); return; }
    emit({ mode: 'requesting-recording', error: false, message: 'Waiting for browser microphone permission. Recording has not started.' });
    const requestTimer = later(() => { if (active(token)) cancel(true, 'Permission was not completed in time. You can retry. Any late microphone stream will be stopped, not recorded.'); }, REQUEST_LIMIT_MS);
    try {
      const granted = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (!active(token)) { granted.getTracks().forEach(track => track.stop()); return; }
      clearTimeout(requestTimer); stream = granted;
      const live = granted.getAudioTracks().some(track => track.readyState === 'live');
      if (!live) { fail('The microphone stream is not available. Try again or practise privately.', true); return; }
      const types = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus'];
      const mimeType = types.find(type => typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(type));
      const item = mimeType ? new MediaRecorder(granted, { mimeType }) : new MediaRecorder(granted);
      recorder = item; let chunks: Blob[] = []; let bytes = 0; let started = false;
      const startTimer = later(() => { if (active(token) && !started) fail('The browser did not start recording. The microphone has been stopped.', true); }, 5000);
      item.onstart = () => {
        if (!active(token) || recorder !== item) return;
        started = true; clearTimeout(startTimer);
        emit({ mode: 'recording', message: 'Microphone recording now. Press Stop recording when ready. Clips stop after 30 seconds; there is no score for speed.' });
        later(stopRecording, CLIP_LIMIT_MS);
      };
      item.ondataavailable = event => {
        if (!active(token) || recorder !== item || !event.data?.size) return;
        bytes += event.data.size;
        if (bytes > CLIP_LIMIT_BYTES) { chunks = []; fail('This clip reached the size limit and was deleted. Try a shorter recording.', true); return; }
        chunks.push(event.data);
      };
      item.onstop = () => {
        if (!active(token) || recorder !== item) return;
        recorder = null; clearTimers(); detachRecorder(item); stopTracks();
        if (!started || bytes === 0) { chunks = []; emit({ mode: 'idle', error: true, message: 'No audio clip was produced. No score was added. Try again or practise privately.' }); return; }
        try {
          const clip = new Blob(chunks, { type: item.mimeType || mimeType || 'audio/webm' }); chunks = [];
          const clipUrl = URL.createObjectURL(clip);
          emit({ mode: 'idle', clipUrl, error: false, message: 'Microphone off. Your temporary clip is ready: choose Hear my recording. It has not been uploaded or scored.' });
        } catch { fail('The clip could not be prepared for playback. Try again.', true); }
      };
      item.onerror = () => { if (active(token) && recorder === item) { chunks = []; fail('Recording failed. The microphone has been stopped and the unfinished clip deleted.', true); } };
      granted.getTracks().forEach(track => { track.onended = () => { if (active(token) && recorder === item) fail('The microphone disconnected. The unfinished clip was deleted; private practice still works.', true); }; });
      item.start(1000);
    } catch (error) { if (active(token)) fail(microphoneErrorMessage(error), true); }
  };
  const replay = () => {
    if (!state.clipUrl || !current()) return;
    const token = begin(); if (token === null || !state.clipUrl) return;
    try {
      const item = new Audio(state.clipUrl); audio = item;
      item.onplaying = () => { if (active(token) && audio === item) emit({ mode: 'replaying', error: false, message: 'Playing your own recording. Microphone off.' }); };
      item.onended = () => { if (active(token) && audio === item) cancel(false, 'Playback finished. Microphone off. You can replay, delete or record a new try.'); };
      item.onerror = () => { if (active(token) && audio === item) fail('The browser could not play this recording. Try again or delete it.'); };
      emit({ mode: 'requesting-replay', message: 'Starting your recording playback. Microphone off.', error: false });
      later(() => { if (active(token) && audio === item) cancel(false, 'Playback stopped. Microphone off.'); }, 45000);
      Promise.resolve(item.play()).catch(() => { if (active(token) && audio === item) fail('Playback was blocked. Tap Hear my recording again and check your device volume.'); });
    } catch { fail('Playback is not available in this browser. You can delete the clip and practise privately.'); }
  };
  const speak = (text: string, rate = 0.68) => {
    if (!current() || !text.trim() || text.length > 240 || ![0.68, 0.92].includes(rate)) return;
    const token = begin(); if (token === null) return;
    try {
      const engine = window.speechSynthesis;
      const voice = engine?.getVoices().find(item => item.localService === true && /^en(?:[-_]|$)/i.test(item.lang));
      if (!voice || typeof window.SpeechSynthesisUtterance !== 'function') { emit({ error: true, message: 'No on-device English voice is ready. Refresh device voices or install an English voice in your device settings. No remote voice was used.' }); return; }
      const item = new SpeechSynthesisUtterance(text); utterance = item; utteranceEngine = engine;
      item.voice = voice; item.lang = voice.lang; item.rate = rate; item.pitch = 1;
      const timeout = () => { if (active(token) && utterance === item) fail('The device voice did not finish. Press Play to try again, or read the example.'); };
      const startTimer = later(timeout, 8000);
      item.onstart = () => { if (active(token) && utterance === item) { clearTimeout(startTimer); later(timeout, 60000); emit({ mode: 'speaking', error: false, message: 'Playing the example with an on-device voice. Microphone off.' }); } };
      item.onend = () => { if (active(token) && utterance === item) { utterance = null; utteranceEngine = null; clearTimers(); item.onstart = null; item.onend = null; item.onerror = null; emit({ mode: 'idle', message: 'Example finished. Your microphone is still off.' }); } };
      item.onerror = () => { if (active(token) && utterance === item) fail('The device voice could not play. Retry or use the written example.'); };
      emit({ mode: 'requesting-voice', message: 'Preparing the example voice. Microphone off.', error: false });
      engine.speak(item);
    } catch { fail('The example voice is not available. No microphone is needed for the written practice.'); }
  };
  const check = (consent: boolean) => {
    if (!consent || !current()) return;
    const token = begin(); if (token === null) return;
    const Constructor = recognitionConstructor();
    if (!Constructor) { emit({ error: true, message: 'Browser word checking is unavailable here. Record-and-replay and private self-check are separate options.' }); return; }
    try {
      const item = new Constructor(); recognition = item; let finalText = '';
      item.continuous = false; item.interimResults = false; item.maxAlternatives = 1; item.lang = 'en-GB';
      item.onaudiostart = () => { if (active(token) && recognition === item) emit({ mode: 'checking', message: 'Microphone active for browser word checking. Your browser’s service may process this audio.' }); };
      item.onaudioend = () => { if (active(token) && recognition === item) emit({ mode: 'requesting-check', message: 'Microphone capture ended. Waiting for the browser’s final words…' }); };
      item.onresult = event => {
        if (!active(token) || recognition !== item) return;
        const texts: string[] = [];
        for (let i = 0; i < Math.min(event.results.length, 30); i += 1) { const result = event.results[i]; if (result.isFinal) texts.push((result[0]?.transcript ?? '').slice(0, 1000)); }
        finalText = texts.join(' ').trim().slice(0, 1000);
        emit({ transcript: finalText });
      };
      item.onerror = error => { if (active(token) && recognition === item) fail(microphoneErrorMessage(error)); };
      item.onend = () => {
        if (!active(token) || recognition !== item) return;
        recognition = null; detachRecognition(item); clearTimers();
        emit({ mode: 'idle', error: !finalText, message: finalText ? 'Browser word check finished. The score is a text match, not a pronunciation assessment.' : 'No final words were returned. No new score was added; you can try again or self-check.' });
        if (finalText) options.onRecognised(finalText);
      };
      later(() => { if (active(token) && recognition === item) fail('Browser word checking timed out. No score was added. Try again or use private practice.'); }, 45000);
      emit({ mode: 'requesting-check', transcript: '', error: false, message: 'Waiting for browser microphone access. Word checking has not confirmed capture yet.' });
      item.start();
    } catch (error) { fail(microphoneErrorMessage(error)); }
  };
  const stop = () => {
    if (state.mode === 'recording') { stopRecording(); return; }
    if (state.mode === 'checking' && recognition) {
      const token = generation; clearTimers();
      later(() => { if (active(token) && recognition) cancel(false, 'Word checking stopped without a final result. No score was added.'); }, 5000);
      try { recognition.stop(); } catch { fail('The browser could not finish word checking. No score was added.'); }
      return;
    }
    cancel(false);
  };
  return { record, replay, speak, check, stop, cancel, recordingAvailable, recognitionAvailable: () => Boolean(recognitionConstructor()),
    getState: () => ({ ...state }),
    dispose: () => { disposed = true; halt(); eraseClip(); state = { ...EMPTY_MEDIA_STATE }; },
  };
}
