const CUES = new Set(['Breathe in gently', 'Breathe out gently', 'The bubble grows', 'The bubble shrinks']);

/** Fixed optional cues only: no microphone, recording, remote voice fallback or storage. */
export function createCalmCueVoice(isCurrent: () => boolean, onUnavailable: (message: string) => void) {
  let disposed = false;
  let generation = 0;
  let owned: SpeechSynthesisUtterance | null = null;
  let engine: SpeechSynthesis | null = null;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const cancel = () => {
    generation += 1;
    timers.forEach(clearTimeout); timers.clear();
    const old = owned; const synth = engine; owned = null; engine = null;
    if (old) {
      old.onstart = null; old.onend = null; old.onerror = null;
      try { synth?.cancel(); } catch { /* No further cue will use this utterance. */ }
    }
  };
  const speak = (cue: string) => {
    if (disposed || !isCurrent() || document.hidden || !CUES.has(cue)) return;
    cancel();
    const token = generation;
    const active = () => !disposed && generation === token && isCurrent() && !document.hidden;
    const unavailable = (message: string) => { if (!active()) return; cancel(); onUnavailable(message); };
    try {
      const synth = window.speechSynthesis;
      const voice = synth?.getVoices().find(item => item.localService === true && /^en(?:[-_]|$)/i.test(item.lang));
      if (!voice || typeof window.SpeechSynthesisUtterance !== 'function') {
        unavailable('An on-device English voice is not ready. The visual and written prompts still work.'); return;
      }
      if (synth.speaking || synth.pending || synth.paused) {
        unavailable('Another voice is using the browser. Spoken prompts are off; the bubble still works.'); return;
      }
      const item = new SpeechSynthesisUtterance(cue); owned = item; engine = synth;
      item.voice = voice; item.lang = voice.lang; item.rate = 0.92; item.pitch = 1;
      const later = (fn: () => void, ms: number) => { const timer = setTimeout(fn, ms); timers.add(timer); return timer; };
      const startTimer = later(() => unavailable('The voice did not start in time. Written prompts remain available.'), 900);
      later(() => unavailable('The voice did not finish in time. Written prompts remain available.'), 2500);
      item.onstart = () => { if (!active()) return; clearTimeout(startTimer); };
      item.onend = () => {
        if (!active()) return;
        timers.forEach(clearTimeout); timers.clear();
        item.onstart = null; item.onend = null; item.onerror = null; owned = null; engine = null;
      };
      item.onerror = () => unavailable('This device could not play the prompt. Continue with the visual or written version.');
      synth.speak(item);
    } catch { unavailable('Spoken prompts are unavailable here. The visual and written version is still available.'); }
  };
  return { speak, cancel, dispose: () => { cancel(); disposed = true; } };
}
