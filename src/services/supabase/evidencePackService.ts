import { type Profile } from 'services/supabase/client';
import {
  BuddyDigestService,
  type BuddyDigest,
  type BuddyDigestPriority,
  type BuddyDigestScope,
} from 'services/supabase/buddyDigestService';
import {
  NotificationService,
  type SupportNotification,
} from 'services/supabase/notificationService';
import {
  SupportPlanService,
  type SupportPlanDraft,
} from 'services/supabase/supportPlanService';
import {
  SupportTimelineService,
  type SupportTimelineBundle,
  type SupportTimelineItem,
} from 'services/supabase/supportTimelineService';

export interface EvidencePackMetric {
  label: string;
  value: string | number;
  detail: string;
}

export interface EvidencePackSection {
  title: string;
  items: string[];
}

export interface EvidencePackAction {
  label: string;
  detail: string;
  tone: BuddyDigestPriority;
}

export interface EvidencePack {
  scope: BuddyDigestScope;
  title: string;
  subjectName: string;
  generatedAt: string;
  windowLabel: string;
  priority: BuddyDigestPriority;
  executiveSummary: string[];
  metrics: EvidencePackMetric[];
  supportSections: EvidencePackSection[];
  nextActions: EvidencePackAction[];
  talkingPoints: string[];
  openActions: SupportNotification[];
  timeline: SupportTimelineItem[];
  supportPlans: SupportPlanDraft[];
  privacyNote: string;
}

export interface EvidencePackOptions {
  childIds?: string[];
  scope?: BuddyDigestScope;
  limit?: number;
}

const OPEN_NOTIFICATION_STATUSES = new Set(['unread', 'seen', 'responded', 'escalated']);

const labelize = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

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

const getScope = (profile: Profile, requested?: BuddyDigestScope): BuddyDigestScope => {
  if (requested) return requested;
  if (profile.role === 'teacher') return 'class';
  if (profile.role === 'admin') return 'platform';
  return 'child';
};

const getTitle = (scope: BuddyDigestScope, subjectName: string): string => {
  if (scope === 'platform') return 'AdaptBuddy Platform Evidence Pack';
  if (scope === 'class') return `${subjectName} Evidence Pack`;
  return `${subjectName} Evidence Pack`;
};

const getPrivacyNote = (scope: BuddyDigestScope): string => {
  if (scope === 'platform') {
    return 'This pack is for governance review. It aggregates support-visible evidence and avoids private journal content unless explicitly shared by policy.';
  }
  if (scope === 'class') {
    return 'This pack uses parent-approved school visibility only. Private journal text, hidden profile information, and personal notes remain excluded unless the family explicitly shares them.';
  }
  return 'This pack is a support coordination aid for trusted adults. It is not a diagnosis or clinical document, and it uses shared/support-visible evidence only.';
};

const filterNotifications = (
  notifications: SupportNotification[],
  childIds?: string[],
): SupportNotification[] => {
  const childSet = new Set(childIds ?? []);
  return notifications
    .filter((notification) => !childSet.size || (notification.childId && childSet.has(notification.childId)))
    .filter((notification) => OPEN_NOTIFICATION_STATUSES.has(notification.status));
};

const getNeedsHelpCount = (timeline: SupportTimelineItem[]): number =>
  timeline.filter((item) => /needs help|need help|help/i.test(`${item.title} ${item.detail} ${item.status ?? ''}`)).length;

const getUrgentCount = (
  bundle: SupportTimelineBundle,
  notifications: SupportNotification[],
  plans: SupportPlanDraft[],
): number =>
  bundle.items.filter((item) => item.severity === 'high' || item.severity === 'urgent').length +
  notifications.filter((notification) => notification.severity === 'high' || notification.severity === 'urgent').length +
  plans.reduce((total, plan) => total + plan.highRiskCount, 0);

const getSupportSections = (
  digest: BuddyDigest,
  plans: SupportPlanDraft[],
  bundle: SupportTimelineBundle,
): EvidencePackSection[] => {
  const helpfulSupports = dedupe(plans.flatMap((plan) => plan.helpfulSupports)).slice(0, 6);
  const adultActions = dedupe(plans.flatMap((plan) => plan.adultActions)).slice(0, 6);
  const avoid = dedupe(plans.flatMap((plan) => plan.avoid)).slice(0, 5);
  const patterns = dedupe([
    ...plans.flatMap((plan) => plan.triggers),
    ...bundle.items
      .filter((item) => item.kind === 'signal' || item.kind === 'assignment')
      .slice(0, 5)
      .map((item) => `${item.title}: ${item.detail}`),
  ]).slice(0, 6);

  return [
    {
      title: 'What the evidence suggests',
      items: digest.summary,
    },
    {
      title: 'Helpful supports',
      items: helpfulSupports.length ? helpfulSupports : ['Keep using visual steps, short tasks, and calm check-ins while evidence builds.'],
    },
    {
      title: 'Adult actions',
      items: adultActions.length ? adultActions : digest.suggestedActions.map((action) => action.detail),
    },
    {
      title: 'Patterns to watch',
      items: patterns.length ? patterns : ['No repeated pattern has been confirmed yet. Keep collecting shared signals.'],
    },
    {
      title: 'Try not to',
      items: avoid.length ? avoid : ['Avoid treating support signals as refusal. Treat them as information for better adjustment.'],
    },
  ];
};

const getMetrics = (
  digest: BuddyDigest,
  bundle: SupportTimelineBundle,
  notifications: SupportNotification[],
  plans: SupportPlanDraft[],
): EvidencePackMetric[] => {
  const urgentCount = getUrgentCount(bundle, notifications, plans);
  const needsHelpCount = getNeedsHelpCount(bundle.items) + plans.reduce((total, plan) => total + plan.needsHelpCount, 0);

  return [
    {
      label: 'Evidence points',
      value: digest.metrics.evidence,
      detail: 'Signals, assignments, meetings, messages, and adult responses.',
    },
    {
      label: 'Open actions',
      value: notifications.length,
      detail: 'Support items awaiting an adult status update.',
    },
    {
      label: 'Urgent signals',
      value: urgentCount,
      detail: 'High-priority evidence that needs prompt review.',
    },
    {
      label: 'Needs-help evidence',
      value: needsHelpCount,
      detail: 'Task or support moments where extra help was requested.',
    },
    {
      label: 'Resolved responses',
      value: bundle.metrics.resolvedCount,
      detail: 'Adult response events closed as resolved.',
    },
    {
      label: 'Plan drafts',
      value: plans.length,
      detail: 'Support-plan drafts generated from repeated evidence.',
    },
  ];
};

const getExecutiveSummary = (
  digest: BuddyDigest,
  bundle: SupportTimelineBundle,
  notifications: SupportNotification[],
  plans: SupportPlanDraft[],
): string[] => {
  const lines = [
    digest.headline,
    `${pluralize(bundle.items.length, 'support event')} reviewed for ${digest.windowLabel}.`,
    `${pluralize(notifications.length, 'open support action')} should be checked by the responsible adult.`,
  ];

  if (plans[0]) {
    lines.push(`Priority support-plan next step: ${plans[0].homeSchoolNextStep}`);
  }

  if (bundle.metrics.averageFirstResponseMinutes !== null) {
    lines.push(`Average first response time is ${Math.round(bundle.metrics.averageFirstResponseMinutes)} minutes.`);
  }

  return dedupe(lines).slice(0, 5);
};

const getTimeline = (bundle: SupportTimelineBundle, limit: number): SupportTimelineItem[] =>
  bundle.items
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

export class EvidencePackService {
  static async getPack(profile: Profile, options: EvidencePackOptions = {}): Promise<EvidencePack> {
    const scope = getScope(profile, options.scope);
    const limit = options.limit ?? (scope === 'platform' ? 18 : 12);

    const [digest, bundle, plans, allNotifications] = await Promise.all([
      BuddyDigestService.getDigest(profile, {
        childIds: options.childIds,
        scope,
        limit: scope === 'platform' ? 140 : 90,
      }),
      SupportTimelineService.getTimelineBundle(profile, {
        childIds: options.childIds,
        limit: scope === 'platform' ? 140 : 90,
      }),
      SupportPlanService.getDrafts(profile, {
        childIds: options.childIds,
        limit: scope === 'platform' ? 8 : 4,
      }),
      NotificationService.getNotifications(profile),
    ]);

    const openActions = filterNotifications(allNotifications, options.childIds).slice(0, limit);
    const timeline = getTimeline(bundle, limit);

    return {
      scope,
      title: getTitle(scope, digest.subjectName),
      subjectName: digest.subjectName,
      generatedAt: new Date().toISOString(),
      windowLabel: digest.windowLabel,
      priority: digest.priority,
      executiveSummary: getExecutiveSummary(digest, bundle, openActions, plans),
      metrics: getMetrics(digest, bundle, openActions, plans),
      supportSections: getSupportSections(digest, plans, bundle),
      nextActions: digest.suggestedActions,
      talkingPoints: digest.talkingPoints,
      openActions,
      timeline,
      supportPlans: plans,
      privacyNote: getPrivacyNote(scope),
    };
  }
}

export function formatEvidenceTimelineItem(item: SupportTimelineItem): string {
  const status = item.status ? ` (${labelize(item.status)})` : '';
  return `${labelize(item.kind)}: ${item.title}${status} - ${item.detail}`;
}
