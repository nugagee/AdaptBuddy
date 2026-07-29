import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Flame, Mic2, Volume2 } from 'lucide-react';
import { NEURO_OPTION_MAP } from 'constants/neuroOptions';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { ROUTES } from 'constants/routes';

interface DashboardHeroProps {
  firstName: string;
  neuroTypes: string[];
  todayProgress: number;
}

const DashboardHero: React.FC<DashboardHeroProps> = ({ firstName, neuroTypes, todayProgress }) => {
  const streakDays = useChildProgressStore((s) => s.streakDays);
  const starsTotal = useChildProgressStore((s) => s.starsTotal);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-adapt-indigo/15 via-white/80 to-adapt-teal/15 p-6 shadow-card backdrop-blur-sm dark:border-white/10 dark:from-adapt-indigo/25 dark:via-gray-900/90 dark:to-adapt-teal/10 sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-adapt-cyan/20 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-adapt-purple/15 blur-3xl" aria-hidden />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold uppercase tracking-wider text-adapt-indigo/80 dark:text-adapt-cyan">
            {greeting}, {firstName}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold leading-tight text-adapt-navy dark:text-gray-50 sm:text-3xl lg:text-4xl">
            Your learning universe is{' '}
            <span className="dash-shimmer-text">alive today</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-gray-400 sm:text-base">
            Every activity below is hand-picked for your brain profile — calm, clear, and made just for you.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {neuroTypes.map((id) => {
              const option = NEURO_OPTION_MAP[id];
              if (!option) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-3 py-1.5 text-xs font-semibold text-adapt-navy shadow-sm dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-100"
                >
                  {option.name.split(' ')[0]}
                  <span className="hidden sm:inline">{option.name.split(' ').slice(1).join(' ')}</span>
                </span>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to={ROUTES.PRONUNCIATION_BUDDY}
              className="inline-flex min-h-[3rem] items-center gap-2 rounded-2xl bg-gradient-to-r from-adapt-teal to-adapt-indigo px-5 py-3 text-sm font-black text-white shadow-md transition hover:scale-[1.01] hover:shadow-lg"
            >
              <Mic2 className="h-4 w-4" aria-hidden />
              Pronunciation Buddy
            </Link>
            <Link
              to={ROUTES.PRONUNCIATION_BUDDY}
              className="inline-flex min-h-[3rem] items-center gap-2 rounded-2xl border border-adapt-indigo/15 bg-white/75 px-5 py-3 text-sm font-black text-adapt-indigo shadow-sm transition hover:border-adapt-indigo/30 hover:bg-adapt-indigo/5 dark:border-adapt-cyan/20 dark:bg-gray-950/70 dark:text-adapt-cyan"
            >
              <Volume2 className="h-4 w-4" aria-hidden />
              Listen & repeat
            </Link>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4 sm:gap-6">
          <div className="text-center">
            <div className="dash-float mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-adapt-indigo to-adapt-teal text-2xl font-black text-white shadow-glow">
              {todayProgress}%
            </div>
            <p className="mt-2 text-xs font-medium text-slate-500 dark:text-gray-400">Today</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-2xl bg-white/70 px-4 py-2.5 dark:bg-gray-800/70">
              <Flame className="h-5 w-5 text-orange-500" aria-hidden />
              <div>
                <p className="text-lg font-bold leading-none text-adapt-navy dark:text-gray-100">{streakDays}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Day streak</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl bg-white/70 px-4 py-2.5 dark:bg-gray-800/70">
              <Sparkles className="h-5 w-5 text-amber-500" aria-hidden />
              <div>
                <p className="text-lg font-bold leading-none text-adapt-navy dark:text-gray-100">{starsTotal}</p>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Stars earned</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardHero;
