import React from 'react';
import { Check, Clock, Play, Sparkles, Star } from 'lucide-react';
import { NEURO_OPTION_MAP } from 'constants/neuroOptions';
import {
  NEURO_ZONE_META,
  type NeuroActivity,
} from 'features/child/data/neuroDashboardContent';
import { useChildProgressStore } from 'features/child/store/childProgressStore';

interface NeuroZoneCardProps {
  neuroId: string;
  activities: NeuroActivity[];
  onStartActivity: (activity: NeuroActivity) => void;
}

const NeuroZoneCard: React.FC<NeuroZoneCardProps> = ({ neuroId, activities, onStartActivity }) => {
  const option = NEURO_OPTION_MAP[neuroId];
  const meta = NEURO_ZONE_META[neuroId];
  const completions = useChildProgressStore((s) => s.completions);
  const metricValues = useChildProgressStore((s) => s.metricValues);

  const today = new Date().toISOString().slice(0, 10);
  const isCompleted = (activityId: string) =>
    completions.some((c) => c.activityId === activityId && c.completedAt.startsWith(today));
  const metricValue =
    metricValues.find((m) => m.neuroId === neuroId && m.date === today)?.value ?? 0;

  if (!option || !meta) return null;

  const Icon = option.icon;
  const doneCount = activities.filter((a) => isCompleted(a.id)).length;

  return (
    <article
      className={`overflow-hidden rounded-[1.75rem] border border-white/70 bg-gradient-to-br ${meta.gradient} ${meta.glow} backdrop-blur-sm dark:border-gray-800`}
    >
      <header className="flex items-start gap-4 border-b border-white/50 p-5 dark:border-gray-800/80 sm:p-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/90 shadow-sm dark:bg-gray-900/90">
          {Icon ? <Icon className="h-7 w-7 text-adapt-indigo" aria-hidden /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-adapt-navy dark:text-gray-100">{option.name}</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.chip}`}>
              {option.learningStyle}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">{meta.tagline}</p>
          <p className="mt-2 text-xs font-medium text-slate-500">
            {meta.dailyGoalLabel} · {doneCount}/{activities.length} done · {metricValue} reps today
          </p>
        </div>
      </header>

      <ul className="space-y-3 p-5 sm:p-6">
        {activities.map((activity) => {
          const done = isCompleted(activity.id);
          const ActivityIcon = activity.icon;

          return (
            <li key={activity.id}>
              <div
                className={`group rounded-2xl border-2 p-4 transition ${
                  done
                    ? 'border-emerald-300/60 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/30'
                    : 'border-white/80 bg-white/85 hover:border-adapt-indigo/30 hover:shadow-md dark:border-gray-700 dark:bg-gray-900/85 dark:hover:border-adapt-cyan/30'
                }`}
              >
                <div className="flex gap-3 sm:gap-4">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      done ? 'bg-emerald-200/80 dark:bg-emerald-900/50' : 'bg-adapt-indigo/10'
                    }`}
                  >
                    {done ? (
                      <Check className="h-5 w-5 text-emerald-600" aria-hidden />
                    ) : (
                      <ActivityIcon className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-adapt-navy dark:text-gray-100">{activity.title}</h4>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" aria-hidden />
                        {activity.durationMinutes} min
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
                        +{activity.starsReward}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">{activity.description}</p>
                    <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400 dark:text-gray-500">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      {activity.inspiration}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  {done ? (
                    <span className="dash-activity-done inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      <Check className="h-4 w-4" aria-hidden />
                      Completed!
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onStartActivity(activity)}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-adapt-indigo to-adapt-teal px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:scale-[1.02] hover:shadow-lg"
                    >
                      <Play className="h-4 w-4" aria-hidden />
                      Start
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </article>
  );
};

export default NeuroZoneCard;
