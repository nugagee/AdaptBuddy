import React, { useMemo, useState } from 'react';
import { Check, ChevronRight, HelpCircle, Save } from 'lucide-react';
import type { DyscalculiaSessionInput } from 'features/child/store/childProgressStore';

type Operation = 'addition' | 'subtraction';

interface NumberLineProblem {
  id: string;
  left: number;
  right: number;
  operation: Operation;
  answer: number;
}

const NUMBER_RANGE = { min: 0, max: 20 } as const;

const createSessionId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `dyscalculia-session-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const NUMBER_LINE_PROBLEMS: NumberLineProblem[] = [
  { id: 'add-4-3', left: 4, right: 3, operation: 'addition', answer: 7 },
  { id: 'subtract-12-5', left: 12, right: 5, operation: 'subtraction', answer: 7 },
  { id: 'add-8-6', left: 8, right: 6, operation: 'addition', answer: 14 },
];

const CONFIDENCE_OPTIONS: Array<{
  id: DyscalculiaSessionInput['confidence'];
  label: string;
}> = [
  { id: 'confident', label: 'I feel confident' },
  { id: 'practised', label: 'I practised' },
  { id: 'need-help', label: 'I need help' },
];

interface DyscalculiaNumberLineActivityProps {
  onComplete: (session: DyscalculiaSessionInput) => void;
}

const addToSet = (current: Set<string>, value: string): Set<string> => {
  const next = new Set(current);
  next.add(value);
  return next;
};

const CounterDots: React.FC<{ problem: NumberLineProblem }> = ({ problem }) => {
  const symbol = problem.operation === 'addition' ? '+' : '−';
  const direction = problem.operation === 'addition' ? 'add' : 'take away';

  return (
    <section className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4 dark:border-rose-900/50 dark:bg-rose-950/20">
      <p className="text-xs font-black uppercase tracking-wide text-rose-700 dark:text-rose-200">
        See the numbers as counters
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-gray-200">
        Start with {problem.left} counters, then {direction} {problem.right}.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3" aria-hidden>
        {problem.operation === 'addition' ? (
          <>
            <div className="flex max-w-52 flex-wrap gap-2 rounded-xl bg-white p-3 dark:bg-gray-900">
              {Array.from({ length: problem.left }, (_, index) => (
                <span key={`left-${index}`} className="h-7 w-7 rounded-full bg-rose-400 shadow-sm" />
              ))}
            </div>
            <span className="text-2xl font-black text-rose-700 dark:text-rose-200">{symbol}</span>
            <div className="flex max-w-52 flex-wrap gap-2 rounded-xl bg-white p-3 dark:bg-gray-900">
              {Array.from({ length: problem.right }, (_, index) => (
                <span key={`right-${index}`} className="h-7 w-7 rounded-full bg-amber-400 shadow-sm" />
              ))}
            </div>
          </>
        ) : (
          <div className="flex max-w-md flex-wrap gap-2 rounded-xl bg-white p-3 dark:bg-gray-900">
            {Array.from({ length: problem.left }, (_, index) => {
              const takenAway = index >= problem.left - problem.right;
              return (
                <span
                  key={`counter-${index}`}
                  className={`relative h-7 w-7 rounded-full shadow-sm ${
                    takenAway ? 'bg-slate-200 dark:bg-gray-700' : 'bg-rose-400'
                  }`}
                >
                  {takenAway ? (
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-black text-slate-500 dark:text-gray-300">
                      ×
                    </span>
                  ) : null}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <p className="sr-only">
        {problem.left} {symbol} {problem.right}. Use the counters and number line to choose the answer.
      </p>
    </section>
  );
};

const DyscalculiaNumberLineActivity: React.FC<DyscalculiaNumberLineActivityProps> = ({
  onComplete,
}) => {
  const [sessionId] = useState(createSessionId);
  const [problemIndex, setProblemIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [attemptedProblemIds, setAttemptedProblemIds] = useState<Set<string>>(() => new Set());
  const [correctProblemIds, setCorrectProblemIds] = useState<Set<string>>(() => new Set());
  const [hintedProblemIds, setHintedProblemIds] = useState<Set<string>>(() => new Set());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<DyscalculiaSessionInput['confidence'] | null>(null);

  const problem = NUMBER_LINE_PROBLEMS[problemIndex];
  const symbol = problem.operation === 'addition' ? '+' : '−';
  const direction = problem.operation === 'addition' ? 'right' : 'left';
  const currentAttempted = attemptedProblemIds.has(problem.id);
  const currentCorrect = correctProblemIds.has(problem.id);
  const currentHintShown = hintedProblemIds.has(problem.id);

  const numberLineValues = useMemo(
    () => Array.from(
      { length: NUMBER_RANGE.max - NUMBER_RANGE.min + 1 },
      (_, index) => NUMBER_RANGE.min + index,
    ),
    [],
  );

  const showHint = () => {
    if (currentHintShown) return;
    setHintedProblemIds((current) => addToSet(current, problem.id));
    setFeedback(null);
  };

  const checkAnswer = () => {
    if (selectedAnswer === null || currentCorrect) return;

    setAttemptedProblemIds((current) => addToSet(current, problem.id));
    if (selectedAnswer === problem.answer) {
      setCorrectProblemIds((current) => addToSet(current, problem.id));
      setFeedback(`Yes. ${problem.left} ${symbol} ${problem.right} lands on ${problem.answer}.`);
      return;
    }

    setFeedback('That landing point is not quite right yet. Count the hops and try again.');
  };

  const goToNextProblem = () => {
    if (!currentAttempted || problemIndex >= NUMBER_LINE_PROBLEMS.length - 1) return;
    setProblemIndex((current) => current + 1);
    setSelectedAnswer(null);
    setFeedback(null);
  };

  const savePractice = () => {
    if (attemptedProblemIds.size === 0 || confidence === null) return;

    const attemptedProblems = NUMBER_LINE_PROBLEMS.filter((candidate) =>
      attemptedProblemIds.has(candidate.id),
    );
    const operations = attemptedProblems.reduce<Operation[]>((saved, candidate) => {
      if (!saved.includes(candidate.operation)) saved.push(candidate.operation);
      return saved;
    }, []);
    const supportsUsed = ['visual number line', 'counters'];
    if (hintedProblemIds.size > 0) supportsUsed.push('step hint');

    onComplete({
      sessionId,
      activityId: 'dyscalculia-number-line',
      questionsAttempted: attemptedProblemIds.size,
      questionsCorrect: correctProblemIds.size,
      hintsUsed: hintedProblemIds.size,
      numberRange: { ...NUMBER_RANGE },
      operations,
      supportsUsed,
      confidence,
    });
  };

  return (
    <div className="space-y-5" aria-labelledby="number-line-question">
      <section className="rounded-2xl border border-rose-200 bg-white p-4 dark:border-rose-900/60 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-wide text-rose-700 dark:text-rose-200">
            Question {problemIndex + 1} of {NUMBER_LINE_PROBLEMS.length}
          </p>
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
            No timer · take your time
          </span>
        </div>
        <h3 id="number-line-question" className="mt-4 text-center text-3xl font-black text-adapt-navy dark:text-gray-100 sm:text-4xl">
          {problem.left} {symbol} {problem.right} = ?
        </h3>
        <p className="mt-2 text-center text-sm font-semibold text-slate-600 dark:text-gray-300">
          Connect the numeral, counters and number-line hops. Then choose where you land.
        </p>
      </section>

      <CounterDots problem={problem} />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-adapt-indigo dark:text-adapt-cyan">
              Choose a landing point
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
              Every number is a large button. You can tap it or use the keyboard.
            </p>
          </div>
          <button
            type="button"
            onClick={showHint}
            disabled={currentHintShown}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-adapt-indigo/20 bg-adapt-indigo/5 px-4 py-2 text-sm font-bold text-adapt-indigo transition hover:border-adapt-indigo/50 disabled:cursor-default disabled:opacity-70 dark:border-adapt-cyan/20 dark:text-adapt-cyan"
          >
            <HelpCircle className="h-4 w-4" aria-hidden />
            {currentHintShown ? 'Hint shown' : 'Show a hint'}
          </button>
        </div>

        {currentHintShown ? (
          <div className="mt-4 rounded-xl bg-indigo-50 p-3 text-sm font-semibold text-indigo-900 dark:bg-indigo-950/35 dark:text-indigo-100">
            Start at {problem.left}. Move {direction} {problem.right} spaces, one space at a time.
          </div>
        ) : null}

        <div className="mt-4 overflow-x-auto pb-2" role="group" aria-label="Number line from 0 to 20">
          <div className="relative min-w-[73rem] py-2">
            <span className="absolute left-6 right-6 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-300 dark:bg-gray-700" aria-hidden />
            <div className="relative flex gap-2">
              {numberLineValues.map((value) => {
                const selected = selectedAnswer === value;
                const isStart = value === problem.left;
                const isConfirmedAnswer = currentCorrect && value === problem.answer;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      if (currentCorrect) return;
                      setSelectedAnswer(value);
                      setFeedback(null);
                    }}
                    disabled={currentCorrect}
                    aria-label={`Choose ${value} as answer${isStart ? `; ${value} is the starting number` : ''}`}
                    aria-pressed={selected}
                    className={`min-h-12 min-w-12 rounded-xl border-2 text-base font-black shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-adapt-indigo/30 ${
                      isConfirmedAnswer
                        ? 'border-emerald-400 bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100'
                        : selected
                          ? 'border-adapt-indigo bg-adapt-indigo text-white dark:border-adapt-cyan dark:bg-adapt-cyan dark:text-gray-950'
                          : isStart && currentHintShown
                            ? 'border-amber-400 bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-adapt-indigo/40 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200'
                    }`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={checkAnswer}
          disabled={selectedAnswer === null || currentCorrect}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-3 font-bold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Check className="h-5 w-5" aria-hidden />
          {currentCorrect ? 'Answer checked' : 'Check answer'}
        </button>

        {feedback ? (
          <p
            className={`mt-3 rounded-xl p-3 text-sm font-bold ${
              currentCorrect
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100'
                : 'bg-amber-50 text-amber-900 dark:bg-amber-950/35 dark:text-amber-100'
            }`}
            role="status"
          >
            {feedback}
          </p>
        ) : null}

        {currentAttempted && problemIndex < NUMBER_LINE_PROBLEMS.length - 1 ? (
          <button
            type="button"
            onClick={goToNextProblem}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-adapt-indigo/20 px-5 py-2.5 text-sm font-bold text-adapt-indigo transition hover:border-adapt-indigo/50 dark:border-adapt-cyan/20 dark:text-adapt-cyan"
          >
            Try next question
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950">
        <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">
          How did this practice feel?
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3" role="group" aria-label="Practice confidence">
          {CONFIDENCE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setConfidence(option.id)}
              aria-pressed={confidence === option.id}
              className={`min-h-11 rounded-xl border-2 px-3 py-2 text-sm font-bold transition ${
                confidence === option.id
                  ? 'border-adapt-indigo bg-adapt-indigo/10 text-adapt-indigo dark:border-adapt-cyan dark:text-adapt-cyan'
                  : 'border-white bg-white text-slate-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={savePractice}
        disabled={attemptedProblemIds.size === 0 || confidence === null}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-adapt-teal px-5 py-3.5 font-bold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <Save className="h-5 w-5" aria-hidden />
        Save practice
      </button>
    </div>
  );
};

export default DyscalculiaNumberLineActivity;
