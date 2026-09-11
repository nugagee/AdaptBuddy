import React, { useEffect, useRef, useState } from 'react';
import { ticFlowDraftCache } from './ticFlowDraftCache';
import { copyFlowDraft, emptyFlowDraft, FLOW_BOARDS, MAX_FLOW_CARDS, TIC_CONTROL as CONTROL, TIC_PANEL as PANEL, type FlowDraft } from './touretteSupportContent';

const TicFlexFlowPractice: React.FC<{
  ownerId: string;
  paused: boolean;
  canInteract: () => boolean;
  onFinish: () => void;
}> = ({ ownerId, paused, canInteract, onFinish }) => {
  const [lease] = useState(() => ticFlowDraftCache.acquire(ownerId));
  const [draft, setDraft] = useState<FlowDraft>(() => ticFlowDraftCache.read(lease) ?? emptyFlowDraft());
  const [resumed, setResumed] = useState(() => draft.cards.length > 0);
  const [reviewed, setReviewed] = useState(false);
  const [history, setHistory] = useState<FlowDraft[]>([]);
  const [message, setMessage] = useState('Choose a card when you are ready. Any arrangement is welcome.');
  const finished = useRef(false);
  const board = FLOW_BOARDS[draft.boardIndex];
  useEffect(() => { if (paused) setReviewed(false); }, [paused]);

  const change = (next: FlowDraft, description: string) => {
    if (!canInteract() || finished.current || !ticFlowDraftCache.write(lease, next)) return;
    setHistory(previous => [...previous, copyFlowDraft(draft)].slice(-20));
    setDraft(copyFlowDraft(next)); setReviewed(false); setMessage(description);
  };
  const move = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= draft.cards.length) return;
    const cards = [...draft.cards];
    [cards[index], cards[destination]] = [cards[destination], cards[index]];
    change({ ...draft, cards }, 'Card moved. Your draft is kept in this tab.');
  };
  const forget = () => {
    if (!canInteract() || !ticFlowDraftCache.clear(lease)) return;
    setDraft(emptyFlowDraft()); setHistory([]); setResumed(false); setReviewed(false);
    setMessage('Draft erased. There is no need to start again unless you choose to.');
  };
  return <div className="min-w-0 space-y-5">
    <p className={PANEL}>Make a small scene with labelled cards. Repeat, rearrange or remove cards however you like. There is no right order, timer, tic check or pressure to finish. One card can count as partial creative practice.</p>
    {resumed && <p role="status">Your unfinished scene is back. Review it again before recording practice.</p>}
    <p className="text-sm">Drafts are kept only in this open tab while the same child session stays ready. Closing and reopening this activity keeps the scene; refreshing, signing out or changing child clears it. Draft saving does not award stars. Reopening starts a new session-time measurement.</p>
    <div role="group" aria-label="Choose a scene" className="flex flex-wrap gap-2">
      {FLOW_BOARDS.map((item, index) => <button key={item.id} type="button" className={CONTROL} aria-pressed={index === draft.boardIndex} onClick={() => {
        if (index !== draft.boardIndex) change({ boardIndex: index, cards: [] }, 'Scene changed. The previous cards have been cleared; Undo can restore them.');
      }}>{item.title}</button>)}
    </div>
    <div role="group" aria-label="Add a scene card" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {board.cards.map((card, index) => <button key={card.label} type="button" className={CONTROL} aria-label={`Add ${card.label}`} disabled={draft.cards.length >= MAX_FLOW_CARDS} onClick={() => {
        if (draft.cards.length < MAX_FLOW_CARDS) change({ ...draft, cards: [...draft.cards, index] }, `${card.label} added. Your draft is kept in this tab.`);
      }}><span aria-hidden="true" className="mr-2 text-2xl">{card.symbol}</span>{card.label}</button>)}
    </div>
    <p role="status" aria-live="polite">{message}</p>
    <ol aria-label="Your scene cards" className="space-y-3">
      {draft.cards.map((cardIndex, index) => {
        const card = board.cards[cardIndex];
        return <li key={`${index}-${cardIndex}`} className={PANEL}>
          <p data-testid="tic-flow-card" className="mb-3 font-bold"><span aria-hidden="true" className="mr-2 text-2xl">{card.symbol}</span>{card.label}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={CONTROL} aria-label={`Move ${card.label} card ${index + 1} left`} disabled={index === 0} onClick={() => move(index, -1)}>Move left</button>
            <button type="button" className={CONTROL} aria-label={`Move ${card.label} card ${index + 1} right`} disabled={index === draft.cards.length - 1} onClick={() => move(index, 1)}>Move right</button>
            <button type="button" className={CONTROL} aria-label={`Remove ${card.label} card ${index + 1}`} onClick={() => change({ ...draft, cards: draft.cards.filter((_, i) => i !== index) }, `${card.label} removed. You can undo that change.`)}>Remove</button>
          </div>
        </li>;
      })}
    </ol>
    {draft.cards.length === 0 && <p>Your scene is empty. Pausing is still available.</p>}
    {draft.cards.length >= MAX_FLOW_CARDS && <p>This scene has six cards. You can rearrange, remove or review them; there is no target to beat.</p>}
    <div className="flex flex-wrap gap-2">
      <button type="button" className={CONTROL} disabled={history.length === 0} onClick={() => {
        if (!canInteract() || !history.length) return;
        const previous = history[history.length - 1];
        if (!ticFlowDraftCache.write(lease, previous)) return;
        setDraft(copyFlowDraft(previous)); setHistory(items => items.slice(0, -1)); setReviewed(false); setMessage('Last scene change undone.');
      }}>Undo scene change</button>
      <button type="button" className={CONTROL} onClick={forget}>Erase this tab&apos;s draft</button>
    </div>
    <label className="flex min-h-12 items-center gap-3"><input type="checkbox" className="h-6 w-6 shrink-0" disabled={!draft.cards.length} checked={reviewed} onChange={event => { if (canInteract() && draft.cards.length) setReviewed(event.target.checked); }} />I explored my scene in my own way</label>
    <button type="button" className={`${CONTROL} w-full`} disabled={!draft.cards.length || !reviewed} onClick={() => {
      if (!canInteract() || finished.current || !draft.cards.length || !reviewed || !ticFlowDraftCache.clear(lease)) return;
      finished.current = true; onFinish();
    }}>Record creative practice</button>
    <p className="text-sm">Recording clears this draft. Only ordinary completion and visible, unpaused time from this launch are recorded, not your cards or a measure of tics.</p>
  </div>;
};
export default TicFlexFlowPractice;
