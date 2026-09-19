import type { Profile, UserRole } from 'services/supabase/client';

export const EXPERIENCE_SURVEY_SOURCE = 'experience_survey';
export const EXPERIENCE_SURVEY_STORAGE_KEY = 'adaptbuddy-experience-survey-v1';
export const EXPERIENCE_SURVEY_DELAY_MS = 3 * 60 * 1000; // 3 minutes on dashboard
export const EXPERIENCE_SURVEY_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
export const EXPERIENCE_SURVEY_RESUBMIT_MS = 30 * 24 * 60 * 60 * 1000;

export type SurveyFeatureKey =
  | 'dashboard'
  | 'learning_tools'
  | 'communication'
  | 'calm_support'
  | 'overall_ease';

export interface SurveyFeatureRating {
  key: SurveyFeatureKey;
  label: string;
  helper: string;
  score: number | null;
}

export interface ExperienceSurveyAnswers {
  comfortScores: Record<SurveyFeatureKey, number>;
  experienceRating: number;
  improvements: string;
  wishedFeatures: string;
}

export interface ExperienceSurveyState {
  lastSubmittedAt?: string;
  snoozedUntil?: string;
  lastSeenPromptAt?: string;
}

const CHILD_FEATURES: Omit<SurveyFeatureRating, 'score'>[] = [
  {
    key: 'dashboard',
    label: 'My home screen',
    helper: 'Finding things and knowing what to do next',
  },
  {
    key: 'learning_tools',
    label: 'Learning tools',
    helper: 'Writing pad, reading help, practice games',
  },
  {
    key: 'communication',
    label: 'Talking with helpers',
    helper: 'Messages, classroom, and trusted adults',
  },
  {
    key: 'calm_support',
    label: 'Calm & comfort tools',
    helper: 'Feelings, music, timers, quiet spaces',
  },
  {
    key: 'overall_ease',
    label: 'How easy AdaptBuddy feels',
    helper: 'Buttons, colours, words, and pace',
  },
];

const ADULT_FEATURES: Omit<SurveyFeatureRating, 'score'>[] = [
  {
    key: 'dashboard',
    label: 'Dashboard clarity',
    helper: 'Finding the right information quickly',
  },
  {
    key: 'learning_tools',
    label: 'Learning & support tools',
    helper: 'Activities, assignments, progress views',
  },
  {
    key: 'communication',
    label: 'Communication loops',
    helper: 'Messages, links, classroom, and updates',
  },
  {
    key: 'calm_support',
    label: 'Wellbeing & safeguarding comfort',
    helper: 'Mood, journals, alerts, and calm supports',
  },
  {
    key: 'overall_ease',
    label: 'Overall ease of use',
    helper: 'Navigation, language, and cognitive load',
  },
];

export function surveyFeaturesForRole(role: UserRole): Omit<SurveyFeatureRating, 'score'>[] {
  return role === 'child' ? CHILD_FEATURES : ADULT_FEATURES;
}

export function readSurveyState(userId: string): ExperienceSurveyState {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(`${EXPERIENCE_SURVEY_STORAGE_KEY}:${userId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ExperienceSurveyState;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function writeSurveyState(userId: string, next: ExperienceSurveyState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${EXPERIENCE_SURVEY_STORAGE_KEY}:${userId}`, JSON.stringify(next));
  } catch {
    // Best-effort only.
  }
}

export function surveyStorageId(profile: Profile | null | undefined, isGuest: boolean, visitorKey?: string): string {
  if (isGuest) return `guest:${visitorKey || profile?.id || 'anonymous'}`;
  return profile?.id || 'anonymous';
}

export function shouldOfferExperienceSurvey(
  profile: Profile | null | undefined,
  isGuest: boolean,
  visitorKey?: string,
): boolean {
  if (!profile) return false;
  if (profile.role === 'admin' && !isGuest) return false;
  if (!['child', 'parent', 'teacher'].includes(profile.role)) return false;

  const state = readSurveyState(surveyStorageId(profile, isGuest, visitorKey));
  const now = Date.now();
  if (state.snoozedUntil && new Date(state.snoozedUntil).getTime() > now) return false;
  if (state.lastSubmittedAt && now - new Date(state.lastSubmittedAt).getTime() < EXPERIENCE_SURVEY_RESUBMIT_MS) {
    return false;
  }
  return true;
}

export function buildSubmitterSnapshot(
  profile: Profile,
  isGuest: boolean,
  visitorKey: string,
  extras?: { contactName?: string; contactEmail?: string; path?: string },
) {
  const contactName = (extras?.contactName || '').trim();
  const contactEmail = (extras?.contactEmail || '').trim();
  return {
    userId: isGuest ? null : profile.id,
    userRole: profile.role,
    isGuest,
    visitorKey,
    submitterName: contactName || profile.full_name || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || '',
    submitterEmail: contactEmail || profile.email || '',
    buddyId: profile.buddy_id || null,
    childName: profile.child_name || null,
    firstName: profile.first_name || '',
    lastName: profile.last_name || '',
    path: extras?.path || '/',
  };
}

export function markSurveySubmitted(userId: string): void {
  const state = readSurveyState(userId);
  writeSurveyState(userId, {
    ...state,
    lastSubmittedAt: new Date().toISOString(),
    snoozedUntil: undefined,
  });
}

export function markSurveySnoozed(userId: string): void {
  const state = readSurveyState(userId);
  writeSurveyState(userId, {
    ...state,
    snoozedUntil: new Date(Date.now() + EXPERIENCE_SURVEY_SNOOZE_MS).toISOString(),
    lastSeenPromptAt: new Date().toISOString(),
  });
}

export function buildSurveyFeedbackText(answers: ExperienceSurveyAnswers, role: UserRole): string {
  const features = surveyFeaturesForRole(role);
  const comfortLines = features
    .map((feature) => {
      const score = answers.comfortScores[feature.key];
      return `- ${feature.label}: ${score}/5`;
    })
    .join('\n');

  return [
    'Experience survey response',
    '',
    'Comfort with features:',
    comfortLines,
    '',
    `Overall experience rating: ${answers.experienceRating}/5`,
    '',
    'What could improve:',
    answers.improvements.trim() || '(not shared)',
    '',
    'Features they would like:',
    answers.wishedFeatures.trim() || '(not shared)',
  ].join('\n');
}

export function averageComfortScore(answers: ExperienceSurveyAnswers): number {
  const values = Object.values(answers.comfortScores).filter((value) => Number.isFinite(value));
  if (!values.length) return answers.experienceRating;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}
