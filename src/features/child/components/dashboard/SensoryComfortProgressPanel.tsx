import React, { useMemo } from 'react';
import { HeartHandshake, SlidersHorizontal, Waves } from 'lucide-react';
import type {
  SensoryArea,
  SensoryComfortChoice,
} from 'features/child/store/childProgressStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { useChildProgressReadAccess } from 'features/child/store/childProgressReadAccess';

const AREA_LABELS: Record<SensoryArea, string> = {
  sight: 'Sight',
  sound: 'Sound',
  touch: 'Touch',
  movement: 'Movement',
};

const COMFORT_LABELS: Record<SensoryComfortChoice, string> = {
  comfortable: 'Comfortable right now',
  'a-bit-much': 'A bit much right now',
  'need-change': 'Would like a change',
};

const CONFIDENCE_LABELS = {
  'ready-to-continue': 'Ready to continue',
  'need-more-time': 'Would like more time',
  'ask-for-help': 'Would like help',
} as const;

const SensoryComfortProgressPanel: React.FC = () => {
  const allSessions = useChildProgressStore((state) => state.sensoryComfortSessions);
  const { isReady } = useChildProgressReadAccess();

  const sessions = useMemo(() => {
    if (!isReady) return [];
    const today = new Date().toISOString().slice(0, 10);
    return allSessions.filter((session) => session.createdAt.startsWith(today));
  }, [allSessions, isReady]);

  const latestSession = sessions[0];
  const areasReviewed = sessions.reduce(
    (total, session) => total + session.selections.length,
    0,
  );

  if (!latestSession) {
    return (
      <section className="rounded-3xl border border-pink-200 bg-gradient-to-br from-white via-pink-50 to-fuchsia-50 p-6 shadow-sm dark:border-pink-900/50 dark:from-gray-900 dark:via-pink-950/20 dark:to-fuchsia-950/20 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-200">
            <Waves className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">
              Sensory Comfort Practice
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
              Try one Sensory Comfort Check-In to begin today&apos;s practice summary.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-pink-200 bg-gradient-to-br from-white via-pink-50 to-fuchsia-50 p-6 shadow-sm dark:border-pink-900/50 dark:from-gray-900 dark:via-pink-950/20 dark:to-fuchsia-950/20 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-200">
            <Waves className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-pink-700 dark:text-pink-200">
              Latest comfort choice
            </p>
            <h2 className="mt-1 text-xl font-black text-adapt-navy dark:text-gray-100">
              {latestSession.supportChoiceLabel}
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-gray-300">
              Next choice: {CONFIDENCE_LABELS[latestSession.confidence]}.
            </p>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm dark:bg-gray-950/80">
            <HeartHandshake className="mx-auto h-5 w-5 text-pink-600" aria-hidden />
            <p className="mt-2 text-2xl font-black text-adapt-navy dark:text-gray-100">
              {sessions.length}
            </p>
            <p className="text-xs font-bold text-slate-500">check-ins</p>
          </div>
          <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm dark:bg-gray-950/80">
            <SlidersHorizontal className="mx-auto h-5 w-5 text-fuchsia-600" aria-hidden />
            <p className="mt-2 text-2xl font-black text-adapt-navy dark:text-gray-100">
              {areasReviewed}
            </p>
            <p className="text-xs font-bold text-slate-500">choices reviewed</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-pink-100 bg-white/80 p-4 dark:border-pink-900/40 dark:bg-gray-950/60">
        <p className="text-xs font-black uppercase tracking-wide text-pink-700 dark:text-pink-200">
          What was chosen
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {latestSession.selections.map((selection) => (
            <li
              key={selection.area}
              className="rounded-2xl bg-pink-50/80 p-3 text-sm font-semibold text-slate-700 dark:bg-pink-950/30 dark:text-gray-200"
            >
              <span className="font-black text-adapt-navy dark:text-gray-100">
                {AREA_LABELS[selection.area]}:
              </span>{' '}
              {COMFORT_LABELS[selection.comfort]}
            </li>
          ))}
        </ul>
      </div>

      {latestSession.supportsUsed.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-black uppercase tracking-wide text-pink-700 dark:text-pink-200">
            Supports used
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {latestSession.supportsUsed.map((support) => (
              <span
                key={support}
                className="rounded-full bg-white/90 px-3 py-2 text-xs font-black capitalize text-slate-600 shadow-sm dark:bg-gray-950/80 dark:text-gray-300"
              >
                {support}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-xs font-semibold text-slate-500 dark:text-gray-400">
        This summary records the child&apos;s comfort choices today. It is not a sensory assessment,
        diagnosis, comparison or ranking.
      </p>
    </section>
  );
};

export default SensoryComfortProgressPanel;
