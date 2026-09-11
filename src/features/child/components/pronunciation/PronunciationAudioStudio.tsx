import React, { forwardRef, useLayoutEffect, useImperativeHandle, useRef, useState } from 'react';
import { Mic, MicOff, Play, Square, Trash2, Volume2 } from 'lucide-react';
import { useAuthStore } from 'store/authStore';
import { useUiStore } from 'store/uiStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { getCurrentChildScopeId, getReadyChildProgressForOwner } from 'features/child/store/childProgressReadAccess';
import { createPronunciationMediaController, EMPTY_MEDIA_STATE } from './pronunciationMediaController';
import './pronunciation-audio.css';
import { registerGuidanceMediaBoundary } from './guidanceMediaBoundary';

export interface PronunciationAudioHandle { hear: () => void; focus: () => void; reset: () => void }
const BUTTON = 'pronunciation-action inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-indigo-200 bg-white px-4 py-3 text-sm font-bold text-indigo-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-indigo-800 dark:bg-slate-950 dark:text-indigo-100';
const PANEL = 'rounded-2xl border border-slate-200 p-4 dark:border-slate-700';

/** Recording is session-only. Recognition is a separate, explicitly disclosed browser service. */
const PronunciationAudioStudio = forwardRef<PronunciationAudioHandle, {
  ownerId: string | null; itemId: string; phrase: string; onRecognised: (text: string) => void;
}>(({ ownerId, itemId, phrase, onRecognised }, ref) => {
  const heading = useRef<HTMLHeadingElement>(null);
  const controller = useRef<ReturnType<typeof createPronunciationMediaController> | null>(null);
  const resultHandler = useRef(onRecognised); resultHandler.current = onRecognised;
  const [state, setState] = useState({ ...EMPTY_MEDIA_STATE });
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [recordConsent, setRecordConsent] = useState(false);
  const [checkConsent, setCheckConsent] = useState(false);
  const [voiceHint, setVoiceHint] = useState('');
  const calm = useUiStore(value => value.reducedMotion);

  useLayoutEffect(() => {
    let invalid = false; let onceReady = false;
    const scopeReady = () => Boolean(ownerId && getCurrentChildScopeId() === ownerId && getReadyChildProgressForOwner(ownerId));
    const media = createPronunciationMediaController({
      isCurrent: () => !invalid && scopeReady(), onState: setState,
      onRecognised: text => { if (!invalid && scopeReady()) resultHandler.current(text); },
    });
    const offGuidance = registerGuidanceMediaBoundary(ownerId, () => media.cancel(true, 'Audio stopped and the temporary clip deleted before opening guidance. Your earlier scores remain.'));
    controller.current = media; setState({ ...EMPTY_MEDIA_STATE }); setExpired(false);
    setRecordConsent(false); setCheckConsent(false); setVoiceHint('');
    const checkScope = () => {
      const good = scopeReady();
      if (onceReady && !good) { invalid = true; media.dispose(); setExpired(true); setState({ ...EMPTY_MEDIA_STATE }); setRecordConsent(false); setCheckConsent(false); }
      if (good && !invalid) onceReady = true;
      setReady(good && !invalid);
    };
    checkScope();
    const offAuth = useAuthStore.subscribe(checkScope);
    const offProgress = useChildProgressStore.subscribe(checkScope);
    const hide = () => { if (document.hidden) media.cancel(true, 'Audio stopped and your temporary clip was deleted when this page became hidden. Press a button to start again.'); };
    const blur = () => {
      // A permission prompt may blur the page. Do not cancel before it can be answered.
      if (!['idle', 'requesting-recording', 'requesting-check'].includes(media.getState().mode)) {
        media.cancel(true, 'Audio stopped and the temporary clip was deleted when this window lost focus.');
      }
    };
    const pageHide = () => media.cancel(true);
    document.addEventListener('visibilitychange', hide); window.addEventListener('blur', blur); window.addEventListener('pagehide', pageHide);
    return () => {
      offGuidance(); invalid = true; media.dispose(); if (controller.current === media) controller.current = null;
      offAuth(); offProgress(); document.removeEventListener('visibilitychange', hide); window.removeEventListener('blur', blur); window.removeEventListener('pagehide', pageHide);
    };
  }, [ownerId, itemId, phrase]);

  const focus = () => { heading.current?.focus(); heading.current?.scrollIntoView?.({ block: 'nearest' }); };
  useImperativeHandle(ref, () => ({
    hear: () => { focus(); if (ready) controller.current?.speak(phrase); }, focus,
    reset: () => { controller.current?.cancel(true, 'Ready for a new try. The previous temporary clip and recognised text were deleted.'); },
  }), [ready, phrase]);
  const busy = state.mode !== 'idle';
  const recording = state.mode === 'recording';
  const listening = state.mode === 'checking';
  const recordingSupported = controller.current?.recordingAvailable() ?? false;
  const checkSupported = controller.current?.recognitionAvailable() ?? false;
  const refreshVoices = () => {
    try {
      const available = window.speechSynthesis?.getVoices().some(voice => voice.localService === true && /^en(?:[-_]|$)/i.test(voice.lang));
      setVoiceHint(available ? 'An on-device English voice is available. Press Slow or Normal to hear it.' : 'No on-device English voice is ready. Check installed English voices in your device settings; written practice remains available.');
    } catch { setVoiceHint('Device voices could not be checked. Written practice remains available.'); }
  };
  if (expired) return <section className={PANEL}><h3 ref={heading} tabIndex={-1}>Audio controls paused for privacy</h3><p role="status">The original child session changed. Return to the dashboard and reopen this page. No old recording can be replayed here.</p></section>;
  return <section className="pronunciation-motion mt-5 space-y-4" data-calm={calm ? 'true' : 'false'} aria-labelledby="pronunciation-audio-title">
    <h3 id="pronunciation-audio-title" ref={heading} tabIndex={-1} className="text-xl font-black">Hear, record and practise</h3>
    {!ready && <p role="status">Waiting for this child’s practice profile to be ready. No microphone has been started.</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" className={BUTTON} data-pronunciation-guide="example" disabled={!ready || busy} onClick={() => controller.current?.speak(phrase, 0.68)}><Volume2 className="pronunciation-icon h-5 w-5" aria-hidden />Slow</button>
      <button type="button" className={BUTTON} disabled={!ready || busy} onClick={() => controller.current?.speak(phrase, 0.92)}><Volume2 className="pronunciation-icon h-5 w-5" aria-hidden />Normal</button>
      <button type="button" className={BUTTON} disabled={!ready || busy} onClick={refreshVoices}>Refresh device voices</button>
      <button type="button" className={BUTTON} data-pronunciation-guide="stop" disabled={!busy} onClick={() => controller.current?.stop()}><Square className="h-4 w-4" aria-hidden />{recording ? 'Stop recording' : state.mode === 'requesting-recording' ? 'Cancel microphone request' : 'Stop audio'}</button>
    </div>
    <p className="text-sm">Hear the example with the microphone off. Check your volume first. We use an English voice reported by the browser as on-device; pronunciation and speed vary by device.</p>
    {voiceHint && <p role="status" className="text-sm">{voiceHint}</p>}
    <div className={PANEL}>
      <h4 className="font-bold">Record and hear yourself — optional</h4>
      <p className="mt-2 text-sm">A clip stays only in this open practice session. It is not uploaded or automatically scored. New recordings replace the old clip. Clips stop at 30 seconds for privacy, not as a challenge.</p>
      <label data-pronunciation-guide="record-consent" className="my-3 flex min-h-12 items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={recordConsent} disabled={!ready} onChange={event => {
        setRecordConsent(event.target.checked); if (!event.target.checked) controller.current?.cancel(true, 'Recording agreement turned off and the temporary clip deleted.');
      }} />Allow temporary recording for this visit</label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BUTTON} data-pronunciation-guide="record" disabled={!ready || !recordConsent || busy || !recordingSupported} onClick={() => void controller.current?.record(recordConsent)}><Mic className="pronunciation-icon h-5 w-5" aria-hidden />Record my try</button>
        <button type="button" className={BUTTON} data-pronunciation-guide="replay" disabled={!ready || !state.clipUrl || busy} onClick={() => controller.current?.replay()}><Play className="pronunciation-icon h-5 w-5" aria-hidden />Hear my recording</button>
        <button type="button" className={BUTTON} disabled={!state.clipUrl && !busy} onClick={() => controller.current?.cancel(true, 'Temporary recording and recognised words deleted. Microphone off.')}><Trash2 className="h-5 w-5" aria-hidden />Delete recording</button>
      </div>
      {!recordingSupported && <p className="mt-2 text-sm">Recording is unavailable in this browser or connection. You can still hear examples or practise without a microphone.</p>}
      <p className="mt-2 text-sm">After replaying, choose “I said it myself” below to record your self-check. Recording and replay alone do not create a score.</p>
    </div>
    <div className={PANEL}>
      <h4 className="font-bold">Browser word check — separate option</h4>
      <p className="mt-2 text-sm">This listens for words and compares recognised text. Your browser’s speech service may send audio away from the device. This is separate from temporary record-and-replay; the clip above is never submitted to that service.</p>
      <label data-pronunciation-guide="word-check" className="my-3 flex min-h-12 items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={checkConsent} disabled={!ready} onChange={event => {
        setCheckConsent(event.target.checked); if (!event.target.checked) controller.current?.cancel(true, 'Browser word-check agreement turned off. Microphone stopped.');
      }} />Allow browser speech checking for this visit</label>
      <button type="button" className={BUTTON} disabled={!ready || !checkConsent || busy || !checkSupported} onClick={() => controller.current?.check(checkConsent)}><Mic className="pronunciation-icon h-5 w-5" aria-hidden />Use mic</button>
      {!checkSupported && <p className="mt-2 text-sm">Browser word checking is unavailable here. Temporary recording may still work; microphone support and speech recognition are different features.</p>}
    </div>
    <div className={PANEL}>
      <p className="flex items-center gap-2 font-bold">
        {recording || listening ? <Mic className="pronunciation-icon pronunciation-active h-5 w-5" aria-hidden /> : <MicOff className="h-5 w-5" aria-hidden />}
        {recording ? 'Microphone recording' : listening ? 'Microphone checking words' : busy ? 'Audio operation in progress' : 'Microphone off'}
      </p>
      <p role={state.error ? 'alert' : 'status'} aria-live="polite" className="mt-2 text-sm">{state.message}</p>
      {state.transcript && <div className="mt-2"><p className="text-sm font-bold">What the browser heard this visit</p><p>{state.transcript}</p><p className="text-xs">Not retained in practice history. Recognition can make mistakes.</p></div>}
      <button type="button" className={`${BUTTON} mt-3`} onClick={() => { setRecordConsent(false); setCheckConsent(false); controller.current?.cancel(true, 'Microphone options turned off for this visit. Temporary audio and recognised words deleted.'); }}>Turn microphone options off</button>
      <p className="mt-2 text-xs">These agreements do not override your browser’s permission. Clips are deleted on item/account changes, leaving or hiding this page, reset, or deletion. Nothing restarts automatically.</p>
    </div>
  </section>;
});
PronunciationAudioStudio.displayName = 'PronunciationAudioStudio';
export default PronunciationAudioStudio;
