import React, { useMemo, useState } from 'react';
import type { DyspraxiaPlanningSessionInput } from 'features/child/store/childProgressStore';

export type { DyspraxiaPlanningSessionInput } from 'features/child/store/childProgressStore';

interface DyspraxiaStepPlannerActivityProps {
  onComplete: (session: DyspraxiaPlanningSessionInput) => void;
}

interface PlanTemplate {
  id: string;
  title: string;
  emoji: string;
  steps: readonly [string, string, string];
  startingOrder: readonly [number, number, number];
}

const PLAN_TEMPLATES: readonly PlanTemplate[] = [
  {
    id: 'get-ready-for-school',
    title: 'Get ready for school',
    emoji: '🎒',
    steps: [
      'Put on my clothes',
      'Pack the things I need',
      'Put on my shoes and coat',
    ],
    startingOrder: [1, 2, 0],
  },
  {
    id: 'pack-my-school-bag',
    title: 'Pack my school bag',
    emoji: '💼',
    steps: [
      'Check what I need',
      'Put each item in my bag',
      'Zip my bag and place it by the door',
    ],
    startingOrder: [2, 0, 1],
  },
  {
    id: 'make-a-snack',
    title: 'Make a snack',
    emoji: '🍎',
    steps: [
      'Wash and dry my hands',
      'Make or choose my snack',
      'Put things away',
    ],
    startingOrder: [1, 0, 2],
  },
];

const createSessionId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `dyspraxia-session-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createStartingOrder = (template: PlanTemplate): string[] => (
  template.startingOrder.map((stepIndex) => template.steps[stepIndex])
);

const confidenceOptions: ReadonlyArray<{
  id: DyspraxiaPlanningSessionInput['confidence'];
  label: string;
}> = [
  { id: 'confident', label: 'I feel confident' },
  { id: 'practised', label: 'I have practised' },
  { id: 'need-help', label: 'I need help' },
];

const DyspraxiaStepPlannerActivity: React.FC<DyspraxiaStepPlannerActivityProps> = ({
  onComplete,
}) => {
  const [sessionId] = useState(createSessionId);
  const [templateId, setTemplateId] = useState(PLAN_TEMPLATES[0].id);
  const template = useMemo(
    () => PLAN_TEMPLATES.find((option) => option.id === templateId) ?? PLAN_TEMPLATES[0],
    [templateId],
  );
  const [orderedSteps, setOrderedSteps] = useState<string[]>(() => createStartingOrder(PLAN_TEMPLATES[0]));
  const [orderHistory, setOrderHistory] = useState<string[][]>([]);
  const [movesMade, setMovesMade] = useState(0);
  const [checksMade, setChecksMade] = useState(0);
  const [confidence, setConfidence] = useState<DyspraxiaPlanningSessionInput['confidence'] | null>(null);
  const [feedback, setFeedback] = useState(
    'There is no score. Arrange the cards in an order that helps you begin.',
  );
  const [oneStepMode, setOneStepMode] = useState(false);
  const [oneStepWasUsed, setOneStepWasUsed] = useState(false);
  const [undoWasUsed, setUndoWasUsed] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const chooseTemplate = (nextTemplate: PlanTemplate) => {
    setTemplateId(nextTemplate.id);
    setOrderedSteps(createStartingOrder(nextTemplate));
    setOrderHistory([]);
    setMovesMade(0);
    setChecksMade(0);
    setConfidence(null);
    setFeedback('There is no score. Arrange the cards in an order that helps you begin.');
    setOneStepMode(false);
    setOneStepWasUsed(false);
    setActiveStepIndex(0);
    setUndoWasUsed(false);
  };

  const moveStep = (fromIndex: number, direction: -1 | 1) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= orderedSteps.length) return;

    const nextOrder = [...orderedSteps];
    [nextOrder[fromIndex], nextOrder[toIndex]] = [nextOrder[toIndex], nextOrder[fromIndex]];
    setOrderHistory((history) => [...history, orderedSteps]);
    setOrderedSteps(nextOrder);
    setMovesMade((current) => current + 1);
    setActiveStepIndex(toIndex);
    setFeedback('Step moved. Keep arranging, check the example, or save this draft.');
  };

  const undoLastMove = () => {
    const previousOrder = orderHistory[orderHistory.length - 1];
    if (!previousOrder) return;

    const visibleStep = orderedSteps[activeStepIndex];
    const restoredIndex = previousOrder.indexOf(visibleStep);
    setOrderedSteps(previousOrder);
    setOrderHistory((history) => history.slice(0, -1));
    setActiveStepIndex(restoredIndex >= 0 ? restoredIndex : 0);
    setUndoWasUsed(true);
    setFeedback('Last move undone. You can try another order or check this one.');
  };

  const checkOrder = () => {
    const matchingPositions = orderedSteps.reduce(
      (total, step, index) => total + (step === template.steps[index] ? 1 : 0),
      0,
    );
    setChecksMade((current) => current + 1);
    setFeedback(
      matchingPositions === template.steps.length
        ? 'This order matches the example. You can keep it or change it to suit you.'
        : `${matchingPositions} of ${template.steps.length} steps match the example order. You can keep arranging or save this draft.`,
    );
  };

  const toggleOneStepMode = () => {
    setOneStepMode((current) => !current);
    setOneStepWasUsed(true);
    setActiveStepIndex(0);
  };

  const handleComplete = () => {
    if (!confidence || (movesMade === 0 && checksMade === 0)) return;

    const supportsUsed = [
      movesMade > 0 ? 'large move controls' : null,
      checksMade > 0 ? 'order check' : null,
      oneStepWasUsed ? 'one-step mode' : null,
      undoWasUsed ? 'undo' : null,
    ].filter((support): support is string => Boolean(support));

    onComplete({
      sessionId,
      activityId: 'dyspraxia-sequence-steps',
      planId: template.id,
      planTitle: template.title,
      orderedSteps: [...orderedSteps],
      movesMade,
      checksMade,
      supportsUsed,
      confidence,
    });
  };

  const hasMeaningfulInteraction = movesMade > 0 || checksMade > 0;
  const canSave = hasMeaningfulInteraction && confidence !== null;
  const visibleSteps = oneStepMode
    ? [{ step: orderedSteps[activeStepIndex], index: activeStepIndex }]
    : orderedSteps.map((step, index) => ({ step, index }));

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/50 dark:bg-sky-950/25 sm:p-5">
        <h3 className="text-base font-black text-adapt-navy dark:text-gray-100">Choose an everyday plan</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-gray-300">
          Pick one task. Then use the buttons to put its three cards in an order that feels useful.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3" role="group" aria-label="Everyday task templates">
          {PLAN_TEMPLATES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => chooseTemplate(option)}
              aria-label={`Choose ${option.title} plan`}
              aria-pressed={template.id === option.id}
              className={`min-h-16 rounded-2xl border-2 p-4 text-left font-bold transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 ${
                template.id === option.id
                  ? 'border-sky-500 bg-white text-adapt-navy shadow-sm dark:bg-gray-950 dark:text-gray-100'
                  : 'border-transparent bg-white/70 text-slate-700 dark:bg-gray-900 dark:text-gray-200'
              }`}
            >
              <span className="mr-2 text-xl" aria-hidden>{option.emoji}</span>
              {option.title}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-sky-700 dark:text-sky-200">{template.title}</p>
            <h3 className="mt-1 text-lg font-black text-adapt-navy dark:text-gray-100">Arrange the step cards</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={undoLastMove}
              disabled={orderHistory.length === 0}
              className="min-h-12 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 transition motion-reduce:transition-none hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300"
            >
              Undo last move
            </button>
            <button
              type="button"
              onClick={toggleOneStepMode}
              aria-label={oneStepMode ? 'Turn off one-step mode' : 'Turn on one-step mode'}
              aria-pressed={oneStepMode}
              className={`min-h-12 rounded-xl border-2 px-4 py-3 text-sm font-black transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300 ${
                oneStepMode
                  ? 'border-violet-500 bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-100'
                  : 'border-slate-300 bg-white text-slate-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200'
              }`}
            >
              One-step mode: {oneStepMode ? 'On' : 'Off'}
            </button>
          </div>
        </div>

        {oneStepMode ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-violet-50 p-3 dark:bg-violet-950/25">
            <button
              type="button"
              onClick={() => setActiveStepIndex((current) => Math.max(0, current - 1))}
              disabled={activeStepIndex === 0}
              className="min-h-12 rounded-xl bg-white px-4 py-3 text-sm font-black text-violet-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-950 dark:text-violet-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
            >
              Previous step
            </button>
            <p className="text-center text-sm font-black text-violet-800 dark:text-violet-200" aria-live="polite">
              Step {activeStepIndex + 1} of {orderedSteps.length}
            </p>
            <button
              type="button"
              onClick={() => setActiveStepIndex((current) => Math.min(orderedSteps.length - 1, current + 1))}
              disabled={activeStepIndex === orderedSteps.length - 1}
              className="min-h-12 rounded-xl bg-white px-4 py-3 text-sm font-black text-violet-800 shadow-sm disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-950 dark:text-violet-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
            >
              Next step
            </button>
          </div>
        ) : null}

        <ol className="mt-4 space-y-3" aria-label="Steps in your current order">
          {visibleSteps.map(({ step, index }) => (
            <li
              key={step}
              className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-950"
              aria-posinset={index + 1}
              aria-setsize={orderedSteps.length}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-lg font-black text-sky-800 dark:bg-sky-950/60 dark:text-sky-200" aria-hidden>
                  {index + 1}
                </span>
                <p className="min-w-0 flex-1 pt-2 text-base font-bold leading-6 text-adapt-navy dark:text-gray-100" data-testid="dyspraxia-plan-step">
                  {step}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => moveStep(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${step} up`}
                  className="min-h-12 rounded-xl border-2 border-sky-300 bg-white px-4 py-3 text-sm font-black text-sky-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-900 dark:text-sky-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300"
                >
                  ↑ Move up
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(index, 1)}
                  disabled={index === orderedSteps.length - 1}
                  aria-label={`Move ${step} down`}
                  className="min-h-12 rounded-xl border-2 border-sky-300 bg-white px-4 py-3 text-sm font-black text-sky-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-gray-900 dark:text-sky-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300"
                >
                  ↓ Move down
                </button>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
          <button
            type="button"
            onClick={checkOrder}
            className="min-h-12 rounded-xl bg-sky-700 px-5 py-3 text-sm font-black text-white transition motion-reduce:transition-none hover:bg-sky-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-300"
          >
            Check my order
          </button>
          <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold leading-6 text-slate-700 dark:bg-gray-800 dark:text-gray-200" aria-live="polite">
            {feedback}
          </p>
        </div>
      </section>

      <fieldset className="rounded-3xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/50 dark:bg-violet-950/25 sm:p-5">
        <legend className="px-1 text-base font-black text-adapt-navy dark:text-gray-100">How does this plan feel?</legend>
        <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">Choose the answer that fits today. Every answer is okay.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {confidenceOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setConfidence(option.id)}
              aria-pressed={confidence === option.id}
              className={`min-h-12 rounded-xl border-2 px-4 py-3 text-sm font-black transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 ${
                confidence === option.id
                  ? 'border-violet-600 bg-white text-violet-900 shadow-sm dark:bg-gray-950 dark:text-violet-100'
                  : 'border-violet-200 bg-white/70 text-slate-700 dark:border-violet-900/50 dark:bg-gray-900 dark:text-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm leading-6 text-slate-600 dark:text-gray-300">
          You can save a draft even when it does not match the example. Move a card or check the order, then choose how the plan feels.
        </p>
        <button
          type="button"
          onClick={handleComplete}
          disabled={!canSave}
          className="mt-3 min-h-12 w-full rounded-xl bg-violet-600 px-5 py-3 text-base font-black text-white shadow-sm transition motion-reduce:transition-none hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 dark:disabled:bg-gray-700 dark:disabled:text-gray-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300"
        >
          Save this plan
        </button>
      </div>
    </div>
  );
};

export default DyspraxiaStepPlannerActivity;
