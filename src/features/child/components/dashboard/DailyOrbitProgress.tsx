import React from 'react';
import { CheckCircle2, Circle, Clock, Heart, Trophy, TrendingDown, TrendingUp } from 'lucide-react';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { useChildSessionStore } from 'features/child/store/childSessionStore';
import {
  formatSessionDuration,
  getVisitComparison,
} from 'features/child/utils/childSessionTime';

interface DailyOrbitProgressProps {
  totalActivities: number;
  onMoodCheck: () => void;
}

const DailyOrbitProgress: React.FC<DailyOrbitProgressProps> = ({ totalActivities, onMoodCheck }) => {
  const completions = useChildProgressStore((s) => s.completions);
  const focusMinutes = useChildProgressStore((s) => s.focusMinutesToday);
  const todayMood = useChildProgressStore((s) => s.todayMood);
  const elapsedSeconds = useChildSessionStore((s) => s.elapsedSeconds);
  const lastVisitSeconds = useChildSessionStore((s) => s.lastVisitSeconds);

  const visitComparison =
    lastVisitSeconds > 0 ? getVisitComparison(elapsedSeconds, lastVisitSeconds) : null;

  const today = new Date().toISOString().slice(0, 10);
  const todayCompletions = completions.filter((c) => c.completedAt.startsWith(today));
  const starsToday = todayCompletions.reduce((sum, c) => sum + c.starsEarned, 0);
  const completed = todayCompletions.length;
  const progressPct = totalActivities > 0 ? Math.round((completed / totalActivities) * 100) : 0;

  const moodEmoji = todayMood
    ? { happy: '😊', okay: '😐', sad: '😔', angry: '😠', tired: '😴' }[todayMood] ?? '💭'
    : '💭';

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100 sm:text-xl">
            Today&apos;s Orbit
          </h2>
          <p className="text-sm text-slate-500 dark:text-gray-400">
            {completed} of {totalActivities} missions complete
          </p>
        </div>
        <button
          type="button"
          onClick={onMoodCheck}
          className="inline-flex items-center gap-2 rounded-full border-2 border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
        >
          <Heart className="h-4 w-4" aria-hidden />
          Mood {moodEmoji}
        </button>
      </div>

      <div className="relative mb-6 h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-adapt-indigo via-adapt-purple to-adapt-teal transition-all duration-700 ease-out"
          style={{ width: `${progressPct}%` }}
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Today's learning progress"
        />
      </div>

      <div
        className="mb-6 rounded-2xl border border-adapt-indigo/15 bg-gradient-to-r from-adapt-indigo/5 to-adapt-teal/5 px-4 py-3 dark:border-adapt-cyan/20 dark:from-adapt-indigo/10 dark:to-adapt-teal/10"
        role="status"
        aria-live="polite"
        aria-label={`You have spent ${formatSessionDuration(elapsedSeconds)} on AdaptBuddy this visit`}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-adapt-indigo/10 dark:bg-adapt-cyan/10">
            <Clock className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                This visit
              </p>
              <p className="text-base font-bold text-adapt-navy dark:text-gray-100">
                You have spent:{' '}
                <span className="text-adapt-indigo dark:text-adapt-cyan">
                  {formatSessionDuration(elapsedSeconds)}
                </span>
              </p>
            </div>

            {lastVisitSeconds > 0 && (
              <div className="border-t border-adapt-indigo/10 pt-2 dark:border-adapt-cyan/15">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-gray-400">
                  Last visit
                </p>
                <p className="text-sm font-semibold text-slate-700 dark:text-gray-300">
                  {formatSessionDuration(lastVisitSeconds)}
                </p>
                {visitComparison && (
                  <p
                    className={`mt-1 flex items-center gap-1.5 text-sm font-medium ${
                      visitComparison.ahead
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {visitComparison.ahead ? (
                      <TrendingUp className="h-4 w-4 shrink-0" aria-hidden />
                    ) : (
                      <TrendingDown className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                    {visitComparison.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="rounded-2xl bg-adapt-mist/80 p-4 text-center dark:bg-gray-800/80">
          <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-adapt-indigo/15">
            {completed >= totalActivities && totalActivities > 0 ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : (
              <Circle className="h-5 w-5 text-adapt-indigo" />
            )}
          </div>
          <p className="text-xl font-bold text-adapt-navy dark:text-gray-100">
            {completed}/{totalActivities}
          </p>
          <p className="text-xs text-slate-500">Missions</p>
        </div>
        <div className="rounded-2xl bg-adapt-mist/80 p-4 text-center dark:bg-gray-800/80">
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{focusMinutes}</p>
          <p className="text-xs text-slate-500">Focus min</p>
        </div>
        <div className="rounded-2xl bg-adapt-mist/80 p-4 text-center dark:bg-gray-800/80">
          <Trophy className="mx-auto mb-1 h-5 w-5 text-amber-500" aria-hidden />
          <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{starsToday}</p>
          <p className="text-xs text-slate-500">Stars today</p>
        </div>
      </div>
    </section>
  );
};

export default DailyOrbitProgress;
