import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { getReadyChildProgressForOwner, useChildProgressReadAccess } from 'features/child/store/childProgressReadAccess';
import { AUDITORY_CONTROL as CONTROL, AUDITORY_PANEL as PANEL, AUDITORY_RATES, isAuditoryPracticeActivity, type AuditoryPracticeId } from './auditoryPracticeContent';
import { CaptionMatchPractice, SlowClearPractice } from './AuditoryPracticeExercises';
import { AUDITORY_SPEECH_MESSAGES, useAuditorySpeech } from './useAuditorySpeech';

export { isAuditoryPracticeActivity } from './auditoryPracticeContent';

/** Uses a monotonic clock and counts only visible, unpaused session time. */
const useAuditoryClock = (enabled: boolean) => {
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

const AuditoryPracticeActivity: React.FC<{
  activityId: AuditoryPracticeId;
  onComplete: (result: { durationMinutes: number }) => void;
}> = ({ activityId, onComplete }) => {
  const { childId, isReady } = useChildProgressReadAccess();
  const hasProfile = useAuthStore(state => Boolean(state.profile?.neuro_types?.includes('auditory')));
  const launch = useRef({ childId, activityId });
  const expiredRef = useRef(false);
  const finishedRef = useRef(false);
  const pausedRef = useRef(false);
  const [expired, setExpired] = useState(false);
  const [finished, setFinished] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(0.75);
  const valid = Boolean(!expired && childId && isReady && hasProfile && childId === launch.current.childId
    && activityId === launch.current.activityId && isAuditoryPracticeActivity(activityId));
  const canInteract = () => Boolean(valid && !expiredRef.current && !finishedRef.current && !pausedRef.current && !document.hidden
    && getReadyChildProgressForOwner(launch.current.childId) && useAuthStore.getState().profile?.neuro_types?.includes('auditory'));
  const audio = useAuditorySpeech(canInteract, valid && !paused && !finished);
  const stopAudio = audio.stop;
  const duration = useAuditoryClock(valid && !paused && !finished);
  useEffect(() => {
    const check = () => {
      if (!getReadyChildProgressForOwner(launch.current.childId) || !useAuthStore.getState().profile?.neuro_types?.includes('auditory')) {
        expiredRef.current = true; stopAudio(); setExpired(true);
      }
    };
    const unsubscribeAuth = useAuthStore.subscribe(check);
    const unsubscribeProgress = useChildProgressStore.subscribe(check);
    check(); return () => { unsubscribeAuth(); unsubscribeProgress(); };
  }, [stopAudio]);
  useEffect(() => {
    if (activityId !== launch.current.activityId) { expiredRef.current = true; stopAudio(); setExpired(true); }
  }, [activityId, stopAudio]);
  const finish = () => {
    if (!canInteract()) return;
    const durationMinutes = duration();
    if (!Number.isFinite(durationMinutes) || durationMinutes < 0) return;
    finishedRef.current = true; stopAudio(); setFinished(true);
    // Never return answers, transcript preferences, voice details or hearing/ability judgments.
    onComplete({ durationMinutes });
  };
  if (!valid) return <p role="status">This practice is no longer connected to the original child session. Close it and reopen the activity.</p>;
  if (finished) return <p role="status">Communication practice recorded. Your exercise choices have been cleared.</p>;
  const audioControl = (text: string, label: string) => <div className={PANEL}>
    <p className="text-sm">Check your device volume before pressing Play. Only a browser-reported on-device English voice is used. Speech quality and rate vary by device.</p>
    {!audio.available && <p className="mt-2 text-sm">No on-device English voice is available. Read the text instead; practice counts equally.</p>}
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <label className="flex min-h-12 items-center gap-2">Optional speech rate
        <select className={CONTROL} value={rate} onChange={event => {
          const next = Number(event.target.value);
          if (!canInteract() || !AUDITORY_RATES.some(value => value === next)) return;
          stopAudio(); setRate(next);
        }}>
          <option value={0.6}>Slower (0.6)</option><option value={0.75}>Slow (0.75)</option><option value={1}>Usual (1.0)</option>
        </select>
      </label>
      <button type="button" className={CONTROL} disabled={!audio.available} onClick={() => { if (canInteract()) audio.play(text, rate); }}>{label}</button>
      <button type="button" className={CONTROL} onClick={() => { if (canInteract()) audio.refresh(); }}>Refresh device voices</button>
    </div>
  </div>;
  return <div className="min-w-0 space-y-4 text-slate-900 dark:text-slate-100">
    <p className="text-sm">No timer to beat, ranking or hearing assessment. Choices disappear on close. Only completion and visible, unpaused session time are recorded.</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={CONTROL} onClick={() => {
        if (!valid || expiredRef.current || finishedRef.current || document.hidden || !getReadyChildProgressForOwner(launch.current.childId)) return;
        pausedRef.current = !pausedRef.current; stopAudio(); setPaused(pausedRef.current);
      }}>{paused ? 'Continue communication practice' : 'Pause communication practice'}</button>
      <button type="button" className={CONTROL} disabled={audio.status !== 'requested' && audio.status !== 'playing'} onClick={stopAudio}>Stop audio</button>
    </div>
    <p role="status" aria-label="Audio status">{AUDITORY_SPEECH_MESSAGES[audio.status]}</p>
    {paused && <p role="status">Paused. Your choices stay here until you close the activity. Audio will not restart automatically.</p>}
    <fieldset disabled={paused} hidden={paused} className="min-w-0">
      <legend className="sr-only">Communication practice controls</legend>
      {activityId === 'auditory-caption-match'
        ? <CaptionMatchPractice canInteract={canInteract} onFinish={finish} stopAudio={stopAudio} audioControl={audioControl} />
        : <SlowClearPractice canInteract={canInteract} onFinish={finish} stopAudio={stopAudio} audioControl={audioControl} />}
    </fieldset>
  </div>;
};

export default AuditoryPracticeActivity;
