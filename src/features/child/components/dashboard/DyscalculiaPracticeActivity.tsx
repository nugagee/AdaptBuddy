import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { getReadyChildProgressForOwner, useChildProgressReadAccess } from 'features/child/store/childProgressReadAccess';
import {
  PATTERN_TOKENS, PATTERN_EXAMPLES, MATHS_STORIES, storyAnswer, quantityLabel,
  isDyscalculiaPracticeActivity, type MathsPracticeId, type PatternToken,
} from './dyscalculiaPracticeContent';

export { isDyscalculiaPracticeActivity } from './dyscalculiaPracticeContent';
const CONTROL = 'min-h-12 min-w-12 rounded-xl border-2 border-slate-400 bg-white px-4 py-3 text-left font-semibold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100';
const PANEL = 'rounded-2xl border-2 border-slate-400 p-4';
const SELECT = `${CONTROL} mt-2 block w-full`;
const chosen = (value: boolean) => `${CONTROL} ${value ? 'ring-2 ring-inset ring-slate-700 dark:ring-slate-200' : ''}`;
interface ToolProps { canInteract: () => boolean; onFinish: () => void; }

const Token: React.FC<{ token: PatternToken }> = ({ token }) => <span className="inline-flex min-w-12 flex-col items-center gap-2">
  {token.count !== undefined ? <span className="flex max-w-20 flex-wrap justify-center gap-1" aria-hidden="true">
    {Array.from({ length: token.count }, (_, index) => <span key={index} className="h-3 w-3 rounded-full bg-current" />)}
  </span> : <span className="text-2xl" aria-hidden="true">{token.symbol}</span>}
  <span>{token.label}</span>
</span>;
const getToken = (id: string) => PATTERN_TOKENS.find(token => token.id === id)!;

const PatternPractice: React.FC<ToolProps> = ({ canInteract, onFinish }) => {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [slot, setSlot] = useState(0);
  const [answers, setAnswers] = useState<string[]>(['', '']);
  const [checked, setChecked] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [hint, setHint] = useState(false);
  const example = PATTERN_EXAMPLES[exampleIndex];
  const ready = answers.every(value => example.choices.includes(value));
  const matches = answers.every((value, index) => value === example.expected[index]);
  const reset = () => { setSlot(0); setAnswers(['', '']); setChecked(false); setReviewed(false); setHint(false); };
  return <div className="space-y-4">
    <label className="block font-bold">Pattern example
      <select className={SELECT} value={exampleIndex} onChange={event => {
        const index = Number(event.target.value);
        if (!canInteract() || !PATTERN_EXAMPLES[index] || index === exampleIndex) return;
        setExampleIndex(index); reset();
      }}>{PATTERN_EXAMPLES.map((item, index) => <option key={item.id} value={index}>{item.title}</option>)}</select>
    </label>
    <p>Explore the two missing blocks. You can use a hint, compare your choices with the example and record one reviewed exercise.</p>
    <section className={PANEL} aria-label="Pattern to explore">
      <h3 className="font-bold">Follow this example</h3>
      <ol className="mt-3 flex flex-wrap gap-3">{example.sequence.map((id, index) => <li key={`${example.id}-${index}`} className="rounded-xl border border-slate-400 p-3">
        <span className="sr-only">Position {index + 1}: </span><Token token={getToken(id)} />
      </li>)}</ol>
    </section>
    <fieldset className="space-y-2"><legend className="font-bold">Choose a missing block to work on</legend>
      <div className="grid gap-3 sm:grid-cols-2">{answers.map((value, index) => <button key={index} type="button" className={chosen(slot === index)} aria-pressed={slot === index} aria-label={`Missing block ${index + 1}`} onClick={() => { if (canInteract()) setSlot(index); }}>
        <span className="block">Missing block {index + 1}</span>
        {value ? <Token token={getToken(value)} /> : <span>Not chosen yet</span>}
      </button>)}</div>
    </fieldset>
    <p role="status">Choosing for missing block {slot + 1}.</p>
    <div role="group" aria-label="Block choices" className="flex flex-wrap gap-2">{example.choices.map(id => <button key={id} type="button" className={CONTROL} aria-label={`Use ${getToken(id).label}`} onClick={() => {
      if (!canInteract()) return;
      setAnswers(old => old.map((value, index) => index === slot ? id : value)); setChecked(false); setReviewed(false);
    }}><Token token={getToken(id)} /></button>)}</div>
    <button type="button" className={CONTROL} aria-expanded={hint} onClick={() => { if (canInteract()) setHint(value => !value); }}>{hint ? 'Hide pattern hint' : 'Show pattern hint'}</button>
    {hint && <p className={PANEL}>{example.hint}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" className={CONTROL} disabled={!ready} onClick={() => { if (canInteract() && ready) { setChecked(true); setReviewed(false); } }}>Check my pattern</button>
      <button type="button" className={CONTROL} onClick={() => { if (canInteract()) reset(); }}>Reset this pattern</button>
    </div>
    {checked && <section className={PANEL} role="status" aria-label="Pattern feedback">
      <h3 className="font-bold">{matches ? 'Your blocks continue this example.' : 'Your blocks make a different pattern.'}</h3>
      <p>{example.explanation}</p>
      <p>You can change your choices or record practice after comparing. Hints and different answers do not reduce your practice reward.</p>
    </section>}
    <label className="flex min-h-12 items-center gap-3"><input type="checkbox" className="h-6 w-6 shrink-0" disabled={!checked} checked={reviewed} onChange={event => { if (canInteract() && checked) setReviewed(event.target.checked); }} />I compared my blocks with the example</label>
    <button type="button" className={`${CONTROL} w-full`} disabled={!checked || !reviewed} onClick={() => { if (canInteract() && ready && checked && reviewed) onFinish(); }}>Record pattern practice</button>
  </div>;
};

const StoryPractice: React.FC<ToolProps> = ({ canInteract, onFinish }) => {
  const [storyIndex, setStoryIndex] = useState(0);
  const [count, setCount] = useState(MATHS_STORIES[0].start);
  const [answer, setAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [hint, setHint] = useState(false);
  const [oneStep, setOneStep] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const story = MATHS_STORIES[storyIndex];
  const expected = storyAnswer(story);
  const steps = [story.introduction, story.changeText, story.question];
  const reset = (index = storyIndex) => {
    setCount(MATHS_STORIES[index].start); setAnswer(null); setChecked(false); setReviewed(false);
    setHint(false); setOneStep(false); setStepIndex(0);
  };
  const changeCount = (difference: number) => {
    if (!canInteract()) return;
    setCount(value => Math.max(0, Math.min(story.max, value + difference)));
    setAnswer(null); setChecked(false); setReviewed(false);
  };
  const answerReady = answer !== null && Number.isInteger(answer) && answer >= 0 && answer <= story.max;
  return <div className="space-y-4">
    <label className="block font-bold">Maths story
      <select className={SELECT} value={storyIndex} onChange={event => {
        const index = Number(event.target.value);
        if (!canInteract() || !MATHS_STORIES[index] || index === storyIndex) return;
        setStoryIndex(index); reset(index);
      }}>{MATHS_STORIES.map((item, index) => <option key={item.id} value={index}>{item.title}</option>)}</select>
    </label>
    <p>These are pretend, on-screen stories. No food, water, kitchen equipment or cooking is needed.</p>
    <button type="button" className={CONTROL} aria-pressed={oneStep} onClick={() => { if (canInteract()) { setOneStep(value => !value); setStepIndex(0); } }}>{oneStep ? 'Show the whole story' : 'Show one story step'}</button>
    <section className={PANEL} aria-label="Story instructions">
      <h3 className="font-bold">{story.title}</h3>
      <ol className="mt-2 space-y-2">{steps.map((text, index) => (!oneStep || index === stepIndex) && <li key={index} value={index + 1}>{index + 1}. {text}</li>)}</ol>
      {oneStep && <div className="mt-3 space-y-2">
        <p role="status">Story step {stepIndex + 1} of 3</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={CONTROL} disabled={stepIndex === 0} onClick={() => { if (canInteract()) setStepIndex(value => value - 1); }}>Previous story step</button>
          <button type="button" className={CONTROL} disabled={stepIndex === 2} onClick={() => { if (canInteract()) setStepIndex(value => value + 1); }}>Next story step</button>
        </div>
      </div>}
    </section>
    <section className={`${PANEL} space-y-3`} aria-label="My counting model">
      <h3 className="font-bold">My counting model</h3>
      <p>Move one at a time to explore. The model starts with the story&apos;s starting amount, not the answer.</p>
      <p role="status">My model: {quantityLabel(story, count)}</p>
      {story.capacity ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="img" aria-label={`Pretend jug: ${count} of ${story.capacity} equal measures filled`}>
        {Array.from({ length: story.capacity }, (_, index) => <div key={index} aria-hidden="true" className="min-h-20 rounded-lg border-2 border-slate-500 p-2 text-center">
          <span className="block font-bold">{index < count ? 'Filled' : 'Empty'}</span><span className="text-sm">1 measure</span>
        </div>)}
      </div> : <div role="img" aria-label={`Model shows ${quantityLabel(story, count)}`} className="flex min-h-12 flex-wrap gap-2">
        {count === 0 ? <span>No {story.plural} in this model.</span> : Array.from({ length: count }, (_, index) => <span key={index} aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-current font-bold">{index + 1}</span>)}
      </div>}
      {story.capacity && <p>Each box is one equal measure: one quarter of this pretend jug. These are not millilitres or a real recipe.</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={CONTROL} disabled={count === 0} onClick={() => changeCount(-1)}>Remove one</button>
        <button type="button" className={CONTROL} disabled={count === story.max} onClick={() => changeCount(1)}>Add one</button>
        <button type="button" className={CONTROL} onClick={() => { if (canInteract()) { setAnswer(count); setChecked(false); setReviewed(false); } }}>Use my model as my answer</button>
      </div>
    </section>
    <label className="block font-bold">My answer
      <select className={SELECT} value={answer === null ? '' : String(answer)} onChange={event => {
        if (!canInteract()) return;
        const value = event.target.value === '' ? null : Number(event.target.value);
        if (value !== null && (!Number.isInteger(value) || value < 0 || value > story.max)) return;
        setAnswer(value); setChecked(false); setReviewed(false);
      }}><option value="">Choose a quantity</option>{Array.from({ length: story.max + 1 }, (_, value) => <option key={value} value={value}>{quantityLabel(story, value)}</option>)}</select>
    </label>
    <button type="button" className={CONTROL} aria-expanded={hint} onClick={() => { if (canInteract()) setHint(value => !value); }}>{hint ? 'Hide story hint' : 'Show story hint'}</button>
    {hint && <p className={PANEL}>{story.hint}</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" className={CONTROL} disabled={!answerReady} onClick={() => { if (canInteract() && answerReady) { setChecked(true); setReviewed(false); } }}>Check my answer</button>
      <button type="button" className={CONTROL} onClick={() => { if (canInteract()) reset(); }}>Reset this story</button>
    </div>
    {checked && <section className={PANEL} role="status" aria-label="Story feedback">
      <h3 className="font-bold">{answer === expected ? 'Your quantity matches this story.' : 'This story works out to a different quantity.'}</h3>
      <p>{story.start} {story.operation === 'add' ? '+' : '−'} {story.change} = {quantityLabel(story, expected)}.</p>
      <p>{story.hint}</p>
      <p>You chose {quantityLabel(story, answer!)}. You can compare and record practice, or change your answer. Hints and different answers count equally as practice.</p>
    </section>}
    <label className="flex min-h-12 items-center gap-3"><input type="checkbox" className="h-6 w-6 shrink-0" checked={reviewed} disabled={!checked} onChange={event => { if (canInteract() && checked) setReviewed(event.target.checked); }} />I compared my quantity with the worked example</label>
    <button type="button" className={`${CONTROL} w-full`} disabled={!checked || !reviewed} onClick={() => { if (canInteract() && answerReady && checked && reviewed) onFinish(); }}>Record story practice</button>
  </div>;
};

/** Visible, unpaused duration is usage metadata, not a performance score. */
const useMathsClock = (enabled: boolean) => {
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

const DyscalculiaPracticeActivity: React.FC<{ activityId: MathsPracticeId; onComplete: (result: { durationMinutes: number }) => void }> = ({ activityId, onComplete }) => {
  const { childId, isReady } = useChildProgressReadAccess();
  const hasProfile = useAuthStore(state => Boolean(state.profile?.neuro_types?.includes('dyscalculia')));
  const launch = useRef({ owner: childId, activityId });
  const expiredRef = useRef(false);
  const finishedRef = useRef(false);
  const pausedRef = useRef(false);
  const [expired, setExpired] = useState(false);
  const [finished, setFinished] = useState(false);
  const [paused, setPaused] = useState(false);
  const valid = Boolean(!expired && childId && isReady && hasProfile && childId === launch.current.owner
    && activityId === launch.current.activityId && isDyscalculiaPracticeActivity(activityId));
  const duration = useMathsClock(valid && !paused && !finished);
  useEffect(() => {
    const check = () => {
      if (!getReadyChildProgressForOwner(launch.current.owner) || !useAuthStore.getState().profile?.neuro_types?.includes('dyscalculia')) {
        expiredRef.current = true; setExpired(true);
      }
    };
    const unsubscribeAuth = useAuthStore.subscribe(check);
    const unsubscribeProgress = useChildProgressStore.subscribe(check);
    check(); return () => { unsubscribeAuth(); unsubscribeProgress(); };
  }, []);
  useEffect(() => {
    if (activityId !== launch.current.activityId) { expiredRef.current = true; setExpired(true); }
  }, [activityId]);
  const canInteract = () => Boolean(valid && !expiredRef.current && !finishedRef.current && !pausedRef.current && !document.hidden
    && getReadyChildProgressForOwner(launch.current.owner) && useAuthStore.getState().profile?.neuro_types?.includes('dyscalculia'));
  const finish = () => {
    if (!canInteract()) return;
    const durationMinutes = duration();
    if (!Number.isFinite(durationMinutes) || durationMinutes < 0) return;
    finishedRef.current = true; setFinished(true);
    // Never persist answer choices, correctness, hint use or counter arrangements.
    onComplete({ durationMinutes });
  };
  if (!valid) return <p role="status">This maths practice is no longer connected to the original child session. Close it and reopen the activity.</p>;
  if (finished) return <p role="status">Maths practice recorded. Your exercise choices have been cleared.</p>;
  return <div className="min-w-0 space-y-4 text-slate-900 dark:text-slate-100">
    <p className={PANEL}>Explore at your own pace. There is no timer to beat and no score or ranking. One checked and reviewed exercise is enough to record practice.</p>
    <p className="text-sm">Choices stay in this open activity and disappear when it closes. Recording saves the activity completion and visible session time, not your answers or hint choices.</p>
    <button type="button" className={CONTROL} onClick={() => {
      if (!valid || expiredRef.current || finishedRef.current || document.hidden || !getReadyChildProgressForOwner(launch.current.owner)) return;
      pausedRef.current = !pausedRef.current; setPaused(pausedRef.current);
    }}>{paused ? 'Continue maths practice' : 'Pause maths practice'}</button>
    {paused && <p role="status">Paused. Your choices stay here until you close the activity.</p>}
    <fieldset disabled={paused} hidden={paused} className="min-w-0">
      <legend className="sr-only">Maths practice controls</legend>
      {activityId === 'dyscalculia-pattern-blocks' ? <PatternPractice canInteract={canInteract} onFinish={finish} /> : <StoryPractice canInteract={canInteract} onFinish={finish} />}
    </fieldset>
  </div>;
};

export default DyscalculiaPracticeActivity;
