import { saveJournalEntry } from 'services/supabase/autismProfileService';
import type { AdhdSupportSignalInput } from 'features/child/store/childProgressStore';
import type { EmotionAnalysis, EmotionType, RiskLevel } from 'types/ai.types';

interface SyncAdhdSupportSignalInput {
  childId: string;
  activityId: string;
  activityTitle: string;
  signal: AdhdSupportSignalInput;
}

const highSupportReasons = ['overloaded', 'do not know where to start'];
const mediumSupportReasons = ['too many steps', 'too hard', 'too big', 'stuck', 'frustrated', 'overwhelmed'];

const normalizeText = (value: string): string => value.toLowerCase().trim();

const deriveRiskLevel = (signal: AdhdSupportSignalInput): RiskLevel => {
  const searchable = [
    signal.energyId,
    signal.energyLabel,
    signal.rescueReason,
    signal.supportPlan,
    signal.firstStep,
  ]
    .map(normalizeText)
    .join(' ');

  if (highSupportReasons.some((reason) => searchable.includes(reason))) return 'high';
  if (mediumSupportReasons.some((reason) => searchable.includes(reason))) return 'medium';
  return 'low';
};

const deriveEmotion = (signal: AdhdSupportSignalInput): EmotionType => {
  const searchable = normalizeText(`${signal.energyId} ${signal.energyLabel} ${signal.rescueReason}`);

  if (/tired|sleepy/.test(searchable)) return 'tired';
  if (/frustrated|too hard/.test(searchable)) return 'angry';
  if (/overwhelmed|stuck|do not know|too many|too big/.test(searchable)) return 'anxious';
  if (/focused|task breakdown/.test(searchable)) return 'calm';
  return 'excited';
};

const buildSignalLabel = (signal: AdhdSupportSignalInput): string => {
  if (signal.taskTitle?.toLowerCase().includes('break')) return `ADHD ${signal.taskTitle}`;
  if (signal.taskTitle) return 'ADHD task breakdown';
  return `ADHD ${signal.energyLabel}`;
};

const buildSignalText = (activityTitle: string, signal: AdhdSupportSignalInput): string => {
  const parts = [
    `${activityTitle} completed.`,
    signal.taskTitle ? `Task: ${signal.taskTitle}.` : null,
    `Blocker/state: ${signal.rescueReason || signal.energyLabel}.`,
    `First step: ${signal.firstStep}`,
    `Support plan: ${signal.supportPlan}`,
    signal.breakdownSteps?.length ? `Tiny steps: ${signal.breakdownSteps.join(' / ')}` : null,
  ];

  return parts.filter(Boolean).join(' ');
};

const buildAnalysis = (
  activityId: string,
  activityTitle: string,
  signal: AdhdSupportSignalInput,
): EmotionAnalysis => {
  const riskLevel = deriveRiskLevel(signal);
  const supportLevel = riskLevel === 'high' ? 'urgent' : riskLevel === 'medium' ? 'concern' : 'positive';
  const emotion = deriveEmotion(signal);

  return {
    emotion,
    confidence: 0.88,
    keywords: [
      'adhd',
      signal.energyLabel,
      signal.rescueReason,
      ...(signal.taskTitle ? [signal.taskTitle] : []),
    ],
    riskLevel,
    sentimentScore: riskLevel === 'high' ? 0.22 : riskLevel === 'medium' ? 0.42 : 0.72,
    timestamp: new Date(),
    signalId: activityId,
    signalLabel: buildSignalLabel(signal),
    signalCategory: signal.taskTitle?.toLowerCase().includes('break') ? 'regulation' : 'cognitive',
    supportLevel,
    source: 'adhd_support_signal',
    activityLabel: activityTitle,
    parentInsight: signal.taskTitle
      ? `ADHD support used for ${signal.taskTitle}: ${signal.firstStep}`
      : `ADHD support signal: ${signal.energyLabel} with ${signal.rescueReason}.`,
    suggestedAction: signal.supportPlan,
    moodScore: riskLevel === 'high' ? 35 : riskLevel === 'medium' ? 55 : 75,
    focusScore: riskLevel === 'high' ? 28 : riskLevel === 'medium' ? 45 : 72,
    calmScore: riskLevel === 'high' ? 30 : riskLevel === 'medium' ? 52 : 76,
  };
};

export async function syncAdhdSupportSignal({
  childId,
  activityId,
  activityTitle,
  signal,
}: SyncAdhdSupportSignalInput): Promise<void> {
  if (!childId || childId === 'guest-child') return;

  await saveJournalEntry({
    childId,
    emotion: deriveEmotion(signal),
    text: buildSignalText(activityTitle, signal),
    analysis: buildAnalysis(activityId, activityTitle, signal),
    isShared: true,
  });
}
