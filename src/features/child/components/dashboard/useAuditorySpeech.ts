import { useCallback, useEffect, useRef, useState } from 'react';
import { createAuditorySpeechController, type AuditorySpeechController, type AuditorySpeechStatus } from './auditorySpeechController';

export function useAuditorySpeech(canPlay: () => boolean, enabled: boolean) {
  const allowedRef = useRef(canPlay);
  allowedRef.current = canPlay;
  const controller = useRef<AuditorySpeechController | null>(null);
  const [available, setAvailable] = useState(false);
  const [status, setStatus] = useState<AuditorySpeechStatus>('idle');
  useEffect(() => {
    const value = createAuditorySpeechController(() => allowedRef.current(), setStatus);
    controller.current = value;
    let synth: SpeechSynthesis | null = null;
    try { synth = window.speechSynthesis ?? null; } catch { /* Text-only fallback. */ }
    const refresh = () => { value.refresh(); setAvailable(value.available()); };
    const hidden = () => { if (document.hidden) value.stop(); };
    const blur = () => value.stop();
    refresh();
    synth?.addEventListener?.('voiceschanged', refresh);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('blur', blur);
    return () => {
      value.dispose(); controller.current = null;
      synth?.removeEventListener?.('voiceschanged', refresh);
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('blur', blur);
    };
  }, []);
  const stop = useCallback(() => controller.current?.stop(), []);
  const play = useCallback((text: string, rate: number) => controller.current?.play(text, rate), []);
  const refresh = useCallback(() => {
    controller.current?.refresh(); setAvailable(controller.current?.available() ?? false);
  }, []);
  useEffect(() => { if (!enabled) stop(); }, [enabled, stop]);
  return { available, status, play, stop, refresh };
}

export const AUDITORY_SPEECH_MESSAGES: Record<AuditorySpeechStatus, string> = {
  idle: 'Audio is optional. Nothing plays automatically.',
  requested: 'Audio requested. You can stop it or read the text.',
  playing: 'Playing optional audio.',
  finished: 'The device finished speaking. Read or replay as often as you need.',
  stopped: 'Audio stopped. Press Play when you choose to hear it again.',
  unavailable: 'No on-device English voice is available. Text-only practice counts equally.',
  busy: 'Another device narration is active or paused. Stop it there first, or use the text.',
  error: 'The device could not play this audio. Use the text or try Play again.',
  timeout: 'The device did not finish the audio in time. Use the text or try Play again.',
  'stop-error': 'The device did not confirm stopping. Use your device sound controls; text-only practice is available.',
};
