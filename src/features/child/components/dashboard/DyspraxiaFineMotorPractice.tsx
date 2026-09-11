import React, { useState } from 'react';
import { MOTOR_CONTROL as CONTROL, MOTOR_PANEL as PANEL, PLACEMENT_BOARDS, PLACEMENT_SPACES } from './dyspraxiaMotorContent';

type Positions = [number | null, number | null, number | null];
const emptyPositions = (): Positions => [null, null, null];

const DyspraxiaFineMotorPractice: React.FC<{ canInteract: () => boolean; onFinish: () => void }> = ({ canInteract, onFinish }) => {
  const [boardIndex, setBoardIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [positions, setPositions] = useState<Positions>(emptyPositions);
  const [history, setHistory] = useState<Positions[]>([]);
  const [onePiece, setOnePiece] = useState(false);
  const [pieceIndex, setPieceIndex] = useState(0);
  const [reviewed, setReviewed] = useState(false);
  const [message, setMessage] = useState('Choose a piece, then choose a space.');
  const board = PLACEMENT_BOARDS[boardIndex];
  const pieceLabels: readonly string[] = board.pieces;
  const placed = positions.filter(value => value !== null).length;

  const clear = () => {
    setSelected(null); setPositions(emptyPositions()); setHistory([]); setReviewed(false); setPieceIndex(0);
    setMessage('Practice cleared. Choose a piece when you are ready.');
  };
  const choosePiece = (index: number) => {
    if (!canInteract()) return;
    setSelected(index); setReviewed(false);
    setMessage(`${board.pieces[index]} selected. Choose any space; there is no wrong arrangement.`);
  };
  const place = (destination: number | null) => {
    if (!canInteract() || selected === null || positions[selected] === destination) return;
    setHistory(previous => [...previous, [...positions] as Positions].slice(-30));
    const next = [...positions] as Positions;
    next[selected] = destination;
    setPositions(next); setReviewed(false);
    setMessage(`${board.pieces[selected]} ${destination === null ? 'returned to the tray' : `placed in ${PLACEMENT_SPACES[destination].toLowerCase()}`}.`);
  };

  return <div className="min-w-0 space-y-5">
    <p className={PANEL}>Choose a piece and place it with two taps or keyboard choices. No dragging, fast tapping or precise aiming is needed. Any arrangement is welcome; one placed piece can be recorded as partial practice.</p>
    <div role="group" aria-label="Choose a placement board" className="flex flex-wrap gap-2">
      {PLACEMENT_BOARDS.map((item, index) => <button key={item.id} type="button" className={CONTROL} aria-pressed={boardIndex === index} onClick={() => {
        if (!canInteract() || index === boardIndex) return;
        clear(); setBoardIndex(index);
      }}>{item.title}</button>)}
    </div>
    <button type="button" className={CONTROL} aria-pressed={onePiece} onClick={() => { if (canInteract()) setOnePiece(value => !value); }}>Show one piece at a time</button>
    {onePiece && <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={CONTROL} disabled={pieceIndex === 0} onClick={() => { if (canInteract()) setPieceIndex(value => Math.max(0, value - 1)); }}>Previous piece</button>
      <span>Piece {pieceIndex + 1} of 3</span>
      <button type="button" className={CONTROL} disabled={pieceIndex === 2} onClick={() => { if (canInteract()) setPieceIndex(value => Math.min(2, value + 1)); }}>Next piece</button>
    </div>}
    <div role="group" aria-label="Choose a piece" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {board.pieces.map((piece, index) => (!onePiece || pieceIndex === index) && <button key={piece} type="button" className={CONTROL} aria-label={`Choose ${piece}`} aria-pressed={selected === index} onClick={() => choosePiece(index)}>
        <span aria-hidden="true" className="mr-3 text-3xl">{board.symbols[index]}</span>{piece}
        <span className="block text-sm font-normal">{positions[index] === null ? 'In the tray' : PLACEMENT_SPACES[positions[index]!]}</span>
      </button>)}
    </div>
    <p role="status" aria-live="polite">{message}</p>
    <div role="group" aria-label="Choose a destination" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {PLACEMENT_SPACES.map((space, destination) => <div key={space} className={PANEL}>
        <button type="button" className={`${CONTROL} w-full`} disabled={selected === null || positions[selected] === destination} onClick={() => place(destination)}>Place in {space.toLowerCase()}</button>
        <p className="mt-2 break-words" data-testid={`motor-space-${destination}`}>{pieceLabels.filter((_, index) => positions[index] === destination).join(', ') || 'Empty space'}</p>
      </div>)}
    </div>
    <p>{placed} of 3 pieces placed. This is not a coordination score.</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={CONTROL} disabled={selected === null || positions[selected] === null} onClick={() => place(null)}>Return selected piece to tray</button>
      <button type="button" className={CONTROL} disabled={history.length === 0} onClick={() => {
        if (!canInteract() || history.length === 0) return;
        setPositions([...history[history.length - 1]] as Positions); setHistory(previous => previous.slice(0, -1));
        setReviewed(false); setMessage('Last placement undone.');
      }}>Undo last placement</button>
      <button type="button" className={CONTROL} onClick={() => { if (canInteract()) clear(); }}>Clear placement practice</button>
    </div>
    <label className="flex min-h-12 items-center gap-3"><input type="checkbox" className="h-6 w-6 shrink-0" checked={reviewed} disabled={placed === 0} onChange={event => { if (canInteract() && placed > 0) setReviewed(event.target.checked); }} />I explored placing or moving a piece</label>
    <button type="button" className={`${CONTROL} w-full`} disabled={placed === 0 || !reviewed} onClick={() => { if (canInteract() && placed > 0 && reviewed) onFinish(); }}>Record placement practice</button>
    <p className="text-sm">Board changes and clearing discard this arrangement. Your choices are not saved when the activity closes.</p>
  </div>;
};

export default DyspraxiaFineMotorPractice;
