import React, { useCallback, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Star, X } from 'lucide-react';
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
  const [dayCards, setDayCards] = useState(['Hello check-in', 'Calm tool', 'Learning task', 'Reward choice']);
  const [storyScenario, setStoryScenario] = useState('A plan changes');
  const [selectedFeeling, setSelectedFeeling] = useState('unsure');
  const [patternAnswer, setPatternAnswer] = useState<string | null>(null);

  const moveDayCard = useCallback((index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= dayCards.length) return;

    setDayCards((cards) => {
      const next = [...cards];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }, [dayCards.length]);

  const activityBody = useMemo(() => {
    if (activity.id === 'autism-visual-schedule') {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl bg-sky-50 p-4 dark:bg-sky-950/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700 dark:text-sky-300">
              Build today in order
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
              Move the cards until the day feels predictable. The first card is what happens now.
            </p>
          </div>

          <ol className="space-y-2">
            {dayCards.map((card, index) => (
              <li
                key={card}
                className="flex items-center gap-3 rounded-2xl border border-sky-100 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800 dark:bg-sky-900 dark:text-sky-100">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-adapt-navy dark:text-gray-100">
                  {card}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveDayCard(index, -1)}
                    disabled={index === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 disabled:opacity-30 dark:bg-gray-700 dark:text-gray-200"
                    aria-label={`Move ${card} up`}
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDayCard(index, 1)}
                    disabled={index === dayCards.length - 1}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 disabled:opacity-30 dark:bg-gray-700 dark:text-gray-200"
                    aria-label={`Move ${card} down`}
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </div>
      );
    }

    if (activity.id === 'autism-social-story') {
      const storySteps = {
        'A plan changes': [
          'Sometimes the plan changes.',
          'I can look for the next clear step.',
          'I can ask for help or choose a calm tool.',
        ],
        'A room feels noisy': [
          'Some rooms have sounds that feel too big.',
          'I can cover my ears, move away, or ask for quiet.',
          'My comfort matters while I learn.',
        ],
        'I meet someone new': [
          'New people may feel surprising at first.',
          'I can say hello, wave, or use a short answer.',
          'I can take my time.',
        ],
      };

      return (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-adapt-indigo dark:text-adapt-cyan">
              Choose a story
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.keys(storySteps).map((scenario) => (
                <button
                  key={scenario}
                  type="button"
                  onClick={() => setStoryScenario(scenario)}
                  className={`rounded-full px-3 py-2 text-xs font-bold transition ${
                    storyScenario === scenario
                      ? 'bg-adapt-indigo text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {scenario}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {storySteps[storyScenario as keyof typeof storySteps].map((step, index) => (
              <div key={step} className="rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-950/30">
                <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">
                  Panel {index + 1}
                </p>
                <p className="mt-2 text-sm font-semibold leading-relaxed text-adapt-navy dark:text-gray-100">
                  {step}
                </p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-adapt-indigo dark:text-adapt-cyan">
              How might I feel?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {['calm', 'unsure', 'worried', 'ready'].map((feeling) => (
                <button
                  key={feeling}
                  type="button"
                  onClick={() => setSelectedFeeling(feeling)}
                  className={`rounded-full px-3 py-2 text-xs font-bold capitalize transition ${
                    selectedFeeling === feeling
                      ? 'bg-adapt-teal text-white shadow-md'
                      : 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {feeling}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (activity.id === 'autism-pattern-calm') {
      const choices = ['Blue square', 'Green circle', 'Blue triangle'];
      const correct = 'Blue square';

      return (
        <div className="space-y-4">
          <div className="rounded-2xl bg-blue-50 p-4 dark:bg-blue-950/30">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
              What comes next?
            </p>
            <div className="mt-3 flex items-center gap-2">
              {['Blue square', 'Green circle', 'Blue square', 'Green circle'].map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className={`flex h-14 w-14 items-center justify-center text-[10px] font-bold ${
                    item.includes('square') ? 'rounded-xl bg-blue-200 text-blue-900' : 'rounded-full bg-emerald-200 text-emerald-900'
                  }`}
                >
                  {item.includes('square') ? 'Blue' : 'Green'}
                </span>
              ))}
              <span className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-xl font-bold text-slate-400">
                ?
              </span>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {choices.map((choice) => {
              const selected = patternAnswer === choice;
              const isCorrect = selected && choice === correct;
              return (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setPatternAnswer(choice)}
                  className={`rounded-2xl border-2 p-3 text-sm font-bold transition ${
                    isCorrect
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : selected
                        ? 'border-amber-300 bg-amber-50 text-amber-800'
                        : 'border-slate-100 bg-white text-slate-600 hover:border-adapt-indigo/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
                  }`}
                >
                  {choice}
                </button>
              );
            })}
          </div>

          <p className="text-sm font-medium text-slate-600 dark:text-gray-400">
            {patternAnswer === correct
              ? 'That fits the pattern. Same structure, calm progress.'
              : patternAnswer
                ? 'Good try. Look for the repeating shape and color.'
                : 'Choose one card. No timer, no rush.'}
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-2xl bg-adapt-mist/60 p-4 dark:bg-gray-800/60">
        <p className="text-xs font-semibold uppercase tracking-wide text-adapt-indigo dark:text-adapt-cyan">
          How it works
        </p>
        <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-gray-400">
          <li>- Take your time. No countdown pressure unless you want it.</li>
          <li>- Tap complete when you feel done. Partial progress counts.</li>
          <li>- Your stars and metrics update instantly.</li>
        </ul>
      </div>
    );
  }, [activity.id, dayCards, moveDayCard, patternAnswer, selectedFeeling, storyScenario]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl dark:bg-gray-900">
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

          {activityBody}

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
