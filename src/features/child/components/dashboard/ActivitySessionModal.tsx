import React from 'react';
import { Check, Star, X } from 'lucide-react';
import type { NeuroActivity } from 'features/child/data/neuroDashboardContent';

interface ActivitySessionModalProps {
  activity: NeuroActivity;
  onClose: () => void;
  onComplete: () => void;
}

const ActivitySessionModal: React.FC<ActivitySessionModalProps> = ({
  activity,
  onClose,
  onComplete,
}) => {
  const Icon = activity.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="bg-gradient-to-r from-adapt-indigo/10 to-adapt-teal/10 p-6 dark:from-adapt-indigo/20 dark:to-adapt-teal/20">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white dark:bg-gray-800">
                <Icon className="h-6 w-6 text-adapt-indigo" aria-hidden />
              </div>
              <div>
                <h2 className="text-xl font-bold text-adapt-navy dark:text-gray-100">{activity.title}</h2>
                <p className="text-sm text-slate-500">{activity.durationMinutes} min · +{activity.starsReward} stars</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 dark:bg-gray-800"
              aria-label="Close activity"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div className="space-y-4 p-6">
          <p className="text-slate-600 dark:text-gray-400">{activity.description}</p>

          <div className="rounded-2xl bg-adapt-mist/60 p-4 dark:bg-gray-800/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-adapt-indigo dark:text-adapt-cyan">
              How it works
            </p>
            <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-gray-400">
              <li>· Take your time — no countdown pressure unless you want it</li>
              <li>· Tap complete when you feel done (even partial progress counts!)</li>
              <li>· Your stars and metrics update instantly</li>
            </ul>
          </div>

          <p className="text-xs text-slate-400 italic">{activity.inspiration}</p>

          <button
            type="button"
            onClick={onComplete}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-adapt-teal py-3.5 font-bold text-white shadow-md transition hover:scale-[1.02]"
          >
            <Check className="h-5 w-5" aria-hidden />
            Mark Complete
            <Star className="h-4 w-4 fill-amber-300 text-amber-300" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivitySessionModal;
