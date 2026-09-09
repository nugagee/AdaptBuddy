import React, { useMemo } from 'react';
import { CheckSquare2, Footprints, ListChecks } from 'lucide-react';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { useChildProgressReadAccess } from 'features/child/store/childProgressReadAccess';

const DyspraxiaProgressPanel: React.FC = () => {
  const allSessions = useChildProgressStore((state) => state.dyspraxiaPlanningSessions);
  const { isReady } = useChildProgressReadAccess();

  const sessions = useMemo(() => {
    if (!isReady) return [];
    const today = new Date().toISOString().slice(0, 10);
    return allSessions.filter((session) => session.createdAt.startsWith(today));
  }, [allSessions, isReady]);

  const latestSession = sessions[0];
  const plansPractised = sessions.length;
  const stepsArranged = sessions.reduce(
    (total, session) => total + session.orderedSteps.length,
    0,
  );

  if (!latestSession) {
    return (
      <section className="rounded-3xl border border-teal-200 bg-gradient-to-br from-white via-teal-50 to-cyan-50 p-6 shadow-sm dark:border-teal-900/50 dark:from-gray-900 dark:via-teal-950/20 dark:to-cyan-950/20 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-200">
            <Footprints className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">
              Step Planning Practice
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
              Arrange one Step-by-Step Planner activity to begin today&apos;s practice summary.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-teal-200 bg-gradient-to-br from-white via-teal-50 to-cyan-50 p-6 shadow-sm dark:border-teal-900/50 dark:from-gray-900 dark:via-teal-950/20 dark:to-cyan-950/20 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-200">
            <Footprints className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-teal-700 dark:text-teal-200">
              Latest step plan
            </p>
            <h2 className="mt-1 text-xl font-black text-adapt-navy dark:text-gray-100">
              {latestSession.planTitle}
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-gray-300">
              Put {latestSession.orderedSteps.length} steps into a helpful order.
            </p>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm dark:bg-gray-950/80">
            <CheckSquare2 className="mx-auto h-5 w-5 text-teal-600" aria-hidden />
            <p className="mt-2 text-2xl font-black text-adapt-navy dark:text-gray-100">
              {plansPractised}
            </p>
            <p className="text-xs font-bold text-slate-500">plans practised</p>
          </div>
          <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm dark:bg-gray-950/80">
            <ListChecks className="mx-auto h-5 w-5 text-cyan-600" aria-hidden />
            <p className="mt-2 text-2xl font-black text-adapt-navy dark:text-gray-100">
              {stepsArranged}
            </p>
            <p className="text-xs font-bold text-slate-500">steps arranged</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-teal-100 bg-white/80 p-4 dark:border-teal-900/40 dark:bg-gray-950/60">
        <p className="text-xs font-black uppercase tracking-wide text-teal-700 dark:text-teal-200">
          Practised order
        </p>
        <ol className="mt-3 space-y-2">
          {latestSession.orderedSteps.map((step, index) => (
            <li
              key={`${step}-${index}`}
              className="flex gap-3 rounded-2xl bg-teal-50/80 p-3 text-sm font-semibold text-slate-700 dark:bg-teal-950/30 dark:text-gray-200"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-200 text-xs font-black text-teal-900 dark:bg-teal-900 dark:text-teal-100">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {latestSession.supportsUsed.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {latestSession.supportsUsed.map((support) => (
            <span
              key={support}
              className="rounded-full bg-white/90 px-3 py-2 text-xs font-black capitalize text-slate-600 shadow-sm dark:bg-gray-950/80 dark:text-gray-300"
            >
              {support}
            </span>
          ))}
        </div>
      ) : null}

      <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-gray-400">
        This summary records step-planning practice only. It does not assess or compare movement skills.
      </p>
    </section>
  );
};

export default DyspraxiaProgressPanel;
