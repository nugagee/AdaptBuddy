import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import PracticeDialog from './PracticeDialog';
import './honor-guidance.css';

export const PRONUNCIATION_GUIDE_STEPS = [
  { target: 'example', title: 'Hear an example', text: 'Slow and Normal play the chosen word. Your microphone can stay off. A suitable device voice is needed; written practice still works without one.' },
  { target: 'record-consent', title: 'Choose whether to record', text: 'Temporary recording is optional. Choose this agreement yourself, then the browser can ask for microphone permission. The tour does not tick the box or grant permission.' },
  { target: 'record', title: 'Record your own try', text: 'After choosing recording, press Record my try. Wait for the actual recording message before speaking. If your browser cannot record, you can practise privately instead.' },
  { target: 'stop', title: 'Stop when you are ready', text: 'During recording this control says Stop recording. Press it to release the microphone and prepare your temporary clip. You do not need to fill the recording time.' },
  { target: 'replay', title: 'Hear yourself', text: 'Hear my recording plays your own clip after recording stops. It is disabled until a clip exists. You can delete it or try again. Playback alone does not create a score.' },
  { target: 'word-check', title: 'Keep the choice yours', text: 'Browser word checking is a separate option that may process speech off-device. You can leave it off and use I said it myself for a self-check. Your existing scores and history stay; confidence is not a microphone measurement.' },
] as const;

export default function PronunciationWalkthrough({ isCurrent, onClose, canRestoreFocus = isCurrent }: { isCurrent: () => boolean; onClose: () => void; canRestoreFocus?: () => boolean }) {
  const titleId = useId();
  const [step, setStep] = useState(0);
  const [spot, setSpot] = useState<{ top: number; left: number; width: number; height: number; cardAtTop: boolean } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const item = PRONUNCIATION_GUIDE_STEPS[step];
  useLayoutEffect(() => {
    const previous = document.body.style.paddingBottom;
    document.body.style.paddingBottom = `${window.innerHeight}px`;
    return () => { document.body.style.paddingBottom = previous; };
  }, []);
  useLayoutEffect(() => {
    const target = document.querySelector<HTMLElement>(`[data-pronunciation-guide="${item.target}"]`);
    let frame = 0;
    const measure = () => {
      const rect = target?.getBoundingClientRect();
      const width = window.innerWidth; const height = window.innerHeight;
      if (height < 520 || !rect || rect.width <= 0 || rect.height <= 0 || !target?.isConnected) { setSpot(null); return; }
      const left = Math.max(8, rect.left - 6); const top = Math.max(8, rect.top - 6);
      const right = Math.min(width - 8, rect.right + 6); const bottom = Math.min(height - 8, rect.bottom + 6);
      if (right <= left || bottom <= top) { setSpot(null); return; }
      setSpot({ top, left, width: right - left, height: bottom - top, cardAtTop: false });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); };
    const originalBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    target?.scrollIntoView?.({ block: 'start', behavior: 'auto' });
    if (target && target.getBoundingClientRect().height > 0) window.scrollBy({ top: target.getBoundingClientRect().top - 80, behavior: 'auto' });
    document.documentElement.style.scrollBehavior = originalBehavior;
    measure(); heading.current?.focus({ preventScroll: true });
    window.addEventListener('resize', schedule); window.addEventListener('scroll', schedule, true);
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null;
    if (target) observer?.observe(target);
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener('resize', schedule); window.removeEventListener('scroll', schedule, true); };
  }, [item.target]);
  const move = (next: number) => { if (isCurrent() && !document.hidden) setStep(Math.max(0, Math.min(PRONUNCIATION_GUIDE_STEPS.length - 1, next))); };
  return <PracticeDialog titleId={titleId} onClose={onClose} canRestoreFocus={canRestoreFocus} className={`walkthrough-overlay${spot ? '' : ' guide-no-target'}`}>
    {spot && <div data-testid="guide-spotlight" className="guide-spotlight" aria-hidden="true" style={{ top: spot.top, left: spot.left, width: spot.width, height: spot.height }} />}
    <div className={`guide-card ${spot?.cardAtTop ? 'guide-card-top' : 'guide-card-bottom'}`}>
      <div className="guidance-heading"><p className="guidance-eyebrow">SHOW ME HOW · {step + 1} OF {PRONUNCIATION_GUIDE_STEPS.length}</p><button type="button" className="guidance-button" onClick={onClose}>Skip tour</button></div>
      <div className="guide-progress" aria-hidden="true">{PRONUNCIATION_GUIDE_STEPS.map((entry, index) => <span key={entry.target} data-complete={index <= step ? 'true' : 'false'} />)}</div>
      <h2 id={titleId} ref={heading} tabIndex={-1} data-guidance-title>{item.title}</h2>
      <p className="guidance-intro">{item.text}</p>
      {!spot && <p className="guidance-note">The control is not visible in this view. These instructions still apply; close the tour to explore the page.</p>}
      <p className="guidance-small">Tour only: the page behind is not interactive. Nothing records, plays or changes permission as you move through these steps.</p>
      <div className="guide-navigation"><button type="button" className="guidance-button" disabled={step === 0} onClick={() => move(step - 1)}>Back</button>
        <button type="button" className="guidance-button guidance-primary" onClick={() => { if (!isCurrent() || document.hidden) return; if (step === PRONUNCIATION_GUIDE_STEPS.length - 1) onClose(); else move(step + 1); }}>{step === PRONUNCIATION_GUIDE_STEPS.length - 1 ? 'Finish tour' : 'Next step'}</button></div>
    </div>
  </PracticeDialog>;
}
