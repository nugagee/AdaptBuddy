import React, { useMemo, useState } from 'react';
import { Check, ChevronRight, Link2, RotateCcw, Trophy, Undo2 } from 'lucide-react';
import type { AchievementBadgeInput } from 'features/child/store/childProgressStore';

export const QUEST_CHAIN_BADGE: AchievementBadgeInput = {
  id: 'adhd-chain-builder',
  title: 'Chain Builder',
  description: 'Completed three tiny wins in a row.',
  emoji: '🔗',
};

const QUEST_SUGGESTIONS = [
  'Finish one piece of schoolwork',
  'Read a small section',
  'Tidy one small space',
  'Get ready for the next activity',
];

const buildQuestSteps = (goal: string): string[] => {
  const cleanGoal = goal.trim() || 'Finish one small task';
  const lowerGoal = cleanGoal.toLowerCase();

  if (/read|book|chapter|page|section/.test(lowerGoal)) {
    return [
      'Open the book or text and find the starting place.',
      'Read only one paragraph or small section.',
      'Say, point to, or write one thing you noticed.',
    ];
  }

  if (/tidy|clean|organise|organize|desk|room|space/.test(lowerGoal)) {
    return [
      'Choose one tiny area and ignore the rest for now.',
      'Put away or move five things from that area.',
      'Pause, look at what changed, and call this round done.',
    ];
  }

  if (/ready|next|leave|pack|activity/.test(lowerGoal)) {
    return [
      'Name the next activity and choose the first thing needed.',
      'Collect only the items needed for the start.',
      'Move to the starting place and take one calm breath.',
    ];
  }

  if (/write|homework|schoolwork|task|question|math|maths/.test(lowerGoal)) {
    return [
      'Open the task and find only the first instruction.',
      'Do the smallest visible part or question 1.',
      'Tick what is done and choose whether to continue or pause.',
    ];
  }

  return [
    `Get ready for: ${cleanGoal}.`,
    'Do the smallest part that changes it from not started to started.',
    'Notice the progress, tick it, and choose the next step later.',
  ];
};

interface AdhdQuestChainActivityProps {
  onComplete: (badge: AchievementBadgeInput) => void;
}

const AdhdQuestChainActivity: React.FC<AdhdQuestChainActivityProps> = ({ onComplete }) => {
  const [goal, setGoal] = useState(QUEST_SUGGESTIONS[0]);
  const [completedWins, setCompletedWins] = useState(0);
  const steps = useMemo(() => buildQuestSteps(goal), [goal]);
  const chainComplete = completedWins === steps.length;
  const goalLocked = completedWins > 0;

  const resetChain = () => setCompletedWins(0);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4 dark:border-violet-900/50 dark:from-violet-950/25 dark:to-indigo-950/25">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white">
            <Link2 className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-200">
              Pick one quest
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-gray-300">
              The whole goal is too big for one button. Build a chain from three tiny wins instead.
            </p>
          </div>
        </div>

        <label className="mt-4 block">
          <span className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">
            My goal
          </span>
          <input
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            disabled={goalLocked}
            className="mt-2 w-full rounded-2xl border-2 border-white bg-white p-3 text-sm font-bold text-adapt-navy outline-none transition focus:border-violet-400 disabled:cursor-not-allowed disabled:opacity-70 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
          />
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          {QUEST_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setGoal(suggestion)}
              disabled={goalLocked}
              className={`rounded-full px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                goal === suggestion
                  ? 'bg-violet-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-violet-100 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-violet-950/50'
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-adapt-indigo dark:text-adapt-cyan">
              Quest chain
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-gray-400" aria-live="polite">
              {chainComplete ? 'All three wins connected.' : `${completedWins} of ${steps.length} tiny wins connected.`}
            </p>
          </div>
          <div className="flex items-center gap-1" aria-label={`${completedWins} of 3 wins complete`}>
            {steps.map((_, index) => (
              <React.Fragment key={`chain-progress-${index}`}>
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${
                    index < completedWins
                      ? 'bg-emerald-500 text-white'
                      : index === completedWins
                        ? 'bg-violet-100 text-violet-700 ring-2 ring-violet-400 dark:bg-violet-950/50 dark:text-violet-200'
                        : 'bg-slate-100 text-slate-400 dark:bg-gray-800'
                  }`}
                >
                  {index < completedWins ? <Check className="h-4 w-4" aria-hidden /> : index + 1}
                </span>
                {index < steps.length - 1 ? (
                  <ChevronRight className={`h-4 w-4 ${index < completedWins ? 'text-emerald-500' : 'text-slate-300'}`} aria-hidden />
                ) : null}
              </React.Fragment>
            ))}
          </div>
        </div>

        <ol className="mt-4 space-y-3">
          {steps.map((step, index) => {
            const done = index < completedWins;
            const current = index === completedWins;

            return (
              <li
                key={`${step}-${index}`}
                className={`rounded-2xl border-2 p-4 transition ${
                  done
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/25'
                    : current
                      ? 'border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/25'
                      : 'border-slate-100 bg-slate-50 opacity-65 dark:border-gray-800 dark:bg-gray-950'
                }`}
              >
                <div className="flex gap-3">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                      done ? 'bg-emerald-500 text-white' : current ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-gray-800'
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" aria-hidden /> : index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold leading-6 text-adapt-navy dark:text-gray-100">{step}</p>
                    {done ? (
                      <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
                        Win connected
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCompletedWins(index + 1)}
                        disabled={!current}
                        className="mt-3 rounded-full bg-violet-600 px-4 py-2 text-xs font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-gray-800"
                      >
                        {current ? `Complete win ${index + 1}` : `Win ${index + 1} locked`}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {completedWins > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {!chainComplete ? (
              <button
                type="button"
                onClick={() => setCompletedWins((count) => Math.max(0, count - 1))}
                className="inline-flex items-center gap-2 rounded-full border-2 border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <Undo2 className="h-4 w-4" aria-hidden />
                Undo last win
              </button>
            ) : null}
            <button
              type="button"
              onClick={resetChain}
              className="inline-flex items-center gap-2 rounded-full border-2 border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Restart chain
            </button>
          </div>
        ) : null}
      </section>

      {chainComplete ? (
        <section className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-yellow-50 to-violet-50 p-5 text-center dark:border-amber-800 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-violet-950/25">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-400 text-3xl shadow-lg" aria-hidden>
            {QUEST_CHAIN_BADGE.emoji}
          </span>
          <div className="mt-3 flex items-center justify-center gap-2 text-amber-800 dark:text-amber-200">
            <Trophy className="h-5 w-5" aria-hidden />
            <p className="text-xs font-black uppercase tracking-wide">Badge unlocked</p>
          </div>
          <h3 className="mt-1 text-2xl font-black text-adapt-navy dark:text-gray-100">
            {QUEST_CHAIN_BADGE.title}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-gray-300">
            {QUEST_CHAIN_BADGE.description}
          </p>
          <button
            type="button"
            onClick={() => onComplete(QUEST_CHAIN_BADGE)}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-violet-600 px-5 py-3 font-black text-white shadow-md sm:w-auto"
          >
            <Trophy className="h-5 w-5" aria-hidden />
            Save badge and finish
          </button>
        </section>
      ) : null}
    </div>
  );
};

export default AdhdQuestChainActivity;
