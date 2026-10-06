import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Users } from 'lucide-react';
import { ROUTES } from 'constants/routes';

/**
 * Soft welcome ribbon for Independent Buddy (adult learners).
 * Keeps the shared learner dashboard while framing agency and optional support.
 */
const IndependentBuddyBanner: React.FC<{ firstName?: string }> = ({ firstName }) => (
  <section
    className="independent-buddy-banner relative mb-6 overflow-hidden rounded-[28px] border border-teal-200/80 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-5 shadow-soft dark:border-teal-500/20 dark:from-teal-950/40 dark:via-slate-950 dark:to-slate-900 sm:p-6"
    aria-label="Independent Buddy welcome"
  >
    <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-teal-400/20 blur-3xl" />
    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-700 dark:text-teal-300">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Independent Buddy
        </p>
        <h2 className="mt-2 text-xl font-bold text-adapt-navy dark:text-white sm:text-2xl">
          {firstName ? `Welcome, ${firstName}` : 'Your adult learner space'}
        </h2>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-gray-300">
          Move at your own pace. Tools stay calm and clear — support is optional, never assumed.
        </p>
      </div>
      <Link
        to={ROUTES.TRUST_AND_SAFETY}
        className="inline-flex shrink-0 items-center gap-2 rounded-2xl border border-teal-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 dark:border-teal-500/30 dark:bg-white/5 dark:text-teal-100 dark:hover:bg-white/10"
      >
        <Users className="h-4 w-4" aria-hidden />
        Support options
      </Link>
    </div>
  </section>
);

export default IndependentBuddyBanner;
