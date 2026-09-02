import React, { useCallback, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Star, X, Zap } from 'lucide-react';
import type { NeuroActivity } from 'features/child/data/neuroDashboardContent';
import type {
  AchievementBadgeInput,
  AdhdEnergyPacingInput,
  AdhdSupportSignalInput,
  DyslexiaPhonicsSessionInput,
  DyslexiaReaderPreferencesInput,
  DyslexiaReadingSessionInput,
} from 'features/child/store/childProgressStore';
import AdhdEnergyCheckInActivity from './AdhdEnergyCheckInActivity';
import AdhdMovementBurstActivity from './AdhdMovementBurstActivity';
import AdhdQuestChainActivity from './AdhdQuestChainActivity';
import DyslexiaOverlayReaderActivity from './DyslexiaOverlayReaderActivity';
import DyslexiaPhonicsTraceActivity from './DyslexiaPhonicsTraceActivity';
import DyslexiaReadAloudActivity from './DyslexiaReadAloudActivity';

export interface ActivitySessionResult {
  adhdSupportSignal?: AdhdSupportSignalInput;
  adhdEnergyPacing?: AdhdEnergyPacingInput;
  achievementBadge?: AchievementBadgeInput;
  dyslexiaReadingSession?: DyslexiaReadingSessionInput;
  dyslexiaReaderPreferences?: DyslexiaReaderPreferencesInput;
  dyslexiaPhonicsSession?: DyslexiaPhonicsSessionInput;
}

const ADHD_ENERGY_OPTIONS = [
  { id: 'sleepy', label: 'Sleepy', plan: 'Stand up, stretch tall, then do a 3-minute start.' },
  { id: 'buzzing', label: 'Buzzing', plan: 'Do 10 wall pushes or chair presses before starting.' },
  { id: 'scattered', label: 'Scattered', plan: 'Hide extra tabs, choose one tiny step, then start.' },
  { id: 'focused', label: 'Focused', plan: 'Protect the flow: one task, no switching.' },
  { id: 'overloaded', label: 'Overloaded', plan: 'Lower the demand: breathe, ask for one clear instruction.' },
];

const ADHD_FIRST_STEPS = [
  'Open the task and read only the first instruction.',
  'Write your name or title first.',
  'Do question 1 only.',
  'Ask Buddy to make the instruction simpler.',
];

const ADHD_RESCUE_OPTIONS = ['too hard', 'too boring', 'too noisy', 'too many steps', 'do not know where to start'];

const ADHD_TASK_BLOCKERS = ['too big', 'too boring', 'too many steps', 'do not know where to start', 'need an example'];

const ADHD_BREAK_OPTIONS = [
  {
    id: 'restless',
    label: 'Restless',
    breakType: 'Movement burst',
    plan: 'Do 20 marching steps, 10 wall pushes, then sit with feet grounded.',
    returnStep: 'Return to the smallest visible step.',
  },
  {
    id: 'tired',
    label: 'Tired',
    breakType: 'Water and stretch',
    plan: 'Sip water, stretch arms up, roll shoulders, then choose a 3-minute start.',
    returnStep: 'Start with reading only the first instruction.',
  },
  {
    id: 'overwhelmed',
    label: 'Overwhelmed',
    breakType: 'Quiet reset',
    plan: 'Look away from the screen, breathe slowly, and ask for one clear instruction.',
    returnStep: 'Return with one instruction visible.',
  },
  {
    id: 'stuck',
    label: 'Stuck',
    breakType: 'Example first',
    plan: 'Pause the task, look at one example, then copy the structure with new words.',
    returnStep: 'Do the first part using the example.',
  },
  {
    id: 'frustrated',
    label: 'Frustrated',
    breakType: 'Calm body reset',
    plan: 'Unclench hands, press palms together, breathe out longer than in.',
    returnStep: 'Choose either help, easier version, or one-minute try.',
  },
  {
    id: 'distracted',
    label: 'Distracted',
    breakType: 'Environment reset',
    plan: 'Close extra tabs, move one distracting item away, and set a short timer.',
    returnStep: 'Return to one task with no switching.',
  },
];

const buildAdhdTaskSteps = (task: string): string[] => {
  const cleanTask = task.trim() || 'Start the classroom task';
  const lowerTask = cleanTask.toLowerCase();

  if (/paragraph|essay|write|story|sentence/.test(lowerTask)) {
    return [
      'Write the title or first sentence.',
      'Add one idea in your own words.',
      'Add one example or detail.',
      'Read it once and tick done.',
    ];
  }

  if (/math|sum|number|calculate|equation|question/.test(lowerTask)) {
    return [
      'Circle the numbers or key words.',
      'Do only question 1 first.',
      'Check the answer with one method.',
      'Ask for help if the same step is still stuck.',
    ];
  }

  if (/read|book|chapter|page|text/.test(lowerTask)) {
    return [
      'Read the heading and first two lines.',
      'Point to one important word.',
      'Read one small section.',
      'Say or write one thing you remember.',
    ];
  }

  if (/project|poster|presentation|research/.test(lowerTask)) {
    return [
      'Choose the title or topic.',
      'Find one fact or idea.',
      'Add one picture, note, or bullet point.',
      'Stop and check the next tiny step.',
    ];
  }

  return [
    `Open: ${cleanTask}.`,
    'Find the first instruction only.',
    'Do the smallest visible part.',
    'Stop and tick what changed from not started to started.',
  ];
};

interface ActivitySessionModalProps {
  activity: NeuroActivity;
  onClose: () => void;
  onComplete: (result?: ActivitySessionResult) => void;
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
  const [adhdEnergy, setAdhdEnergy] = useState('scattered');
  const [adhdStep, setAdhdStep] = useState('Open the task and read only the first instruction.');
  const [adhdRescue, setAdhdRescue] = useState('too many steps');
  const [adhdTaskText, setAdhdTaskText] = useState('Write a paragraph about plants');
  const [adhdTaskBlocker, setAdhdTaskBlocker] = useState('too many steps');
  const [adhdBreakState, setAdhdBreakState] = useState('restless');

  const moveDayCard = useCallback((index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= dayCards.length) return;

    setDayCards((cards) => {
      const next = [...cards];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }, [dayCards.length]);

  const selectedAdhdEnergy =
    ADHD_ENERGY_OPTIONS.find((option) => option.id === adhdEnergy) ?? ADHD_ENERGY_OPTIONS[2];
  const adhdTaskSteps = useMemo(() => buildAdhdTaskSteps(adhdTaskText), [adhdTaskText]);
  const selectedAdhdBreak =
    ADHD_BREAK_OPTIONS.find((option) => option.id === adhdBreakState) ?? ADHD_BREAK_OPTIONS[0];

  const handleCompleteClick = useCallback(() => {
    if (activity.id === 'adhd-focus-coach') {
      onComplete({
        adhdSupportSignal: {
          energyId: selectedAdhdEnergy.id,
          energyLabel: selectedAdhdEnergy.label,
          firstStep: adhdStep,
          rescueReason: adhdRescue,
          supportPlan: selectedAdhdEnergy.plan,
        },
      });
      return;
    }

    if (activity.id === 'adhd-task-breakdown') {
      onComplete({
        adhdSupportSignal: {
          energyId: 'task-breakdown',
          energyLabel: 'Task breakdown',
          firstStep: adhdTaskSteps[0],
          rescueReason: adhdTaskBlocker,
          supportPlan: `Keep the task visible as ${adhdTaskSteps.length} tiny steps. Praise the start, then reveal one next step at a time.`,
          taskTitle: adhdTaskText.trim() || 'Classroom task',
          breakdownSteps: adhdTaskSteps,
        },
      });
      return;
    }

    if (activity.id === 'adhd-break-prescription') {
      onComplete({
        adhdSupportSignal: {
          energyId: selectedAdhdBreak.id,
          energyLabel: selectedAdhdBreak.label,
          firstStep: selectedAdhdBreak.returnStep,
          rescueReason: selectedAdhdBreak.breakType.toLowerCase(),
          supportPlan: selectedAdhdBreak.plan,
          taskTitle: `${selectedAdhdBreak.breakType} break`,
          breakdownSteps: [selectedAdhdBreak.plan, selectedAdhdBreak.returnStep],
        },
      });
      return;
    }

    onComplete();
  }, [activity.id, adhdRescue, adhdStep, adhdTaskBlocker, adhdTaskSteps, adhdTaskText, onComplete, selectedAdhdBreak, selectedAdhdEnergy]);

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

    if (activity.id === 'adhd-focus-coach') {
      const teacherInsight = `Energy: ${selectedAdhdEnergy.label}. First step: ${adhdStep} Rescue reason: ${adhdRescue}. Support: ${selectedAdhdEnergy.plan}`;

      return (
        <div className="space-y-4">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/25">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-white">
                <Zap className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-amber-700 dark:text-amber-200">
                  Energy check-in
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-gray-300">
                  Pick the state closest to right now. The coach changes the start plan, not the child.
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-5">
              {ADHD_ENERGY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setAdhdEnergy(option.id)}
                  className={`rounded-2xl border-2 px-3 py-2 text-xs font-black transition ${
                    adhdEnergy === option.id
                      ? 'border-amber-400 bg-white text-amber-800 shadow-sm dark:bg-gray-950 dark:text-amber-100'
                      : 'border-transparent bg-white/70 text-slate-600 dark:bg-gray-900 dark:text-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-black uppercase tracking-wide text-adapt-indigo dark:text-adapt-cyan">
              Tiny first step
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
              Starting earns credit. The whole assignment does not need to be finished here.
            </p>
            <div className="mt-3 grid gap-2">
              {ADHD_FIRST_STEPS.map((step) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => setAdhdStep(step)}
                  className={`rounded-2xl border-2 p-3 text-left text-sm font-bold transition ${
                    adhdStep === step
                      ? 'border-adapt-indigo bg-adapt-indigo/10 text-adapt-indigo dark:border-adapt-cyan dark:bg-adapt-cyan/10 dark:text-adapt-cyan'
                      : 'border-slate-100 bg-slate-50 text-slate-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300'
                  }`}
                >
                  {step}
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">
                Distraction rescue
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {ADHD_RESCUE_OPTIONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setAdhdRescue(reason)}
                    className={`rounded-full px-3 py-2 text-xs font-bold capitalize ${
                      adhdRescue === reason
                        ? 'bg-adapt-navy text-white dark:bg-adapt-cyan dark:text-gray-950'
                        : 'bg-white text-slate-600 dark:bg-gray-900 dark:text-gray-300'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/25">
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
                Movement prescription
              </p>
              <p className="mt-3 text-sm font-bold leading-6 text-emerald-900 dark:text-emerald-100">
                {selectedAdhdEnergy.plan}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-adapt-indigo/15 bg-adapt-indigo/5 p-4 dark:border-adapt-cyan/20 dark:bg-adapt-cyan/10">
            <p className="text-xs font-black uppercase tracking-wide text-adapt-indigo dark:text-adapt-cyan">
              Teacher insight preview
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-gray-200">
              {teacherInsight}
            </p>
          </section>
        </div>
      );
    }

    if (activity.id === 'adhd-task-breakdown') {
      const supportPreview = `Task: ${adhdTaskText.trim() || 'Classroom task'}. Blocker: ${adhdTaskBlocker}. First step: ${adhdTaskSteps[0]}`;

      return (
        <div className="space-y-4">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/25">
            <p className="text-xs font-black uppercase tracking-wide text-amber-700 dark:text-amber-200">
              Break this task down
            </p>
            <label className="mt-3 block">
              <span className="sr-only">Task to break down</span>
              <textarea
                value={adhdTaskText}
                onChange={(event) => setAdhdTaskText(event.target.value)}
                rows={3}
                className="w-full resize-none rounded-2xl border-2 border-amber-100 bg-white p-3 text-sm font-semibold text-adapt-navy outline-none transition focus:border-amber-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100"
                placeholder="Type the task here"
              />
            </label>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">
              What is blocking the start?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ADHD_TASK_BLOCKERS.map((blocker) => (
                <button
                  key={blocker}
                  type="button"
                  onClick={() => setAdhdTaskBlocker(blocker)}
                  className={`rounded-full px-3 py-2 text-xs font-bold capitalize ${
                    adhdTaskBlocker === blocker
                      ? 'bg-adapt-navy text-white dark:bg-adapt-cyan dark:text-gray-950'
                      : 'bg-slate-100 text-slate-600 dark:bg-gray-950 dark:text-gray-300'
                  }`}
                >
                  {blocker}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/25">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
              Tiny step plan
            </p>
            <ol className="mt-3 space-y-2">
              {adhdTaskSteps.map((step, index) => (
                <li
                  key={`${step}-${index}`}
                  className="flex gap-3 rounded-2xl bg-white/80 p-3 text-sm font-bold text-slate-700 dark:bg-gray-950/70 dark:text-gray-200"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-200 text-xs font-black text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="rounded-2xl border border-adapt-indigo/15 bg-adapt-indigo/5 p-4 dark:border-adapt-cyan/20 dark:bg-adapt-cyan/10">
            <p className="text-xs font-black uppercase tracking-wide text-adapt-indigo dark:text-adapt-cyan">
              Teacher insight preview
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-gray-200">
              {supportPreview}
            </p>
          </section>
        </div>
      );
    }

    if (activity.id === 'adhd-break-prescription') {
      const teacherInsight = `State: ${selectedAdhdBreak.label}. Break: ${selectedAdhdBreak.breakType}. Return: ${selectedAdhdBreak.returnStep}`;

      return (
        <div className="space-y-4">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/25">
            <p className="text-xs font-black uppercase tracking-wide text-amber-700 dark:text-amber-200">
              Current state
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {ADHD_BREAK_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setAdhdBreakState(option.id)}
                  className={`rounded-2xl border-2 p-3 text-left transition ${
                    adhdBreakState === option.id
                      ? 'border-amber-400 bg-white text-amber-900 shadow-sm dark:bg-gray-950 dark:text-amber-100'
                      : 'border-transparent bg-white/70 text-slate-600 dark:bg-gray-900 dark:text-gray-300'
                  }`}
                >
                  <span className="block text-sm font-black">{option.label}</span>
                  <span className="mt-1 block text-xs font-bold">{option.breakType}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/25">
              <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
                60-second break
              </p>
              <p className="mt-3 text-sm font-bold leading-6 text-emerald-900 dark:text-emerald-100">
                {selectedAdhdBreak.plan}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">
                Return step
              </p>
              <p className="mt-3 text-sm font-bold leading-6 text-adapt-navy dark:text-gray-100">
                {selectedAdhdBreak.returnStep}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-adapt-indigo/15 bg-adapt-indigo/5 p-4 dark:border-adapt-cyan/20 dark:bg-adapt-cyan/10">
            <p className="text-xs font-black uppercase tracking-wide text-adapt-indigo dark:text-adapt-cyan">
              Teacher insight preview
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-gray-200">
              {teacherInsight}
            </p>
          </section>
        </div>
      );
    }

    if (activity.id === 'adhd-movement-burst') {
      return (
        <AdhdMovementBurstActivity
          onComplete={(signal) => onComplete({ adhdSupportSignal: signal })}
        />
      );
    }

    if (activity.id === 'adhd-quest-chain') {
      return (
        <AdhdQuestChainActivity
          onComplete={(badge) => onComplete({ achievementBadge: badge })}
        />
      );
    }

    if (activity.id === 'adhd-mood-check') {
      return (
        <AdhdEnergyCheckInActivity
          onComplete={(pacing, signal) => onComplete({
            adhdEnergyPacing: pacing,
            adhdSupportSignal: signal,
          })}
        />
      );
    }

    if (activity.id === 'dyslexia-read-aloud') {
      return (
        <DyslexiaReadAloudActivity
          onComplete={(session) => onComplete({ dyslexiaReadingSession: session })}
        />
      );
    }

    if (activity.id === 'dyslexia-overlay-read') {
      return (
        <DyslexiaOverlayReaderActivity
          onComplete={(session, preferences) => onComplete({
            dyslexiaReadingSession: session,
            dyslexiaReaderPreferences: preferences,
          })}
        />
      );
    }

    if (activity.id === 'dyslexia-phonics-trace') {
      return (
        <DyslexiaPhonicsTraceActivity
          onComplete={(session) => onComplete({ dyslexiaPhonicsSession: session })}
        />
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
  }, [activity.id, adhdBreakState, adhdEnergy, adhdRescue, adhdStep, adhdTaskBlocker, adhdTaskSteps, adhdTaskText, dayCards, moveDayCard, onComplete, patternAnswer, selectedAdhdBreak, selectedAdhdEnergy, selectedFeeling, storyScenario]);

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

          {!['adhd-movement-burst', 'adhd-quest-chain', 'adhd-mood-check', 'dyslexia-read-aloud', 'dyslexia-overlay-read', 'dyslexia-phonics-trace'].includes(activity.id) ? (
            <button
              type="button"
              onClick={handleCompleteClick}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-adapt-teal py-3.5 font-bold text-white shadow-md transition hover:scale-[1.02]"
            >
              <Check className="h-5 w-5" aria-hidden />
              Mark Complete
              <Star className="h-4 w-4 fill-amber-300 text-amber-300" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ActivitySessionModal;
