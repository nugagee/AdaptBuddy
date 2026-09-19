import React, { useMemo } from 'react';
import DyscalculiaPracticeProgress from './DyscalculiaPracticeProgress';
import { Calculator, CheckCircle2, HelpCircle } from 'lucide-react';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { useChildProgressReadAccess } from 'features/child/store/childProgressReadAccess';

const NumberLineProgressPanel: React.FC = () => {
  const allSessions = useChildProgressStore((state) => state.dyscalculiaSessions);
  const { isReady } = useChildProgressReadAccess();

  const sessions = useMemo(() => {
    if (!isReady) return [];
    const today = new Date().toISOString().slice(0, 10);
    return allSessions.filter((session) => session.createdAt.startsWith(today));
  }, [allSessions, isReady]);

  const latestSession = sessions[0];
  const questionsAttempted = sessions.reduce(
    (total, session) => total + session.questionsAttempted,
    0,
  );
  const questionsCorrect = sessions.reduce(
    (total, session) => total + session.questionsCorrect,
    0,
  );
  const hintsUsed = sessions.reduce((total, session) => total + session.hintsUsed, 0);
  const operations = Array.from(new Set(sessions.flatMap((session) => session.operations)));

  if (!latestSession) {
    return (
      <section className="rounded-3xl border border-rose-200 bg-gradient-to-br from-white via-rose-50 to-amber-50 p-6 shadow-sm dark:border-rose-900/50 dark:from-gray-900 dark:via-rose-950/20 dark:to-amber-950/20 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200">
            <Calculator className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">
              Maths Practice
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
              Try a Number Line Explorer question to begin today&apos;s practice summary.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-rose-200 bg-gradient-to-br from-white via-rose-50 to-amber-50 p-6 shadow-sm dark:border-rose-900/50 dark:from-gray-900 dark:via-rose-950/20 dark:to-amber-950/20 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200">
            <Calculator className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-rose-700 dark:text-rose-200">
              Today&apos;s maths practice
            </p>
            <h2 className="mt-1 text-xl font-black text-adapt-navy dark:text-gray-100">
              Numbers {latestSession.numberRange.min} to {latestSession.numberRange.max}
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-gray-300">
              {operations.length > 0
                ? `Practised ${operations.join(' and ')} with a visual number line.`
                : 'Practised with a visual number line.'}
            </p>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm dark:bg-gray-950/80">
            <Calculator className="mx-auto h-5 w-5 text-rose-600" aria-hidden />
            <p className="mt-2 text-2xl font-black text-adapt-navy dark:text-gray-100">
              {questionsAttempted}
            </p>
            <p className="text-xs font-bold text-slate-500">attempted</p>
          </div>
          <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm dark:bg-gray-950/80">
            <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-600" aria-hidden />
            <p className="mt-2 text-2xl font-black text-adapt-navy dark:text-gray-100">
              {questionsCorrect}
            </p>
            <p className="text-xs font-bold text-slate-500">worked out</p>
          </div>
          <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm dark:bg-gray-950/80">
            <HelpCircle className="mx-auto h-5 w-5 text-amber-600" aria-hidden />
            <p className="mt-2 text-2xl font-black text-adapt-navy dark:text-gray-100">
              {hintsUsed}
            </p>
            <p className="text-xs font-bold text-slate-500">hints used</p>
          </div>
        </div>
      </div>

      {latestSession.supportsUsed.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-rose-100 bg-white/80 p-4 dark:border-rose-900/40 dark:bg-gray-950/60">
          <p className="text-xs font-black uppercase tracking-wide text-rose-700 dark:text-rose-200">
            Helpful tools used
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {latestSession.supportsUsed.map((support) => (
              <span
                key={support}
                className="rounded-full bg-rose-50 px-3 py-2 text-xs font-black capitalize text-rose-800 dark:bg-rose-950/40 dark:text-rose-100"
              >
                {support}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-gray-400">
        This summary shows practice completed today. It does not compare or rank learners.
      </p>
    </section>
  );
};

const DyscalculiaProgressPanel: React.FC = () => (
  <div className="space-y-4">
    <DyscalculiaPracticeProgress />
    <NumberLineProgressPanel />
  </div>
);

export default DyscalculiaProgressPanel;
