import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Heart, Loader2, Sparkles, Users, X } from 'lucide-react';
import {
  CALM_STRATEGY_OPTIONS,
  COMMUNICATION_DIFFICULTIES,
  EXECUTIVE_OPTIONS,
  GOAL_OPTIONS,
  LEARNING_ONBOARDING,
  ONBOARDING_STEPS,
  PARENT_COPILOT_MAX_AGE,
  SENSORY_ONBOARDING,
  buildAutismProfileFromOnboarding,
  emptyOnboardingAnswers,
} from 'features/child/constants/companionOnboarding';
import type { CompanionOnboardingAnswers } from 'features/child/types/companionOnboarding';
import type { CalmingTool, LearningFormat, SensorySensitivity } from 'features/child/types/autismProfile';
import { useAutismProfileStore } from 'features/child/store/autismProfileStore';
import { useAuth } from 'hooks/useAuth';
import { ROUTES } from 'constants/routes';
import { completeCompanionOnboarding } from 'services/supabase/profileService';
import { saveAutismProfile } from 'services/supabase/autismProfileService';
import AuthBackground, { AuthLogo } from 'pages/auth/AuthBackground';

const chipClass = (selected: boolean) =>
  `rounded-2xl border-2 px-4 py-3 text-left text-sm font-semibold transition ${
    selected
      ? 'border-adapt-indigo bg-adapt-indigo/10 text-adapt-navy dark:border-adapt-cyan dark:bg-adapt-cyan/10 dark:text-adapt-cyan'
      : 'border-white/60 bg-white/50 text-slate-600 hover:border-adapt-indigo/40 dark:border-white/10 dark:bg-gray-800/40 dark:text-gray-300'
  }`;

const CompanionOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user, isGuest, setProfile } = useAuth();
  const updateAutismProfile = useAutismProfileStore((s) => s.updateProfile);

  useEffect(() => {
    if (!profile) return;
    if (profile.companion_onboarding_completed) {
      navigate(ROUTES.CHILD_DASHBOARD, { replace: true });
      return;
    }
    if (profile.neuro_types.length === 0) {
      navigate(ROUTES.NEURO_SELECTOR, { replace: true });
    }
  }, [profile, navigate]);

  const childAge = profile?.age ?? null;
  const needsParentCopilot = childAge != null && childAge <= PARENT_COPILOT_MAX_AGE;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<CompanionOnboardingAnswers>(() =>
    emptyOnboardingAnswers(profile?.first_name || ''),
  );
  const [tagInput, setTagInput] = useState('');
  const [happyInput, setHappyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currentStep = ONBOARDING_STEPS[step];
  const progress = ((step + 1) / ONBOARDING_STEPS.length) * 100;

  const set = <K extends keyof CompanionOnboardingAnswers>(key: K, value: CompanionOnboardingAnswers[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const toggleList = (key: keyof CompanionOnboardingAnswers, value: string) => {
    setAnswers((prev) => {
      const list = prev[key] as string[];
      const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
      return { ...prev, [key]: next };
    });
  };

  const addTag = (field: 'favouriteThings' | 'happyTriggers', value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setAnswers((prev) => ({
      ...prev,
      [field]: prev[field].includes(trimmed) ? prev[field] : [...prev[field], trimmed],
    }));
  };

  const removeTag = (field: 'favouriteThings' | 'happyTriggers', value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [field]: prev[field].filter((item) => item !== value),
    }));
  };

  const canContinue = useMemo(() => {
    switch (currentStep.id) {
      case 'about':
        return answers.preferredName.trim().length > 0;
      case 'goals':
        return answers.goals.length > 0;
      default:
        return true;
    }
  }, [currentStep.id, answers]);

  const finishOnboarding = async () => {
    setSaving(true);
    setError('');

    const childId = user?.id ?? profile?.id ?? 'guest-child';
    const autismProfile = buildAutismProfileFromOnboarding(childId, {
      ...answers,
      onboardedWithParent: needsParentCopilot,
    });

    updateAutismProfile(autismProfile);

    if (isGuest && profile) {
      setProfile({
        ...profile,
        neuro_types: profile.neuro_types.length > 0 ? profile.neuro_types : ['autism'],
        onboarding_completed: true,
        companion_onboarding_completed: true,
        updated_at: new Date().toISOString(),
      });
      navigate(ROUTES.CHILD_DASHBOARD, {
        replace: true,
        state: { message: 'AdaptBuddy understands you now. Welcome!' },
      });
      setSaving(false);
      return;
    }

    if (!user?.id) {
      setError('Please sign in to continue.');
      setSaving(false);
      return;
    }

    try {
      await saveAutismProfile(user.id, autismProfile);
      const updated = await completeCompanionOnboarding(user.id, profile);
      setProfile(updated);
      navigate(ROUTES.CHILD_DASHBOARD, {
        replace: true,
        state: { message: 'AdaptBuddy understands you now. Welcome!' },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    void finishOnboarding();
  };

  const renderStep = () => {
    switch (currentStep.id) {
      case 'about':
        return (
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-adapt-navy dark:text-gray-200">
                What should AdaptBuddy call you?
              </span>
              <input
                value={answers.preferredName}
                onChange={(e) => set('preferredName', e.target.value)}
                placeholder="e.g. Alex"
                className="w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 text-adapt-navy outline-none focus:border-adapt-indigo dark:border-white/10 dark:bg-gray-800/60 dark:text-gray-100"
              />
            </label>
            <div>
              <span className="mb-2 block text-sm font-semibold text-adapt-navy dark:text-gray-200">
                What are your favourite things?
              </span>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag('favouriteThings', tagInput);
                      setTagInput('');
                    }
                  }}
                  placeholder="Dinosaurs, trains, art…"
                  className="flex-1 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-gray-800/60 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    addTag('favouriteThings', tagInput);
                    setTagInput('');
                  }}
                  className="rounded-2xl bg-adapt-indigo px-4 py-3 text-sm font-semibold text-white"
                >
                  Add
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {answers.favouriteThings.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-full bg-adapt-indigo/10 py-1 pl-3 pr-1.5 text-xs font-semibold text-adapt-indigo"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeTag('favouriteThings', item)}
                      className="rounded-full p-0.5 transition hover:bg-adapt-indigo/20"
                      aria-label={`Remove ${item}`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-2 block text-sm font-semibold text-adapt-navy dark:text-gray-200">
                What makes you happy?
              </span>
              <div className="flex gap-2">
                <input
                  value={happyInput}
                  onChange={(e) => setHappyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag('happyTriggers', happyInput);
                      setHappyInput('');
                    }
                  }}
                  placeholder="Music, drawing, playing outside…"
                  className="flex-1 rounded-2xl border border-white/60 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-gray-800/60 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => {
                    addTag('happyTriggers', happyInput);
                    setHappyInput('');
                  }}
                  className="rounded-2xl bg-adapt-indigo px-4 py-3 text-sm font-semibold text-white"
                >
                  Add
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {answers.happyTriggers.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1 rounded-full bg-pink-500/10 py-1 pl-3 pr-1.5 text-xs font-semibold text-pink-600 dark:text-pink-300"
                  >
                    {item}
                    <button
                      type="button"
                      onClick={() => removeTag('happyTriggers', item)}
                      className="rounded-full p-0.5 transition hover:bg-pink-500/20"
                      aria-label={`Remove ${item}`}
                    >
                      <X className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        );

      case 'learning':
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            {LEARNING_ONBOARDING.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  const current = answers.learningFormats;
                  const next = current.includes(opt.id)
                    ? current.filter((v) => v !== opt.id)
                    : [...current, opt.id];
                  set('learningFormats', next as LearningFormat[]);
                }}
                className={chipClass(answers.learningFormats.includes(opt.id))}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );

      case 'communication':
        return (
          <div className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-gray-400">Sometimes I find it hard to…</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {COMMUNICATION_DIFFICULTIES.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggleList('communicationDifficulties', opt.id)}
                  className={chipClass(answers.communicationDifficulties.includes(opt.id))}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );

      case 'sensory':
        return (
          <div className="grid gap-3">
            {SENSORY_ONBOARDING.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  const current = answers.sensorySensitivities;
                  const next = current.includes(opt.id)
                    ? current.filter((v) => v !== opt.id)
                    : [...current, opt.id];
                  set('sensorySensitivities', next as SensorySensitivity[]);
                }}
                className={chipClass(answers.sensorySensitivities.includes(opt.id))}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );

      case 'feelings':
        return (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">I get worried about…</span>
              <input
                value={answers.worryTopics}
                onChange={(e) => set('worryTopics', e.target.value)}
                placeholder="School, new places, loud rooms…"
                className="w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-gray-800/60 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">I get frustrated when…</span>
              <input
                value={answers.frustrationTriggers}
                onChange={(e) => set('frustrationTriggers', e.target.value)}
                placeholder="Plans change, tasks feel too big…"
                className="w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-gray-800/60 dark:text-gray-100"
              />
            </label>
            <div>
              <span className="mb-2 block text-sm font-semibold">I feel calm when…</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {CALM_STRATEGY_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      const current = answers.calmStrategies;
                      const next = current.includes(opt.id)
                        ? current.filter((v) => v !== opt.id)
                        : [...current, opt.id];
                      set('calmStrategies', next as CalmingTool[]);
                    }}
                    className={chipClass(answers.calmStrategies.includes(opt.id))}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">When I need help I usually…</span>
              <input
                value={answers.helpBehaviour}
                onChange={(e) => set('helpBehaviour', e.target.value)}
                placeholder="Ask a parent, take a break, use my calm corner…"
                className="w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-gray-800/60 dark:text-gray-100"
              />
            </label>
          </div>
        );

      case 'executive':
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            {EXECUTIVE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleList('executiveDifficulties', opt.id)}
                className={chipClass(answers.executiveDifficulties.includes(opt.id))}
              >
                {opt.label}
              </button>
            ))}
          </div>
        );

      case 'goals':
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            {GOAL_OPTIONS.map((goal) => (
              <button
                key={goal}
                type="button"
                onClick={() => toggleList('goals', goal)}
                className={chipClass(answers.goals.includes(goal))}
              >
                {goal}
              </button>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AuthBackground variant="signup">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8 sm:px-6">
        <AuthLogo className="mb-6" />

        <div className="flex-1 rounded-3xl border border-white/50 bg-white/60 p-6 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-gray-900/70 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-adapt-indigo/15 text-adapt-indigo dark:bg-adapt-cyan/15 dark:text-adapt-cyan">
              <Sparkles className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-adapt-indigo dark:text-adapt-cyan">
                Step {step + 1} of {ONBOARDING_STEPS.length}
              </p>
              <h1 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100 sm:text-2xl">
                {currentStep.title}
              </h1>
              <p className="text-sm text-slate-600 dark:text-gray-400">{currentStep.subtitle}</p>
            </div>
          </div>

          <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/70 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-adapt-indigo to-adapt-purple transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {needsParentCopilot && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 dark:border-amber-500/20 dark:bg-amber-950/30">
              <Users className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">Parent co-pilot mode</p>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90">
                  A parent or trusted adult can help answer these questions together.
                </p>
              </div>
            </div>
          )}

          <div className="mb-8 min-h-[220px]">{renderStep()}</div>

          {error && (
            <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              disabled={step === 0 || saving}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/60 px-5 py-3 text-sm font-semibold text-slate-600 disabled:opacity-40 dark:border-white/10 dark:text-gray-300"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back
            </button>
            <button
              type="button"
              disabled={!canContinue || saving}
              onClick={handleNext}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-adapt-indigo px-5 py-3 text-sm font-semibold text-white hover:bg-adapt-purple disabled:opacity-50 dark:bg-adapt-cyan dark:text-gray-900"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {step === ONBOARDING_STEPS.length - 1 ? (
                <>
                  <Heart className="h-4 w-4" aria-hidden />
                  Meet AdaptBuddy
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
};

export default CompanionOnboardingPage;
