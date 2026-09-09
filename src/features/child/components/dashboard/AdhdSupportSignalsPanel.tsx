import React, { useMemo } from 'react';
import { AlertCircle, CheckCircle2, ClipboardList, Footprints, Lightbulb } from 'lucide-react';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { useChildProgressReadAccess } from 'features/child/store/childProgressReadAccess';

const formatSignalTime = (isoDate: string): string =>
  new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoDate));

const AdhdSupportSignalsPanel: React.FC = () => {
  const signals = useChildProgressStore((s) => s.adhdSupportSignals);
  const { isReady } = useChildProgressReadAccess();

  const todaySignals = useMemo(() => {
    if (!isReady) return [];
    const today = new Date().toISOString().slice(0, 10);
    return signals.filter((signal) => signal.createdAt.startsWith(today));
  }, [isReady, signals]);

  const latestSignal = todaySignals[0];
  const checkInCount = todaySignals.filter((signal) => signal.needsCheckIn).length;
  const commonBlocker = useMemo(() => {
    if (todaySignals.length === 0) return 'No blocker logged yet';

    const counts = new Map<string, number>();
    todaySignals.forEach((signal) => {
      counts.set(signal.rescueReason, (counts.get(signal.rescueReason) ?? 0) + 1);
    });

    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'No blocker logged yet';
  }, [todaySignals]);

  if (todaySignals.length === 0) {
    return (
      <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-white via-amber-50 to-emerald-50 p-6 shadow-sm dark:border-amber-900/50 dark:from-gray-900 dark:via-amber-950/20 dark:to-emerald-950/20 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
              <ClipboardList className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">
                ADHD Support Signals
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
                Complete ADHD Focus Coach to create a practical support snapshot for today.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-500 shadow-sm dark:bg-gray-950 dark:text-gray-300">
            Waiting for first signal
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-amber-200 bg-gradient-to-br from-white via-amber-50 to-emerald-50 p-6 shadow-sm dark:border-amber-900/50 dark:from-gray-900 dark:via-amber-950/20 dark:to-emerald-950/20 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
              <ClipboardList className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">
                ADHD Support Signals
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
                Today&apos;s focus pattern is translated into a small classroom support action.
              </p>
            </div>
          </div>

          {latestSignal && (
            <div className="mt-5 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/80">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ${
                    latestSignal.needsCheckIn
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-100'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100'
                  }`}
                >
                  {latestSignal.needsCheckIn ? (
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                  )}
                  {latestSignal.needsCheckIn ? 'Needs check-in' : 'Steady support'}
                </span>
                <span className="text-xs font-bold text-slate-400">
                  {formatSignalTime(latestSignal.createdAt)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-amber-50 p-3 dark:bg-amber-950/25">
                  <p className="text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-200">
                    {latestSignal.taskTitle ? 'Tool' : 'Energy'}
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-adapt-navy dark:text-gray-100">
                    {latestSignal.energyLabel}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 dark:bg-gray-900">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">
                    Blocker
                  </p>
                  <p className="mt-1 text-sm font-extrabold capitalize text-adapt-navy dark:text-gray-100">
                    {latestSignal.rescueReason}
                  </p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/25">
                  <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
                    First step
                  </p>
                  <p className="mt-1 text-sm font-extrabold text-adapt-navy dark:text-gray-100">
                    {latestSignal.firstStep}
                  </p>
                </div>
              </div>

              {latestSignal.taskTitle && latestSignal.breakdownSteps?.length ? (
                <div className="mt-3 rounded-2xl bg-white/80 p-3 dark:bg-gray-900/80">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">
                    Tiny steps for {latestSignal.taskTitle}
                  </p>
                  <ol className="mt-2 space-y-2">
                    {latestSignal.breakdownSteps.map((step, index) => (
                      <li key={`${step}-${index}`} className="flex gap-2 text-sm font-semibold text-slate-700 dark:text-gray-200">
                        <span className="text-adapt-indigo dark:text-adapt-cyan">{index + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              <div className="mt-3 flex items-start gap-2 rounded-2xl bg-adapt-indigo/5 p-3 dark:bg-adapt-cyan/10">
                <Footprints className="mt-0.5 h-4 w-4 shrink-0 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
                <p className="text-sm font-semibold leading-6 text-slate-700 dark:text-gray-200">
                  {latestSignal.supportPlan}
                </p>
              </div>
            </div>
          )}
        </div>

        <aside className="grid gap-3 sm:grid-cols-3 lg:w-64 lg:grid-cols-1">
          <div className="rounded-2xl bg-white/85 p-4 shadow-sm dark:bg-gray-950/80">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">
              Signals today
            </p>
            <p className="mt-2 text-3xl font-extrabold text-adapt-navy dark:text-gray-100">
              {todaySignals.length}
            </p>
          </div>
          <div className="rounded-2xl bg-white/85 p-4 shadow-sm dark:bg-gray-950/80">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">
              Check-ins
            </p>
            <p className="mt-2 text-3xl font-extrabold text-adapt-navy dark:text-gray-100">
              {checkInCount}
            </p>
          </div>
          <div className="rounded-2xl bg-white/85 p-4 shadow-sm dark:bg-gray-950/80">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-600" aria-hidden />
              <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">
                Pattern
              </p>
            </div>
            <p className="mt-2 text-sm font-extrabold capitalize text-adapt-navy dark:text-gray-100">
              {commonBlocker}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default AdhdSupportSignalsPanel;
