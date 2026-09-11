import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { getReadyChildProgressForOwner, useChildProgressReadAccess } from 'features/child/store/childProgressReadAccess';
import {
  INITIAL_STORY_ORDER, PHRASE_GROUPS, PRACTICE_STORIES, SENTENCE_PARTS,
  isSpeechLanguageActivity,
  type CommunicationPracticeResult, type SpeechLanguageActivityId,
} from './speechLanguageContent';

export { isSpeechLanguageActivity } from './speechLanguageContent';
const CONTROL = 'min-h-12 rounded-xl border-2 px-4 py-3 text-left font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-700 disabled:cursor-not-allowed disabled:opacity-50';
const BUTTON = `${CONTROL} border-slate-400 bg-white text-slate-900`;
const FINISH = `${CONTROL} w-full border-cyan-800 bg-cyan-800 text-white`;
const selectedClass = (selected: boolean) => `${CONTROL} text-slate-900 ${selected ? 'border-cyan-800 bg-cyan-50 ring-2 ring-cyan-700' : 'border-slate-400 bg-white'}`;

/** Visible elapsed time only: no countdown, speed target or background accrual. */
const usePracticeClock = (enabled: boolean) => {
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

const PhraseCards: React.FC<ToolProps> = ({ onFinish }) => {
  const [groupIndex, setGroupIndex] = useState(0);
  const [phrase, setPhrase] = useState<string | null>(null);
  const [practised, setPractised] = useState(false);
  const group = PHRASE_GROUPS[groupIndex];
  return <div className="space-y-4">
    <fieldset className="space-y-2"><legend className="font-bold">Choose a situation</legend>
      <div className="flex flex-wrap gap-2">{PHRASE_GROUPS.map((item, index) => <button key={item.id} type="button" className={selectedClass(index === groupIndex)} aria-pressed={index === groupIndex} onClick={() => {
        if (index !== groupIndex) { setGroupIndex(index); setPhrase(null); setPractised(false); }
      }}>{item.label}</button>)}</div>
    </fieldset>
    <fieldset className="space-y-2"><legend className="font-bold">Choose a phrase</legend>
      <div className="grid gap-2">{group.phrases.map((text) => <button key={text} type="button" className={selectedClass(phrase === text)} aria-pressed={phrase === text} onClick={() => {
        if (text !== phrase) { setPhrase(text); setPractised(false); }
      }}>{text}</button>)}</div>
    </fieldset>
    <section aria-label="My phrase card" className="rounded-2xl border-2 border-cyan-700 bg-cyan-50 p-5 text-xl leading-relaxed text-slate-900">
      {phrase ?? 'Choose a phrase to make your card.'}
    </section>
    <p className="text-sm">Showing a phrase does not send a message or contact anyone. To ask someone for help, show them your card or communicate in your own way.</p>
    <fieldset className="space-y-2"><legend className="font-bold">Try the card your way</legend>
      <div className="flex flex-wrap gap-2">{['I pointed to the card', 'I read the card', 'I said it my way'].map((label) => <button type="button" key={label} className={BUTTON} disabled={!phrase} onClick={() => setPractised(true)}>{label}</button>)}</div>
    </fieldset>
    <p role="status" className="text-sm">{practised ? 'Practice acknowledged. You can record this session or try another card.' : 'Choose a phrase, then try it by pointing, reading or speaking.'}</p>
    <button type="button" className={FINISH} disabled={!phrase || !practised} onClick={onFinish}>Record phrase practice</button>
  </div>;
};

const SentenceBuilder: React.FC<ToolProps> = ({ onFinish }) => {
  const [parts, setParts] = useState<string[]>(['', '', '']);
  const [explored, setExplored] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const complete = parts.every(Boolean);
  return <div className="space-y-4">
    <p>Choose one card from each group. There is no spelling test or speech score.</p>
    {SENTENCE_PARTS.map((part, index) => <fieldset key={part.id} className="space-y-2"><legend className="font-bold">{part.label}</legend>
      <div className="flex flex-wrap gap-2">{part.choices.map((word) => <button key={word} type="button" className={selectedClass(parts[index] === word)} aria-pressed={parts[index] === word} onClick={() => {
        if (parts[index] !== word) { setParts((old) => old.map((value, i) => i === index ? word : value)); setExplored(false); }
      }}>{word}</button>)}</div>
    </fieldset>)}
    <section aria-label="My sentence" className="rounded-2xl border-2 border-cyan-700 bg-cyan-50 p-5 text-xl leading-relaxed text-slate-900" aria-live="polite">
      {parts.filter(Boolean).join(' ') || 'Your sentence will appear here.'}
    </section>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={BUTTON} aria-expanded={showExample} onClick={() => setShowExample((old) => !old)}>{showExample ? 'Hide sentence example' : 'Show a sentence example'}</button>
      <button type="button" className={BUTTON} onClick={() => { setParts(['', '', '']); setExplored(false); setShowExample(false); }}>Clear sentence</button>
    </div>
    {showExample && <p className="rounded-xl border border-slate-400 p-3">One example: We draw in the classroom. Your choices can be different.</p>}
    <label className="flex min-h-12 items-center gap-3"><input className="h-6 w-6 shrink-0" type="checkbox" disabled={!complete} checked={explored} onChange={(event) => setExplored(event.target.checked)} />I explored my sentence by pointing, reading or speaking</label>
    <p className="text-sm">Choose who, an action and a place before recording. Changing a word starts a fresh practice confirmation.</p>
    <button type="button" className={FINISH} disabled={!complete || !explored} onClick={onFinish}>Record sentence practice</button>
  </div>;
};

const StorySteps: React.FC<ToolProps> = ({ onFinish }) => {
  const [storyIndex, setStoryIndex] = useState(0);
  const [order, setOrder] = useState([...INITIAL_STORY_ORDER]);
  const [interacted, setInteracted] = useState(false);
  const [checked, setChecked] = useState(false);
  const [explored, setExplored] = useState(false);
  const [oneStep, setOneStep] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const story = PRACTICE_STORIES[storyIndex];
  const matchesExample = order.every((value, index) => value === index);
  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    setOrder((previous) => {
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setInteracted(true); setExplored(false); setChecked(false);
    if (oneStep) setStepIndex(target);
  };
  return <div className="space-y-4">
    <label className="block font-bold">Story
      <select className="mt-2 min-h-12 w-full rounded-xl border-2 border-slate-400 bg-white px-3 text-slate-900" value={storyIndex} onChange={(event) => {
        const index = Number(event.target.value);
        if (!PRACTICE_STORIES[index] || index === storyIndex) return;
        setStoryIndex(index); setOrder([...INITIAL_STORY_ORDER]); setInteracted(false); setChecked(false); setExplored(false); setOneStep(false); setStepIndex(0);
      }}>{PRACTICE_STORIES.map((item, index) => <option key={item.id} value={index}>{item.title}</option>)}</select>
    </label>
    <p>Explore one card or all three. Move a card or compare with an example, then point, read or tell the story your way. There is no score.</p>
    <button type="button" className={BUTTON} aria-pressed={oneStep} onClick={() => { setOneStep((value) => !value); setStepIndex(0); }}>{oneStep ? 'Show all story steps' : 'Show one step at a time'}</button>
    {oneStep && <p role="status">Step {stepIndex + 1} of {order.length}</p>}
    <ol className="space-y-3" aria-label="My story order">
      {order.map((cardIndex, index) => {
        if (oneStep && index !== stepIndex) return null;
        const card = story.cards[cardIndex];
        return <li key={card.id} className="space-y-3 rounded-2xl border-2 border-slate-400 p-4">
          <p className="text-lg"><span aria-hidden="true" className="mr-2">{card.emoji}</span><span className="font-bold">{index + 1}. </span><span>{card.text}</span></p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={BUTTON} disabled={index === 0} aria-label={`Move ${card.text} up`} onClick={() => move(index, -1)}>Move up</button>
            <button type="button" className={BUTTON} disabled={index === order.length - 1} aria-label={`Move ${card.text} down`} onClick={() => move(index, 1)}>Move down</button>
          </div>
        </li>;
      })}
    </ol>
    {oneStep && <div className="flex flex-wrap gap-2">
      <button type="button" className={BUTTON} disabled={stepIndex === 0} onClick={() => setStepIndex((index) => index - 1)}>Previous story step</button>
      <button type="button" className={BUTTON} disabled={stepIndex === order.length - 1} onClick={() => setStepIndex((index) => index + 1)}>Next story step</button>
    </div>}
    <button type="button" className={BUTTON} onClick={() => { setChecked(true); setInteracted(true); }}>Compare with an example</button>
    {checked && <section aria-label="One example order" className="space-y-2 rounded-xl border border-slate-400 p-4">
      <h3 className="font-bold">One example order</h3>
      <p role="status">{matchesExample ? 'Your order matches this example. You can still tell it your way.' : 'Your order is different from this example. You can explore it or keep your version.'}</p>
      <ol className="list-inside list-decimal space-y-2">{story.cards.map((card) => <li key={card.id}>{card.text}</li>)}</ol>
    </section>}
    <label className="flex min-h-12 items-center gap-3"><input className="h-6 w-6 shrink-0" type="checkbox" disabled={!interacted} checked={explored} onChange={(event) => setExplored(event.target.checked)} />I explored this story by pointing, reading or telling it</label>
    <button type="button" className={FINISH} disabled={!interacted || !explored} onClick={onFinish}>Record story practice</button>
  </div>;
};

interface Props { activityId: SpeechLanguageActivityId; onComplete: (result: CommunicationPracticeResult) => void; }

const SpeechLanguageActivity: React.FC<Props> = ({ activityId, onComplete }) => {
  const { childId, isReady } = useChildProgressReadAccess();
  const hasProfile = useAuthStore((state) => Boolean(state.profile?.neuro_types?.includes('speech-language')));
  const launch = useRef({ owner: childId, activityId });
  const finished = useRef(false);
  const [expired, setExpired] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [paused, setPaused] = useState(false);
  const validScope = Boolean(!expired && childId && isReady && hasProfile
    && childId === launch.current.owner && activityId === launch.current.activityId && isSpeechLanguageActivity(activityId));
  const readMinutes = usePracticeClock(validScope && !paused && !recorded);

  useEffect(() => {
    // Subscribe to transitions as well as rendering: even A -> loading -> A
    // invalidates this launch instead of resurrecting a previous practice.
    const check = () => {
      if (!getReadyChildProgressForOwner(launch.current.owner)
        || !useAuthStore.getState().profile?.neuro_types?.includes('speech-language')) setExpired(true);
    };
    const unsubscribeAuth = useAuthStore.subscribe(check);
    const unsubscribeProgress = useChildProgressStore.subscribe(check);
    check();
    return () => { unsubscribeAuth(); unsubscribeProgress(); };
  }, []);
  useEffect(() => {
    if (activityId !== launch.current.activityId) setExpired(true);
  }, [activityId]);

  const finish = () => {
    if (finished.current || paused || !validScope
      || !getReadyChildProgressForOwner(launch.current.owner)
      || !useAuthStore.getState().profile?.neuro_types?.includes('speech-language')) return;
    const durationMinutes = readMinutes();
    if (!Number.isFinite(durationMinutes) || durationMinutes < 0) return;
    finished.current = true; setRecorded(true);
    // Only the existing completion metadata leaves this tool. No phrase,
    // sentence, story order or communication method is stored or sent.
    onComplete({ durationMinutes });
  };
  if (!validScope) return <p role="status">This child session has changed or is not ready for this tool. Close and reopen the activity.</p>;
  if (recorded) return <p role="status">Practice recorded. You can close this activity.</p>;
  return <div className="min-w-0 space-y-4 text-slate-900 dark:text-slate-100">
    <p className="rounded-xl border border-cyan-700 p-3">Point, read or speak — each way counts equally. These are educational practice tools, not speech therapy or assessment. No microphone is used.</p>
    <p className="text-sm">Your choices stay in this open activity. Recording adds a practice completion and visible session time, not your words or answers. Closing discards the choices.</p>
    <button type="button" className={BUTTON} onClick={() => setPaused((value) => !value)}>{paused ? 'Continue practice' : 'Pause practice'}</button>
    {paused && <p role="status">Practice paused. Your choices stay here until you close the activity.</p>}
    <div hidden={paused}>
      {activityId === 'speech-language-phrase-cards' && <PhraseCards onFinish={finish} />}
      {activityId === 'speech-language-sentence-builder' && <SentenceBuilder onFinish={finish} />}
      {activityId === 'speech-language-story-steps' && <StorySteps onFinish={finish} />}
    </div>
  </div>;
};

export default SpeechLanguageActivity;
