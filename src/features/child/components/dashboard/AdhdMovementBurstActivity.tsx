import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Pause, Play, RotateCcw } from 'lucide-react';
import type { AdhdSupportSignalInput } from 'features/child/store/childProgressStore';

const MOVEMENT_BURST_SECONDS = 60;
const MOVEMENT_PHASE_SECONDS = 15;

interface MovementPhase {
  title: string;
  standing: string;
  seated: string;
}

interface MovementBurstOption {
  id: string;
  label: string;
  description: string;
  returnStep: string;
  phases: MovementPhase[];
}

const MOVEMENT_BURST_OPTIONS: MovementBurstOption[] = [
  {
    id: 'restless',
    label: 'Restless',
    description: 'Use steady pressure and rhythm to settle extra movement.',
    returnStep: 'Sit or stand with both feet grounded, then open only the first task step.',
    phases: [
      {
        title: 'March to a beat',
        standing: 'March in place at a comfortable pace.',
        seated: 'Tap alternating feet while sitting tall.',
      },
      {
        title: 'Push and press',
        standing: 'Do slow wall pushes with both hands.',
        seated: 'Press palms together, then release slowly.',
      },
      {
        title: 'Cross the middle',
        standing: 'Touch one hand to the opposite knee, then switch.',
        seated: 'Reach one hand toward the opposite knee, then switch.',
      },
      {
        title: 'Ground and breathe',
        standing: 'Plant both feet and breathe out slowly.',
        seated: 'Press feet into the floor and breathe out slowly.',
      },
    ],
  },
  {
    id: 'sleepy',
    label: 'Sleepy',
    description: 'Use bigger, brighter movements to wake up gently.',
    returnStep: 'Choose a three-minute start and begin with the easiest visible action.',
    phases: [
      {
        title: 'Reach tall',
        standing: 'Reach both arms up, lower them, and repeat.',
        seated: 'Reach both arms up from the chair, then lower them.',
      },
      {
        title: 'Step side to side',
        standing: 'Step right and left with relaxed arms.',
        seated: 'Tap one foot out to each side.',
      },
      {
        title: 'Cross-crawl',
        standing: 'Lift one knee toward the opposite hand, then switch.',
        seated: 'Lift one knee and reach with the opposite hand.',
      },
      {
        title: 'Shake and focus',
        standing: 'Shake out hands, roll shoulders, then look at one task.',
        seated: 'Shake out hands, roll shoulders, then look at one task.',
      },
    ],
  },
  {
    id: 'stuck',
    label: 'Stuck',
    description: 'Change the body pattern, then return to one tiny action.',
    returnStep: 'Ask for one example or do only the smallest part of the task.',
    phases: [
      {
        title: 'Change the pattern',
        standing: 'Take four slow steps forward and four back.',
        seated: 'Tap knees twice, then shoulders twice.',
      },
      {
        title: 'Reach across',
        standing: 'Reach across your body, return, then switch sides.',
        seated: 'Reach across from the chair, return, then switch sides.',
      },
      {
        title: 'Strong press',
        standing: 'Press hands into a wall and release slowly.',
        seated: 'Press hands into the chair or palms together, then release.',
      },
      {
        title: 'Ready position',
        standing: 'Plant both feet and point toward the next task step.',
        seated: 'Place both feet down and point toward the next task step.',
      },
    ],
  },
];

interface AdhdMovementBurstActivityProps {
  onComplete: (signal: AdhdSupportSignalInput) => void;
}

const AdhdMovementBurstActivity: React.FC<AdhdMovementBurstActivityProps> = ({ onComplete }) => {
  const [selectedId, setSelectedId] = useState(MOVEMENT_BURST_OPTIONS[0].id);
  const [secondsLeft, setSecondsLeft] = useState(MOVEMENT_BURST_SECONDS);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);

  const selectedOption = useMemo(
    () => MOVEMENT_BURST_OPTIONS.find((option) => option.id === selectedId) ?? MOVEMENT_BURST_OPTIONS[0],
    [selectedId],
  );
  const completed = secondsLeft === 0;
  const elapsedSeconds = MOVEMENT_BURST_SECONDS - secondsLeft;
  const phaseIndex = Math.min(
    selectedOption.phases.length - 1,
    Math.floor(elapsedSeconds / MOVEMENT_PHASE_SECONDS),
  );
  const activePhase = selectedOption.phases[phaseIndex];
  const progress = (elapsedSeconds / MOVEMENT_BURST_SECONDS) * 100;
  const timerMinutes = Math.floor(secondsLeft / 60);
  const timerSeconds = secondsLeft % 60;

  useEffect(() => {
    if (!running || completed) return undefined;

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [completed, running]);

  useEffect(() => {
    if (completed) setRunning(false);
  }, [completed]);

  const handleStartOrPause = () => {
    setStarted(true);
    setRunning((current) => !current);
  };

  const handleReset = () => {
    setRunning(false);
    setStarted(false);
    setSecondsLeft(MOVEMENT_BURST_SECONDS);
  };

  const handleComplete = () => {
    const movementSteps = selectedOption.phases.map(
      (phase) => `${phase.title}: ${phase.standing} Seated option: ${phase.seated}`,
    );

    onComplete({
      energyId: selectedOption.id,
      energyLabel: selectedOption.label,
      firstStep: selectedOption.returnStep,
      rescueReason: 'movement reset',
      supportPlan: `${selectedOption.description} Use the seated version whenever standing movement is not comfortable or safe.`,
      taskTitle: 'Movement Burst break',
      breakdownSteps: movementSteps,
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/25">
        <p className="text-xs font-black uppercase tracking-wide text-amber-700 dark:text-amber-200">
          What does your body need?
        </p>
        <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
          Choose the closest feeling. Every movement has a standing and seated version.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {MOVEMENT_BURST_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelectedId(option.id)}
              disabled={started}
              className={`rounded-2xl border-2 p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${
                selectedId === option.id
                  ? 'border-amber-400 bg-white text-amber-900 shadow-sm dark:bg-gray-950 dark:text-amber-100'
                  : 'border-transparent bg-white/70 text-slate-600 dark:bg-gray-900 dark:text-gray-300'
              }`}
            >
              <span className="block text-sm font-black">{option.label}</span>
              <span className="mt-1 block text-xs leading-5">{option.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-adapt-indigo/20 bg-white dark:border-adapt-cyan/20 dark:bg-gray-900">
        <div className="h-2 bg-slate-100 dark:bg-gray-800" aria-hidden>
          <div
            className="h-full bg-gradient-to-r from-adapt-indigo to-adapt-teal transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-adapt-indigo dark:text-adapt-cyan">
                {completed ? 'Reset complete' : `Move ${phaseIndex + 1} of ${selectedOption.phases.length}`}
              </p>
              <h3 className="mt-1 text-xl font-extrabold text-adapt-navy dark:text-gray-100">
                {completed ? 'Ready to return' : activePhase.title}
              </h3>
            </div>
            <div
              className="rounded-2xl bg-adapt-indigo/10 px-4 py-2 text-2xl font-black tabular-nums text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan"
              role="timer"
              aria-label={`${secondsLeft} seconds remaining`}
            >
              {timerMinutes}:{timerSeconds.toString().padStart(2, '0')}
            </div>
          </div>

          {completed ? (
            <div className="mt-4 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/25">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                <div>
                  <p className="font-black text-emerald-900 dark:text-emerald-100">One clear return step</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-emerald-800 dark:text-emerald-200">
                    {selectedOption.returnStep}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-950/25">
                <p className="text-xs font-black uppercase tracking-wide text-indigo-700 dark:text-indigo-200">
                  Standing
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700 dark:text-gray-200">
                  {activePhase.standing}
                </p>
              </div>
              <div className="rounded-2xl bg-teal-50 p-4 dark:bg-teal-950/25">
                <p className="text-xs font-black uppercase tracking-wide text-teal-700 dark:text-teal-200">
                  Seated option
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-700 dark:text-gray-200">
                  {activePhase.seated}
                </p>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {!completed ? (
              <button
                type="button"
                onClick={handleStartOrPause}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-adapt-indigo px-5 py-3 text-sm font-black text-white hover:bg-adapt-purple dark:bg-adapt-cyan dark:text-gray-950"
              >
                {running ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
                {running ? 'Pause movement' : started ? 'Resume movement' : 'Start 60-second burst'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Save reset and return
              </button>
            )}

            {started && !completed ? (
              <button
                type="button"
                onClick={() => setSecondsLeft(0)}
                className="rounded-full border-2 border-emerald-200 px-4 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-200 dark:hover:bg-emerald-950/30"
              >
                I&apos;m ready to return
              </button>
            ) : null}

            {started ? (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                Reset
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <p className="text-xs font-semibold leading-5 text-slate-500 dark:text-gray-400">
        Stop any movement that hurts or feels unsafe. Partial movement still counts.
      </p>
    </div>
  );
};

export default AdhdMovementBurstActivity;
