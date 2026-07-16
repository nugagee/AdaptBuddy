import { type Profile } from 'services/supabase/client';
import {
  SupportTimelineService,
  type SupportTimelineBundle,
  type SupportTimelineItem,
} from 'services/supabase/supportTimelineService';
import {
  SupportPlanService,
  type SupportPlanDraft,
  type SupportPlanPriority,
} from 'services/supabase/supportPlanService';
import {
  NotificationService,
  type SupportNotification,
} from 'services/supabase/notificationService';
import {
  ProductFeedbackService,
  type ProductFeedbackSummary,
} from 'services/supabase/productFeedbackService';

export type BuddyDigestScope = 'child' | 'class' | 'platform';
export type BuddyDigestPriority = 'steady' | 'watch' | 'urgent';

export interface BuddyDigestAction {
  label: string;
  detail: string;
  tone: BuddyDigestPriority;
}

export interface BuddyDigestMetrics {
  evidence: number;
  openActions: number;
  urgentSignals: number;
  resolvedResponses: number;
  supportPlans: number;
  feedbackConcerns: number;
}

export interface BuddyDigest {
  scope: BuddyDigestScope;
  title: string;
  subjectName: string;
  generatedAt: string;
  windowLabel: string;
  priority: BuddyDigestPriority;
  headline: string;
  summary: string[];
  wins: string[];
  watchouts: string[];
  suggestedActions: BuddyDigestAction[];
  talkingPoints: string[];
  metrics: BuddyDigestMetrics;
}

export interface BuddyDigestOptions {
  childIds?: string[];
  scope?: BuddyDigestScope;
  limit?: number;
}

const OPEN_NOTIFICATION_STATUSES = new Set(['unread', 'seen', 'responded', 'escalated']);

const PRIORITY_RANK: Record<BuddyDigestPriority, number> = {
  steady: 0,
  watch: 1,
  urgent: 2,
};

const toPriority = (priority: SupportPlanPriority): BuddyDigestPriority => priority;

const strongestPriority = (values: BuddyDigestPriority[]): BuddyDigestPriority =>
  values.reduce<BuddyDigestPriority>(
    (strongest, value) => (PRIORITY_RANK[value] > PRIORITY_RANK[strongest] ? value : strongest),
    'steady',
  );

const dedupe = (values: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const normalized = value?.trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(normalized);
  });

  return result;
};

const pluralize = (count: number, singular: string, plural = `${singular}s`): string =>
  `${count} ${count === 1 ? singular : plural}`;

const getWindowLabel = (): string => {
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 6);

  const formatter = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
};

const getScope = (profile: Profile, requested?: BuddyDigestScope): BuddyDigestScope => {
  if (requested) return requested;
  if (profile.role === 'teacher') return 'class';
  if (profile.role === 'admin') return 'platform';
  return 'child';
};

const getSubjectName = (
  profile: Profile,
  scope: BuddyDigestScope,
  plans: SupportPlanDraft[],
  timeline: SupportTimelineItem[],
): string => {
  if (scope === 'platform') return 'AdaptBuddy';
  if (scope === 'class') return 'Class support';

  const planName = plans[0]?.childName;
  if (planName) return planName;

  const timelineName = timeline.find((item) => item.childName && item.childName !== 'Learner')?.childName;
  if (timelineName) return timelineName;

  return profile.child_name || profile.full_name || 'this child';
};

const getOpenNotifications = (notifications: SupportNotification[]): SupportNotification[] =>
  notifications.filter((notification) => OPEN_NOTIFICATION_STATUSES.has(notification.status));

const countUrgentSignals = (
  bundle: SupportTimelineBundle,
  notifications: SupportNotification[],
  plans: SupportPlanDraft[],
): number => {
  const urgentTimeline = bundle.items.filter(
    (item) => item.severity === 'urgent' || item.severity === 'high',
  ).length;
  const urgentNotifications = notifications.filter(
    (notification) => notification.severity === 'urgent' || notification.severity === 'high',
  ).length;
  const highRiskPlans = plans.reduce((total, plan) => total + plan.highRiskCount, 0);

  return urgentTimeline + urgentNotifications + highRiskPlans;
};

const getFeedbackConcerns = (feedback: ProductFeedbackSummary | null): number => {
  if (!feedback) return 0;
  return (feedback.bySentiment.concerned ?? 0) + (feedback.byType.bug ?? 0);
};

const getDigestPriority = (
  bundle: SupportTimelineBundle,
  notifications: SupportNotification[],
  plans: SupportPlanDraft[],
  feedback: ProductFeedbackSummary | null,
): BuddyDigestPriority => {
  const openNotifications = getOpenNotifications(notifications);
  const urgentSignals = countUrgentSignals(bundle, notifications, plans);
  const planPriorities = plans.map((plan) => toPriority(plan.priority));
  const feedbackConcerns = getFeedbackConcerns(feedback);

  if (
    urgentSignals > 0 ||
    bundle.metrics.openAlertCount > 0 ||
    openNotifications.some((notification) => notification.severity === 'urgent' || notification.severity === 'high')
  ) {
    return 'urgent';
  }

  if (
    openNotifications.length > 0 ||
    bundle.metrics.escalatedCount > 0 ||
    feedbackConcerns > 0 ||
    strongestPriority(planPriorities) === 'watch'
  ) {
    return 'watch';
  }

  return strongestPriority(planPriorities);
};

const buildHeadline = (subjectName: string, priority: BuddyDigestPriority): string => {
  if (priority === 'urgent') {
    return `${subjectName} needs same-day adult follow-up.`;
  }
  if (priority === 'watch') {
    return `${subjectName} has useful patterns to review this week.`;
  }
  return `${subjectName} looks steady, with support evidence building.`;
};

const buildSummary = (
  bundle: SupportTimelineBundle,
  notifications: SupportNotification[],
  plans: SupportPlanDraft[],
  feedback: ProductFeedbackSummary | null,
): string[] => {
  const openNotifications = getOpenNotifications(notifications);
  const lines = [
    `${pluralize(bundle.items.length, 'support event')} captured across signals, assignments, meetings, messages, and adult responses.`,
    `${pluralize(openNotifications.length, 'open action')} still needs an adult status update.`,
    `${pluralize(plans.length, 'support plan draft')} available for review.`,
  ];

  if (bundle.metrics.averageFirstResponseMinutes !== null) {
    lines.push(`Average first adult response is ${Math.round(bundle.metrics.averageFirstResponseMinutes)} minutes.`);
  }

  if (feedback && feedback.total > 0) {
    lines.push(`${pluralize(feedback.total, 'product feedback item')} recorded, with ${getFeedbackConcerns(feedback)} concern signal${getFeedbackConcerns(feedback) === 1 ? '' : 's'}.`);
  }

  return lines;
};

const buildWins = (
  bundle: SupportTimelineBundle,
  plans: SupportPlanDraft[],
  notifications: SupportNotification[],
): string[] => {
  const supports = dedupe(plans.flatMap((plan) => plan.helpfulSupports)).slice(0, 2);
  const resolvedLine =
    bundle.metrics.resolvedCount > 0
      ? `${pluralize(bundle.metrics.resolvedCount, 'adult response')} reached resolved status.`
      : null;
  const seenLine =
    bundle.metrics.seenCount > 0 || bundle.metrics.respondedCount > 0
      ? `${pluralize(bundle.metrics.seenCount + bundle.metrics.respondedCount, 'adult acknowledgement')} recorded.`
      : null;
  const supportLine = supports.length
    ? `Helpful supports emerging: ${supports.join('; ')}.`
    : null;
  const notificationLine = notifications.some((notification) => notification.status === 'resolved')
    ? 'At least one support notification has been closed cleanly.'
    : null;

  return dedupe([resolvedLine, seenLine, supportLine, notificationLine, 'Shared evidence is now connected across child, parent, teacher, and admin views.']).slice(0, 4);
};

const buildWatchouts = (
  bundle: SupportTimelineBundle,
  plans: SupportPlanDraft[],
  notifications: SupportNotification[],
  feedback: ProductFeedbackSummary | null,
): string[] => {
  const openNotifications = getOpenNotifications(notifications);
  const repeatedPatterns = plans.flatMap((plan) => plan.patterns).filter((pattern) => pattern.count > 1);
  const triggers = dedupe(plans.flatMap((plan) => plan.triggers)).slice(0, 2);
  const urgentSignals = countUrgentSignals(bundle, notifications, plans);

  return dedupe([
    urgentSignals > 0 ? `${pluralize(urgentSignals, 'high-priority signal')} should be reviewed before the day ends.` : null,
    openNotifications.length > 0 ? `${pluralize(openNotifications.length, 'support action')} is still open.` : null,
    repeatedPatterns.length > 0 ? `Repeated pattern: ${repeatedPatterns[0].label}.` : null,
    triggers.length > 0 ? `Likely trigger to watch: ${triggers[0]}.` : null,
    feedback && getFeedbackConcerns(feedback) > 0 ? `${pluralize(getFeedbackConcerns(feedback), 'platform concern')} needs product review.` : null,
  ]).slice(0, 4);
};

const buildSuggestedActions = (
  priority: BuddyDigestPriority,
  bundle: SupportTimelineBundle,
  notifications: SupportNotification[],
  plans: SupportPlanDraft[],
  feedback: ProductFeedbackSummary | null,
): BuddyDigestAction[] => {
  const openNotifications = getOpenNotifications(notifications);
  const actions: BuddyDigestAction[] = [];

  if (priority === 'urgent') {
    actions.push({
      label: 'Same-day check-in',
      detail: 'Review high-priority signals and confirm which trusted adult is taking the next step.',
      tone: 'urgent',
    });
  }

  if (openNotifications.length > 0) {
    actions.push({
      label: 'Clear open actions',
      detail: `Update ${pluralize(openNotifications.length, 'support item')} as seen, responded, escalated, or resolved.`,
      tone: priority === 'urgent' ? 'urgent' : 'watch',
    });
  }

  if (plans.length > 0) {
    actions.push({
      label: 'Review support plan',
      detail: plans[0].homeSchoolNextStep,
      tone: plans[0].priority,
    });
  }

  if (bundle.metrics.averageFirstResponseMinutes === null && bundle.items.length > 0) {
    actions.push({
      label: 'Close the response loop',
      detail: 'Add at least one adult response so future digests can measure support timing.',
      tone: 'watch',
    });
  }

  if (feedback && getFeedbackConcerns(feedback) > 0) {
    actions.push({
      label: 'Triage product feedback',
      detail: 'Review negative or bug feedback and decide whether it should become a product task.',
      tone: 'watch',
    });
  }

  if (actions.length === 0) {
    actions.push({
      label: 'Keep the rhythm',
      detail: 'Continue logging tasks, mood signals, and adult responses so the evidence stays fresh.',
      tone: 'steady',
    });
  }

  return actions.slice(0, 4);
};

const buildTalkingPoints = (plans: SupportPlanDraft[], bundle: SupportTimelineBundle): string[] => {
  const planPoints = plans.flatMap((plan) => [
    plan.homeSchoolNextStep,
    ...plan.adultActions,
    ...plan.avoid,
  ]);
  const timelinePoints = bundle.items
    .filter((item) => item.kind === 'assignment' || item.kind === 'signal' || item.kind === 'meeting')
    .map((item) => `${item.title}: ${item.detail}`);

  return dedupe([...planPoints, ...timelinePoints]).slice(0, 5);
};

const buildTitle = (scope: BuddyDigestScope): string => {
  if (scope === 'platform') return 'Platform Buddy Digest';
  if (scope === 'class') return 'Class Buddy Digest';
  return 'Buddy Digest';
};

export class BuddyDigestService {
  static async getDigest(profile: Profile, options: BuddyDigestOptions = {}): Promise<BuddyDigest> {
    const scope = getScope(profile, options.scope);
    const limit = options.limit ?? (scope === 'platform' ? 120 : 80);

    const [timelineBundle, plans, notifications, feedbackSummary] = await Promise.all([
      SupportTimelineService.getTimelineBundle(profile, { childIds: options.childIds, limit }),
      SupportPlanService.getDrafts(profile, { childIds: options.childIds, limit: scope === 'platform' ? 8 : 4 }),
      NotificationService.getNotifications(profile),
      ProductFeedbackService.getSummary(profile).catch(() => null),
    ]);

    const subjectName = getSubjectName(profile, scope, plans, timelineBundle.items);
    const priority = getDigestPriority(timelineBundle, notifications, plans, feedbackSummary);

    return {
      scope,
      title: buildTitle(scope),
      subjectName,
      generatedAt: new Date().toISOString(),
      windowLabel: getWindowLabel(),
      priority,
      headline: buildHeadline(subjectName, priority),
      summary: buildSummary(timelineBundle, notifications, plans, feedbackSummary),
      wins: buildWins(timelineBundle, plans, notifications),
      watchouts: buildWatchouts(timelineBundle, plans, notifications, feedbackSummary),
      suggestedActions: buildSuggestedActions(priority, timelineBundle, notifications, plans, feedbackSummary),
      talkingPoints: buildTalkingPoints(plans, timelineBundle),
      metrics: {
        evidence: timelineBundle.items.length,
        openActions: getOpenNotifications(notifications).length,
        urgentSignals: countUrgentSignals(timelineBundle, notifications, plans),
        resolvedResponses: timelineBundle.metrics.resolvedCount,
        supportPlans: plans.length,
        feedbackConcerns: getFeedbackConcerns(feedbackSummary),
      },
    };
  }
}
