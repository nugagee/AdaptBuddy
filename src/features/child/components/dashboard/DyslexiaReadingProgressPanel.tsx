import React, { useMemo } from 'react';
import { BookOpenCheck, Ear, Headphones, Type } from 'lucide-react';
import { useChildProgressStore } from 'features/child/store/childProgressStore';

const DyslexiaReadingProgressPanel: React.FC = () => {
  const allSessions = useChildProgressStore((state) => state.dyslexiaReadingSessions);
  const readerPreferences = useChildProgressStore((state) => state.dyslexiaReaderPreferences);
  const allPhonicsSessions = useChildProgressStore((state) => state.dyslexiaPhonicsSessions);
  const sessions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return allSessions.filter((session) => session.createdAt.startsWith(today));
  }, [allSessions]);
  const phonicsSessions = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return allPhonicsSessions.filter((session) => session.createdAt.startsWith(today));
  }, [allPhonicsSessions]);
  const latest = sessions[0];
  const latestPhonics = phonicsSessions[0];
  const wordsRead = sessions.reduce((total, session) => total + session.wordsRead, 0);
  const sentencesRead = sessions.reduce((total, session) => total + session.sentencesCompleted, 0);
  const soundsPractised = phonicsSessions.reduce(
    (total, session) => total + session.completedSoundIds.length,
    0,
  );
  const latestIsPhonics = Boolean(
    latestPhonics && (!latest || latestPhonics.createdAt > latest.createdAt),
  );
  const latestSupports = latestIsPhonics
    ? latestPhonics?.supportsUsed ?? []
    : latest?.supportsUsed ?? [];

  if (!latest && !latestPhonics) {
    return (
      <section className="rounded-3xl border border-violet-200 bg-gradient-to-br from-white via-violet-50 to-sky-50 p-6 shadow-sm dark:border-violet-900/50 dark:from-gray-900 dark:via-violet-950/20 dark:to-sky-950/20 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
            <BookOpenCheck className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">Reading Progress</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
              Read or listen to one sentence in a Dyslexia reading activity to begin today&apos;s progress.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-violet-200 bg-gradient-to-br from-white via-violet-50 to-sky-50 p-6 shadow-sm dark:border-violet-900/50 dark:from-gray-900 dark:via-violet-950/20 dark:to-sky-950/20 sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
            <BookOpenCheck className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-200">
              {latest && !latestIsPhonics
                ? latest.activityId === 'dyslexia-overlay-read' ? 'Latest comfort reading' : 'Latest read-aloud'
                : 'Latest phonics practice'}
            </p>
            <h2 className="mt-1 text-xl font-black text-adapt-navy dark:text-gray-100">
              {latest && !latestIsPhonics
                ? latest.passageTitle
                : `${latestPhonics?.completedSounds.join(', ')} sounds`}
            </h2>
            <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-gray-300">
              {latest && !latestIsPhonics ? (
                <>
                  {latest.sentencesCompleted} of {latest.totalSentences} sentences completed
                  {latest.speechRate ? ` at ${latest.speechRate}x speed` : ''}.
                </>
              ) : (
                <>
                  {latestPhonics?.completedSoundIds.length} of {latestPhonics?.totalSounds} sound missions completed.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm dark:bg-gray-950/80">
            <Type className="mx-auto h-5 w-5 text-violet-600" aria-hidden />
            <p className="mt-2 text-2xl font-black text-adapt-navy dark:text-gray-100">{wordsRead}</p>
            <p className="text-xs font-bold text-slate-500">words today</p>
          </div>
          <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm dark:bg-gray-950/80">
            <Headphones className="mx-auto h-5 w-5 text-sky-600" aria-hidden />
            <p className="mt-2 text-2xl font-black text-adapt-navy dark:text-gray-100">{sentencesRead}</p>
            <p className="text-xs font-bold text-slate-500">sentences today</p>
          </div>
          <div className="rounded-2xl bg-white/90 p-4 text-center shadow-sm dark:bg-gray-950/80">
            <Ear className="mx-auto h-5 w-5 text-emerald-600" aria-hidden />
            <p className="mt-2 text-2xl font-black text-adapt-navy dark:text-gray-100">{soundsPractised}</p>
            <p className="text-xs font-bold text-slate-500">sounds today</p>
          </div>
        </div>
      </div>

      {latestSupports.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {latestSupports.map((support) => (
            <span
              key={support}
              className="rounded-full bg-white/90 px-3 py-2 text-xs font-black capitalize text-slate-600 shadow-sm dark:bg-gray-950/80 dark:text-gray-300"
            >
              {support}
            </span>
          ))}
        </div>
      ) : null}

      {readerPreferences ? (
        <div className="mt-4 rounded-2xl border border-violet-100 bg-white/80 p-4 dark:border-violet-900/40 dark:bg-gray-950/60">
          <p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-200">
            Saved comfort setup
          </p>
          <p className="mt-2 text-sm font-semibold capitalize text-slate-600 dark:text-gray-300">
            {readerPreferences.overlay} page · {readerPreferences.textSize.replace('-', ' ')} text ·{' '}
            {readerPreferences.lineSpacing.replace('-', ' ')} spacing · {readerPreferences.lineWidth} column
            {readerPreferences.readingRuler ? ' · reading ruler' : ''}
            {readerPreferences.dyslexiaFont ? ' · dyslexia-friendly font' : ''}
          </p>
        </div>
      ) : null}
    </section>
  );
};

export default DyslexiaReadingProgressPanel;
