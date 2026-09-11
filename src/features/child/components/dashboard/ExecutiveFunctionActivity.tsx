import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { getReadyChildProgressForOwner, useChildProgressReadAccess } from 'features/child/store/childProgressReadAccess';
import {
  FIRST_STEP_TASKS, START_SUPPORTS, READY_CHECKLISTS, CHECKLIST_STATUSES,
  PLAN_ACTIVITIES, TRANSITION_SUPPORTS, isExecutiveFunctionActivity,
  type ExecutiveActivityId, type PlanningPracticeResult,
} from './executiveFunctionContent';

export { isExecutiveFunctionActivity } from './executiveFunctionContent';
const CONTROL = 'min-h-12 rounded-xl border-2 px-4 py-3 text-left font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 disabled:cursor-not-allowed disabled:opacity-50';
const BUTTON = `${CONTROL} border-slate-400 bg-white text-slate-900`;
const FINISH = `${CONTROL} w-full border-slate-800 bg-slate-800 text-white`;
const SELECT = 'mt-2 min-h-12 w-full rounded-xl border-2 border-slate-400 bg-white px-3 text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700';
const picked = (selected: boolean) => `${CONTROL} text-slate-900 ${selected ? 'border-slate-800 bg-slate-100 ring-2 ring-slate-700' : 'border-slate-400 bg-white'}`;
const SUMMARY = 'space-y-2 rounded-2xl border-2 border-slate-500 bg-slate-50 p-4 text-slate-900';

/** Measured visible, unpaused time; no countdown or minimum-duration target. */
const usePlanningClock = (enabled: boolean) => {
  const elapsed = useRef(0);
  const started = useRef<number | null>(null);
  const settle = useCallback(() => {
    if (started.current !== null) elapsed.current += Math.max(0, Date.now() - started.current);
    started.current = null;
  }, []);
  useEffect(() => {
    const sync = () => {
      settle();
      if (enabled && !document.hidden) started.current = Date.now();
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => { settle(); document.removeEventListener('visibilitychange', sync); };
  }, [enabled, settle]);
  return useCallback(() => (
    elapsed.current + (started.current === null ? 0 : Math.max(0, Date.now() - started.current))
  ) / 60000, []);
};

interface ToolProps { onFinish: () => void; }
const FirstStepPlanner: React.FC<ToolProps> = ({ onFinish }) => {
  const [taskIndex, setTaskIndex] = useState(0);
  const [step, setStep] = useState('');
  const [support, setSupport] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const task = FIRST_STEP_TASKS[taskIndex];
  const choicesReady = (task.steps as readonly string[]).includes(step)
    && (START_SUPPORTS as readonly string[]).includes(support);
  const reset = () => { setStep(''); setSupport(''); setReviewed(false); };
  return <div className="space-y-4">
    <label className="block font-bold">Planning example
      <select className={SELECT} value={taskIndex} onChange={(event) => {
        const index = Number(event.target.value);
        if (!FIRST_STEP_TASKS[index] || index === taskIndex) return;
        setTaskIndex(index); reset();
      }}>{FIRST_STEP_TASKS.map((item, index) => <option key={item.id} value={index}>{item.title}</option>)}</select>
    </label>
    <p>Plan a small start. You do not have to do the task now, and you can change your mind.</p>
    <fieldset className="space-y-2"><legend className="font-bold">Choose one first step</legend>
      <div className="grid gap-2">{task.steps.map((text) => <button type="button" key={text} className={picked(text === step)} aria-pressed={text === step} onClick={() => {
        if (step !== text) { setStep(text); setReviewed(false); }
      }}>{text}</button>)}</div>
    </fieldset>
    <fieldset className="space-y-2"><legend className="font-bold">Choose your support</legend>
      <div className="flex flex-wrap gap-2">{START_SUPPORTS.map((text) => <button type="button" key={text} className={picked(text === support)} aria-pressed={text === support} onClick={() => {
        if (support !== text) { setSupport(text); setReviewed(false); }
      }}>{text}</button>)}</div>
    </fieldset>
    <section aria-label="My first-step plan" className={SUMMARY} aria-live="polite">
      <h3 className="font-bold">My first-step plan</h3>
      <p>First step: {step || 'Choose one small step.'}</p>
      <p>Support: {support || 'Choose what works for you.'}</p>
    </section>
    <label className="flex min-h-12 items-center gap-3"><input className="h-6 w-6 shrink-0" type="checkbox" checked={reviewed} disabled={!choicesReady} onChange={(event) => setReviewed(event.target.checked)} />I reviewed my first-step plan</label>
    <button type="button" className={BUTTON} onClick={reset}>Clear first-step plan</button>
    <button type="button" className={FINISH} disabled={!choicesReady || !reviewed} onClick={() => { if (choicesReady && reviewed) onFinish(); }}>Record first-step practice</button>
  </div>;
};

const ReadyChecklist: React.FC<ToolProps> = ({ onFinish }) => {
  const [listIndex, setListIndex] = useState(0);
  const [statuses, setStatuses] = useState<string[]>(['', '', '']);
  const [reviewed, setReviewed] = useState(false);
  const [oneItem, setOneItem] = useState(false);
  const [itemIndex, setItemIndex] = useState(0);
  const list = READY_CHECKLISTS[listIndex];
  const allConsidered = statuses.every((value) => CHECKLIST_STATUSES.some((status) => status.id === value));
  const reset = () => { setStatuses(['', '', '']); setReviewed(false); setItemIndex(0); setOneItem(false); };
  return <div className="space-y-4">
    <label className="block font-bold">Checklist example
      <select className={SELECT} value={listIndex} onChange={(event) => {
        const index = Number(event.target.value);
        if (!READY_CHECKLISTS[index] || index === listIndex) return;
        setListIndex(index); reset();
      }}>{READY_CHECKLISTS.map((item, index) => <option key={item.id} value={index}>{item.title}</option>)}</select>
    </label>
    <p>Review each item your way. Ready, not needed and asking for help count equally. This is planning practice, not a check that you have packed anything.</p>
    <button type="button" className={BUTTON} aria-pressed={oneItem} onClick={() => { setOneItem((value) => !value); setItemIndex(0); }}>{oneItem ? 'Show the whole checklist' : 'Show one checklist item'}</button>
    {oneItem && <p role="status">Item {itemIndex + 1} of {list.items.length}</p>}
    <div className="space-y-3">{list.items.map((item, index) => (!oneItem || index === itemIndex) && <label className="block rounded-xl border border-slate-400 p-3 font-bold" key={item}>
      {item}
      <select className={SELECT} aria-label={`Status for ${item}`} value={statuses[index]} onChange={(event) => {
        const value = event.target.value;
        if (value !== '' && !CHECKLIST_STATUSES.some((status) => status.id === value)) return;
        if (value !== statuses[index]) {
          setStatuses((old) => old.map((previous, i) => i === index ? value : previous)); setReviewed(false);
        }
      }}><option value="">Choose a status</option>{CHECKLIST_STATUSES.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select>
    </label>)}</div>
    {oneItem && <div className="flex flex-wrap gap-2">
      <button type="button" className={BUTTON} disabled={itemIndex === 0} onClick={() => setItemIndex((value) => value - 1)}>Previous checklist item</button>
      <button type="button" className={BUTTON} disabled={itemIndex === list.items.length - 1} onClick={() => setItemIndex((value) => value + 1)}>Next checklist item</button>
    </div>}
    <section aria-label="My checklist review" className={SUMMARY}>
      <h3 className="font-bold">My checklist review</h3>
      <ul className="space-y-2">{list.items.map((item, index) => <li key={item}>{item}: {CHECKLIST_STATUSES.find((status) => status.id === statuses[index])?.label ?? 'Not reviewed yet'}</li>)}</ul>
    </section>
    <label className="flex min-h-12 items-center gap-3"><input className="h-6 w-6 shrink-0" type="checkbox" disabled={!allConsidered} checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />I reviewed this checklist</label>
    <button type="button" className={BUTTON} onClick={reset}>Clear checklist choices</button>
    <button type="button" className={FINISH} disabled={!allConsidered || !reviewed} onClick={() => { if (allConsidered && reviewed) onFinish(); }}>Record checklist practice</button>
  </div>;
};

const ChangeOfPlan: React.FC<ToolProps> = ({ onFinish }) => {
  const [now, setNow] = useState('');
  const [next, setNext] = useState('');
  const [bridge, setBridge] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const complete = (PLAN_ACTIVITIES as readonly string[]).includes(now)
    && (PLAN_ACTIVITIES as readonly string[]).includes(next) && now !== next
    && (TRANSITION_SUPPORTS as readonly string[]).includes(bridge);
  return <div className="space-y-4">
    <p>Try a possible change of plan. This does not mean you must move on now. You can ask for help, more time or a pause.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block font-bold">What is happening now?
        <select className={SELECT} value={now} onChange={(event) => { setNow(event.target.value); setReviewed(false); }}>
          <option value="">Choose now</option>{PLAN_ACTIVITIES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label className="block font-bold">What might come next?
        <select className={SELECT} value={next} onChange={(event) => { setNext(event.target.value); setReviewed(false); }}>
          <option value="">Choose next</option>{PLAN_ACTIVITIES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
    </div>
    {now && now === next && <p role="status">You can stay with your activity. To practise a change, choose a different next activity.</p>}
    <fieldset className="space-y-2"><legend className="font-bold">Choose a helpful bridge</legend>
      <div className="grid gap-2">{TRANSITION_SUPPORTS.map((text) => <button type="button" key={text} className={picked(bridge === text)} aria-pressed={bridge === text} onClick={() => {
        if (bridge !== text) { setBridge(text); setReviewed(false); }
      }}>{text}</button>)}</div>
    </fieldset>
    <section aria-label="My change-of-plan card" className={SUMMARY} aria-live="polite">
      <h3 className="font-bold">My change-of-plan card</h3>
      <p>Now: {now || 'Choose an activity.'}</p>
      <p>Helpful bridge: {bridge || 'Choose support for a change.'}</p>
      <p>Next, when ready: {next || 'Choose a different activity.'}</p>
    </section>
    <label className="flex min-h-12 items-center gap-3"><input className="h-6 w-6 shrink-0" type="checkbox" checked={reviewed} disabled={!complete} onChange={(event) => setReviewed(event.target.checked)} />I explored this possible change of plan</label>
    <button type="button" className={BUTTON} onClick={() => { setNow(''); setNext(''); setBridge(''); setReviewed(false); }}>Clear change-of-plan card</button>
    <button type="button" className={FINISH} disabled={!complete || !reviewed} onClick={() => { if (complete && reviewed) onFinish(); }}>Record transition practice</button>
  </div>;
};

interface Props { activityId: ExecutiveActivityId; onComplete: (result: PlanningPracticeResult) => void; }
const ExecutiveFunctionActivity: React.FC<Props> = ({ activityId, onComplete }) => {
  const { childId, isReady } = useChildProgressReadAccess();
  const hasProfile = useAuthStore((state) => Boolean(state.profile?.neuro_types?.includes('executive-function')));
  const launch = useRef({ owner: childId, activityId });
  const expiredRef = useRef(false);
  const finished = useRef(false);
  const pausedRef = useRef(false);
  const [expired, setExpired] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [paused, setPaused] = useState(false);
  const valid = Boolean(!expired && childId && isReady && hasProfile
    && childId === launch.current.owner && activityId === launch.current.activityId && isExecutiveFunctionActivity(activityId));
  const readMinutes = usePlanningClock(valid && !paused && !recorded);
  useEffect(() => {
    const check = () => {
      if (!getReadyChildProgressForOwner(launch.current.owner)
        || !useAuthStore.getState().profile?.neuro_types?.includes('executive-function')) {
        // Invalidate synchronously, including A -> loading -> A in one React batch.
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
  const finish = () => {
    if (finished.current || expiredRef.current || pausedRef.current || document.hidden || !valid
      || !getReadyChildProgressForOwner(launch.current.owner)
      || !useAuthStore.getState().profile?.neuro_types?.includes('executive-function')) return;
    const durationMinutes = readMinutes();
    if (!Number.isFinite(durationMinutes) || durationMinutes < 0) return;
    finished.current = true; setRecorded(true);
    // Deliberately omit the task, checklist statuses, transition and support choices.
    onComplete({ durationMinutes });
  };
  if (!valid) return <p role="status">This child session has changed or is not ready for this tool. Close and reopen the activity.</p>;
  if (recorded) return <p role="status">Planning practice recorded. You can close this activity.</p>;
  return <div className="min-w-0 space-y-4 text-slate-900 dark:text-slate-100">
    <p className="rounded-xl border border-slate-500 p-3">Choose, prepare or adjust at your pace. This is optional planning practice, not a test of ability or a requirement to finish a task.</p>
    <p className="text-sm">Your choices stay in this open activity. Recording adds a practice completion and visible session time, not your plan or support choices. Closing discards the choices.</p>
    <p className="text-sm">No reminders, messages or adult alerts are sent. To ask for help or more time, communicate with someone directly in your own way.</p>
    <button type="button" className={BUTTON} onClick={() => { pausedRef.current = !pausedRef.current; setPaused(pausedRef.current); }}>{paused ? 'Continue planning' : 'Pause planning'}</button>
    {paused && <p role="status">Planning paused. Your choices stay here until you close the activity.</p>}
    <div hidden={paused}>
      {activityId === 'executive-first-step' && <FirstStepPlanner onFinish={finish} />}
      {activityId === 'executive-ready-checklist' && <ReadyChecklist onFinish={finish} />}
      {activityId === 'executive-change-plan' && <ChangeOfPlan onFinish={finish} />}
    </div>
  </div>;
};
export default ExecutiveFunctionActivity;
