import React from 'react';
import { Award, LockKeyhole } from 'lucide-react';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { useChildProgressReadAccess } from 'features/child/store/childProgressReadAccess';

const AchievementBadgesPanel: React.FC = () => {
  const storedBadges = useChildProgressStore((state) => state.achievementBadges);
  const { isReady } = useChildProgressReadAccess();
  const badges = isReady ? storedBadges : [];

  return (
    <section className="rounded-3xl border border-violet-200 bg-gradient-to-br from-white via-violet-50 to-amber-50 p-6 shadow-sm dark:border-violet-900/50 dark:from-gray-900 dark:via-violet-950/20 dark:to-amber-950/20 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
          <Award className="h-6 w-6" aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">Achievement Badges</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
            Small wins stay visible here, even after an activity closes.
          </p>
        </div>
      </div>

      {badges.length === 0 ? (
        <div className="mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-violet-200 bg-white/70 p-4 dark:border-violet-900/60 dark:bg-gray-950/60">
          <LockKeyhole className="h-5 w-5 shrink-0 text-violet-400" aria-hidden />
          <p className="text-sm font-semibold text-slate-600 dark:text-gray-300">
            Complete Quest Chain to unlock the first badge.
          </p>
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((badge) => (
            <li
              key={badge.id}
              className="flex items-center gap-3 rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/80"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-100 text-2xl dark:bg-amber-950/40" aria-hidden>
                {badge.emoji}
              </span>
              <div className="min-w-0">
                <p className="font-black text-adapt-navy dark:text-gray-100">{badge.title}</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-gray-400">
                  {badge.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default AchievementBadgesPanel;
