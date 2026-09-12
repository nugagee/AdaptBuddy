import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useUiStore } from 'store/uiStore';
import PracticeDialog from './PracticeDialog';
import { calmBubbleFrame, type CalmCycle, type CalmDuration } from './calmBubbleModel';
import { createCalmCueVoice } from './calmCueVoice';
import './honor-guidance.css';

type Status = 'ready' | 'running' | 'paused' | 'finished' | 'stopped';
export default function CalmBubble({ isCurrent, onClose, canRestoreFocus = isCurrent }: { isCurrent: () => boolean; onClose: () => void; canRestoreFocus?: () => boolean }) {
  const titleId = useId();
  const current = useRef(isCurrent); current.current = isCurrent;
  const [status, setStatus] = useState<Status>('ready');
  const statusRef = useRef<Status>('ready');
  const [duration, setDuration] = useState<CalmDuration>(60000);
  const [cycle, setCycle] = useState<CalmCycle>(8000);
  const [watch, setWatch] = useState(false);
  const [still, setStill] = useState(false);
  const [spoken, setSpoken] = useState(false);
  const spokenRef = useRef(false);
  const [voiceMessage, setVoiceMessage] = useState('');
  const [pauseMessage, setPauseMessage] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const anchor = useRef<number | null>(null);
  const [phaseOrigin, setPhaseOrigin] = useState(0);
  const voice = useRef<ReturnType<typeof createCalmCueVoice> | null>(null);
  const appStill = useUiStore(value => value.reducedMotion);
  const [systemStill, setSystemStill] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false);
  const allowed = () => current.current() && !document.hidden;
  const motionOff = appStill || systemStill || still;
  const frame = calmBubbleFrame(elapsed - phaseOrigin, cycle, watch);
  const changeStatus = (next: Status) => { statusRef.current = next; setStatus(next); };
  const settle = useCallback(() => {
    if (anchor.current !== null) elapsedRef.current += Math.max(0, performance.now() - anchor.current);
    anchor.current = null; setElapsed(elapsedRef.current);
  }, []);
  const pause = useCallback((message: string) => {
    if (statusRef.current !== 'running') return;
    settle(); statusRef.current = 'paused'; setStatus('paused'); setPauseMessage(message); voice.current?.cancel();
  }, [settle]);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    const change = () => setSystemStill(media.matches); change();
    if (media.addEventListener) media.addEventListener('change', change); else media.addListener?.(change);
    return () => { if (media.removeEventListener) media.removeEventListener('change', change); else media.removeListener?.(change); };
  }, []);
  useEffect(() => {
    const controller = createCalmCueVoice(() => current.current() && statusRef.current === 'running' && spokenRef.current, message => {
      spokenRef.current = false; setSpoken(false); setVoiceMessage(message);
    });
    voice.current = controller;
    const hide = () => { if (document.hidden) pause('Paused while this page was hidden. Continue only when you are ready.'); };
    const blur = () => pause('Paused while this window was away. Nothing restarts automatically.');
    document.addEventListener('visibilitychange', hide); window.addEventListener('blur', blur); window.addEventListener('pagehide', blur);
    return () => {
      statusRef.current = 'stopped'; anchor.current = null; controller.dispose(); voice.current = null;
      document.removeEventListener('visibilitychange', hide); window.removeEventListener('blur', blur); window.removeEventListener('pagehide', blur);
    };
  }, [pause]);
  useEffect(() => {
    if (status !== 'running') return;
    const timer = setInterval(() => {
      if (!allowed()) { pause('This session has paused. Close it or continue from a ready profile.'); return; }
      const value = elapsedRef.current + (anchor.current === null ? 0 : Math.max(0, performance.now() - anchor.current));
      if (duration > 0 && value >= duration) {
        elapsedRef.current = duration; anchor.current = null; setElapsed(duration); changeStatus('finished'); voice.current?.cancel();
      } else setElapsed(value);
    }, 50);
    return () => clearInterval(timer);
  }, [status, duration, pause]); // Current owner is read through the ref on every tick.
  useEffect(() => {
    if (status === 'running' && spoken && allowed()) voice.current?.speak(frame.cue);
  }, [status, spoken, frame.key, frame.cue, phaseOrigin]);
  const reset = () => {
    voice.current?.cancel(); anchor.current = null; elapsedRef.current = 0; setElapsed(0); setPhaseOrigin(0); changeStatus('ready'); setPauseMessage('');
  };
  const start = () => {
    if (!allowed() || statusRef.current === 'running') return;
    if (statusRef.current !== 'paused') { elapsedRef.current = 0; setElapsed(0); }
    setPhaseOrigin(elapsedRef.current); anchor.current = performance.now(); setPauseMessage(''); changeStatus('running');
  };
  const stop = () => { if (!current.current()) return; settle(); voice.current?.cancel(); changeStatus('stopped'); };
  const label = status === 'running' ? frame.cue : status === 'paused' ? 'Take your time'
    : status === 'finished' ? 'Your chosen time has ended' : status === 'stopped' ? 'Stopped. Your choice.' : 'A moment for you';
  const remaining = duration ? Math.max(0, Math.ceil((duration - elapsed) / 1000)) : null;
  return <PracticeDialog titleId={titleId} onClose={onClose} canRestoreFocus={canRestoreFocus} className="calm-overlay">
    <div className="guidance-heading"><div><p className="guidance-eyebrow">ADAPTBUDDY · YOUR PACE</p><h2 id={titleId} tabIndex={-1} data-guidance-title>Calm Bubble</h2></div>
      <button type="button" className="guidance-button" onClick={onClose}>Close calm moment</button></div>
    <div className="calm-scroll"><p className="guidance-intro">Breathe gently at a pace that feels comfortable—or just watch. You do not need to match the bubble. No breath holding or forced deep breaths.</p>
    <div className="calm-stage" data-still={motionOff ? 'true' : 'false'} data-running={status === 'running' ? 'true' : 'false'}>
      <div className="calm-orbit" aria-hidden="true"><div className="calm-orbit-inner" /></div>
      <div className="calm-bubble" data-testid="calm-bubble" aria-hidden="true" style={{ '--calm-scale': motionOff ? 1 : frame.scale } as React.CSSProperties}><div className="calm-bubble-shine" /></div>
      <div className="calm-caption"><p role="status" aria-live={spoken && status === 'running' ? 'off' : 'polite'}>{label}</p><span>{status === 'running' ? (watch ? 'You can simply look. There is nothing to get right.' : 'Comfort comes first. Stop whenever you need.') : 'No score. No pressure to finish.'}</span></div>
    </div>
    {pauseMessage && status === 'paused' && <p className="guidance-note">{pauseMessage}</p>}
    <p className="calm-time" aria-live="off">{remaining === null ? 'No finish timer — stop whenever you choose' : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')} of chosen time remaining`}</p>
    <fieldset className="calm-setup" disabled={status === 'running'}><legend>Choose your experience</legend>
      <label>Session length<select aria-label="Session length" value={duration} onChange={event => { if (!allowed()) return; reset(); setDuration(Number(event.target.value) as CalmDuration); }}><option value={60000}>1 minute</option><option value={120000}>2 minutes</option><option value={0}>No timer</option></select></label>
      <label>Visual circle pace<select aria-label="Visual circle pace" value={cycle} onChange={event => { if (!allowed()) return; reset(); setCycle(Number(event.target.value) as CalmCycle); }}><option value={6000}>6-second circle</option><option value={8000}>8-second circle</option><option value={10000}>10-second circle</option></select></label>
      <label className="guidance-check"><input type="checkbox" checked={watch} onChange={event => { if (!allowed()) return; reset(); setWatch(event.target.checked); }} />Just watch the bubble</label>
      <p className="guidance-small">This is a visual preference, not a breathing target. Pause to change this setup; changing it starts a new session.</p>
    </fieldset>
    <div className="calm-options"><label className="guidance-check"><input type="checkbox" checked={still} onChange={event => { if (allowed()) setStill(event.target.checked); }} />Still visual</label>
      <label className="guidance-check"><input type="checkbox" checked={spoken} onChange={event => {
        if (!allowed()) return; spokenRef.current = event.target.checked; setSpoken(event.target.checked); setVoiceMessage(''); if (!event.target.checked) voice.current?.cancel();
      }} />Spoken prompts (optional)</label></div>
    {(appStill || systemStill) && <p className="guidance-small">Your Calm Motion or device preference keeps the visual still. Written prompts remain available.</p>}
    {voiceMessage && <p role="status" className="guidance-note">{voiceMessage}</p>}
    <p className="guidance-small">Spoken prompts use a voice the browser reports as on-device, when available. No microphone is used. This tool does not measure breathing or calmness, save a session, or change your scores.</p>
    <p className="guidance-small">Stop if you feel uncomfortable. You can ask a trusted adult for help. This is optional guidance, not medical treatment.</p>
    </div>
    <div className="calm-controls">
      <button type="button" className="guidance-button guidance-primary" disabled={status === 'running'} onClick={start}>{status === 'running' ? 'In progress' : status === 'paused' ? 'Continue calm moment' : status === 'ready' ? 'Start calm moment' : 'Start again'}</button>
      <button type="button" className="guidance-button" disabled={status !== 'running'} onClick={() => pause('Paused. Breathe in your own way, or simply rest.')}>Pause</button>
      <button type="button" className="guidance-button" disabled={status === 'ready' || status === 'stopped' || status === 'finished'} onClick={stop}>Stop</button>
    </div>
  </PracticeDialog>;
}
