import React, { useMemo, useState } from 'react';
import { Check, Eye, Hand, Move, Volume2, type LucideIcon } from 'lucide-react';
import type {
  SensoryArea,
  SensoryComfortChoice,
  SensoryComfortSessionInput,
} from 'features/child/store/childProgressStore';

interface SensoryComfortCheckInActivityProps {
  onComplete: (session: SensoryComfortSessionInput) => void;
}

interface SensoryAreaOption {
  id: SensoryArea;
  label: string;
  prompt: string;
  icon: LucideIcon;
}

interface SupportChoice {
  id: string;
  label: string;
  tip: string;
  areas: SensoryArea[];
}

const AREAS: SensoryAreaOption[] = [
  { id: 'sight', label: 'Light and things I see', prompt: 'How do the light and things around you feel?', icon: Eye },
  { id: 'sound', label: 'Sounds', prompt: 'How do the sounds around you feel?', icon: Volume2 },
  { id: 'touch', label: 'Touch and textures', prompt: 'How do clothes, seats, or things touching you feel?', icon: Hand },
  { id: 'movement', label: 'Movement', prompt: 'How does your body feel about moving or being still?', icon: Move },
];

const COMFORT_OPTIONS: Array<{ id: SensoryComfortChoice; label: string }> = [
  { id: 'comfortable', label: 'Comfortable' },
  { id: 'a-bit-much', label: 'A bit much' },
  { id: 'need-change', label: 'I want a change' },
];

const SUPPORT_CHOICES: SupportChoice[] = [
  {
    id: 'soften-light',
    label: 'Softer light or less to look at',
    tip: 'Turn down a light, use a calmer screen, or look at one thing at a time.',
    areas: ['sight'],
  },
  {
    id: 'quieter-space',
    label: 'A quieter sound space',
    tip: 'Lower the sound, move somewhere quieter, or use a comfortable sound tool if one is allowed.',
    areas: ['sound'],
  },
  {
    id: 'touch-choice',
    label: 'Change a texture or touch',
    tip: 'Move an uncomfortable item, choose a comfortable texture, or keep your hands free.',
    areas: ['touch'],
  },
  {
    id: 'movement-choice',
    label: 'Move or be still for a moment',
    tip: 'Choose a gentle stretch, a short walk, a seated movement, or a quiet still moment.',
    areas: ['movement'],
  },
  {
    id: 'keep-going',
    label: 'Keep things as they are',
    tip: 'Your current space feels workable. You can check again whenever you want.',
    areas: ['sight', 'sound', 'touch', 'movement'],
  },
];

const CONFIDENCE_OPTIONS: Array<{
  id: SensoryComfortSessionInput['confidence'];
  label: string;
}> = [
  { id: 'ready-to-continue', label: 'Ready to continue' },
  { id: 'need-more-time', label: 'I need more time' },
  { id: 'ask-for-help', label: 'I want help choosing' },
];

const createSessionId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `sensory-comfort-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const SensoryComfortCheckInActivity: React.FC<SensoryComfortCheckInActivityProps> = ({
  onComplete,
}) => {
  const [sessionId] = useState(createSessionId);
  const [selections, setSelections] = useState<Partial<Record<SensoryArea, SensoryComfortChoice>>>({});
  const [supportChoiceId, setSupportChoiceId] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<SensoryComfortSessionInput['confidence'] | null>(null);

  const completedAreas = Object.keys(selections).length;
  const suggestedArea = useMemo(() => (
    AREAS.find((area) => selections[area.id] === 'need-change')?.id
      ?? AREAS.find((area) => selections[area.id] === 'a-bit-much')?.id
      ?? null
  ), [selections]);
  const orderedSupports = useMemo(() => {
    if (!suggestedArea) return SUPPORT_CHOICES;
    return [...SUPPORT_CHOICES].sort((left, right) => (
      Number(right.areas.includes(suggestedArea)) - Number(left.areas.includes(suggestedArea))
    ));
  }, [suggestedArea]);
  const selectedSupport = SUPPORT_CHOICES.find((choice) => choice.id === supportChoiceId) ?? null;
  const canSave = completedAreas === AREAS.length && selectedSupport !== null && confidence !== null;

  const chooseComfort = (area: SensoryArea, comfort: SensoryComfortChoice) => {
    setSelections((current) => ({ ...current, [area]: comfort }));
    setSupportChoiceId(null);
    setConfidence(null);
  };

  const saveCheckIn = () => {
    if (!canSave || !selectedSupport || !confidence) return;

    onComplete({
      sessionId,
      activityId: 'spd-sensory-checklist',
      selections: AREAS.map((area) => ({
        area: area.id,
        comfort: selections[area.id] as SensoryComfortChoice,
      })),
      supportChoiceId: selectedSupport.id,
      supportChoiceLabel: selectedSupport.label,
      supportsUsed: ['sensory choice cards', 'child-chosen comfort support'],
      confidence,
    });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-pink-200 bg-pink-50 p-4 dark:border-pink-900/50 dark:bg-pink-950/20 sm:p-5">
        <p className="text-xs font-black uppercase tracking-wide text-pink-700 dark:text-pink-200">
          Your comfort, your choice
        </p>
        <h3 className="mt-1 text-lg font-black text-adapt-navy dark:text-gray-100">
          Notice four parts of your space
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-gray-300">
          There are no right answers and no score. Choose what feels closest right now. This is a comfort check-in, not a test.
        </p>
        <p className="mt-2 text-sm font-bold text-pink-800 dark:text-pink-100" aria-live="polite">
          {completedAreas} of {AREAS.length} choices made
        </p>
      </section>

      <div className="space-y-4">
        {AREAS.map((area) => {
          const Icon = area.icon;
          return (
            <fieldset key={area.id} className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
              <legend className="px-1 text-base font-black text-adapt-navy dark:text-gray-100">
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-5 w-5 text-pink-600" aria-hidden />
                  {area.label}
                </span>
              </legend>
              <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">{area.prompt}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {COMFORT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => chooseComfort(area.id, option.id)}
                    aria-pressed={selections[area.id] === option.id}
                    className={`min-h-12 rounded-2xl border-2 px-3 py-3 text-sm font-black transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-300 ${
                      selections[area.id] === option.id
                        ? 'border-pink-500 bg-pink-100 text-pink-900 dark:bg-pink-950/50 dark:text-pink-100'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-pink-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>
          );
        })}
      </div>

      {completedAreas === AREAS.length ? (
        <section className="rounded-3xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900/50 dark:bg-violet-950/20 sm:p-5">
          <h3 className="text-lg font-black text-adapt-navy dark:text-gray-100">Choose one support to try</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-gray-300">
            These are choices, not instructions. Pick the one that feels useful, or keep things as they are.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {orderedSupports.map((choice, index) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => {
                  setSupportChoiceId(choice.id);
                  setConfidence(null);
                }}
                aria-pressed={supportChoiceId === choice.id}
                className={`min-h-16 rounded-2xl border-2 p-4 text-left transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 ${
                  supportChoiceId === choice.id
                    ? 'border-violet-500 bg-white text-violet-950 shadow-sm dark:bg-gray-950 dark:text-violet-100'
                    : 'border-transparent bg-white/80 text-slate-700 dark:bg-gray-900 dark:text-gray-200'
                }`}
              >
                <span className="font-black">{choice.label}</span>
                {suggestedArea && index === 0 && choice.areas.includes(suggestedArea) ? (
                  <span className="ml-2 rounded-full bg-violet-100 px-2 py-1 text-xs font-black text-violet-800 dark:bg-violet-900 dark:text-violet-100">
                    You could try this
                  </span>
                ) : null}
                <span className="mt-1 block text-sm font-medium leading-5 text-slate-600 dark:text-gray-300">
                  {choice.tip}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {selectedSupport ? (
        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:p-5">
          <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-200">Your chosen support</p>
          <p className="mt-2 text-base font-black text-adapt-navy dark:text-gray-100">{selectedSupport.label}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-gray-300">{selectedSupport.tip}</p>

          <fieldset className="mt-4">
            <legend className="text-sm font-black text-adapt-navy dark:text-gray-100">What would help next?</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {CONFIDENCE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setConfidence(option.id)}
                  aria-pressed={confidence === option.id}
                  className={`min-h-12 rounded-2xl border-2 px-3 py-3 text-sm font-black focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 ${
                    confidence === option.id
                      ? 'border-emerald-500 bg-white text-emerald-900 dark:bg-gray-950 dark:text-emerald-100'
                      : 'border-emerald-100 bg-white/70 text-slate-700 dark:border-emerald-900/40 dark:bg-gray-900 dark:text-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          {confidence === 'ask-for-help' ? (
            <p className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              Please tell or show this choice to a trusted adult nearby. Saving this check-in does not send them a message.
            </p>
          ) : null}
        </section>
      ) : null}

      <button
        type="button"
        onClick={saveCheckIn}
        disabled={!canSave}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-5 py-3 font-black text-white shadow-md transition motion-reduce:transition-none hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-pink-300"
      >
        <Check className="h-5 w-5" aria-hidden />
        Save my comfort choice
      </button>
    </div>
  );
};

export default SensoryComfortCheckInActivity;
