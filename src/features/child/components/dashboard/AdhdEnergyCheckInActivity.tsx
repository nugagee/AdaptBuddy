import React, { useMemo, useState } from 'react';
import { BatteryCharging, CheckCircle2, Coffee, TimerReset } from 'lucide-react';
import type {
  AdhdEnergyPacingInput,
  AdhdSupportSignalInput,
} from 'features/child/store/childProgressStore';

const ADHD_ENERGY_PACING_OPTIONS: AdhdEnergyPacingInput[] = [
  {
    energyId: 'sleepy',
    energyLabel: 'Nearly empty',
    emoji: '🪫',
    taskMinutes: 3,
    breakMinutes: 5,
    recommendationMood: 'tired',
    plan: 'Keep the demand tiny. Try three minutes, then take a real five-minute reset.',
    firstStep: 'Choose the easiest visible action and try it for three minutes.',
  },
  {
    energyId: 'low',
    energyLabel: 'Low battery',
    emoji: '🪫',
    taskMinutes: 5,
    breakMinutes: 3,
    recommendationMood: 'tired',
    plan: 'Use a five-minute task window with one instruction visible, then pause for three minutes.',
    firstStep: 'Open one task and find only its first instruction.',
  },
  {
    energyId: 'scattered',
    energyLabel: 'Scattered',
    emoji: '🌀',
    taskMinutes: 5,
    breakMinutes: 2,
    recommendationMood: 'anxious',
    plan: 'Hide extra choices, work for five minutes, then use a two-minute movement or quiet reset.',
    firstStep: 'Close or cover everything except one tiny task step.',
  },
  {
    energyId: 'focused',
    energyLabel: 'Ready',
    emoji: '🎯',
    taskMinutes: 10,
    breakMinutes: 2,
    recommendationMood: 'calm',
    plan: 'Use a ten-minute focus window and protect it from task switching.',
    firstStep: 'Choose one clear goal before starting the timer.',
  },
  {
    energyId: 'buzzing',
    energyLabel: 'Full power',
    emoji: '⚡',
    taskMinutes: 12,
    breakMinutes: 2,
    recommendationMood: 'happy',
    plan: 'Use the available energy for one twelve-minute sprint, then pause before choosing more.',
    firstStep: 'Point the energy at one task instead of opening several.',
  },
  {
    energyId: 'overloaded',
    energyLabel: 'Overloaded',
    emoji: '🌧️',
    taskMinutes: 3,
    breakMinutes: 5,
    recommendationMood: 'anxious',
    plan: 'Lower the demand now: one tiny action, a five-minute reset, and adult help if it still feels too much.',
    firstStep: 'Ask for one clear instruction or choose a regulation break first.',
  },
];

interface AdhdEnergyCheckInActivityProps {
  onComplete: (
    pacing: AdhdEnergyPacingInput,
    signal: AdhdSupportSignalInput,
  ) => void;
}

const AdhdEnergyCheckInActivity: React.FC<AdhdEnergyCheckInActivityProps> = ({ onComplete }) => {
  const [selectedId, setSelectedId] = useState('focused');
  const selected = useMemo(
    () => ADHD_ENERGY_PACING_OPTIONS.find((option) => option.energyId === selectedId)
      ?? ADHD_ENERGY_PACING_OPTIONS[3],
    [selectedId],
  );

  const handleComplete = () => {
    onComplete(selected, {
      energyId: selected.energyId,
      energyLabel: selected.energyLabel,
      firstStep: selected.firstStep,
      rescueReason: ['scattered', 'overloaded'].includes(selected.energyId)
        ? selected.energyId
        : 'energy check-in',
      supportPlan: `${selected.plan} Recommended pace: ${selected.taskMinutes} minutes on, ${selected.breakMinutes} minutes off.`,
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-amber-50 p-4 dark:border-sky-900/50 dark:from-sky-950/25 dark:to-amber-950/20">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white">
            <BatteryCharging className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-sky-700 dark:text-sky-200">
              Check your battery
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-gray-300">
              There is no good or bad level. The plan changes to fit the energy that is here now.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ADHD_ENERGY_PACING_OPTIONS.map((option) => (
            <button
              key={option.energyId}
              type="button"
              onClick={() => setSelectedId(option.energyId)}
              aria-pressed={selectedId === option.energyId}
              className={`rounded-2xl border-2 p-3 text-left transition ${
                selectedId === option.energyId
                  ? 'border-sky-400 bg-white text-sky-900 shadow-sm dark:bg-gray-950 dark:text-sky-100'
                  : 'border-transparent bg-white/70 text-slate-600 hover:border-sky-200 dark:bg-gray-900 dark:text-gray-300'
              }`}
            >
              <span className="text-xl" aria-hidden>{option.emoji}</span>
              <span className="ml-2 text-sm font-black">{option.energyLabel}</span>
              <span className="mt-2 block text-xs font-semibold">
                {option.taskMinutes} min task · {option.breakMinutes} min reset
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-adapt-indigo/20 bg-white p-4 dark:border-adapt-cyan/20 dark:bg-gray-900 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-adapt-indigo dark:text-adapt-cyan">
              Today&apos;s pacing plan
            </p>
            <h3 className="mt-1 text-xl font-black text-adapt-navy dark:text-gray-100">
              {selected.emoji} {selected.energyLabel}
            </h3>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-2 text-xs font-black text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-200">
              <TimerReset className="h-4 w-4" aria-hidden />
              {selected.taskMinutes} min on
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-2 text-xs font-black text-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
              <Coffee className="h-4 w-4" aria-hidden />
              {selected.breakMinutes} min off
            </span>
          </div>
        </div>

        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-700 dark:bg-gray-950 dark:text-gray-200">
          {selected.plan}
        </p>
        <div className="mt-3 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/25">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
            First step
          </p>
          <p className="mt-1 text-sm font-bold leading-6 text-emerald-900 dark:text-emerald-100">
            {selected.firstStep}
          </p>
        </div>

        <button
          type="button"
          onClick={handleComplete}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sky-600 to-adapt-indigo px-5 py-3 font-black text-white shadow-md"
        >
          <CheckCircle2 className="h-5 w-5" aria-hidden />
          Use this pacing plan
        </button>
      </section>
    </div>
  );
};

export default AdhdEnergyCheckInActivity;
