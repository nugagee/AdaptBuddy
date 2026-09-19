import React, { useMemo } from 'react';
import { ArrowRight, CheckCircle2, Clock3, Sparkles } from 'lucide-react';
import type { NeuroActivity } from 'features/child/data/neuroDashboardContent';
import { getReadySupportSuggestions } from 'features/child/data/supportSuggestions';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { useChildProgressReadAccess } from 'features/child/store/childProgressReadAccess';

interface SmartRecommendationsPanelProps {
  neuroTypes: string[];
  onTryRecommendation: (activity: NeuroActivity) => void;
}

const SmartRecommendationsPanel: React.FC<SmartRecommendationsPanelProps> = ({
  neuroTypes,
  onTryRecommendation,
}) => {
  const completions = useChildProgressStore((state) => state.completions);
  const { isReady } = useChildProgressReadAccess();
  const today = new Date().toISOString().slice(0, 10);
  const completedIds = useMemo(
    () => new Set(
      isReady
        ? completions
          .filter((completion) => completion.completedAt.startsWith(today))
          .map((completion) => completion.activityId)
        : [],
    ),
    [completions, isReady, today],
  );

  const suggestions = useMemo(
    () => getReadySupportSuggestions(neuroTypes, completedIds),
    [completedIds, neuroTypes],
  );

  if (suggestions.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-3xl border border-adapt-indigo/20 bg-gradient-to-br from-indigo-50/80 via-white to-teal-50/80 shadow-card dark:border-adapt-cyan/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
      <div className="border-b border-adapt-indigo/10 p-5 dark:border-gray-800 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-adapt-indigo to-adapt-teal text-white">
            <Sparkles className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100 sm:text-xl">
              Suggested support tools
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
              Real tools from your selected support profile. You choose what helps today.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-5 sm:p-6">
        {suggestions.map((activity) => (
          <article
            key={activity.id}
            className="rounded-2xl border border-white/80 bg-white/90 p-4 dark:border-gray-700 dark:bg-gray-800/90"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    Ready now
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-gray-400">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden />
                    About {activity.durationMinutes} min
                  </span>
                </div>
                <h3 className="mt-1 text-base font-bold text-adapt-navy dark:text-gray-100">
                  {activity.title}
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
                  {activity.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onTryRecommendation(activity)}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-adapt-navy px-5 py-2.5 text-sm font-bold text-white transition hover:bg-adapt-indigo dark:bg-adapt-indigo dark:hover:bg-adapt-purple"
              >
                Open tool
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </article>
        ))}

        <p className="rounded-2xl border border-dashed border-adapt-teal/40 bg-adapt-teal/5 p-4 text-sm text-slate-600 dark:border-adapt-cyan/30 dark:bg-adapt-cyan/5 dark:text-gray-400">
          These are transparent support suggestions, not a diagnosis or an ability score.
        </p>
      </div>
    </section>
  );
};

export default SmartRecommendationsPanel;
