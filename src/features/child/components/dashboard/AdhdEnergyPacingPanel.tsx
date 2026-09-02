import React from 'react';
import { BatteryCharging, Coffee, TimerReset } from 'lucide-react';
import { useChildProgressStore } from 'features/child/store/childProgressStore';

const AdhdEnergyPacingPanel: React.FC = () => {
  const pacing = useChildProgressStore((state) => state.getTodayAdhdEnergyPacing());

  if (!pacing) {
    return (
      <section className="rounded-3xl border border-sky-200 bg-gradient-to-br from-white via-sky-50 to-indigo-50 p-6 shadow-sm dark:border-sky-900/50 dark:from-gray-900 dark:via-sky-950/20 dark:to-indigo-950/20 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200">
            <BatteryCharging className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">Today&apos;s Energy Pace</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
              Complete Energy Check-In to match task and break lengths to today&apos;s battery.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-sky-200 bg-gradient-to-br from-white via-sky-50 to-indigo-50 p-6 shadow-sm dark:border-sky-900/50 dark:from-gray-900 dark:via-sky-950/20 dark:to-indigo-950/20 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm dark:bg-gray-950" aria-hidden>
            {pacing.emoji}
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-sky-700 dark:text-sky-200">
              Today&apos;s Energy Pace
            </p>
            <h2 className="mt-1 text-xl font-black text-adapt-navy dark:text-gray-100">
              {pacing.energyLabel}
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600 dark:text-gray-300">
              {pacing.plan}
            </p>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm dark:bg-gray-950/80">
            <TimerReset className="mx-auto h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
            <p className="mt-2 text-2xl font-black text-adapt-navy dark:text-gray-100">
              {pacing.taskMinutes}
            </p>
            <p className="text-xs font-bold text-slate-500">minutes on</p>
          </div>
          <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm dark:bg-gray-950/80">
            <Coffee className="mx-auto h-5 w-5 text-amber-600" aria-hidden />
            <p className="mt-2 text-2xl font-black text-adapt-navy dark:text-gray-100">
              {pacing.breakMinutes}
            </p>
            <p className="text-xs font-bold text-slate-500">minutes off</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/25">
        <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
          Start here
        </p>
        <p className="mt-1 text-sm font-bold text-emerald-900 dark:text-emerald-100">
          {pacing.firstStep}
        </p>
      </div>
    </section>
  );
};

export default AdhdEnergyPacingPanel;
