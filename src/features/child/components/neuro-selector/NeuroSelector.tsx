import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  Heart,
  Loader2,
  Sparkles,
  Star,
  Wand2,
} from 'lucide-react';
import { NEURO_OPTIONS, ACTIVE_NEURO_IDS } from 'constants/neuroOptions';
import { useUiStore } from 'store/uiStore';
import adaptbuddyLogo from 'assets/Adaptbuddy_logo.png';
import './neuro-selector.css';

interface NeuroSelectorProps {
  initialSelected?: string[];
  userName?: string;
  onContinue: (selected: string[]) => void | Promise<void>;
  submitLabel?: string;
  saving?: boolean;
}

const CARD_ACCENTS: Record<
  string,
  { ring: string; border: string; surface: string; icon: string; chip: string; glow: string }
> = {
  autism: {
    ring: 'ring-sky-400/50',
    border: 'border-sky-300/80',
    surface: 'from-sky-50/95 via-white/90 to-indigo-50/80 dark:from-sky-950/35 dark:via-gray-900/85 dark:to-indigo-950/30',
    icon: 'from-sky-400 to-indigo-500',
    chip: 'bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200',
    glow: 'shadow-[0_8px_32px_-8px_rgba(56,189,248,0.45)]',
  },
  adhd: {
    ring: 'ring-amber-400/50',
    border: 'border-amber-300/80',
    surface: 'from-amber-50/95 via-white/90 to-orange-50/80 dark:from-amber-950/35 dark:via-gray-900/85 dark:to-orange-950/30',
    icon: 'from-amber-400 to-orange-500',
    chip: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200',
    glow: 'shadow-[0_8px_32px_-8px_rgba(251,191,36,0.45)]',
  },
  dyslexia: {
    ring: 'ring-violet-400/50',
    border: 'border-violet-300/80',
    surface: 'from-violet-50/95 via-white/90 to-purple-50/80 dark:from-violet-950/35 dark:via-gray-900/85 dark:to-purple-950/30',
    icon: 'from-violet-400 to-purple-500',
    chip: 'bg-violet-100 text-violet-900 dark:bg-violet-950/60 dark:text-violet-200',
    glow: 'shadow-[0_8px_32px_-8px_rgba(167,139,250,0.45)]',
  },
  dysgraphia: {
    ring: 'ring-emerald-400/50',
    border: 'border-emerald-300/80',
    surface: 'from-emerald-50/95 via-white/90 to-teal-50/80 dark:from-emerald-950/35 dark:via-gray-900/85 dark:to-teal-950/30',
    icon: 'from-emerald-400 to-teal-500',
    chip: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200',
    glow: 'shadow-[0_8px_32px_-8px_rgba(52,211,153,0.45)]',
  },
  dyscalculia: {
    ring: 'ring-rose-400/50',
    border: 'border-rose-300/80',
    surface: 'from-rose-50/95 via-white/90 to-red-50/80 dark:from-rose-950/35 dark:via-gray-900/85 dark:to-red-950/30',
    icon: 'from-rose-400 to-red-500',
    chip: 'bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200',
    glow: 'shadow-[0_8px_32px_-8px_rgba(251,113,133,0.45)]',
  },
  dyspraxia: {
    ring: 'ring-teal-400/50',
    border: 'border-teal-300/80',
    surface: 'from-teal-50/95 via-white/90 to-cyan-50/80 dark:from-teal-950/35 dark:via-gray-900/85 dark:to-cyan-950/30',
    icon: 'from-teal-400 to-cyan-500',
    chip: 'bg-teal-100 text-teal-900 dark:bg-teal-950/60 dark:text-teal-200',
    glow: 'shadow-[0_8px_32px_-8px_rgba(45,212,191,0.45)]',
  },
  tourettes: {
    ring: 'ring-purple-400/50',
    border: 'border-purple-300/80',
    surface: 'from-purple-50/95 via-white/90 to-violet-50/80 dark:from-purple-950/35 dark:via-gray-900/85 dark:to-violet-950/30',
    icon: 'from-purple-400 to-violet-600',
    chip: 'bg-purple-100 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200',
    glow: 'shadow-[0_8px_32px_-8px_rgba(192,132,252,0.45)]',
  },
  'speech-language': {
    ring: 'ring-cyan-400/50',
    border: 'border-cyan-300/80',
    surface: 'from-cyan-50/95 via-white/90 to-blue-50/80 dark:from-cyan-950/35 dark:via-gray-900/85 dark:to-blue-950/30',
    icon: 'from-cyan-400 to-blue-500',
    chip: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-950/60 dark:text-cyan-200',
    glow: 'shadow-[0_8px_32px_-8px_rgba(34,211,238,0.45)]',
  },
  auditory: {
    ring: 'ring-indigo-400/50',
    border: 'border-indigo-300/80',
    surface: 'from-indigo-50/95 via-white/90 to-blue-50/80 dark:from-indigo-950/35 dark:via-gray-900/85 dark:to-blue-950/30',
    icon: 'from-indigo-400 to-blue-500',
    chip: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200',
    glow: 'shadow-[0_8px_32px_-8px_rgba(129,140,248,0.45)]',
  },
  spd: {
    ring: 'ring-pink-400/50',
    border: 'border-pink-300/80',
    surface: 'from-pink-50/95 via-white/90 to-fuchsia-50/80 dark:from-pink-950/35 dark:via-gray-900/85 dark:to-fuchsia-950/30',
    icon: 'from-pink-400 to-fuchsia-500',
    chip: 'bg-pink-100 text-pink-900 dark:bg-pink-950/60 dark:text-pink-200',
    glow: 'shadow-[0_8px_32px_-8px_rgba(244,114,182,0.45)]',
  },
  'visual-stress': {
    ring: 'ring-yellow-400/50',
    border: 'border-yellow-300/80',
    surface: 'from-yellow-50/95 via-white/90 to-amber-50/80 dark:from-yellow-950/35 dark:via-gray-900/85 dark:to-amber-950/30',
    icon: 'from-yellow-300 to-amber-500',
    chip: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950/60 dark:text-yellow-200',
    glow: 'shadow-[0_8px_32px_-8px_rgba(250,204,21,0.4)]',
  },
  'executive-function': {
    ring: 'ring-slate-400/50',
    border: 'border-slate-300/80',
    surface: 'from-slate-50/95 via-white/90 to-gray-100/80 dark:from-slate-900/70 dark:via-gray-900/85 dark:to-gray-800/80',
    icon: 'from-slate-500 to-gray-700',
    chip: 'bg-slate-100 text-slate-900 dark:bg-slate-900/80 dark:text-slate-200',
    glow: 'shadow-[0_8px_32px_-8px_rgba(100,116,139,0.45)]',
  },
};

const defaultAccent = CARD_ACCENTS.autism;

const NeuroSelector: React.FC<NeuroSelectorProps> = ({
  initialSelected = [],
  userName = 'friend',
  onContinue,
  submitLabel = 'Create My Calm Space',
  saving = false,
}) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    initialSelected[0] ?? 'autism',
  );
  const reducedMotion = useUiStore((s) => s.reducedMotion);

  const selected = selectedProfileId ? [selectedProfileId] : [];
  const selectedOptions = useMemo(
    () => NEURO_OPTIONS.filter((o) => o.id === selectedProfileId),
    [selectedProfileId],
  );

  const toggleSelection = (id: string) => {
    if (!ACTIVE_NEURO_IDS.has(id)) return;
    setSelectedProfileId((currentId) => (currentId === id ? null : id));
  };

  const availableCount = NEURO_OPTIONS.filter((o) => ACTIVE_NEURO_IDS.has(o.id)).length;

  const encouragement = selectedProfileId
    ? 'Great start. You can continue, or choose a different main support profile.'
    : 'Choose one main support profile to begin. You can refine this later.';

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-adapt-cloud dark:bg-gray-950 sepia:bg-sepia-50">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-violet-100/70 via-adapt-cloud to-teal-100/60 dark:from-indigo-950/50 dark:via-gray-950 dark:to-teal-950/30 sepia:from-amber-50/90 sepia:via-sepia-50 sepia:to-orange-50/50" />
        <div
          className={`neuro-ambient-blob absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl dark:bg-violet-600/20 ${
            reducedMotion ? 'opacity-50' : ''
          }`}
        />
        <div
          className={`neuro-ambient-blob-delayed absolute -right-16 top-1/3 h-80 w-80 rounded-full bg-cyan-300/25 blur-3xl dark:bg-cyan-500/15 ${
            reducedMotion ? 'opacity-50' : ''
          }`}
        />
        <div className="absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-indigo-200/25 blur-3xl dark:bg-indigo-700/15" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.08),transparent_55%)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-36 pt-8 sm:px-6 sm:pt-12">
        <header className="mb-10 text-center animate-slide-up">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/70 shadow-soft ring-1 ring-white/80 backdrop-blur-md dark:bg-gray-900/70 dark:ring-white/10">
            <img src={adaptbuddyLogo} alt="" className="h-11 w-11 object-contain" />
          </div>

          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-adapt-indigo/20 bg-white/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-adapt-indigo backdrop-blur-sm dark:border-adapt-cyan/25 dark:bg-gray-900/60 dark:text-adapt-cyan sepia:border-amber-300/50 sepia:bg-amber-50/80 sepia:text-amber-900">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {availableCount} available · more coming soon
          </p>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-adapt-navy sm:text-4xl md:text-5xl dark:text-gray-100 sepia:text-amber-950">
            Hi {userName},{' '}
            <span className="bg-gradient-to-r from-adapt-purple via-adapt-indigo to-adapt-teal bg-clip-text text-transparent">
              how does your brain like to learn?
            </span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-gray-300 sepia:text-amber-900/80 sm:text-lg">
            We&apos;re starting with Autism support. Choose it to begin — other profiles are on
            the way.
          </p>

          <div className="mx-auto mt-6 flex max-w-md flex-col items-center gap-3">
            <div className="flex w-full items-center gap-3 rounded-2xl border border-white/60 bg-white/50 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-gray-900/50 sepia:border-amber-200/60 sepia:bg-amber-50/70">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-adapt-indigo to-adapt-teal text-sm font-bold text-white shadow-md"
                aria-label={`${selectedProfileId ? 1 : 0} of 1 selected`}
              >
                {selectedProfileId ? 1 : 0}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold text-adapt-navy dark:text-gray-100">
                  {selectedProfileId ? 1 : 0} of 1 picked
                </p>
                <p className="text-xs text-slate-500 dark:text-gray-400">{encouragement}</p>
              </div>
            </div>
          </div>
        </header>

        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-slide-up delay-100"
          role="radiogroup"
          aria-label="Support profile options"
        >
          {NEURO_OPTIONS.map((option) => {
            const isSelected = selectedProfileId === option.id;
            const isAvailable = ACTIVE_NEURO_IDS.has(option.id);
            const accent = CARD_ACCENTS[option.id] ?? defaultAccent;
            const IconComponent = option.icon;

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-disabled={!isAvailable}
                disabled={!isAvailable}
                onClick={() => toggleSelection(option.id)}
                className={`neuro-profile-card group relative flex flex-col overflow-hidden rounded-3xl border-2 bg-gradient-to-br p-5 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-adapt-indigo/30 ${
                  !isAvailable
                    ? `${accent.border} ${accent.surface} cursor-not-allowed opacity-55 grayscale-[0.35]`
                    : isSelected
                      ? `${accent.border} ${accent.surface} ring-4 ${accent.ring} ${accent.glow} ${
                          !reducedMotion ? 'neuro-card-selected' : ''
                        }`
                      : `${accent.border} ${accent.surface} opacity-90 hover:opacity-100 hover:shadow-xl dark:border-opacity-50 sepia:border-amber-200/70 sepia:from-amber-50/90 sepia:via-white/80 sepia:to-orange-50/60`
                }`}
              >
                <span
                  className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${
                    isSelected ? 'opacity-100' : ''
                  }`}
                  aria-hidden
                >
                  <span className="neuro-card-sheen absolute -left-1/2 top-0 h-full w-1/2 rotate-12 bg-white/35 blur-xl" />
                </span>

                {isSelected && isAvailable && (
                  <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md">
                    <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
                  </span>
                )}

                {!isAvailable && (
                  <span className="absolute right-3 top-3 rounded-full bg-slate-800/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-gray-950/90">
                    Coming soon
                  </span>
                )}

                <div className="mb-4 flex items-start gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${accent.icon} text-white shadow-md transition-transform duration-300 group-hover:scale-105`}
                  >
                    {IconComponent && <IconComponent className="h-7 w-7" aria-hidden />}
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-lg font-bold leading-tight text-adapt-navy dark:text-gray-100">
                      {option.name}
                    </p>
                    <span
                      className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${accent.chip}`}
                    >
                      {option.learningStyle}
                    </span>
                  </div>
                </div>

                <p className="text-sm leading-relaxed text-slate-600 dark:text-gray-300">
                  {option.description}
                </p>

                {(isSelected || option.longDescription) && (
                  <p
                    className={`mt-3 text-xs leading-relaxed ${
                      isSelected
                        ? 'text-adapt-indigo/90 dark:text-adapt-cyan/90'
                        : 'text-slate-400 dark:text-gray-500'
                    }`}
                  >
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Star className="h-3 w-3 fill-current" aria-hidden />
                        Selected as your starting profile
                      </span>
                    ) : (
                      option.longDescription
                    )}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        <section
          className="mt-10 animate-slide-up delay-200 rounded-4xl border border-white/60 bg-white/50 p-6 backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/45 sepia:border-amber-200/55 sepia:bg-amber-50/55"
          aria-live="polite"
        >
          <div className="mb-4 flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
            <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">
              Your learning profile
            </h2>
          </div>

          {selectedOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedOptions.map((o) => {
                const accent = CARD_ACCENTS[o.id] ?? defaultAccent;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => toggleSelection(o.id)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition hover:opacity-80 ${accent.chip}`}
                    aria-label={`Remove ${o.name}`}
                  >
                    {o.name}
                    <span className="text-xs opacity-60">x</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-gray-400">
              <Heart className="h-4 w-4 text-pink-400" aria-hidden />
              Your chosen profile will appear here.
            </p>
          )}
        </section>

        <p className="mt-8 text-center text-xs text-slate-400 dark:text-gray-500">
          Private & safe · Built for every brain · You can change this anytime in Settings
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/50 bg-white/75 px-4 py-4 backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/85 sepia:border-amber-200/50 sepia:bg-amber-50/90">
        <div className="mx-auto flex max-w-3xl flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-adapt-navy dark:text-gray-100">
              {selectedProfileId ? 'Ready when you are' : 'Pick one profile to continue'}
            </p>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              We&apos;ll save this starting profile to your account
            </p>
          </div>

          <button
            type="button"
            onClick={() => void onContinue(selected)}
            disabled={!selectedProfileId || saving}
            className="neuro-cta-shimmer inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-adapt-indigo via-adapt-purple to-adapt-teal px-8 py-4 text-base font-bold text-white shadow-[0_8px_32px_-8px_rgba(99,102,241,0.55)] transition hover:scale-[1.02] hover:shadow-[0_12px_40px_-8px_rgba(99,102,241,0.65)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                Creating your space...
              </>
            ) : (
              <>
                {submitLabel}
                <ArrowRight className="h-5 w-5" aria-hidden />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NeuroSelector;
