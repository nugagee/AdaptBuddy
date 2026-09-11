import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { getReadyChildProgressForOwner, useChildProgressReadAccess } from 'features/child/store/childProgressReadAccess';
import DyspraxiaFineMotorPractice from './DyspraxiaFineMotorPractice';
import DyspraxiaMovementPractice from './DyspraxiaMovementPractice';
import { isDyspraxiaMotorActivity, type DyspraxiaMotorId, MOTOR_CONTROL as CONTROL } from './dyspraxiaMotorContent';
export { isDyspraxiaMotorActivity } from './dyspraxiaMotorContent';

const useVisibleSessionMinutes = (enabled: boolean) => {
  const elapsed = useRef(0);
  const started = useRef<number | null>(null);
  const settle = useCallback(() => {
    if (started.current !== null) elapsed.current += Math.max(0, Date.now() - started.current);
    started.current = null;
  }, []);
  useEffect(() => {
    const sync = () => { settle(); if (enabled && !document.hidden) started.current = Date.now(); };
    sync(); document.addEventListener('visibilitychange', sync);
    return () => { settle(); document.removeEventListener('visibilitychange', sync); };
  }, [enabled, settle]);
  return () => (elapsed.current + (started.current === null ? 0 : Math.max(0, Date.now() - started.current))) / 60000;
};

const DyspraxiaMotorActivity: React.FC<{
  activityId: DyspraxiaMotorId;
  onComplete: (result: { durationMinutes: number }) => void;
}> = ({ activityId, onComplete }) => {
  const { childId, isReady } = useChildProgressReadAccess();
  const hasProfile = useAuthStore(state => Boolean(state.profile?.neuro_types?.includes('dyspraxia')));
  const launch = useRef({ owner: childId, activityId });
  const expiredRef = useRef(false);
  const completedRef = useRef(false);
  const pausedRef = useRef(false);
  const [expired, setExpired] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [paused, setPaused] = useState(false);
  const valid = Boolean(!expired && childId && isReady && hasProfile && childId === launch.current.owner
    && activityId === launch.current.activityId && isDyspraxiaMotorActivity(activityId));
  const duration = useVisibleSessionMinutes(valid && !paused && !completed);

  useEffect(() => {
    const check = () => {
      if (!getReadyChildProgressForOwner(launch.current.owner) || !useAuthStore.getState().profile?.neuro_types?.includes('dyspraxia')) {
        expiredRef.current = true; setExpired(true);
      }
    };
    const unsubscribeAuth = useAuthStore.subscribe(check);
    const unsubscribeProgress = useChildProgressStore.subscribe(check);
    check();
    return () => { unsubscribeAuth(); unsubscribeProgress(); };
  }, []);
  useEffect(() => {
    if (activityId !== launch.current.activityId) { expiredRef.current = true; setExpired(true); }
  }, [activityId]);

  const isOwned = () => Boolean(valid && !expiredRef.current && !completedRef.current && !document.hidden
    && getReadyChildProgressForOwner(launch.current.owner) && useAuthStore.getState().profile?.neuro_types?.includes('dyspraxia'));
  const canInteract = () => isOwned() && !pausedRef.current;
  const finish = () => {
    if (!canInteract()) return;
    const durationMinutes = duration();
    if (!Number.isFinite(durationMinutes) || durationMinutes < 0) return;
    completedRef.current = true; setCompleted(true);
    // Only usage metadata, never movements, readiness acknowledgements, outcomes or arrangements.
    onComplete({ durationMinutes });
  };

  if (!valid) return <p role="status">This practice is no longer connected to the original child session. Close it and reopen the activity.</p>;
  if (completed) return <p role="status">Practice recorded. Your open activity choices have been cleared.</p>;
  return <div className="min-w-0 space-y-4 text-slate-900 dark:text-slate-100">
    <p className="text-sm">Optional exploration, not a motor assessment or therapy programme. Choices disappear when this activity closes. Only completion and visible, unpaused session time are recorded; this is not exercise time.</p>
    <button type="button" className={CONTROL} onClick={() => {
      if (!isOwned()) return;
      pausedRef.current = !pausedRef.current; setPaused(pausedRef.current);
    }}>{paused ? 'Continue this practice' : 'Pause this practice'}</button>
    {paused && <p role="status">Paused. You can close this activity at any time. Seated movement does not resume automatically.</p>}
    {activityId === 'dyspraxia-fine-motor' ? <fieldset disabled={paused} hidden={paused} className="min-w-0">
      <legend className="sr-only">Placement practice controls</legend>
      <DyspraxiaFineMotorPractice canInteract={canInteract} onFinish={finish} />
    </fieldset> : <DyspraxiaMovementPractice paused={paused} canInteract={canInteract} canStop={isOwned} onFinish={finish} />}
  </div>;
};

export default DyspraxiaMotorActivity;
