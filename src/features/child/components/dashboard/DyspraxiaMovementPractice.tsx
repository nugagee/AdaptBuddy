import React, { useCallback, useEffect, useState } from 'react';
import { MOTOR_CONTROL as CONTROL, MOTOR_PANEL as PANEL, MOVEMENT_CARDS, MOVEMENT_CHECKS } from './dyspraxiaMotorContent';

type Mode = 'read' | 'move';
type Outcome = 'read' | 'rest' | 'help' | 'tried';
const OUTCOMES: Array<{ id: Outcome; label: string }> = [
  { id: 'read', label: 'I read or imagined a step' },
  { id: 'rest', label: 'I chose to rest' },
  { id: 'help', label: 'I chose to ask for help' },
  { id: 'tried', label: 'I tried a comfortable seated action' },
];

const DyspraxiaMovementPractice: React.FC<{
  paused: boolean;
  canInteract: () => boolean;
  canStop: () => boolean;
  onFinish: () => void;
}> = ({ paused, canInteract, canStop, onFinish }) => {
  const [cardIndex, setCardIndex] = useState(0);
  const [mode, setMode] = useState<Mode>('read');
  const [checks, setChecks] = useState([false, false, false]);
  const [opened, setOpened] = useState(false);
  const [step, setStep] = useState(0);
  const [explored, setExplored] = useState<number[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [movementLocked, setMovementLocked] = useState(false);
  const [notice, setNotice] = useState('');
  const card = MOVEMENT_CARDS[cardIndex];
  const safeToOpen = mode === 'read' || (!movementLocked && checks.every(Boolean));
  const canRecord = opened && safeToOpen && explored.length > 0 && outcome !== null && reviewed;

  const resetPractice = useCallback(() => {
    setOpened(false); setStep(0); setExplored([]); setOutcome(null); setReviewed(false);
  }, []);
  const returnToReading = useCallback(() => {
    if (mode !== 'move') return;
    setMode('read'); setChecks([false, false, false]); resetPractice();
    setNotice('Movement paused. Read-only mode is selected; a seated action needs fresh safety checks.');
  }, [mode, resetPractice]);
  useEffect(() => {
    const onHidden = () => { if (document.hidden) returnToReading(); };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('blur', returnToReading);
    return () => { document.removeEventListener('visibilitychange', onHidden); window.removeEventListener('blur', returnToReading); };
  }, [returnToReading]);
  useEffect(() => { if (paused) returnToReading(); }, [paused, returnToReading]);

  const changeMode = (next: Mode) => {
    if (!canInteract() || next === mode || (next === 'move' && movementLocked)) return;
    setMode(next); setChecks([false, false, false]); resetPractice(); setNotice('');
  };
  const stop = () => {
    if (!canStop()) return;
    setMovementLocked(true); setStopped(true); setMode('read'); setChecks([false, false, false]); resetPractice();
  };

  return <div className="min-w-0 space-y-4">
    <p className={PANEL}>You do not need to move to take part. Read, imagine, rest or ask for help. There is no standing, balancing, countdown or movement score.</p>
    <p className="text-sm">Before trying an action, use your usual support and check with a trusted adult. Follow any advice from your own care team. If you are unsure, unwell, dizzy, in pain or uncomfortable, choose read-only or stop. Do not change seats or equipment for this activity.</p>
    <button type="button" className={`${CONTROL} w-full`} onClick={stop}>Stop — I need rest or help</button>
    {stopped ? <div className={PANEL}>
      <p role="status">You stopped. Rest in your usual comfortable position. Speak to a trusted adult if anything hurts or feels wrong. No message or alert has been sent.</p>
      <button type="button" className={`${CONTROL} mt-3`} disabled={paused} onClick={() => {
        if (!canInteract()) return;
        setStopped(false); setNotice('Read-only exploration is available. Seated actions stay off for this launch.');
      }}>Continue with a read-only card</button>
    </div> : <fieldset disabled={paused} hidden={paused} className="min-w-0 space-y-4">
      <legend className="sr-only">Movement card controls</legend>
      {notice && <p role="status">{notice}</p>}
      <div role="group" aria-label="Choose participation" className="flex flex-wrap gap-2">
        <button type="button" className={CONTROL} aria-pressed={mode === 'read'} onClick={() => changeMode('read')}>Read or imagine</button>
        <button type="button" className={CONTROL} aria-pressed={mode === 'move'} disabled={movementLocked} onClick={() => changeMode('move')}>Try a seated action</button>
      </div>
      <div role="group" aria-label="Choose a movement card" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {MOVEMENT_CARDS.map((item, index) => <button key={item.id} type="button" className={CONTROL} aria-pressed={index === cardIndex} onClick={() => {
          if (!canInteract() || index === cardIndex) return;
          setCardIndex(index); setChecks([false, false, false]); resetPractice(); setNotice('');
        }}><span aria-hidden="true" className="mr-2">{item.symbol}</span>{item.title}</button>)}
      </div>
      {mode === 'move' && <fieldset className={`${PANEL} space-y-3`}>
        <legend className="font-bold">Before trying a seated action</legend>
        <p>These are your acknowledgements, not a verified adult approval. They do not tell the app that an action is medically safe.</p>
        {MOVEMENT_CHECKS.map((label, index) => <label key={label} className="flex min-h-12 items-center gap-3">
          <input type="checkbox" className="h-6 w-6 shrink-0" checked={checks[index]} onChange={event => {
            if (!canInteract()) return;
            const checked = event.target.checked;
            setChecks(previous => previous.map((value, i) => i === index ? checked : value)); resetPractice();
          }} />{label}
        </label>)}
      </fieldset>}
      {!opened ? <button type="button" className={`${CONTROL} w-full`} disabled={!safeToOpen} onClick={() => {
        if (canInteract() && safeToOpen) { setOpened(true); setNotice(''); }
      }}>Open selected card</button> : <section className={`${PANEL} space-y-4`} aria-label="Open movement card">
        <h3 className="font-bold">{card.title} — step {step + 1} of 3</h3>
        <p className="font-semibold">{mode === 'read' ? 'Read or imagine only — no movement is required.' : 'An optional seated action. Only do what is comfortable; you can rest instead.'}</p>
        <p data-testid="movement-step">{card.steps[step]}</p>
        <button type="button" className={CONTROL} disabled={explored.includes(step)} onClick={() => {
          if (!canInteract() || !safeToOpen || explored.includes(step)) return;
          setExplored(previous => [...previous, step]); setOutcome(null); setReviewed(false);
        }}>{explored.includes(step) ? 'Step explored' : 'Mark this step explored'}</button>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={CONTROL} disabled={step === 0} onClick={() => { if (canInteract()) setStep(value => Math.max(0, value - 1)); }}>Previous step</button>
          <button type="button" className={CONTROL} disabled={step === 2} onClick={() => { if (canInteract()) setStep(value => Math.min(2, value + 1)); }}>Next step</button>
        </div>
        <p>{explored.length} of 3 steps explored. One is enough to record partial card exploration.</p>
        <div role="group" aria-label="How did you explore?" className="flex flex-wrap gap-2">
          {OUTCOMES.filter(item => item.id !== 'tried' || mode === 'move').map(item => <button key={item.id} type="button" className={CONTROL} disabled={explored.length === 0} aria-pressed={outcome === item.id} onClick={() => {
            if (!canInteract() || explored.length === 0) return;
            setOutcome(item.id); setReviewed(false);
          }}>{item.label}</button>)}
        </div>
        <label className="flex min-h-12 items-center gap-3"><input type="checkbox" className="h-6 w-6 shrink-0" checked={reviewed} disabled={explored.length === 0 || outcome === null} onChange={event => {
          if (canInteract() && explored.length > 0 && outcome !== null) setReviewed(event.target.checked);
        }} />I reviewed this card in my own way</label>
        <button type="button" className={`${CONTROL} w-full`} disabled={!canRecord} onClick={() => { if (canInteract() && canRecord) onFinish(); }}>Record card exploration</button>
      </section>}
      <button type="button" className={CONTROL} onClick={() => {
        if (!canInteract()) return;
        resetPractice(); setChecks([false, false, false]); setNotice('Card reset. Your earlier review was cleared.');
      }}>Reset movement card</button>
      <p className="text-sm">Recording counts card exploration, not movements performed, repetitions or physical improvement. Rest and help choices receive the same practice credit. Nothing is sent to an adult.</p>
    </fieldset>}
  </div>;
};

export default DyspraxiaMovementPractice;
