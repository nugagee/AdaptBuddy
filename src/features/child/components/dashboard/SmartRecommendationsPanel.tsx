import React from 'react';
import { ArrowRight, Bot, Sparkles, Star } from 'lucide-react';
import { RecommendationEngine } from 'services/ai/recommendationEngine';
import { useChildProgressStore } from 'features/child/store/childProgressStore';

interface SmartRecommendationsPanelProps {
  neuroTypes: string[];
  onTryRecommendation: (id: string, title: string) => void;
}

const SmartRecommendationsPanel: React.FC<SmartRecommendationsPanelProps> = ({
  neuroTypes,
  onTryRecommendation,
}) => {
  const todayMood = useChildProgressStore((s) => s.todayMood);
  const completions = useChildProgressStore((s) => s.completions);

  const today = new Date().toISOString().slice(0, 10);
  const todayCompletions = completions.filter((c) => c.completedAt.startsWith(today));
  const completedIds = todayCompletions.map((c) => c.activityId);

  const mood = todayMood ?? 'calm';
  const performance = Math.min(1, todayCompletions.length / 6);
  const recommendations = RecommendationEngine.recommend(neuroTypes, performance, mood, completedIds);

  const styleProfile = RecommendationEngine.getLearningStyleProfile(neuroTypes);
  const topStyle = Object.entries(styleProfile).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'visual';

  return (
    <section className="overflow-hidden rounded-3xl border border-adapt-indigo/20 bg-gradient-to-br from-indigo-50/80 via-white to-teal-50/80 shadow-card dark:border-adapt-cyan/20 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
      <div className="border-b border-adapt-indigo/10 p-5 dark:border-gray-800 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-adapt-indigo to-adapt-teal text-white">
            <Bot className="h-6 w-6" aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100 sm:text-xl">
              AdaptAI Recommendations
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
              Mood-aware picks · Your top style:{' '}
              <span className="font-semibold capitalize text-adapt-indigo dark:text-adapt-cyan">
                {topStyle}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-5 sm:p-6">
        {recommendations.map((rec, idx) => (
          <div
            key={rec.id}
            className="group rounded-2xl border border-white/80 bg-white/90 p-4 transition hover:border-adapt-indigo/30 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/90"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-adapt-indigo dark:text-adapt-cyan">
                    #{idx + 1} match
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                    <Star className="h-3 w-3 fill-amber-400" aria-hidden />
                    {Math.round(rec.aiConfidence * 100)}% fit
                  </span>
                </div>
                <h3 className="mt-1 text-base font-bold text-adapt-navy dark:text-gray-100">{rec.title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">{rec.description}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rec.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-adapt-mist px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-gray-700 dark:text-gray-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onTryRecommendation(rec.id, rec.title)}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-adapt-navy px-5 py-2.5 text-sm font-bold text-white transition hover:bg-adapt-indigo dark:bg-adapt-indigo dark:hover:bg-adapt-purple"
              >
                Try it
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-dashed border-adapt-teal/40 bg-adapt-teal/5 p-4 dark:border-adapt-cyan/30 dark:bg-adapt-cyan/5">
          <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-400">
            <Sparkles className="h-4 w-4 text-adapt-teal" aria-hidden />
            Built on UDL principles — adapts to how you feel today, not just your diagnosis.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SmartRecommendationsPanel;
