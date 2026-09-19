import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { getReadyChildProgressForOwner, useChildProgressReadAccess } from 'features/child/store/childProgressReadAccess';
import TicFlexFlowPractice from './TicFlexFlowPractice';
import { BREAK_MESSAGES, isTouretteSupportActivity, TIC_CONTROL as CONTROL, TIC_PANEL as PANEL, type TouretteSupportId } from './touretteSupportContent';
export { isTouretteSupportActivity } from './touretteSupportContent';

type Mode = 'active' | 'paused' | 'card';
const useSupportClock = (enabled: boolean) => {
  const elapsed = useRef(0);
  const started = useRef<number | null>(null);
  const settle = useCallback(() => {
    if (started.current !== null) elapsed.current += Math.max(0, performance.now() - started.current);
    started.current = null;
  }, []);
  useEffect(() => {
    const sync = () => { settle(); if (enabled && !document.hidden) started.current = performance.now(); };
    sync(); document.addEventListener('visibilitychange', sync);
    return () => { settle(); document.removeEventListener('visibilitychange', sync); };
  }, [enabled, settle]);
  return () => (elapsed.current + (started.current === null ? 0 : Math.max(0, performance.now() - started.current))) / 60000;
};

const TouretteSupportActivity: React.FC<{
  activityId: TouretteSupportId;
  onComplete: (result: { durationMinutes: number }) => void;
}> = ({ activityId, onComplete }) => {
  const { childId, isReady } = useChildProgressReadAccess();
  const hasProfile = useAuthStore(state => Boolean(state.profile?.neuro_types?.includes('tourettes')));
  const launch = useRef({ childId, activityId });
  const expiredRef = useRef(false);
  const finishedRef = useRef(false);
  const modeRef = useRef<Mode>('active');
  const returnMode = useRef<Mode>('active');
  const [expired, setExpired] = useState(false);
  const [finished, setFinished] = useState(false);
  const [mode, setModeState] = useState<Mode>('active');
  const [messageIndex, setMessageIndex] = useState(0);
  const [hasShown, setHasShown] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const pauseButton = useRef<HTMLButtonElement>(null);
  const showButton = useRef<HTMLButtonElement>(null);
  const cardHeading = useRef<HTMLHeadingElement>(null);
  const previousMode = useRef<Mode>('active');
  const valid = Boolean(!expired && childId && isReady && hasProfile && childId === launch.current.childId
    && activityId === launch.current.activityId && isTouretteSupportActivity(activityId));
  const safeScope = () => Boolean(valid && !expiredRef.current && !finishedRef.current && !document.hidden
    && getReadyChildProgressForOwner(launch.current.childId) && useAuthStore.getState().profile?.neuro_types?.includes('tourettes'));
  const canInteract = () => safeScope() && modeRef.current === 'active';
  const duration = useSupportClock(valid && !finished && mode === 'active');
  const setMode = (next: Mode) => { modeRef.current = next; setModeState(next); setReviewed(false); };

  useEffect(() => {
    const check = () => {
      if (!getReadyChildProgressForOwner(launch.current.childId) || !useAuthStore.getState().profile?.neuro_types?.includes('tourettes')) {
        expiredRef.current = true; setExpired(true);
      }
    };
    const offAuth = useAuthStore.subscribe(check);
    const offProgress = useChildProgressStore.subscribe(check);
    check(); return () => { offAuth(); offProgress(); };
  }, []);
  useEffect(() => {
    if (activityId !== launch.current.activityId) { expiredRef.current = true; setExpired(true); }
  }, [activityId]);
  useEffect(() => {
    const pauseOnLeave = () => {
      if (modeRef.current === 'active') {
        modeRef.current = 'paused'; setModeState('paused'); setReviewed(false);
      }
    };
    const onVisibility = () => { if (document.hidden) pauseOnLeave(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', pauseOnLeave);
    return () => { document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('blur', pauseOnLeave); };
  }, []);
  useEffect(() => {
    if (previousMode.current !== mode) {
      if (mode === 'card') cardHeading.current?.focus();
      else if (previousMode.current === 'card' && mode === 'active') showButton.current?.focus();
      else pauseButton.current?.focus();
    }
    previousMode.current = mode;
  }, [mode]);
  const finish = () => {
    if (!canInteract()) return;
    const durationMinutes = duration();
    if (!Number.isFinite(durationMinutes) || durationMinutes < 0) return;
    finishedRef.current = true; setFinished(true);
    onComplete({ durationMinutes });
  };
  if (!valid) return <p role="status">This support tool is no longer connected to the original child session. Close it and reopen the activity.</p>;
  if (finished) return <p role="status">Support practice recorded. No tic or break-outcome information was saved.</p>;
  const isFlow = activityId === 'tourettes-flex-flow';
  return <div className="min-w-0 space-y-4 text-slate-900 dark:text-slate-100">
    <p className="text-sm">You never have to earn a break or explain why. There is no requirement to stop tics or become calm. You can close this tool without recording anything.</p>
    <div className="flex flex-wrap gap-2">
      {mode !== 'card' && <>
        <button ref={pauseButton} type="button" className={CONTROL} onClick={() => { if (safeScope()) setMode(modeRef.current === 'paused' ? 'active' : 'paused'); }}>{mode === 'paused' ? 'Continue at my pace' : 'Pause at any time'}</button>
        <button ref={showButton} type="button" className={CONTROL} onClick={() => {
          if (!safeScope()) return;
          returnMode.current = modeRef.current; setHasShown(true); setMode('card');
        }}>Show break card</button>
      </>}
    </div>
    {mode === 'paused' && <p role="status">Paused. Your open choices remain here; nothing restarts until you choose Continue. You can still show a break card.</p>}
    {mode === 'card' && <section className={`${PANEL} space-y-5`} aria-label="Break support card">
      <h3 ref={cardHeading} tabIndex={-1} className="break-words text-2xl font-bold sm:text-3xl">{BREAK_MESSAGES[messageIndex]}</h3>
      <p>No countdown. Take the time you need; there is no calmness or tic check before returning.</p>
      <p className="text-sm">Show this screen to someone nearby when helpful. It sends no message and does not grant permission to leave. Use the break arrangements agreed with your trusted adult.</p>
      <button type="button" className={CONTROL} onClick={() => { if (safeScope()) setMode(returnMode.current); }}>Back to my choices</button>
      <p className="text-sm">Time with this card open is not counted as practice or recorded as break duration. Closing it does not award stars.</p>
    </section>}
    <fieldset disabled={mode !== 'active'} hidden={mode !== 'active'} className="min-w-0">
      <legend className="sr-only">Optional support practice controls</legend>
      {isFlow ? <TicFlexFlowPractice ownerId={childId!} paused={mode !== 'active'} canInteract={canInteract} onFinish={finish} /> : <div className="space-y-4">
        <p className={PANEL}>The default card is ready to show now. Choosing different words and recording its use are optional. This is a communication aid, not an official pass or an adult alert.</p>
        <div role="group" aria-label="Optional break card wording" className="space-y-2">
          {BREAK_MESSAGES.map((message, index) => <button key={message} type="button" className={`${CONTROL} block w-full`} aria-pressed={messageIndex === index} onClick={() => {
            if (!canInteract() || index === messageIndex) return;
            setMessageIndex(index); setHasShown(false); setReviewed(false);
          }}>{message}</button>)}
        </div>
        <label className="flex min-h-12 items-center gap-3"><input type="checkbox" className="h-6 w-6 shrink-0" disabled={!hasShown} checked={reviewed} onChange={event => { if (canInteract() && hasShown) setReviewed(event.target.checked); }} />I used or explored this support card</label>
        <button type="button" className={`${CONTROL} w-full`} disabled={!hasShown || !reviewed} onClick={() => { if (canInteract() && hasShown && reviewed) finish(); }}>Record support-card use</button>
        <p className="text-sm">Recording is optional. It records support-card use, not a tic count, an approved break, symptom improvement or a reply from an adult. Card wording is discarded on close.</p>
      </div>}
    </fieldset>
  </div>;
};
export default TouretteSupportActivity;
