import React, { useMemo } from 'react';
import { CheckCircle2, MessageSquareText, Rows3 } from 'lucide-react';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { useChildProgressReadAccess } from 'features/child/store/childProgressReadAccess';

const formatFixedVocabularySentence = (words: string[]): string =>
  words.join(' ').replace(/\s+([,.!?])/g, '$1');

const DysgraphiaWordBankProgressPanel: React.FC = () => {
  const allSessions = useChildProgressStore((state) => state.dysgraphiaWordBankSessions);
  const { isReady } = useChildProgressReadAccess();

  const sessions = useMemo(() => {
    if (!isReady) return [];
    const today = new Date().toISOString().slice(0, 10);
    return allSessions.filter((session) => session.createdAt.startsWith(today));
  }, [allSessions, isReady]);

  const latestSession = sessions[0];
  const wordCardsUsed = sessions.reduce(
    (total, session) => total + session.selectedWords.length,
    0,
  );
  const checksMade = sessions.reduce((total, session) => total + session.checksMade, 0);

  if (!latestSession) {
    return (
      <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-white via-emerald-50 to-teal-50 p-6 shadow-sm dark:border-emerald-900/50 dark:from-gray-900 dark:via-emerald-950/20 dark:to-teal-950/20 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
            <MessageSquareText className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">
              Word Bank Practice
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
              Build one Word Bank Express sentence to begin today&apos;s practice summary.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const latestSentence = formatFixedVocabularySentence(latestSession.selectedWords);

  return (
    <section className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-white via-emerald-50 to-teal-50 p-6 shadow-sm dark:border-emerald-900/50 dark:from-gray-900 dark:via-emerald-950/20 dark:to-teal-950/20 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
            <MessageSquareText className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
              Latest fixed-word sentence
            </p>
            <h2 className="mt-1 text-xl font-black text-adapt-navy dark:text-gray-100">
              {latestSession.promptTitle}
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-gray-300">
              Built using selectable word cards, without saving free-text writing.
            </p>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm dark:bg-gray-950/80">
            <MessageSquareText className="mx-auto h-5 w-5 text-emerald-600" aria-hidden />
            <p className="mt-2 text-2xl font-black text-adapt-navy dark:text-gray-100">
              {sessions.length}
            </p>
            <p className="text-xs font-bold text-slate-500">sentences</p>
          </div>
          <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm dark:bg-gray-950/80">
            <Rows3 className="mx-auto h-5 w-5 text-teal-600" aria-hidden />
            <p className="mt-2 text-2xl font-black text-adapt-navy dark:text-gray-100">
              {wordCardsUsed}
            </p>
            <p className="text-xs font-bold text-slate-500">word cards</p>
          </div>
          <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm dark:bg-gray-950/80">
            <CheckCircle2 className="mx-auto h-5 w-5 text-cyan-600" aria-hidden />
            <p className="mt-2 text-2xl font-black text-adapt-navy dark:text-gray-100">
              {checksMade}
            </p>
            <p className="text-xs font-bold text-slate-500">checks used</p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-100 bg-white/80 p-4 dark:border-emerald-900/40 dark:bg-gray-950/60">
        <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
          Sentence practised
        </p>
        <p className="mt-2 text-base font-bold leading-7 text-adapt-navy dark:text-gray-100">
          {latestSentence}
        </p>
      </div>

      {latestSession.supportsUsed.length > 0 ? (
        <div className="mt-4">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
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
        This summary records fixed-vocabulary sentence practice completed today. It does not assess,
        diagnose, compare or rank writing ability.
      </p>
    </section>
  );
};

export default DysgraphiaWordBankProgressPanel;
