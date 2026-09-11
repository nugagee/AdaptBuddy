import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  getReadyChildProgressForOwner,
  useChildProgressReadAccess,
} from 'features/child/store/childProgressReadAccess';
import VisualComfortControls, { COMFORT_BUTTON } from './VisualComfortControls';
import {
  COMFORT_PASSAGES, DEFAULT_COMFORT, comfortPreviewStyle,
  type ComfortSettings, type VisualActivityId, type VisualActivityResult,
} from './visualComfort';

export { isVisualStressActivity } from './visualComfort';

/** Accumulate visible, active session time, not the catalogue's estimated minutes. */
const useVisibleSessionClock = (enabled: boolean) => {
  const accumulated = useRef(0);
  const startedAt = useRef<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const settle = useCallback(() => {
    const now = Date.now();
    if (startedAt.current !== null) accumulated.current += Math.max(0, now - startedAt.current);
    startedAt.current = startedAt.current === null ? null : now;
  }, []);
  const read = useCallback(() => (
    accumulated.current + (startedAt.current === null ? 0 : Math.max(0, Date.now() - startedAt.current))
  ) / 1000, []);
  const reset = useCallback(() => {
    accumulated.current = 0;
    if (startedAt.current !== null) startedAt.current = Date.now();
    setSeconds(0);
  }, []);

  useEffect(() => {
    const syncVisibility = () => {
      settle();
      startedAt.current = enabled && !document.hidden ? Date.now() : null;
      setSeconds(read());
    };
    syncVisibility();
    const timer = window.setInterval(() => {
      settle();
      setSeconds(read());
    }, 250);
    document.addEventListener('visibilitychange', syncVisibility);
    return () => {
      settle();
      startedAt.current = null;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', syncVisibility);
    };
  }, [enabled, read, settle]);
  return { seconds, read, reset };
};

interface ToolProps { onFinish: (seconds: number) => void; }

const ComfortReader: React.FC<ToolProps> = ({ onFinish }) => {
  const [settings, setSettings] = useState<ComfortSettings>({ ...DEFAULT_COMFORT });
  const [passageIndex, setPassageIndex] = useState(0);
  const [lineIndex, setLineIndex] = useState(0);
  const [readLines, setReadLines] = useState<number[]>([]);
  const clock = useVisibleSessionClock(true);
  const passage = COMFORT_PASSAGES[passageIndex];
  const markLine = () => {
    setReadLines((lines) => lines.includes(lineIndex) ? lines : [...lines, lineIndex]);
    setLineIndex((index) => Math.min(index + 1, passage.lines.length - 1));
  };
  return (
    <div className="space-y-4">
      <VisualComfortControls value={settings} onChange={setSettings} onReset={() => setSettings({ ...DEFAULT_COMFORT })} />
      <label className="block text-sm font-semibold">Reading passage
        <select className="mt-1 min-h-12 w-full rounded-xl border border-slate-400 bg-white px-3 text-slate-900" value={passageIndex} onChange={(event) => {
          setPassageIndex(Number(event.target.value));
          setLineIndex(0);
          setReadLines([]);
          clock.reset();
        }}>
          {COMFORT_PASSAGES.map((item, index) => <option key={item.id} value={index}>{item.title}</option>)}
        </select>
      </label>
      <p className="text-sm">Changing the passage starts a fresh reading count. There is no reading-speed target.</p>
      <section aria-label="Comfort reading preview" className="mx-auto rounded-2xl border border-slate-400 p-4" style={comfortPreviewStyle(settings)}>
        <h3 className="mb-3 font-bold">{passage.title}</h3>
        <ol className="space-y-3">
          {passage.lines.map((line, index) => (
            <li key={line} aria-current={index === lineIndex ? 'step' : undefined} className="rounded-lg border-2 p-2" style={{ borderColor: settings.ruler && index === lineIndex ? '#364b70' : 'transparent' }}>
              {line}
              {readLines.includes(index) && <span className="sr-only"> Line marked read.</span>}
            </li>
          ))}
        </ol>
      </section>
      <p role="status" className="text-sm font-semibold">Line {lineIndex + 1} of {passage.lines.length}. {readLines.length} lines marked read.</p>
      <progress aria-label="Reading progress" className="h-3 w-full" max={passage.lines.length} value={readLines.length} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className={COMFORT_BUTTON} disabled={lineIndex === 0} onClick={() => setLineIndex((index) => index - 1)}>Previous line</button>
        <button type="button" className={COMFORT_BUTTON} disabled={lineIndex === passage.lines.length - 1} onClick={() => setLineIndex((index) => index + 1)}>Next line</button>
        <button type="button" className={COMFORT_BUTTON} onClick={markLine}>I read this line</button>
      </div>
      <p className="text-sm">Read as much as feels comfortable. Mark at least one line before recording a reading session.</p>
      <button type="button" className={`${COMFORT_BUTTON} w-full bg-indigo-700 text-white`} disabled={readLines.length === 0} onClick={() => onFinish(clock.read())}>Record reading session</button>
    </div>
  );
};

const TypographyLab: React.FC<ToolProps> = ({ onFinish }) => {
  const [settings, setSettings] = useState<ComfortSettings>({ ...DEFAULT_COMFORT });
  const [changed, setChanged] = useState(false);
  const [tried, setTried] = useState(false);
  const clock = useVisibleSessionClock(true);
  const sample = 'I can change how these words look. I can choose the layout that feels most comfortable today.';
  return (
    <div className="space-y-4">
      <VisualComfortControls value={settings} onChange={(next) => {
        setSettings(next);
        setChanged(true);
        setTried(false);
      }} onReset={() => {
        setSettings({ ...DEFAULT_COMFORT });
        setChanged(false);
        setTried(false);
      }} />
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <section aria-label="Starting layout preview" className="min-w-0 space-y-2">
          <h3 className="font-bold">Starting layout</h3>
          <p className="rounded-xl border border-slate-400 p-3" style={comfortPreviewStyle(DEFAULT_COMFORT)}>{sample}</p>
        </section>
        <section aria-label="My layout preview" className="min-w-0 space-y-2">
          <h3 className="font-bold">My layout</h3>
          <p className="rounded-xl border border-slate-400 p-3" style={{ ...comfortPreviewStyle(settings), outline: settings.ruler ? '2px solid #364b70' : 'none', outlineOffset: '-6px' }}>{sample}</p>
        </section>
      </div>
      <label className="flex min-h-12 items-center gap-3 text-sm font-semibold">
        <input type="checkbox" className="h-6 w-6" disabled={!changed} checked={tried} onChange={(event) => setTried(event.target.checked)} />
        I tried this layout
      </label>
      <p className="text-sm">Change a setting, try the sample, then record your practice. You can return to your starting choices; there is no best font for everyone.</p>
      <button type="button" className={`${COMFORT_BUTTON} w-full bg-indigo-700 text-white`} disabled={!changed || !tried} onClick={() => onFinish(clock.read())}>Record layout practice</button>
    </div>
  );
};

const ScreenBreak: React.FC<ToolProps> = ({ onFinish }) => {
  const [mode, setMode] = useState<'timed' | 'untimed'>('timed');
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [visibilityPaused, setVisibilityPaused] = useState(false);
  const clock = useVisibleSessionClock(running);
  const timerFinished = mode === 'timed' && clock.seconds >= 20;
  useEffect(() => {
    if (timerFinished) setRunning(false);
  }, [timerFinished]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && running) {
        setRunning(false);
        setVisibilityPaused(true);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [running]);
  const startOrResume = () => {
    if (document.hidden) return;
    setStarted(true);
    setVisibilityPaused(false);
    setRunning(true);
  };
  const reset = () => {
    setRunning(false);
    setStarted(false);
    setVisibilityPaused(false);
    clock.reset();
  };
  const canRecord = started && (mode === 'timed' ? timerFinished : clock.seconds >= 1);
  return (
    <div className="space-y-4">
      <p>Take a pause in a way that is comfortable for you. You do not need to keep looking at this screen. You may stop or ask a trusted adult for help at any time.</p>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-2 font-bold">Choose your break</legend>
        <button type="button" className={COMFORT_BUTTON} aria-pressed={mode === 'timed'} onClick={() => { reset(); setMode('timed'); }}>Optional 20-second timer</button>
        <button type="button" className={COMFORT_BUTTON} aria-pressed={mode === 'untimed'} onClick={() => { reset(); setMode('untimed'); }}>No timer</button>
      </fieldset>
      <div className="rounded-2xl border border-slate-300 p-5 text-center dark:border-slate-600">
        {mode === 'timed' ? (
          <>
            <p aria-live="off" className="text-4xl font-bold">{Math.max(0, 20 - Math.floor(clock.seconds))} seconds</p>
            <progress aria-label="Break timer progress" className="mt-3 h-3 w-full" value={Math.min(20, clock.seconds)} max={20} />
          </>
        ) : <p className="text-xl font-bold">Your break, your pace.</p>}
        <p role="status" className="mt-3 text-sm">
          {timerFinished ? 'The timer has finished. Record a break only when you are ready.'
            : visibilityPaused ? 'Paused while this tab was away. Resume when you are ready.'
              : running ? 'Break started. No sound or pop-up will play.'
                : started ? 'Paused. Your elapsed break time is kept while this activity stays open.'
                  : 'Nothing starts until you choose Start break.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {!running && !timerFinished && <button type="button" className={COMFORT_BUTTON} onClick={startOrResume}>{started ? 'Resume break' : 'Start break'}</button>}
        {running && <button type="button" className={COMFORT_BUTTON} onClick={() => setRunning(false)}>Pause break</button>}
        <button type="button" className={COMFORT_BUTTON} onClick={reset}>Reset break</button>
      </div>
      <p className="text-sm">This is an optional pause, not medical advice or a treatment. There are no recurring reminders. Closing the activity does not record completion, and timer expiry never records it automatically.</p>
      <button type="button" className={`${COMFORT_BUTTON} w-full bg-indigo-700 text-white`} disabled={!canRecord} onClick={() => {
        setRunning(false);
        onFinish(mode === 'timed' ? Math.min(20, clock.read()) : clock.read());
      }}>I took my break — record it</button>
    </div>
  );
};

interface Props {
  activityId: VisualActivityId;
  onComplete: (result: VisualActivityResult) => void;
}

/** Never carry preferences, timer state or a delayed completion into another child scope. */
const VisualStressActivity: React.FC<Props> = ({ activityId, onComplete }) => {
  const { childId, isReady } = useChildProgressReadAccess();
  const launchOwner = useRef(childId);
  const completed = useRef(false);
  const [recorded, setRecorded] = useState(false);
  const validScope = Boolean(childId && isReady && childId === launchOwner.current);
  const finish = useCallback((seconds: number) => {
    if (completed.current || !validScope || !Number.isFinite(seconds)
      || !getReadyChildProgressForOwner(launchOwner.current)) return;
    completed.current = true;
    setRecorded(true);
    onComplete({ durationMinutes: Math.max(0, seconds) / 60 });
  }, [onComplete, validScope]);

  if (!validScope) return <p role="status">This child session has changed or is not ready. Close and reopen the activity.</p>;
  if (recorded) return <p role="status">Session recorded. You can close this activity.</p>;
  return (
    <div className="min-w-0 text-slate-900 dark:text-slate-100">
      {activityId === 'visual-comfort-read' && <ComfortReader onFinish={finish} />}
      {activityId === 'visual-font-lab' && <TypographyLab onFinish={finish} />}
      {activityId === 'visual-break-2020' && <ScreenBreak onFinish={finish} />}
    </div>
  );
};

export default VisualStressActivity;
