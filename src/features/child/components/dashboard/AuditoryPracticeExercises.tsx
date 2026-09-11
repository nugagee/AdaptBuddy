import React, { useState } from 'react';
import { AUDITORY_CONTROL as CONTROL, AUDITORY_PANEL as PANEL, CAPTION_EXAMPLES, INSTRUCTION_EXAMPLES } from './auditoryPracticeContent';

type PracticeProps = {
  canInteract: () => boolean;
  onFinish: () => void;
  stopAudio: () => void;
  audioControl: (text: string, label: string) => React.ReactNode;
};

export const CaptionMatchPractice: React.FC<PracticeProps> = ({ canInteract, onFinish, stopAudio, audioControl }) => {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [showText, setShowText] = useState(true);
  const example = CAPTION_EXAMPLES[exampleIndex];
  const selected = example.choices.find(item => item.id === choice);
  const expected = example.choices.find(item => item.id === example.answerId)!;
  const clear = () => { stopAudio(); setChoice(null); setChecked(false); setReviewed(false); };
  return <div className="min-w-0 space-y-4">
    <p className={PANEL}>Read the caption, listen when available, or use both. Choose the card that fits, check it and compare with the explanation. Text-only practice and using help count equally.</p>
    <div role="group" aria-label="Choose a caption example" className="flex flex-wrap gap-2">
      {CAPTION_EXAMPLES.map((item, index) => <button type="button" key={item.id} className={CONTROL} aria-pressed={index === exampleIndex} onClick={() => {
        if (!canInteract() || index === exampleIndex) return;
        clear(); setExampleIndex(index); setShowText(true);
      }}>{`Example ${index + 1}`}</button>)}
    </div>
    <h3 className="font-bold">Caption {exampleIndex + 1}</h3>
    <button type="button" className={CONTROL} aria-pressed={showText} onClick={() => { if (canInteract()) setShowText(value => !value); }}>Show caption text</button>
    {showText && <p className={PANEL} aria-label="Caption transcript">{example.caption}</p>}
    {audioControl(example.caption, 'Play caption')}
    <div role="group" aria-label="Choose a matching card" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {example.choices.map(item => <button type="button" key={item.id} className={CONTROL} aria-pressed={choice === item.id} onClick={() => {
        if (!canInteract()) return;
        setChoice(item.id); setChecked(false); setReviewed(false);
      }}><span aria-hidden="true" className="mb-2 block text-3xl">{item.symbol}</span>{item.label}</button>)}
    </div>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={CONTROL} disabled={!selected} onClick={() => {
        if (canInteract() && selected) { stopAudio(); setChecked(true); setReviewed(false); }
      }}>Check my match</button>
      <button type="button" className={CONTROL} onClick={() => { if (canInteract()) clear(); }}>Reset caption practice</button>
    </div>
    {checked && selected && <section className={PANEL} role="status" aria-label="Caption comparison">
      <h3 className="font-bold">{selected.id === expected.id ? 'Your card matches the caption.' : 'A different card matches this caption.'}</h3>
      <p>{example.caption}</p>
      <p>The matching card is: {expected.label}. You chose: {selected.label}.</p>
      <p>You can compare and record practice, or choose again. This is practice, not a hearing or memory test.</p>
    </section>}
    <label className="flex min-h-12 items-center gap-3"><input type="checkbox" className="h-6 w-6 shrink-0" checked={reviewed} disabled={!checked} onChange={event => {
      if (canInteract() && checked) setReviewed(event.target.checked);
    }} />I compared my card with the caption</label>
    <button type="button" className={`${CONTROL} w-full`} disabled={!selected || !checked || !reviewed} onClick={() => {
      if (canInteract() && selected && checked && reviewed) onFinish();
    }}>Record caption practice</button>
  </div>;
};

const KeyWords: React.FC<{ text: string; keyword: string; highlight: boolean }> = ({ text, keyword, highlight }) => {
  const start = text.indexOf(keyword);
  if (!highlight || start < 0) return <>{text}</>;
  return <>{text.slice(0, start)}<strong className="underline decoration-2 underline-offset-4">{keyword}</strong>{text.slice(start + keyword.length)}</>;
};

export const SlowClearPractice: React.FC<PracticeProps> = ({ canInteract, onFinish, stopAudio, audioControl }) => {
  const [exampleIndex, setExampleIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [explored, setExplored] = useState<boolean[]>([false, false, false]);
  const [reviewed, setReviewed] = useState(false);
  const [highlight, setHighlight] = useState(true);
  const [allSteps, setAllSteps] = useState(false);
  const example = INSTRUCTION_EXAMPLES[exampleIndex];
  const step = example.steps[stepIndex];
  const count = explored.filter(Boolean).length;
  const reset = () => { stopAudio(); setStepIndex(0); setExplored([false, false, false]); setReviewed(false); };
  const navigate = (index: number) => {
    if (!canInteract() || index < 0 || index >= example.steps.length) return;
    stopAudio(); setStepIndex(index); setReviewed(false);
  };
  return <div className="min-w-0 space-y-4">
    <p className={PANEL}>Explore a short instruction in your own time. Read it, listen when available, or ask someone to help. You do not need to carry out the real task. One explored instruction plus review can record partial practice.</p>
    <div role="group" aria-label="Choose an instruction example" className="flex flex-wrap gap-2">
      {INSTRUCTION_EXAMPLES.map((item, index) => <button type="button" key={item.id} className={CONTROL} aria-pressed={index === exampleIndex} onClick={() => {
        if (!canInteract() || index === exampleIndex) return;
        reset(); setExampleIndex(index);
      }}>{item.title}</button>)}
    </div>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={CONTROL} aria-pressed={highlight} onClick={() => { if (canInteract()) setHighlight(value => !value); }}>Highlight key words</button>
      <button type="button" className={CONTROL} aria-expanded={allSteps} onClick={() => { if (canInteract()) setAllSteps(value => !value); }}>Show all instructions</button>
    </div>
    {allSteps && <ol aria-label="All instructions" className="list-decimal space-y-2 pl-6">
      {example.steps.map(item => <li key={item.text}><KeyWords {...item} highlight={highlight} /></li>)}
    </ol>}
    <section className={PANEL} aria-label="Current instruction">
      <h3 className="font-bold">Instruction {stepIndex + 1} of {example.steps.length}</h3>
      <p className="mt-2 text-lg"><KeyWords {...step} highlight={highlight} /></p>
    </section>
    {audioControl(step.text, 'Play instruction')}
    <div className="flex flex-wrap gap-2">
      <button type="button" className={CONTROL} disabled={stepIndex === 0} onClick={() => navigate(stepIndex - 1)}>Previous instruction</button>
      <button type="button" className={CONTROL} disabled={stepIndex === example.steps.length - 1} onClick={() => navigate(stepIndex + 1)}>Next instruction</button>
    </div>
    <button type="button" className={CONTROL} disabled={explored[stepIndex]} onClick={() => {
      if (!canInteract() || explored[stepIndex]) return;
      setExplored(values => values.map((value, index) => index === stepIndex ? true : value)); setReviewed(false);
    }}>{explored[stepIndex] ? 'This instruction is explored' : 'I explored this instruction'}</button>
    <p role="status">{count} of {example.steps.length} instructions explored. This does not mean the real task was completed.</p>
    <label className="flex min-h-12 items-center gap-3"><input type="checkbox" className="h-6 w-6 shrink-0" checked={reviewed} disabled={count === 0} onChange={event => {
      if (canInteract() && count > 0) setReviewed(event.target.checked);
    }} />I reviewed the instructions I explored</label>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={CONTROL} onClick={() => { if (canInteract()) reset(); }}>Reset instruction practice</button>
      <button type="button" className={CONTROL} disabled={count === 0 || !reviewed} onClick={() => {
        if (canInteract() && count > 0 && reviewed) onFinish();
      }}>Record instruction practice</button>
    </div>
    <p className="text-sm">The underlined key words stay visible; they are not live word-by-word audio tracking.</p>
  </div>;
};
