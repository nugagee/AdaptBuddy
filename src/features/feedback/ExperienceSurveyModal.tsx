import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HeartHandshake,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import { ProductFeedbackService } from 'services/supabase/productFeedbackService';
import { getClientEnvironmentSnapshot, getVisitorKey } from 'services/analytics/activityTracker';
import {
  EXPERIENCE_SURVEY_SOURCE,
  averageComfortScore,
  buildSubmitterSnapshot,
  buildSurveyFeedbackText,
  markSurveySubmitted,
  surveyFeaturesForRole,
  surveyStorageId,
  type ExperienceSurveyAnswers,
  type SurveyFeatureKey,
} from 'features/feedback/experienceSurvey';
import './experienceSurvey.css';

interface ExperienceSurveyModalProps {
  open: boolean;
  onClose: (reason: 'submitted' | 'snoozed' | 'dismissed') => void;
}

const SCORE_LABELS = ['Hard', 'A bit hard', 'Okay', 'Good', 'Great'] as const;
const SCORE_EMOJIS = ['😟', '😕', '😐', '🙂', '😊'] as const;

type StepId = 'welcome' | 'comfort' | 'overall' | 'improve' | 'wish' | 'details' | 'success';

const ExperienceSurveyModal: React.FC<ExperienceSurveyModalProps> = ({ open, onClose }) => {
  const { profile, isGuest } = useAuth();
  const role = profile?.role === 'child' || profile?.role === 'teacher' || profile?.role === 'parent'
    ? profile.role
    : 'parent';
  const isChild = role === 'child';
  const features = useMemo(() => surveyFeaturesForRole(role), [role]);
  const visitorKey = useMemo(() => getVisitorKey(), []);

  const [step, setStep] = useState<StepId>('welcome');
  const [featureIndex, setFeatureIndex] = useState(0);
  const [comfortScores, setComfortScores] = useState<Partial<Record<SurveyFeatureKey, number>>>({});
  const [experienceRating, setExperienceRating] = useState<number | null>(null);
  const [improvements, setImprovements] = useState('');
  const [wishedFeatures, setWishedFeatures] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !profile) return;
    setStep('welcome');
    setFeatureIndex(0);
    setComfortScores({});
    setExperienceRating(null);
    setImprovements('');
    setWishedFeatures('');
    setContactName(isGuest ? '' : profile.full_name || '');
    setContactEmail(isGuest ? '' : profile.email || '');
    setSubmitting(false);
    setError('');
  }, [open, profile, isGuest]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && step !== 'success') onClose('dismissed');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose, step]);

  if (!open || !profile) return null;

  const totalProgressSteps = features.length + 5; // welcome + features + overall + improve + wish + details
  const currentProgress = (() => {
    if (step === 'welcome') return 1;
    if (step === 'comfort') return 2 + featureIndex;
    if (step === 'overall') return 2 + features.length;
    if (step === 'improve') return 3 + features.length;
    if (step === 'wish') return 4 + features.length;
    if (step === 'details') return 5 + features.length;
    return totalProgressSteps;
  })();

  const currentFeature = features[featureIndex];
  const currentFeatureScore = currentFeature ? comfortScores[currentFeature.key] ?? null : null;

  const titleCopy = isChild
    ? {
        welcomeTitle: 'A gentle check-in',
        welcomeBody: 'We would love to know how AdaptBuddy feels for you. There are no wrong answers. You can skip anytime.',
        overallTitle: 'How does AdaptBuddy feel overall?',
        improveTitle: 'What would make things nicer?',
        wishTitle: 'What would you like next?',
        improvePlaceholder: 'Maybe bigger buttons, calmer colours, more help with reading…',
        wishPlaceholder: 'A new game, more calm tools, easier classroom…',
        successTitle: 'Thank you for sharing',
        successBody: 'Your ideas help us make AdaptBuddy kinder and clearer for every buddy.',
      }
    : {
        welcomeTitle: 'Shape AdaptBuddy with us',
        welcomeBody: 'A short, calm survey about comfort with key features, your experience, and what you want improved next.',
        overallTitle: 'How would you rate your overall experience?',
        improveTitle: 'What should we improve?',
        wishTitle: 'What features would you like to see?',
        improvePlaceholder: 'Navigation, language load, classroom flow, reporting…',
        wishPlaceholder: 'Expected features, integrations, or support tools…',
        successTitle: 'Thank you — we heard you',
        successBody: 'Your feedback helps us prioritise clearer, calmer, more inclusive experiences.',
      };

  const goNextFromComfort = () => {
    if (!currentFeature || !currentFeatureScore) return;
    if (featureIndex < features.length - 1) {
      setFeatureIndex((index) => index + 1);
      return;
    }
    setStep('overall');
  };

  const submit = async () => {
    if (!experienceRating) {
      setError(isChild ? 'Please choose how it feels overall.' : 'Please choose an overall rating.');
      return;
    }

    const completeComfort = features.reduce<Record<SurveyFeatureKey, number>>((acc, feature) => {
      acc[feature.key] = comfortScores[feature.key] ?? experienceRating;
      return acc;
    }, {} as Record<SurveyFeatureKey, number>);

    const answers: ExperienceSurveyAnswers = {
      comfortScores: completeComfort,
      experienceRating,
      improvements,
      wishedFeatures,
    };

    setSubmitting(true);
    setError('');
    try {
      const env = getClientEnvironmentSnapshot();
      const submitter = buildSubmitterSnapshot(profile, isGuest, visitorKey, {
        contactName,
        contactEmail,
        path: typeof env.path === 'string' ? env.path : window.location.pathname,
      });
      const feedbackText = buildSurveyFeedbackText(answers, role);
      const avgComfort = averageComfortScore(answers);
      await ProductFeedbackService.submitFeedback(profile, {
        sourceArea: EXPERIENCE_SURVEY_SOURCE,
        feedbackType: experienceRating >= 4 ? 'delight' : experienceRating <= 2 ? 'confusing' : 'idea',
        rating: experienceRating,
        feedbackText,
        isGuest,
        visitorKey: submitter.visitorKey,
        submitterName: submitter.submitterName,
        submitterEmail: submitter.submitterEmail,
        buddyId: submitter.buddyId,
        path: submitter.path,
        metadata: {
          kind: 'experience_survey',
          comfortScores: completeComfort,
          averageComfort: avgComfort,
          experienceRating,
          improvements: improvements.trim(),
          wishedFeatures: wishedFeatures.trim(),
          role,
          isGuest,
          visitorKey: submitter.visitorKey,
          submitter: {
            name: submitter.submitterName,
            email: submitter.submitterEmail,
            buddyId: submitter.buddyId,
            childName: submitter.childName,
            firstName: submitter.firstName,
            lastName: submitter.lastName,
            userId: submitter.userId,
            accountType: isGuest ? 'guest' : 'authenticated',
          },
          environment: env,
        },
      });
      markSurveySubmitted(surveyStorageId(profile, isGuest, visitorKey));
      setStep('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send your feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="experience-survey-backdrop fixed inset-0 z-[80] flex items-end justify-center bg-adapt-navy/45 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="experience-survey-title"
    >
      <div className="experience-survey-card relative w-full max-w-xl overflow-hidden rounded-[28px] border border-adapt-indigo/15 bg-gradient-to-br from-white via-adapt-mist/80 to-cyan-50 shadow-soft dark:border-white/10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-adapt-cyan/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-adapt-indigo/15 blur-3xl" />

        <div className="relative border-b border-adapt-indigo/10 px-5 py-4 dark:border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-adapt-indigo dark:text-adapt-cyan">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                AdaptBuddy pulse
              </p>
              <h2 id="experience-survey-title" className="mt-1 text-xl font-bold text-adapt-navy dark:text-white">
                {step === 'success' ? titleCopy.successTitle : titleCopy.welcomeTitle}
              </h2>
            </div>
            {step !== 'success' && (
              <button
                type="button"
                onClick={() => onClose('dismissed')}
                className="rounded-full border border-adapt-indigo/15 bg-white/80 p-2 text-adapt-navy/70 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
                aria-label="Close survey"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {step !== 'success' && (
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-adapt-navy/55 dark:text-gray-400">
                <span>Step {Math.min(currentProgress, totalProgressSteps)} of {totalProgressSteps}</span>
                <span>{Math.round((currentProgress / totalProgressSteps) * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-adapt-indigo/10 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-adapt-indigo to-adapt-cyan transition-all duration-500"
                  style={{ width: `${(currentProgress / totalProgressSteps) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="relative px-5 py-5 sm:px-6">
          {step === 'welcome' && (
            <div className="experience-survey-step space-y-4">
              <div className="rounded-3xl border border-adapt-indigo/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                    <HeartHandshake className="h-6 w-6" aria-hidden />
                  </div>
                  <p className="text-sm leading-relaxed text-adapt-navy/80 dark:text-gray-300">
                    {titleCopy.welcomeBody}
                  </p>
                </div>
              </div>
              <ul className="grid gap-2 text-sm text-adapt-navy/70 dark:text-gray-400 sm:grid-cols-3">
                <li className="rounded-2xl bg-white/70 px-3 py-3 dark:bg-white/5">One thing at a time</li>
                <li className="rounded-2xl bg-white/70 px-3 py-3 dark:bg-white/5">Skip whenever you need</li>
                <li className="rounded-2xl bg-white/70 px-3 py-3 dark:bg-white/5">Calm, clear choices</li>
              </ul>
            </div>
          )}

          {step === 'comfort' && currentFeature && (
            <div key={currentFeature.key} className="experience-survey-step space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-adapt-indigo dark:text-adapt-cyan">
                  Comfort check
                </p>
                <h3 className="mt-1 text-lg font-bold text-adapt-navy dark:text-white">{currentFeature.label}</h3>
                <p className="mt-1 text-sm text-adapt-navy/65 dark:text-gray-400">{currentFeature.helper}</p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {SCORE_EMOJIS.map((emoji, index) => {
                  const score = index + 1;
                  const selected = currentFeatureScore === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setComfortScores((prev) => ({ ...prev, [currentFeature.key]: score }))}
                      className={`flex min-h-[4.5rem] flex-col items-center justify-center rounded-2xl border px-1 py-2 text-center transition ${
                        selected
                          ? 'border-adapt-indigo bg-adapt-indigo text-white shadow-glow dark:border-adapt-cyan dark:bg-adapt-cyan dark:text-slate-950'
                          : 'border-adapt-indigo/15 bg-white/80 text-adapt-navy hover:border-adapt-indigo/40 dark:border-white/10 dark:bg-white/5 dark:text-gray-200'
                      }`}
                      aria-pressed={selected}
                      aria-label={`${SCORE_LABELS[index]} (${score} of 5)`}
                    >
                      <span className="text-xl" aria-hidden>{emoji}</span>
                      <span className="mt-1 text-[10px] font-semibold leading-tight">{SCORE_LABELS[index]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'overall' && (
            <div className="experience-survey-step space-y-4">
              <div>
                <h3 className="text-lg font-bold text-adapt-navy dark:text-white">{titleCopy.overallTitle}</h3>
                <p className="mt-1 text-sm text-adapt-navy/65 dark:text-gray-400">
                  Pick the face that matches your experience today.
                </p>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {SCORE_EMOJIS.map((emoji, index) => {
                  const score = index + 1;
                  const selected = experienceRating === score;
                  return (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setExperienceRating(score)}
                      className={`flex min-h-[4.5rem] flex-col items-center justify-center rounded-2xl border px-1 py-2 transition ${
                        selected
                          ? 'border-adapt-indigo bg-adapt-indigo text-white shadow-glow dark:border-adapt-cyan dark:bg-adapt-cyan dark:text-slate-950'
                          : 'border-adapt-indigo/15 bg-white/80 text-adapt-navy hover:border-adapt-indigo/40 dark:border-white/10 dark:bg-white/5 dark:text-gray-200'
                      }`}
                      aria-pressed={selected}
                    >
                      <span className="text-xl" aria-hidden>{emoji}</span>
                      <span className="mt-1 text-[10px] font-semibold">{score}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'improve' && (
            <div className="experience-survey-step space-y-3">
              <h3 className="text-lg font-bold text-adapt-navy dark:text-white">{titleCopy.improveTitle}</h3>
              <textarea
                value={improvements}
                onChange={(event) => setImprovements(event.target.value)}
                rows={5}
                className="w-full rounded-3xl border border-adapt-indigo/15 bg-white/85 px-4 py-3 text-sm leading-relaxed text-adapt-navy outline-none ring-adapt-indigo/30 transition focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
                placeholder={titleCopy.improvePlaceholder}
              />
            </div>
          )}

          {step === 'wish' && (
            <div className="experience-survey-step space-y-3">
              <h3 className="text-lg font-bold text-adapt-navy dark:text-white">{titleCopy.wishTitle}</h3>
              <textarea
                value={wishedFeatures}
                onChange={(event) => setWishedFeatures(event.target.value)}
                rows={5}
                className="w-full rounded-3xl border border-adapt-indigo/15 bg-white/85 px-4 py-3 text-sm leading-relaxed text-adapt-navy outline-none ring-adapt-indigo/30 transition focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
                placeholder={titleCopy.wishPlaceholder}
              />
            </div>
          )}

          {step === 'details' && (
            <div className="experience-survey-step space-y-3">
              <h3 className="text-lg font-bold text-adapt-navy dark:text-white">
                {isGuest ? 'Optional contact details' : 'Confirm your details'}
              </h3>
              <p className="text-sm leading-relaxed text-adapt-navy/70 dark:text-gray-300">
                {isGuest
                  ? 'You are browsing as a guest. Leave a name and email if you want a reply — otherwise we still record your visitor ID for admin follow-up.'
                  : 'We attach your account details so admins can recognise your feedback and reply if needed.'}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold uppercase tracking-wide text-adapt-navy/60 dark:text-gray-400">
                  Name
                  <input
                    type="text"
                    value={contactName}
                    onChange={(event) => setContactName(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-adapt-indigo/15 bg-white/85 px-3 py-2.5 text-sm text-adapt-navy outline-none focus:ring-2 focus:ring-adapt-indigo/30 dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
                    placeholder={isChild ? 'Your name (optional)' : 'Your name'}
                  />
                </label>
                <label className="block text-xs font-semibold uppercase tracking-wide text-adapt-navy/60 dark:text-gray-400">
                  Email
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    className="mt-1 w-full rounded-2xl border border-adapt-indigo/15 bg-white/85 px-3 py-2.5 text-sm text-adapt-navy outline-none focus:ring-2 focus:ring-adapt-indigo/30 dark:border-white/10 dark:bg-white/5 dark:text-gray-100"
                    placeholder="you@example.com"
                  />
                </label>
              </div>
              <div className="rounded-2xl border border-adapt-indigo/10 bg-white/60 px-3 py-2 text-xs text-adapt-navy/70 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
                <p>
                  Account: {isGuest ? 'Guest' : 'Signed in'} · Role: {role}
                  {profile.buddy_id ? ` · Buddy ID: ${profile.buddy_id}` : ''}
                </p>
                <p className="mt-1 break-all">Visitor ID: {visitorKey}</p>
              </div>
              {error && (
                <p className="rounded-2xl border border-rose-300/40 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                  {error}
                </p>
              )}
            </div>
          )}

          {step === 'success' && (
            <div className="experience-survey-step flex flex-col items-center py-6 text-center">
              <div className="experience-survey-success-burst relative mb-4 flex h-28 w-28 items-center justify-center">
                <span className="experience-survey-success-orb absolute inset-0 rounded-full bg-gradient-to-br from-adapt-indigo/25 to-adapt-cyan/30" />
                <span className="experience-survey-success-check relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-adapt-indigo to-adapt-cyan text-white shadow-glow">
                  <Check className="h-8 w-8" strokeWidth={3} />
                </span>
              </div>
              <h3 className="text-xl font-bold text-adapt-navy dark:text-white">{titleCopy.successTitle}</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-adapt-navy/70 dark:text-gray-300">
                {titleCopy.successBody}
              </p>
            </div>
          )}
        </div>

        <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-adapt-indigo/10 px-5 py-4 dark:border-white/10">
          {step === 'success' ? (
            <button
              type="button"
              onClick={() => onClose('submitted')}
              className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-adapt-indigo px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-adapt-indigo/90 dark:bg-adapt-cyan dark:text-slate-950"
            >
              Done
              <Check className="h-4 w-4" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onClose('snoozed')}
                className="rounded-2xl px-3 py-2 text-sm font-medium text-adapt-navy/60 transition hover:text-adapt-navy dark:text-gray-400 dark:hover:text-white"
              >
                Maybe later
              </button>
              <div className="flex items-center gap-2">
                {step !== 'welcome' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (step === 'comfort' && featureIndex > 0) {
                        setFeatureIndex((index) => index - 1);
                        return;
                      }
                      if (step === 'comfort') setStep('welcome');
                      if (step === 'overall') {
                        setStep('comfort');
                        setFeatureIndex(features.length - 1);
                      }
                      if (step === 'improve') setStep('overall');
                      if (step === 'wish') setStep('improve');
                      if (step === 'details') setStep('wish');
                    }}
                    className="inline-flex items-center gap-1 rounded-2xl border border-adapt-indigo/15 bg-white/80 px-3 py-2 text-sm font-semibold text-adapt-navy dark:border-white/10 dark:bg-white/5 dark:text-gray-200"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                )}
                {step === 'welcome' && (
                  <button
                    type="button"
                    onClick={() => setStep('comfort')}
                    className="inline-flex items-center gap-2 rounded-2xl bg-adapt-indigo px-5 py-2.5 text-sm font-semibold text-white dark:bg-adapt-cyan dark:text-slate-950"
                  >
                    Start
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                {step === 'comfort' && (
                  <button
                    type="button"
                    disabled={!currentFeatureScore}
                    onClick={goNextFromComfort}
                    className="inline-flex items-center gap-2 rounded-2xl bg-adapt-indigo px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-adapt-cyan dark:text-slate-950"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                {step === 'overall' && (
                  <button
                    type="button"
                    disabled={!experienceRating}
                    onClick={() => setStep('improve')}
                    className="inline-flex items-center gap-2 rounded-2xl bg-adapt-indigo px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-adapt-cyan dark:text-slate-950"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                {step === 'improve' && (
                  <button
                    type="button"
                    onClick={() => setStep('wish')}
                    className="inline-flex items-center gap-2 rounded-2xl bg-adapt-indigo px-5 py-2.5 text-sm font-semibold text-white dark:bg-adapt-cyan dark:text-slate-950"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                {step === 'wish' && (
                  <button
                    type="button"
                    onClick={() => setStep('details')}
                    className="inline-flex items-center gap-2 rounded-2xl bg-adapt-indigo px-5 py-2.5 text-sm font-semibold text-white dark:bg-adapt-cyan dark:text-slate-950"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                {step === 'details' && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void submit()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-adapt-indigo px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-adapt-cyan dark:text-slate-950"
                  >
                    {submitting ? 'Sending…' : 'Send feedback'}
                    <Sparkles className="h-4 w-4" />
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExperienceSurveyModal;
