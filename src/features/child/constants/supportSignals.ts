import type { EmotionType, RiskLevel } from 'types/ai.types';

export type SupportSignalCategory = 'emotional' | 'cognitive' | 'sensory' | 'support';
export type SupportSignalLevel = 'positive' | 'neutral' | 'concern' | 'urgent';

export type SupportSignalId =
  | 'good'
  | 'calm'
  | 'confused'
  | 'worried'
  | 'frustrated'
  | 'tired'
  | 'too-noisy'
  | 'too-bright'
  | 'need-help';

export interface SupportSignalOption {
  id: SupportSignalId;
  label: string;
  emoji: string;
  helper: string;
  category: SupportSignalCategory;
  level: SupportSignalLevel;
  emotion: EmotionType;
  riskLevel: RiskLevel;
  sentimentScore: number;
  moodScore: number;
  focusScore: number;
  calmScore: number;
  color: 'green' | 'blue' | 'yellow' | 'amber' | 'orange' | 'red' | 'purple';
  parentInsight: string;
  suggestedAction: string;
}

export const SUPPORT_SIGNAL_OPTIONS: SupportSignalOption[] = [
  {
    id: 'good',
    label: 'Good',
    emoji: '😊',
    helper: 'That felt okay or positive',
    category: 'emotional',
    level: 'positive',
    emotion: 'happy',
    riskLevel: 'low',
    sentimentScore: 0.82,
    moodScore: 86,
    focusScore: 74,
    calmScore: 78,
    color: 'green',
    parentInsight: 'The activity felt positive.',
    suggestedAction: 'Keep this routine steady and notice what made it work.',
  },
  {
    id: 'calm',
    label: 'Calm',
    emoji: '😌',
    helper: 'My body feels settled',
    category: 'emotional',
    level: 'positive',
    emotion: 'calm',
    riskLevel: 'low',
    sentimentScore: 0.78,
    moodScore: 78,
    focusScore: 72,
    calmScore: 90,
    color: 'blue',
    parentInsight: 'The child felt regulated after this step.',
    suggestedAction: 'Repeat the same cue, environment, or pacing when possible.',
  },
  {
    id: 'confused',
    label: 'Confused',
    emoji: '😕',
    helper: 'I did not understand',
    category: 'cognitive',
    level: 'concern',
    emotion: 'anxious',
    riskLevel: 'low',
    sentimentScore: 0.38,
    moodScore: 52,
    focusScore: 38,
    calmScore: 58,
    color: 'amber',
    parentInsight: 'The activity may need clearer steps or a visual example.',
    suggestedAction: 'Try one instruction at a time with a model or picture cue.',
  },
  {
    id: 'worried',
    label: 'Worried',
    emoji: '😟',
    helper: 'Something felt hard',
    category: 'emotional',
    level: 'concern',
    emotion: 'anxious',
    riskLevel: 'low',
    sentimentScore: 0.32,
    moodScore: 42,
    focusScore: 45,
    calmScore: 36,
    color: 'yellow',
    parentInsight: 'The child signalled worry around this activity.',
    suggestedAction: 'Check in gently and look for a trigger, transition, or demand change.',
  },
  {
    id: 'frustrated',
    label: 'Frustrated',
    emoji: '😠',
    helper: 'This felt too much',
    category: 'emotional',
    level: 'concern',
    emotion: 'angry',
    riskLevel: 'low',
    sentimentScore: 0.28,
    moodScore: 38,
    focusScore: 42,
    calmScore: 32,
    color: 'orange',
    parentInsight: 'The child may have hit a demand or tolerance limit.',
    suggestedAction: 'Offer a reset, reduce the task size, and return with a smaller next step.',
  },
  {
    id: 'tired',
    label: 'Tired',
    emoji: '😴',
    helper: 'I need rest',
    category: 'emotional',
    level: 'neutral',
    emotion: 'tired',
    riskLevel: 'low',
    sentimentScore: 0.46,
    moodScore: 52,
    focusScore: 34,
    calmScore: 62,
    color: 'purple',
    parentInsight: 'Energy may be lower after this activity.',
    suggestedAction: 'Use a short break, snack, hydration, or lower-demand task next.',
  },
  {
    id: 'too-noisy',
    label: 'Too noisy',
    emoji: '🔊',
    helper: 'Sound felt too big',
    category: 'sensory',
    level: 'concern',
    emotion: 'anxious',
    riskLevel: 'low',
    sentimentScore: 0.3,
    moodScore: 44,
    focusScore: 35,
    calmScore: 30,
    color: 'yellow',
    parentInsight: 'Noise may be affecting regulation or attention.',
    suggestedAction: 'Offer headphones, a quiet corner, or preview noisy transitions.',
  },
  {
    id: 'too-bright',
    label: 'Too bright',
    emoji: '💡',
    helper: 'Light felt too strong',
    category: 'sensory',
    level: 'concern',
    emotion: 'anxious',
    riskLevel: 'low',
    sentimentScore: 0.34,
    moodScore: 46,
    focusScore: 38,
    calmScore: 34,
    color: 'yellow',
    parentInsight: 'Lighting may be creating sensory stress.',
    suggestedAction: 'Try dimmer lighting, screen filters, or a less visually busy space.',
  },
  {
    id: 'need-help',
    label: 'I need help',
    emoji: '🫂',
    helper: 'Please check on me',
    category: 'support',
    level: 'urgent',
    emotion: 'anxious',
    riskLevel: 'high',
    sentimentScore: 0.18,
    moodScore: 28,
    focusScore: 24,
    calmScore: 22,
    color: 'red',
    parentInsight: 'The child explicitly asked for adult support.',
    suggestedAction: 'A trusted adult should check in today and acknowledge the alert.',
  },
];

export const SUPPORT_SIGNAL_MAP = SUPPORT_SIGNAL_OPTIONS.reduce(
  (acc, option) => {
    acc[option.id] = option;
    return acc;
  },
  {} as Record<SupportSignalId, SupportSignalOption>,
);

export const DEFAULT_SUPPORT_SIGNAL = SUPPORT_SIGNAL_MAP.good;

export const getSupportSignalOption = (signalId: string | null | undefined): SupportSignalOption =>
  signalId && signalId in SUPPORT_SIGNAL_MAP
    ? SUPPORT_SIGNAL_MAP[signalId as SupportSignalId]
    : DEFAULT_SUPPORT_SIGNAL;

export const signalNeedsAdultContext = (signal: SupportSignalOption): boolean =>
  signal.level === 'concern' || signal.level === 'urgent' || signal.category === 'sensory' || signal.category === 'cognitive';
