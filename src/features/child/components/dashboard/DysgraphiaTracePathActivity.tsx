import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { getReadyChildProgressForOwner, useChildProgressReadAccess } from 'features/child/store/childProgressReadAccess';

export const TRACE_PATHS = [
  { id: 'straight', title: 'Straight trail', description: 'Start on the left, explore the middle, then the right.', points: '40,100 120,100 200,100 280,100 360,100', stops: [[40,100], [200,100], [360,100]] },
  { id: 'hill', title: 'Gentle hill', description: 'Start low on the left, explore the top of the hill, then come down on the right.', points: '40,150 120,90 200,50 280,90 360,150', stops: [[40,150], [200,50], [360,150]] },
  { id: 'zigzag', title: 'Zigzag trail', description: 'Start on the left, explore the turns, then the right.', points: '40,140 120,60 200,140 280,60 360,140', stops: [[40,140], [200,140], [360,140]] },
] as const;

const CONTROL = 'min-h-12 min-w-12 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-left font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100';
const MAX_STROKES = 20;
const MAX_POINTS = 200;
type Point = { x: number; y: number };
type Method = 'steps' | 'draw';
type Completion = { durationMinutes: number };

/** Visible, unpaused session duration, not a measure of motor performance. */
const useVisiblePracticeTime = (enabled: boolean) => {
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
  return useCallback(() => (elapsed.current + (started.current === null ? 0 : Math.max(0, Date.now() - started.current))) / 60000, []);
};

const pointOnSurface = (event: React.PointerEvent<SVGSVGElement>): Point | null => {
  const box = event.currentTarget.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0 || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return null;
  return {
    x: Math.max(0, Math.min(400, (event.clientX - box.left) * 400 / box.width)),
    y: Math.max(0, Math.min(200, (event.clientY - box.top) * 200 / box.height)),
  };
};
const appendPoint = (points: Point[], point: Point | null) => {
  if (!point || points.length >= MAX_POINTS) return points;
  const previous = points[points.length - 1];
  return previous && previous.x === point.x && previous.y === point.y ? points : [...points, point];
};
const svgPoints = (points: Point[]) => points.map(({ x, y }) => `${x},${y}`).join(' ');

const TraceExplorer: React.FC<{
  paused: boolean;
  canInteract: () => boolean;
  onComplete: () => void;
}> = ({ paused, canInteract, onComplete }) => {
  const uid = useId();
  const [pathIndex, setPathIndex] = useState(0);
  const [method, setMethod] = useState<Method>('steps');
  const [steps, setSteps] = useState(0);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [draft, setDraft] = useState<Point[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [guide, setGuide] = useState(true);
  const activePointer = useRef<{ id: number; element: SVGSVGElement; points: Point[] } | null>(null);
  const path = TRACE_PATHS[pathIndex];
  const hasPractice = method === 'steps' ? steps > 0 : strokes.length > 0;

  const releasePointer = useCallback(() => {
    const active = activePointer.current;
    activePointer.current = null;
    if (active) {
      try {
        if (active.element.hasPointerCapture?.(active.id)) active.element.releasePointerCapture(active.id);
      } catch { /* The browser may already have cancelled this pointer. */ }
    }
  }, []);
  const cancelDrawing = useCallback(() => { releasePointer(); setDraft([]); }, [releasePointer]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) cancelDrawing(); };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('blur', cancelDrawing);
    return () => {
      releasePointer();
      document.removeEventListener('visibilitychange', hidden);
      window.removeEventListener('blur', cancelDrawing);
    };
  }, [cancelDrawing, releasePointer]);
  useEffect(() => { if (paused) cancelDrawing(); }, [paused, cancelDrawing]);

  const clear = () => { cancelDrawing(); setStrokes([]); setSteps(0); setReviewed(false); };
  const selectPath = (index: number) => {
    if (!canInteract() || index === pathIndex) return;
    clear(); setPathIndex(index);
  };
  const selectMethod = (next: Method) => {
    if (!canInteract() || next === method) return;
    clear(); setMethod(next);
  };
  const pointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (method !== 'draw' || !canInteract() || event.button !== 0 || event.isPrimary === false || activePointer.current || strokes.length >= MAX_STROKES) return;
    const point = pointOnSurface(event);
    if (!point) return;
    activePointer.current = { id: event.pointerId, element: event.currentTarget, points: [point] };
    setDraft([point]); setReviewed(false);
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* Drawing still works within the surface. */ }
  };
  const pointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const active = activePointer.current;
    if (!active || active.id !== event.pointerId) return;
    if (!canInteract()) { cancelDrawing(); return; }
    active.points = appendPoint(active.points, pointOnSurface(event));
    setDraft(active.points);
  };
  const pointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const active = activePointer.current;
    if (!active || active.id !== event.pointerId) return;
    if (!canInteract()) { cancelDrawing(); return; }
    const points = appendPoint(active.points, pointOnSurface(event));
    releasePointer(); setDraft([]);
    // An unfinished gesture or single stationary contact does not claim drawing practice.
    if (points.length >= 2) setStrokes(previous => [...previous, points].slice(0, MAX_STROKES));
    setReviewed(false);
  };
  const cancelMatchingPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    if (activePointer.current?.id === event.pointerId) cancelDrawing();
  };

  return (
    <fieldset disabled={paused} hidden={paused} className="min-w-0 space-y-5">
      <legend className="sr-only">Path exploration controls</legend>
      <p id={`${uid}-intro`} className="text-sm text-slate-700 dark:text-slate-200">
        Drawing and step buttons count equally. There is no speed, neatness or accuracy score. You can record partial exploration.
        Changing the path or method clears the open practice. This is optional practice, not therapy or a handwriting assessment.
      </p>
      <div role="group" aria-label="Choose a path" className="flex flex-wrap gap-2">
        {TRACE_PATHS.map((item, index) => <button key={item.id} type="button" className={CONTROL} aria-pressed={index === pathIndex} onClick={() => selectPath(index)}>{item.title}</button>)}
      </div>
      <div role="group" aria-label="Choose how to explore" className="flex flex-wrap gap-2">
        <button type="button" className={CONTROL} aria-pressed={method === 'steps'} onClick={() => selectMethod('steps')}>Step buttons</button>
        <button type="button" className={CONTROL} aria-pressed={method === 'draw'} onClick={() => selectMethod('draw')}>Draw on the path</button>
      </div>
      <p id={`${uid}-description`}>{path.description}</p>
      <p id={`${uid}-draw-help`} className="text-sm">Use a finger, pen or mouse to make a line, or use Step buttons without dragging. Staying on the guide is not required.</p>
      <svg
        viewBox="0 0 400 200" preserveAspectRatio="none" role="img"
        aria-label={`Path exploration surface: ${path.title}`} aria-describedby={`${uid}-description ${uid}-draw-help`}
        className="block w-full rounded-2xl border-2 border-slate-400 bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-100"
        style={{ aspectRatio: '2 / 1', touchAction: method === 'draw' ? 'pinch-zoom' : 'auto' }}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
        onPointerCancel={cancelMatchingPointer} onLostPointerCapture={cancelMatchingPointer}
      >
        {guide && <polyline points={path.points} fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="7 9" />}
        {path.stops.map(([x, y], index) => <g key={index}>
          <circle cx={x} cy={y} r="17" fill="white" stroke="currentColor" strokeWidth={method === 'steps' && index < steps ? 6 : 2} />
          <text x={x} y={y + 5} textAnchor="middle" fill="#0f172a" fontSize="15">{index + 1}</text>
        </g>)}
        {strokes.map((points, index) => <polyline key={index} data-testid="trace-stroke" points={svgPoints(points)} fill="none" stroke="#6366f1" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />)}
        {draft.length > 0 && <polyline data-testid="trace-draft" points={svgPoints(draft)} fill="none" stroke="#6366f1" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      <button type="button" className={CONTROL} aria-pressed={guide} onClick={() => { if (canInteract()) setGuide(value => !value); }}>Show dotted guide</button>
      {method === 'steps' ? <div className="space-y-3">
        <p role="status">{steps === 0 ? 'Choose the first stop when you are ready.' : `Explored ${steps} of 3 stops. You may record partial practice.`}</p>
        <button type="button" className={CONTROL} disabled={steps >= 3} onClick={() => {
          if (!canInteract()) return;
          setSteps(value => Math.min(3, value + 1)); setReviewed(false);
        }}>{steps >= 3 ? 'All stops explored' : `Explore stop ${steps + 1}`}</button>
      </div> : <p role="status">{strokes.length >= MAX_STROKES ? 'This drawing space is full. Record your practice, undo a line or clear it to explore again.' : hasPractice ? 'Your drawing is ready to review. You can record it or keep exploring.' : 'Make a line and lift your finger, pen or mouse to review it.'}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={CONTROL} disabled={!hasPractice && draft.length === 0} onClick={() => {
          if (!canInteract()) return;
          cancelDrawing(); setReviewed(false);
          if (method === 'steps') setSteps(value => Math.max(0, value - 1));
          else setStrokes(value => value.slice(0, -1));
        }}>Undo last exploration</button>
        <button type="button" className={CONTROL} onClick={() => { if (canInteract()) clear(); }}>Clear this practice</button>
      </div>
      <label className="flex min-h-12 items-center gap-3 rounded-xl border-2 border-slate-300 p-3">
        <input type="checkbox" className="h-6 w-6" checked={reviewed} disabled={!hasPractice || draft.length > 0} onChange={event => {
          if (canInteract() && hasPractice && !activePointer.current) setReviewed(event.target.checked);
        }} />
        I have explored this path in my own way
      </label>
      <button type="button" className={`${CONTROL} w-full`} disabled={!hasPractice || !reviewed || draft.length > 0} onClick={() => {
        if (canInteract() && hasPractice && reviewed && !activePointer.current) onComplete();
      }}>Record path practice</button>
      <p className="text-sm text-slate-600 dark:text-slate-300">Drawings and path choices disappear when this activity closes. Only the activity completion and visible, unpaused session time are recorded.</p>
    </fieldset>
  );
};

const DysgraphiaTracePathActivity: React.FC<{ onComplete: (result: Completion) => void }> = ({ onComplete }) => {
  const { childId, isReady } = useChildProgressReadAccess();
  const hasProfile = useAuthStore(state => Boolean(state.profile?.neuro_types?.includes('dysgraphia')));
  const owner = useRef(childId);
  const expiredRef = useRef(false);
  const completedRef = useRef(false);
  const pausedRef = useRef(false);
  const [expired, setExpired] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [paused, setPaused] = useState(false);
  const valid = Boolean(!expired && childId && isReady && hasProfile && childId === owner.current);
  const duration = useVisiblePracticeTime(valid && !paused && !completed);

  useEffect(() => {
    const check = () => {
      if (!getReadyChildProgressForOwner(owner.current) || !useAuthStore.getState().profile?.neuro_types?.includes('dysgraphia')) {
        expiredRef.current = true; setExpired(true);
      }
    };
    const unsubscribeAuth = useAuthStore.subscribe(check);
    const unsubscribeProgress = useChildProgressStore.subscribe(check);
    check();
    return () => { unsubscribeAuth(); unsubscribeProgress(); };
  }, []);
  const canInteract = () => Boolean(valid && !expiredRef.current && !completedRef.current && !pausedRef.current && !document.hidden
    && getReadyChildProgressForOwner(owner.current) && useAuthStore.getState().profile?.neuro_types?.includes('dysgraphia'));
  const finish = () => {
    if (!canInteract()) return;
    completedRef.current = true; setCompleted(true);
    onComplete({ durationMinutes: duration() });
  };
  if (!valid) return <p role="status">This practice is no longer connected to the original child session. Close it and open a new activity.</p>;
  if (completed) return <p role="status">Path practice recorded. Your drawing has been cleared.</p>;
  return <div className="space-y-4">
    <button type="button" className={CONTROL} onClick={() => {
      if (expiredRef.current || completedRef.current || document.hidden || !getReadyChildProgressForOwner(owner.current)) return;
      pausedRef.current = !pausedRef.current; setPaused(pausedRef.current);
    }}>{paused ? 'Continue path practice' : 'Pause path practice'}</button>
    {paused && <p role="status">Paused. Your completed explorations stay here; an unfinished drawing gesture is discarded. You can close this activity at any time.</p>}
    <TraceExplorer paused={paused} canInteract={canInteract} onComplete={finish} />
  </div>;
};

export default DysgraphiaTracePathActivity;
