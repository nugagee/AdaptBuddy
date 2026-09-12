import { AUDITORY_RATES, AUDITORY_SPEECH_TEXTS } from './auditoryPracticeContent';

export type AuditorySpeechStatus = 'idle' | 'requested' | 'playing' | 'finished' | 'stopped' | 'unavailable' | 'busy' | 'error' | 'timeout' | 'stop-error';
type ActiveUtterance = { utterance: SpeechSynthesisUtterance; engine: SpeechSynthesis; timer: ReturnType<typeof setTimeout> | null };
export interface AuditorySpeechController {
  available: () => boolean;
  play: (text: string, rate: number) => void;
  stop: (notify?: boolean) => void;
  refresh: () => void;
  dispose: () => void;
}

/** Owns only an utterance this tool started. No microphone or remote-voice fallback. */
export function createAuditorySpeechController(
  canPlay: () => boolean,
  notify: (status: AuditorySpeechStatus) => void,
): AuditorySpeechController {
  let disposed = false;
  let active: ActiveUtterance | null = null;
  const engine = (): SpeechSynthesis | null => {
    try {
      return typeof window !== 'undefined' && window.speechSynthesis
        && typeof window.SpeechSynthesisUtterance === 'function' ? window.speechSynthesis : null;
    } catch { return null; }
  };
  const localVoice = (synth: SpeechSynthesis | null): SpeechSynthesisVoice | null => {
    try { return synth?.getVoices().find(voice => voice.localService === true && /^en(?:[-_]|$)/i.test(voice.lang)) ?? null; }
    catch { return null; }
  };
  const detach = (item: ActiveUtterance) => {
    if (item.timer !== null) clearTimeout(item.timer);
    item.utterance.onstart = null; item.utterance.onend = null; item.utterance.onerror = null;
  };
  const stop = (announce = true): boolean => {
    const item = active;
    active = null;
    if (!item) return true;
    detach(item);
    try {
      item.engine.cancel();
      if (announce && !disposed) notify('stopped');
      return true;
    } catch {
      if (!disposed) notify('stop-error');
      return false;
    }
  };
  const safeNow = () => !disposed && !document.hidden && canPlay();
  const play = (text: string, rate: number) => {
    if (!safeNow() || !AUDITORY_SPEECH_TEXTS.has(text) || !AUDITORY_RATES.some(value => value === rate)) return;
    if (!stop(false)) return;
    const synth = engine();
    const voice = localVoice(synth);
    if (!synth || !voice) { notify('unavailable'); return; }
    // Do not cancel narration started elsewhere just to start this activity.
    if (synth.speaking || synth.pending || synth.paused) { notify('busy'); return; }
    try {
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.voice = voice; utterance.lang = voice.lang; utterance.rate = rate; utterance.pitch = 1;
      const item: ActiveUtterance = { utterance, engine: synth, timer: null };
      active = item;
      const current = () => !disposed && active === item;
      const expire = () => {
        if (!current()) return;
        if (stop(false)) notify('timeout');
      };
      utterance.onstart = () => {
        if (!current()) return;
        if (!safeNow()) { stop(); return; }
        if (item.timer !== null) clearTimeout(item.timer);
        item.timer = setTimeout(expire, 45000);
        notify('playing');
      };
      const finish = (status: AuditorySpeechStatus) => {
        if (!current()) return;
        if (!safeNow()) { stop(); return; }
        active = null; detach(item); notify(status);
      };
      utterance.onend = () => finish('finished');
      utterance.onerror = () => finish('error');
      item.timer = setTimeout(expire, 8000);
      notify('requested');
      synth.speak(utterance);
    } catch {
      if (stop(false) && !disposed) notify('error');
    }
  };
  const refresh = () => {
    if (!active) return;
    try {
      const voice = active.utterance.voice;
      const remains = active.engine.getVoices().some(candidate => candidate.localService === true
        && /^en(?:[-_]|$)/i.test(candidate.lang) && candidate.voiceURI === voice?.voiceURI);
      if (!remains && stop(false) && !disposed) notify('unavailable');
    } catch { if (stop(false) && !disposed) notify('unavailable'); }
  };
  return {
    available: () => !disposed && Boolean(localVoice(engine())), play, stop, refresh,
    dispose: () => { disposed = true; stop(false); },
  };
}
