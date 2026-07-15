import { getSupabaseClient, isSupabaseConfigured } from 'services/supabase/client';

export type RiskLevel = 'low' | 'medium' | 'high';
export type TrustedAdultStatus = 'active' | 'connected' | 'pending' | 'inactive';

export interface ChildSummary {
  childId: string;
  buddyId?: string | null;
  childName: string;
  age?: number;
  neurotypes: string[];
  totalEntries: number;
  entriesLast7Days: number;
  totalAlerts: number;
  highAlerts: number;
  trustedAdultsCount: number;
  profileCompletion: number;
  wellbeingScore: number | null;
  wellbeingChange: number | null;
}

export interface JournalEntry {
  id: string;
  childId: string;
  emotion: string;
  signalId?: string;
  signalLabel?: string;
  signalCategory?: string;
  supportLevel?: string;
  parentInsight?: string;
  suggestedAction?: string;
  text: string;
  riskLevel: RiskLevel;
  createdAt: string;
  childName?: string;
  moodScore: number | null;
  focusScore: number | null;
  calmScore: number | null;
}

export interface Alert {
  id: string;
  childId: string;
  riskLevel: RiskLevel;
  journalEntryText: string;
  createdAt: string;
  acknowledged: boolean;
}

export interface TrustedAdult {
  id: string;
  childId: string;
  name: string;
  email: string;
  phone?: string;
  relationship: string;
  status: TrustedAdultStatus;
}

export interface ParentMessage {
  id: string;
  childId: string;
  senderId: string;
  recipientId?: string;
  body: string;
  urgency: 'normal' | 'support' | 'urgent';
  aiSummary?: string;
  aiTalkingPoints: string[];
  createdAt: string;
  readAt?: string;
}

export interface CareMeeting {
  id: string;
  childId: string;
  requestedBy: string;
  assignedTo?: string;
  meetingType: string;
  status: 'requested' | 'scheduled' | 'completed' | 'cancelled';
  urgency: 'routine' | 'soon' | 'urgent';
  proposedTimes: string[];
  scheduledAt?: string;
  agenda: string[];
  notes?: string;
  actionItems: string[];
  createdAt: string;
}

export interface SupportGoal {
  id: string;
  childId: string;
  title: string;
  category: string;
  description?: string;
  progress: number;
  status: 'active' | 'paused' | 'completed';
  targetDate?: string;
  aiSuggestion?: string;
  createdAt: string;
}

export interface ParentResource {
  id: string;
  childId: string;
  title: string;
  resourceType: 'article' | 'video' | 'worksheet' | 'strategy' | 'printable';
  url?: string;
  summary: string;
  neurotypes: string[];
  reason?: string;
  readingLevel: 'child' | 'parent' | 'teacher' | 'clinician';
  generated?: boolean;
}

export interface ChildSignal {
  id: string;
  childId: string;
  emotion: string;
  color: string;
  note?: string;
  createdAt: string;
  seenAt?: string;
}

export interface ParentAiDigest {
  headline: string;
  happyWeekPercentage: number | null;
  highestEmotion: string;
  alertSummary: string;
  learningProgress: string;
  suggestion: string;
  talkingPoints: string[];
}

export interface ProactiveInsight {
  id: string;
  childId: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  detail: string;
  suggestedAction: string;
}

export interface ParentFeedbackTheme {
  theme: string;
  count: number;
  sentiment: 'positive' | 'neutral' | 'concerned';
}

export type ParentAssignmentStatus = 'not_started' | 'in_progress' | 'needs_help' | 'completed' | 'submitted';
export type ParentAssignmentType =
  | 'reading'
  | 'maths'
  | 'writing'
  | 'calm_break'
  | 'visual_routine'
  | 'social_story'
  | 'task';

export interface ParentAssignmentSummary {
  id: string;
  childId: string;
  childName: string;
  classId: string;
  className: string;
  schoolName: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  title: string;
  description?: string;
  assignmentType: ParentAssignmentType;
  supportTools: string[];
  dueAt?: string;
  createdAt: string;
  status: ParentAssignmentStatus;
  supportUsed: string[];
  moodAfterTask?: string;
  updatedAt?: string;
}

export interface TeacherClassVisibilitySettings {
  childName: boolean;
  neuroProfile: boolean;
  dailyMood: 'hidden' | 'summary' | 'full';
  worryDiaryText: boolean;
  safeguardingAlerts: boolean;
  academicTasks: boolean;
  personalNotes: boolean;
}

export type TeacherClassRequestStatus =
  | 'pending'
  | 'pending_parent'
  | 'pending_teacher'
  | 'approved'
  | 'declined'
  | 'cancelled';

export interface TeacherClassRequest {
  id: string;
  childId: string;
  classId: string;
  className: string;
  schoolName: string;
  subject: string;
  yearGroup: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  requestedBuddyId?: string | null;
  requestMethod: string;
  status: TeacherClassRequestStatus;
  parentApproved: boolean;
  teacherApproved: boolean;
  visibilitySettings: TeacherClassVisibilitySettings;
  teacherApprovedBy?: string | null;
  teacherApprovedAt?: string | null;
  teacherApprovedByName?: string | null;
  parentApprovedBy?: string | null;
  parentApprovedAt?: string | null;
  parentApprovedByName?: string | null;
  approvedAt?: string | null;
  declinedBy?: string | null;
  declinedAt?: string | null;
  declinedByName?: string | null;
  createdAt: string;
}

export interface BuddyLinkResult {
  childId: string;
  childName: string;
  buddyId: string;
  relationship: string;
  createdAt: string;
}

export interface UnlinkChildResult {
  childId: string;
  childName: string;
  buddyId: string | null;
}

export const createChildSummaryFromLink = (linked: BuddyLinkResult): ChildSummary => ({
  childId: linked.childId,
  buddyId: linked.buddyId,
  childName: linked.childName,
  neurotypes: [],
  totalEntries: 0,
  entriesLast7Days: 0,
  totalAlerts: 0,
  highAlerts: 0,
  trustedAdultsCount: 1,
  profileCompletion: 0,
  wellbeingScore: null,
  wellbeingChange: null,
});

export const mergeLinkedChildIntoDashboard = (
  data: DashboardSummary,
  linked: BuddyLinkResult,
): DashboardSummary => {
  if (data.children.some((child) => child.childId === linked.childId)) {
    return data;
  }

  const children = [...data.children, createChildSummaryFromLink(linked)].sort((a, b) =>
    a.childName.localeCompare(b.childName),
  );

  return {
    ...data,
    children,
    resources: [...data.resources, ...buildGeneratedResources(children)],
    teacherClassRequests: data.teacherClassRequests,
    aiDigest: buildAiDigest(children, data.recentEntries, data.recentAlerts, data.goals),
    proactiveInsights: buildProactiveInsights(
      children,
      data.wellbeingTrends,
      data.recentAlerts,
      data.recentEntries,
    ),
  };
};

export const removeChildFromDashboard = (
  data: DashboardSummary,
  childId: string,
): DashboardSummary => {
  const children = data.children.filter((child) => child.childId !== childId);
  const filterByChild = <T extends { childId: string }>(items: T[]): T[] =>
    items.filter((item) => item.childId !== childId);

  const recentEntries = filterByChild(data.recentEntries);
  const recentAlerts = filterByChild(data.recentAlerts);
  const trustedAdults = filterByChild(data.trustedAdults);
  const messages = filterByChild(data.messages);
  const meetings = filterByChild(data.meetings);
  const goals = filterByChild(data.goals);
  const resources = data.resources.filter(
    (resource) => resource.childId !== childId && !resource.id.startsWith(`${childId}-resource-`),
  );
  const childSignals = filterByChild(data.childSignals);
  const teacherClassRequests = filterByChild(data.teacherClassRequests);
  const assignmentSummaries = filterByChild(data.assignmentSummaries);
  const wellbeingTrends = Object.fromEntries(
    Object.entries(data.wellbeingTrends).filter(([id]) => id !== childId),
  );

  return {
    children,
    recentEntries,
    recentAlerts,
    trustedAdults,
    wellbeingTrends,
    messages,
    meetings,
    goals,
    resources,
    childSignals,
    teacherClassRequests,
    assignmentSummaries,
    aiDigest: buildAiDigest(children, recentEntries, recentAlerts, goals),
    proactiveInsights: buildProactiveInsights(children, wellbeingTrends, recentAlerts, recentEntries),
    parentFeedbackThemes: data.parentFeedbackThemes,
  };
};

export interface WellbeingTrendPoint {
  day: string;
  date: string;
  mood: number;
  focus: number;
  calm: number;
}

export interface DashboardSummary {
  children: ChildSummary[];
  recentEntries: JournalEntry[];
  recentAlerts: Alert[];
  trustedAdults: TrustedAdult[];
  wellbeingTrends: Record<string, WellbeingTrendPoint[]>;
  messages: ParentMessage[];
  meetings: CareMeeting[];
  goals: SupportGoal[];
  resources: ParentResource[];
  childSignals: ChildSignal[];
  teacherClassRequests: TeacherClassRequest[];
  assignmentSummaries: ParentAssignmentSummary[];
  aiDigest: ParentAiDigest;
  proactiveInsights: ProactiveInsight[];
  parentFeedbackThemes: ParentFeedbackTheme[];
}

interface ParentSummaryRow {
  child_id: string;
  buddy_id?: string | null;
  child_name: string | null;
  age: number | null;
  neurotypes: string[] | null;
  total_entries: number | string | null;
  entries_last_7_days: number | string | null;
  total_alerts: number | string | null;
  high_alerts: number | string | null;
  trusted_adults_count: number | string | null;
  profile_completion: number | string | null;
}

type AiAnalysis = {
  emotion?: unknown;
  riskLevel?: unknown;
  risk_level?: unknown;
  sentimentScore?: unknown;
  sentiment_score?: unknown;
  mood?: unknown;
  moodScore?: unknown;
  mood_score?: unknown;
  focus?: unknown;
  focusScore?: unknown;
  focus_score?: unknown;
  calm?: unknown;
  calmScore?: unknown;
  calm_score?: unknown;
  signalId?: unknown;
  signal_id?: unknown;
  signalLabel?: unknown;
  signal_label?: unknown;
  signalCategory?: unknown;
  signal_category?: unknown;
  supportLevel?: unknown;
  support_level?: unknown;
  parentInsight?: unknown;
  parent_insight?: unknown;
  suggestedAction?: unknown;
  suggested_action?: unknown;
  activityLabel?: unknown;
  activity_label?: unknown;
  source?: unknown;
};

interface JournalEntryRow {
  id: string;
  child_id: string;
  emotion: string | null;
  text: string | null;
  ai_analysis: AiAnalysis | null;
  risk_level: string | null;
  created_at: string;
}

interface AlertRow {
  id: string;
  child_id: string;
  risk_level: string | null;
  created_at: string;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  journal_entries?: { text?: string | null } | { text?: string | null }[] | null;
}

interface TrustedAdultRow {
  id: string;
  child_id: string;
  adult_id: string | null;
  name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
}

interface ParentMessageRow {
  id: string;
  child_id: string;
  sender_id: string;
  recipient_id: string | null;
  body: string;
  urgency: string | null;
  ai_summary: string | null;
  ai_talking_points: string[] | null;
  created_at: string;
  read_at: string | null;
}

interface CareMeetingRow {
  id: string;
  child_id: string;
  requested_by: string;
  assigned_to: string | null;
  meeting_type: string;
  status: string | null;
  urgency: string | null;
  proposed_times: unknown;
  scheduled_at: string | null;
  agenda: unknown;
  notes: string | null;
  action_items: unknown;
  created_at: string;
}

interface SupportGoalRow {
  id: string;
  child_id: string;
  title: string;
  category: string | null;
  description: string | null;
  progress: number | null;
  status: string | null;
  target_date: string | null;
  ai_suggestion: { suggestion?: unknown } | string | null;
  created_at: string;
}

interface ParentResourceRow {
  id: string;
  child_id: string;
  title: string;
  resource_type: string | null;
  url: string | null;
  summary: string;
  neurotypes: string[] | null;
  reason: string | null;
  reading_level: string | null;
}

interface ChildSignalRow {
  id: string;
  child_id: string;
  emotion: string;
  color: string | null;
  note: string | null;
  created_at: string;
  seen_at: string | null;
}

interface ParentFeedbackRow {
  sentiment: string | null;
  themes: unknown;
}

interface BuddyLinkRow {
  child_id: string;
  child_name: string | null;
  buddy_id: string | null;
  relationship: string | null;
  created_at: string;
}

interface UnlinkChildRow {
  child_id: string;
  child_name: string | null;
  buddy_id: string | null;
}

interface ParentTeacherClassRequestRpcRow {
  request_id: string;
  child_id: string;
  class_id: string;
  class_name: string | null;
  school_name: string | null;
  subject: string | null;
  year_group: string | null;
  teacher_id: string;
  teacher_name: string | null;
  teacher_email: string | null;
  requested_buddy_id: string | null;
  request_method: string | null;
  status: string | null;
  parent_approved: boolean | null;
  teacher_approved: boolean | null;
  visibility_settings: unknown;
  teacher_approved_by?: string | null;
  teacher_approved_at?: string | null;
  teacher_approved_by_name?: string | null;
  parent_approved_by?: string | null;
  parent_approved_at?: string | null;
  parent_approved_by_name?: string | null;
  approved_at?: string | null;
  declined_by?: string | null;
  declined_at?: string | null;
  declined_by_name?: string | null;
  created_at: string;
}

interface ParentAssignmentSummaryRpcRow {
  assignment_id: string;
  child_id: string;
  child_name: string | null;
  class_id: string;
  class_name: string | null;
  school_name: string | null;
  teacher_id: string;
  teacher_name: string | null;
  teacher_email: string | null;
  title: string;
  description: string | null;
  assignment_type: string | null;
  support_tools: string[] | null;
  due_at: string | null;
  created_at: string;
  status: string | null;
  support_used: string[] | null;
  mood_after_task: string | null;
  updated_at: string | null;
}

const riskLevels: RiskLevel[] = ['low', 'medium', 'high'];
const dayFormatter = new Intl.DateTimeFormat('en-GB', { weekday: 'short' });

const isSchemaUnavailableError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? String((error as { code?: string }).code) : '';
  const message =
    'message' in error ? String((error as { message?: string }).message).toLowerCase() : '';

  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    code === 'PGRST202' ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('could not find the table') ||
    message.includes('could not find the function')
  );
};

const logOptionalTableWarning = (table: string, error: unknown): void => {
  console.warn(`[ParentDashboard] ${table} is unavailable; returning empty data.`, error);
};

const toNumber = (value: number | string | null | undefined, fallback = 0): number => {
  const next = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(next) ? Number(next) : fallback;
};

const clampScore = (value: unknown): number | null => {
  const numeric = typeof value === 'string' ? Number(value) : value;
  if (typeof numeric !== 'number' || !Number.isFinite(numeric)) return null;

  if (numeric >= -1 && numeric <= 1) {
    return Math.round(((numeric + 1) / 2) * 100);
  }

  return Math.round(Math.min(100, Math.max(0, numeric)));
};

const normalizeRiskLevel = (value: unknown): RiskLevel =>
  typeof value === 'string' && riskLevels.includes(value as RiskLevel)
    ? (value as RiskLevel)
    : 'low';

const normalizeTrustedAdultStatus = (value: unknown): TrustedAdultStatus => {
  if (value === 'active' || value === 'connected' || value === 'pending' || value === 'inactive') {
    return value;
  }

  return 'pending';
};

const normalizeMessageUrgency = (value: unknown): ParentMessage['urgency'] => {
  if (value === 'normal' || value === 'support' || value === 'urgent') return value;
  return 'normal';
};

const normalizeMeetingStatus = (value: unknown): CareMeeting['status'] => {
  if (value === 'requested' || value === 'scheduled' || value === 'completed' || value === 'cancelled') {
    return value;
  }

  return 'requested';
};

const normalizeMeetingUrgency = (value: unknown): CareMeeting['urgency'] => {
  if (value === 'routine' || value === 'soon' || value === 'urgent') return value;
  return 'routine';
};

const normalizeGoalStatus = (value: unknown): SupportGoal['status'] => {
  if (value === 'active' || value === 'paused' || value === 'completed') return value;
  return 'active';
};

const normalizeResourceType = (value: unknown): ParentResource['resourceType'] => {
  if (value === 'article' || value === 'video' || value === 'worksheet' || value === 'strategy' || value === 'printable') {
    return value;
  }

  return 'article';
};

const normalizeReadingLevel = (value: unknown): ParentResource['readingLevel'] => {
  if (value === 'child' || value === 'parent' || value === 'teacher' || value === 'clinician') return value;
  return 'parent';
};

const normalizeFeedbackSentiment = (value: unknown): ParentFeedbackTheme['sentiment'] => {
  if (value === 'positive' || value === 'neutral' || value === 'concerned') return value;
  return 'neutral';
};

const parentAssignmentStatuses = ['not_started', 'in_progress', 'needs_help', 'completed', 'submitted'] as const;

const normalizeAssignmentStatus = (value: unknown): ParentAssignmentStatus =>
  parentAssignmentStatuses.includes(value as ParentAssignmentStatus)
    ? (value as ParentAssignmentStatus)
    : 'not_started';

const parentAssignmentTypes = [
  'reading',
  'maths',
  'writing',
  'calm_break',
  'visual_routine',
  'social_story',
  'task',
] as const;

const normalizeAssignmentType = (value: unknown): ParentAssignmentType =>
  parentAssignmentTypes.includes(value as ParentAssignmentType)
    ? (value as ParentAssignmentType)
    : 'task';

const defaultTeacherVisibilitySettings: TeacherClassVisibilitySettings = {
  childName: false,
  neuroProfile: true,
  dailyMood: 'summary',
  worryDiaryText: false,
  safeguardingAlerts: true,
  academicTasks: true,
  personalNotes: false,
};

const normalizeTeacherRequestStatus = (value: unknown): TeacherClassRequestStatus => {
  if (
    value === 'pending' ||
    value === 'pending_parent' ||
    value === 'pending_teacher' ||
    value === 'approved' ||
    value === 'declined' ||
    value === 'cancelled'
  ) {
    return value;
  }

  return 'pending';
};

const normalizeTeacherVisibility = (value: unknown): TeacherClassVisibilitySettings => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaultTeacherVisibilitySettings;
  const raw = value as Record<string, unknown>;
  const dailyMood =
    raw.dailyMood === 'hidden' || raw.dailyMood === 'summary' || raw.dailyMood === 'full'
      ? raw.dailyMood
      : defaultTeacherVisibilitySettings.dailyMood;

  return {
    childName: raw.childName === true,
    neuroProfile: raw.neuroProfile !== false,
    dailyMood,
    worryDiaryText: raw.worryDiaryText === true,
    safeguardingAlerts: raw.safeguardingAlerts !== false,
    academicTasks: raw.academicTasks !== false,
    personalNotes: raw.personalNotes === true,
  };
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  return [];
};

const getAnalysisValue = (
  analysis: AiAnalysis | null,
  keys: Array<keyof AiAnalysis>,
): unknown => {
  if (!analysis) return undefined;
  return keys.map((key) => analysis[key]).find((value) => value !== undefined && value !== null);
};

const getStringAnalysisValue = (
  analysis: AiAnalysis | null,
  keys: Array<keyof AiAnalysis>,
): string | undefined => {
  const value = getAnalysisValue(analysis, keys);
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
};

const getEntrySignalLabel = (entry: Pick<JournalEntry, 'signalLabel' | 'emotion'>): string =>
  entry.signalLabel || entry.emotion;

const scoreFromEmotion = (emotion: string): number | null => {
  switch (emotion.toLowerCase()) {
    case 'happy':
    case 'excited':
    case 'good':
      return 88;
    case 'calm':
    case 'okay':
      return 74;
    case 'tired':
      return 58;
    case 'sad':
    case 'angry':
    case 'frustrated':
      return 38;
    case 'anxious':
    case 'worried':
    case 'confused':
    case 'too noisy':
    case 'too bright':
    case 'i need help':
      return 32;
    default:
      return null;
  }
};

const mapChildSummary = (row: ParentSummaryRow): ChildSummary => ({
  childId: row.child_id,
  buddyId: row.buddy_id ?? null,
  childName: row.child_name || 'Child',
  age: row.age ?? undefined,
  neurotypes: Array.isArray(row.neurotypes) ? row.neurotypes : [],
  totalEntries: toNumber(row.total_entries),
  entriesLast7Days: toNumber(row.entries_last_7_days),
  totalAlerts: toNumber(row.total_alerts),
  highAlerts: toNumber(row.high_alerts),
  trustedAdultsCount: toNumber(row.trusted_adults_count),
  profileCompletion: toNumber(row.profile_completion),
  wellbeingScore: null,
  wellbeingChange: null,
});

const mapJournalEntry = (
  row: JournalEntryRow,
  childNames: Map<string, string>,
): JournalEntry => {
  const emotion = row.emotion || String(getAnalysisValue(row.ai_analysis, ['emotion']) ?? 'unspecified');
  const signalLabel = getStringAnalysisValue(row.ai_analysis, ['signalLabel', 'signal_label']);
  const moodScore =
    clampScore(getAnalysisValue(row.ai_analysis, ['moodScore', 'mood_score', 'mood', 'sentimentScore', 'sentiment_score']))
    ?? scoreFromEmotion(signalLabel ?? emotion);

  return {
    id: row.id,
    childId: row.child_id,
    childName: childNames.get(row.child_id),
    emotion,
    signalId: getStringAnalysisValue(row.ai_analysis, ['signalId', 'signal_id']),
    signalLabel,
    signalCategory: getStringAnalysisValue(row.ai_analysis, ['signalCategory', 'signal_category']),
    supportLevel: getStringAnalysisValue(row.ai_analysis, ['supportLevel', 'support_level']),
    parentInsight: getStringAnalysisValue(row.ai_analysis, ['parentInsight', 'parent_insight']),
    suggestedAction: getStringAnalysisValue(row.ai_analysis, ['suggestedAction', 'suggested_action']),
    text: row.text || '',
    riskLevel: normalizeRiskLevel(row.risk_level ?? getAnalysisValue(row.ai_analysis, ['riskLevel', 'risk_level'])),
    createdAt: row.created_at,
    moodScore,
    focusScore: clampScore(getAnalysisValue(row.ai_analysis, ['focusScore', 'focus_score', 'focus'])),
    calmScore: clampScore(getAnalysisValue(row.ai_analysis, ['calmScore', 'calm_score', 'calm'])),
  };
};

const getJoinedJournalEntry = (row: AlertRow): { text?: string | null } | null => {
  if (!row.journal_entries) return null;
  return Array.isArray(row.journal_entries) ? row.journal_entries[0] ?? null : row.journal_entries;
};

const mapAlert = (row: AlertRow): Alert => ({
  id: row.id,
  childId: row.child_id,
  riskLevel: normalizeRiskLevel(row.risk_level),
  journalEntryText: getJoinedJournalEntry(row)?.text || 'No journal text attached.',
  createdAt: row.created_at,
  acknowledged: Boolean(row.acknowledged_at || row.acknowledged_by),
});

const mapTrustedAdult = (row: TrustedAdultRow): TrustedAdult => ({
  id: row.adult_id || row.id,
  childId: row.child_id,
  name: row.name || 'Trusted adult',
  email: row.email || '',
  phone: row.phone || undefined,
  relationship: row.role || 'trusted adult',
  status: normalizeTrustedAdultStatus(row.status),
});

const mapParentMessage = (row: ParentMessageRow): ParentMessage => ({
  id: row.id,
  childId: row.child_id,
  senderId: row.sender_id,
  recipientId: row.recipient_id ?? undefined,
  body: row.body,
  urgency: normalizeMessageUrgency(row.urgency),
  aiSummary: row.ai_summary ?? undefined,
  aiTalkingPoints: row.ai_talking_points ?? [],
  createdAt: row.created_at,
  readAt: row.read_at ?? undefined,
});

const mapCareMeeting = (row: CareMeetingRow): CareMeeting => ({
  id: row.id,
  childId: row.child_id,
  requestedBy: row.requested_by,
  assignedTo: row.assigned_to ?? undefined,
  meetingType: row.meeting_type,
  status: normalizeMeetingStatus(row.status),
  urgency: normalizeMeetingUrgency(row.urgency),
  proposedTimes: toStringArray(row.proposed_times),
  scheduledAt: row.scheduled_at ?? undefined,
  agenda: toStringArray(row.agenda),
  notes: row.notes ?? undefined,
  actionItems: toStringArray(row.action_items),
  createdAt: row.created_at,
});

const mapSupportGoal = (row: SupportGoalRow): SupportGoal => {
  const suggestion =
    typeof row.ai_suggestion === 'string'
      ? row.ai_suggestion
      : typeof row.ai_suggestion?.suggestion === 'string'
        ? row.ai_suggestion.suggestion
        : undefined;

  return {
    id: row.id,
    childId: row.child_id,
    title: row.title,
    category: row.category ?? 'wellbeing',
    description: row.description ?? undefined,
    progress: Math.min(100, Math.max(0, row.progress ?? 0)),
    status: normalizeGoalStatus(row.status),
    targetDate: row.target_date ?? undefined,
    aiSuggestion: suggestion,
    createdAt: row.created_at,
  };
};

const mapParentResource = (row: ParentResourceRow): ParentResource => ({
  id: row.id,
  childId: row.child_id,
  title: row.title,
  resourceType: normalizeResourceType(row.resource_type),
  url: row.url ?? undefined,
  summary: row.summary,
  neurotypes: Array.isArray(row.neurotypes) ? row.neurotypes : [],
  reason: row.reason ?? undefined,
  readingLevel: normalizeReadingLevel(row.reading_level),
});

const mapChildSignal = (row: ChildSignalRow): ChildSignal => ({
  id: row.id,
  childId: row.child_id,
  emotion: row.emotion,
  color: row.color ?? 'blue',
  note: row.note ?? undefined,
  createdAt: row.created_at,
  seenAt: row.seen_at ?? undefined,
});

const mapBuddyLinkResult = (row: BuddyLinkRow): BuddyLinkResult => ({
  childId: row.child_id,
  childName: row.child_name || 'Child',
  buddyId: row.buddy_id || '',
  relationship: row.relationship || 'parent',
  createdAt: row.created_at,
});

const mapUnlinkChildResult = (row: UnlinkChildRow): UnlinkChildResult => ({
  childId: row.child_id,
  childName: row.child_name || 'Child',
  buddyId: row.buddy_id ?? null,
});

const mapParentTeacherClassRequest = (row: ParentTeacherClassRequestRpcRow): TeacherClassRequest => ({
  id: row.request_id,
  childId: row.child_id,
  classId: row.class_id,
  className: row.class_name || 'Class',
  schoolName: row.school_name || '',
  subject: row.subject || 'General',
  yearGroup: row.year_group || '',
  teacherId: row.teacher_id,
  teacherName: row.teacher_name || row.teacher_email || 'Teacher',
  teacherEmail: row.teacher_email || '',
  requestedBuddyId: row.requested_buddy_id,
  requestMethod: row.request_method || 'buddy_id',
  status: normalizeTeacherRequestStatus(row.status),
  parentApproved: row.parent_approved === true,
  teacherApproved: row.teacher_approved === true,
  visibilitySettings: normalizeTeacherVisibility(row.visibility_settings),
  teacherApprovedBy: row.teacher_approved_by ?? null,
  teacherApprovedAt: row.teacher_approved_at ?? null,
  teacherApprovedByName: row.teacher_approved_by_name ?? null,
  parentApprovedBy: row.parent_approved_by ?? null,
  parentApprovedAt: row.parent_approved_at ?? null,
  parentApprovedByName: row.parent_approved_by_name ?? null,
  approvedAt: row.approved_at ?? null,
  declinedBy: row.declined_by ?? null,
  declinedAt: row.declined_at ?? null,
  declinedByName: row.declined_by_name ?? null,
  createdAt: row.created_at,
});

const mapParentAssignmentSummary = (
  row: ParentAssignmentSummaryRpcRow,
  childNames: Map<string, string>,
): ParentAssignmentSummary => ({
  id: row.assignment_id,
  childId: row.child_id,
  childName: row.child_name || childNames.get(row.child_id) || 'Child',
  classId: row.class_id,
  className: row.class_name || 'Class',
  schoolName: row.school_name || '',
  teacherId: row.teacher_id,
  teacherName: row.teacher_name || row.teacher_email || 'Teacher',
  teacherEmail: row.teacher_email || '',
  title: row.title,
  description: row.description ?? undefined,
  assignmentType: normalizeAssignmentType(row.assignment_type),
  supportTools: row.support_tools ?? [],
  dueAt: row.due_at ?? undefined,
  createdAt: row.created_at,
  status: normalizeAssignmentStatus(row.status),
  supportUsed: row.support_used ?? [],
  moodAfterTask: row.mood_after_task ?? undefined,
  updatedAt: row.updated_at ?? undefined,
});

const createEmptyTrendWindow = (): WellbeingTrendPoint[] => {
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setHours(0, 0, 0, 0);
    date.setDate(today.getDate() - (6 - index));
    const isoDate = date.toISOString().slice(0, 10);

    return {
      day: dayFormatter.format(date),
      date: isoDate,
      mood: 0,
      focus: 0,
      calm: 0,
    };
  });
};

const buildWellbeingTrends = (entries: JournalEntry[]): Record<string, WellbeingTrendPoint[]> => {
  const entriesByChild = entries.reduce<Record<string, JournalEntry[]>>((acc, entry) => {
    acc[entry.childId] = acc[entry.childId] ?? [];
    acc[entry.childId].push(entry);
    return acc;
  }, {});

  return Object.fromEntries(
    Object.entries(entriesByChild).map(([childId, childEntries]) => {
      const window = createEmptyTrendWindow();

      const next = window.map((point) => {
        const entriesForDay = childEntries.filter((entry) => entry.createdAt.slice(0, 10) === point.date);
        if (entriesForDay.length === 0) return point;

        const average = (values: Array<number | null>) => {
          const numbers = values.filter((value): value is number => value !== null);
          if (numbers.length === 0) return 0;
          return Math.round(numbers.reduce((sum, value) => sum + value, 0) / numbers.length);
        };

        const mood = average(entriesForDay.map((entry) => entry.moodScore));

        return {
          ...point,
          mood,
          focus: average(entriesForDay.map((entry) => entry.focusScore)) || Math.max(0, mood - 8),
          calm: average(entriesForDay.map((entry) => entry.calmScore)) || Math.max(0, mood - 4),
        };
      });

      return [childId, next.filter((point) => point.mood > 0 || point.focus > 0 || point.calm > 0)];
    }),
  );
};

const applyWellbeingToChildren = (
  children: ChildSummary[],
  trends: Record<string, WellbeingTrendPoint[]>,
): ChildSummary[] =>
  children.map((child) => {
    const childTrends = trends[child.childId] ?? [];
    if (childTrends.length === 0) return child;

    const latest = childTrends[childTrends.length - 1];
    const first = childTrends[0];
    const wellbeingScore = Math.round((latest.mood + latest.focus + latest.calm) / 3);
    const previousScore = Math.round((first.mood + first.focus + first.calm) / 3);

    return {
      ...child,
      wellbeingScore,
      wellbeingChange: wellbeingScore - previousScore,
    };
  });

const buildAiDigest = (
  children: ChildSummary[],
  entries: JournalEntry[],
  alerts: Alert[],
  goals: SupportGoal[],
): ParentAiDigest => {
  const primaryChild = children[0];
  const childName = primaryChild?.childName ?? 'your child';
  const recentEntries = entries.slice(0, 20);
  const scoredEntries = recentEntries.filter((entry) => entry.moodScore !== null);
  const happyWeekPercentage =
    scoredEntries.length > 0
      ? Math.round((scoredEntries.filter((entry) => (entry.moodScore ?? 0) >= 70).length / scoredEntries.length) * 100)
      : null;

  const emotionCounts = recentEntries.reduce<Record<string, number>>((acc, entry) => {
    const label = getEntrySignalLabel(entry);
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});
  const highestEmotion =
    Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'not enough data yet';
  const sensorySignals = recentEntries.filter((entry) => entry.signalCategory === 'sensory').length;
  const cognitiveSignals = recentEntries.filter((entry) => entry.signalCategory === 'cognitive').length;
  const urgentSupportSignals = recentEntries.filter((entry) => entry.supportLevel === 'urgent').length;

  const unresolvedAlerts = alerts.filter((alert) => !alert.acknowledged);
  const highAlerts = unresolvedAlerts.filter((alert) => alert.riskLevel === 'high').length;
  const mediumAlerts = unresolvedAlerts.filter((alert) => alert.riskLevel === 'medium').length;
  const completedGoals = goals.filter((goal) => goal.status === 'completed').length;
  const activeGoals = goals.filter((goal) => goal.status === 'active').length;

  const suggestion =
    urgentSupportSignals > 0 || highAlerts > 0
      ? `Check in gently with ${childName} today and consider involving a trusted adult.`
      : sensorySignals >= 2
        ? `Look for sensory load around recent tasks; headphones, lower lighting, or a quieter transition may help.`
        : cognitiveSignals >= 2
          ? `Try one-step instructions with a visual example before the next difficult task.`
      : mediumAlerts > 1
        ? `Plan a short parent-teacher check-in to compare what home and school are seeing.`
        : happyWeekPercentage !== null && happyWeekPercentage >= 70
          ? `Keep the current routine steady; it seems to be supporting regulation.`
          : `Try a predictable after-school reset: snack, movement, then one small task.`;

  return {
    headline:
      happyWeekPercentage === null
        ? `Buddy Digest is ready once ${childName} has a few check-ins.`
        : `${childName} had a ${happyWeekPercentage}% regulated week.`,
    happyWeekPercentage,
    highestEmotion,
    alertSummary:
      unresolvedAlerts.length === 0
        ? 'No unresolved safeguarding alerts.'
        : `${unresolvedAlerts.length} unresolved alert${unresolvedAlerts.length === 1 ? '' : 's'}: ${highAlerts} high, ${mediumAlerts} medium.`,
    learningProgress:
      activeGoals + completedGoals === 0
        ? 'No shared goals yet.'
        : `${completedGoals} completed goal${completedGoals === 1 ? '' : 's'}, ${activeGoals} active.`,
    suggestion,
    talkingPoints: [
      `What helped ${childName} feel most regulated this week?`,
      urgentSupportSignals > 0 || highAlerts > 0
        ? 'Which adult should follow up on the high-priority signal?'
        : sensorySignals >= 2
          ? 'Where are the noisy, bright, or crowded moments showing up?'
          : cognitiveSignals >= 2
            ? 'Which instructions need visual support or smaller steps?'
            : 'Are home and school seeing the same pattern?',
      activeGoals > 0 ? 'Which goal needs the smallest next step?' : 'What one goal should we agree together?',
    ],
  };
};

const buildProactiveInsights = (
  children: ChildSummary[],
  trends: Record<string, WellbeingTrendPoint[]>,
  alerts: Alert[],
  entries: JournalEntry[],
): ProactiveInsight[] =>
  children.flatMap((child) => {
    const childTrends = trends[child.childId] ?? [];
    const childAlerts = alerts.filter((alert) => alert.childId === child.childId && !alert.acknowledged);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentChildEntries = entries.filter((entry) => {
      const timestamp = new Date(entry.createdAt).getTime();
      return entry.childId === child.childId && Number.isFinite(timestamp) && timestamp >= weekAgo;
    });
    const sensoryEntries = recentChildEntries.filter((entry) => entry.signalCategory === 'sensory');
    const cognitiveEntries = recentChildEntries.filter((entry) => entry.signalCategory === 'cognitive');
    const urgentSupportEntries = recentChildEntries.filter((entry) => entry.supportLevel === 'urgent');
    const emotionalConcernEntries = recentChildEntries.filter((entry) => {
      const label = getEntrySignalLabel(entry).toLowerCase();
      return entry.signalCategory === 'emotional' && ['worried', 'frustrated'].includes(label);
    });
    const insights: ProactiveInsight[] = [];

    if (childAlerts.some((alert) => alert.riskLevel === 'high')) {
      insights.push({
        id: `${child.childId}-high-alert`,
        childId: child.childId,
        priority: 'high',
        title: 'High-priority support needed',
        detail: `${child.childName} has an unresolved high-priority alert.`,
        suggestedAction: 'Acknowledge the alert and choose a trusted adult to follow up today.',
      });
    }

    if (urgentSupportEntries.length > 0 && !insights.some((insight) => insight.priority === 'high')) {
      insights.push({
        id: `${child.childId}-needs-help`,
        childId: child.childId,
        priority: 'high',
        title: 'Child asked for help',
        detail: `${child.childName} used an "I need help" signal recently.`,
        suggestedAction: 'Check in directly and confirm which trusted adult is available today.',
      });
    }

    if (sensoryEntries.length >= 2) {
      const labels = Array.from(new Set(sensoryEntries.map((entry) => getEntrySignalLabel(entry)))).join(', ');
      insights.push({
        id: `${child.childId}-sensory-pattern`,
        childId: child.childId,
        priority: 'medium',
        title: 'Sensory load pattern',
        detail: `${child.childName} has ${sensoryEntries.length} sensory signal${sensoryEntries.length === 1 ? '' : 's'} this week${labels ? ` (${labels})` : ''}.`,
        suggestedAction: 'Review noise, brightness, crowding, and transitions around these tasks.',
      });
    }

    if (cognitiveEntries.length >= 2) {
      insights.push({
        id: `${child.childId}-confusion-pattern`,
        childId: child.childId,
        priority: 'medium',
        title: 'Instruction clarity needed',
        detail: `${child.childName} signalled confusion more than once this week.`,
        suggestedAction: 'Use one-step instructions, a worked example, and a visual cue before the task starts.',
      });
    }

    if (emotionalConcernEntries.length >= 2) {
      insights.push({
        id: `${child.childId}-emotional-concern-pattern`,
        childId: child.childId,
        priority: 'medium',
        title: 'Repeated emotional strain',
        detail: `${child.childName} signalled worry or frustration repeatedly this week.`,
        suggestedAction: 'Compare the timing with school/home routines and lower demand before the next transition.',
      });
    }

    if (childTrends.length >= 3) {
      const lastThree = childTrends.slice(-3);
      const average = Math.round(
        lastThree.reduce((sum, point) => sum + (point.mood + point.focus + point.calm) / 3, 0) / lastThree.length,
      );

      if (average < 55) {
        insights.push({
          id: `${child.childId}-dip`,
          childId: child.childId,
          priority: 'medium',
          title: 'Possible regulation dip',
          detail: `${child.childName}'s recent mood/focus/calm average is ${average}%.`,
          suggestedAction: 'Try a low-demand check-in and look for schedule changes around this period.',
        });
      }
    }

    if (child.entriesLast7Days === 0) {
      insights.push({
        id: `${child.childId}-no-checkins`,
        childId: child.childId,
        priority: 'low',
        title: 'No journal check-ins this week',
        detail: `${child.childName} has not shared a journal check-in in the last 7 days.`,
        suggestedAction: 'Invite a pressure-free emoji check-in instead of asking for a long explanation.',
      });
    }

    return insights;
  });

const buildGeneratedResources = (children: ChildSummary[]): ParentResource[] =>
  children.flatMap((child) => {
    const neurotypes = child.neurotypes.length > 0 ? child.neurotypes : ['neurodiverse'];
    const hasAutism = neurotypes.includes('autism');
    const hasAdhd = neurotypes.includes('adhd');
    const hasDyslexia = neurotypes.includes('dyslexia');

    const resources: ParentResource[] = [
      {
        id: `${child.childId}-resource-support-plan`,
        childId: child.childId,
        title: 'One-page support plan',
        resourceType: 'printable',
        summary: 'A simple home-school summary of triggers, calming tools, communication preferences, and trusted adults.',
        neurotypes,
        reason: 'Useful before teacher meetings and clinical conversations.',
        readingLevel: 'parent',
        generated: true,
      },
    ];

    if (hasAutism) {
      resources.push({
        id: `${child.childId}-resource-transitions`,
        childId: child.childId,
        title: 'Visual transition routine',
        resourceType: 'strategy',
        summary: 'Use Now/Next/Later language with a short warning timer before changing activities.',
        neurotypes: ['autism'],
        reason: 'Recommended because visual predictability can reduce transition stress.',
        readingLevel: 'parent',
        generated: true,
      });
    }

    if (hasAdhd) {
      resources.push({
        id: `${child.childId}-resource-movement`,
        childId: child.childId,
        title: 'Movement-before-work routine',
        resourceType: 'strategy',
        summary: 'Try a 5-minute movement reset before homework or focus-heavy tasks.',
        neurotypes: ['adhd'],
        reason: 'Recommended for energy regulation and task initiation.',
        readingLevel: 'parent',
        generated: true,
      });
    }

    if (hasDyslexia) {
      resources.push({
        id: `${child.childId}-resource-reading`,
        childId: child.childId,
        title: 'Low-pressure reading support',
        resourceType: 'strategy',
        summary: 'Use read-aloud, tinted backgrounds, and short paired reading sessions.',
        neurotypes: ['dyslexia'],
        reason: 'Recommended to reduce reading fatigue and shame.',
        readingLevel: 'parent',
        generated: true,
      });
    }

    return resources;
  });

const buildFeedbackThemes = (rows: ParentFeedbackRow[]): ParentFeedbackTheme[] => {
  const themes = new Map<string, ParentFeedbackTheme>();

  rows.forEach((row) => {
    const sentiment = normalizeFeedbackSentiment(row.sentiment);
    const rowThemes = toStringArray(row.themes);

    rowThemes.forEach((theme) => {
      const existing = themes.get(theme);
      themes.set(theme, {
        theme,
        count: (existing?.count ?? 0) + 1,
        sentiment: existing?.sentiment === 'concerned' || sentiment === 'concerned' ? 'concerned' : sentiment,
      });
    });
  });

  return Array.from(themes.values()).sort((a, b) => b.count - a.count).slice(0, 5);
};

export class ParentDashboardService {
  static async linkChildByBuddyId(
    buddyId: string,
    relationship = 'parent',
  ): Promise<BuddyLinkResult> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured, so Buddy ID linking is unavailable.');
    }

    const cleanBuddyId = buddyId.trim();
    if (!cleanBuddyId) {
      throw new Error('Enter a Buddy ID first.');
    }

    const { data, error } = await getSupabaseClient().rpc('link_child_by_buddy_id', {
      p_buddy_id: cleanBuddyId,
      p_relationship: relationship,
    });

    if (error) throw error;

    const rows = Array.isArray(data) ? (data as BuddyLinkRow[]) : data ? [data as BuddyLinkRow] : [];
    const row = rows[0];
    if (!row) throw new Error('No child profile was linked.');

    return mapBuddyLinkResult(row);
  }

  static async unlinkChild(childId: string): Promise<UnlinkChildResult> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured, so removing a child is unavailable.');
    }

    const cleanChildId = childId.trim();
    if (!cleanChildId) {
      throw new Error('Select a child to remove.');
    }

    const { data, error } = await getSupabaseClient().rpc('unlink_child_from_parent', {
      p_child_id: cleanChildId,
    });

    if (error) throw error;

    const rows = Array.isArray(data) ? (data as UnlinkChildRow[]) : data ? [data as UnlinkChildRow] : [];
    const row = rows[0];
    if (!row) throw new Error('No child profile was removed.');

    return mapUnlinkChildResult(row);
  }

  static async approveTeacherClassRequest(
    requestId: string,
    visibilitySettings: TeacherClassVisibilitySettings = defaultTeacherVisibilitySettings,
  ): Promise<void> {
    if (!isSupabaseConfigured || !requestId) return;

    const { error } = await getSupabaseClient().rpc('parent_approve_class_join_request', {
      p_request_id: requestId,
      p_visibility_settings: visibilitySettings,
    });

    if (error) throw error;
  }

  static async declineTeacherClassRequest(requestId: string): Promise<void> {
    if (!isSupabaseConfigured || !requestId) return;

    const { error } = await getSupabaseClient().rpc('parent_decline_class_join_request', {
      p_request_id: requestId,
    });

    if (error) throw error;
  }

  static async getChildren(): Promise<ChildSummary[]> {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await getSupabaseClient()
      .from('parent_dashboard_summary')
      .select('*')
      .order('child_name', { ascending: true });

    if (error) throw error;
    return ((data ?? []) as ParentSummaryRow[]).map(mapChildSummary);
  }

  static async getRecentEntries(childId: string, limit = 10): Promise<JournalEntry[]> {
    if (!isSupabaseConfigured || !childId) return [];

    return this.getRecentEntriesForChildren([childId], new Map(), limit);
  }

  static async getAlerts(childId: string, limit = 20): Promise<Alert[]> {
    if (!isSupabaseConfigured || !childId) return [];

    return this.getAlertsForChildren([childId], limit);
  }

  static async getTrustedAdults(childId: string): Promise<TrustedAdult[]> {
    if (!isSupabaseConfigured || !childId) return [];

    return this.getTrustedAdultsForChildren([childId]);
  }

  static async acknowledgeAlert(alertId: string): Promise<void> {
    if (!isSupabaseConfigured || !alertId) return;

    const client = getSupabaseClient();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError) throw userError;

    const userId = userData.user?.id;
    if (!userId) throw new Error('You must be signed in to acknowledge an alert.');

    const { error } = await client
      .from('alerts')
      .update({
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString(),
      })
      .eq('id', alertId);

    if (error) throw error;
  }

  static async getDashboardSummary(): Promise<DashboardSummary> {
    const children = await this.getChildren();
    const childNames = new Map(children.map((child) => [child.childId, child.childName]));
    const childIds = children.map((child) => child.childId);

    if (childIds.length === 0) {
      return {
        children,
        recentEntries: [],
        recentAlerts: [],
        trustedAdults: [],
        wellbeingTrends: {},
        messages: [],
        meetings: [],
        goals: [],
        resources: [],
        childSignals: [],
        teacherClassRequests: [],
        assignmentSummaries: [],
        aiDigest: buildAiDigest([], [], [], []),
        proactiveInsights: [],
        parentFeedbackThemes: [],
      };
    }

    const [
      recentEntries,
      recentAlerts,
      trustedAdults,
      messages,
      meetings,
      goals,
      savedResources,
      childSignals,
      parentFeedbackThemes,
      teacherClassRequests,
      assignmentSummaries,
    ] = await Promise.all([
      this.getRecentEntriesForChildren(childIds, childNames, 30),
      this.getAlertsForChildren(childIds, 20),
      this.getTrustedAdultsForChildren(childIds),
      this.getMessagesForChildren(childIds, 12),
      this.getMeetingsForChildren(childIds),
      this.getGoalsForChildren(childIds),
      this.getResourcesForChildren(childIds),
      this.getSignalsForChildren(childIds),
      this.getParentFeedbackThemes(),
      this.getTeacherClassRequestsForChildren(childIds),
      this.getAssignmentSummariesForChildren(childIds, childNames),
    ]);

    const wellbeingTrends = buildWellbeingTrends(recentEntries);
    const enrichedChildren = applyWellbeingToChildren(children, wellbeingTrends);
    const resources = [...savedResources, ...buildGeneratedResources(enrichedChildren)];

    return {
      children: enrichedChildren,
      recentEntries: recentEntries
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 12),
      recentAlerts: recentAlerts
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 12),
      trustedAdults,
      wellbeingTrends,
      messages,
      meetings,
      goals,
      resources,
      childSignals,
      teacherClassRequests,
      assignmentSummaries,
      aiDigest: buildAiDigest(enrichedChildren, recentEntries, recentAlerts, goals),
      proactiveInsights: buildProactiveInsights(enrichedChildren, wellbeingTrends, recentAlerts, recentEntries),
      parentFeedbackThemes,
    };
  }

  static async sendParentTeacherMessage(
    childId: string,
    body: string,
    recipientId?: string,
    urgency: ParentMessage['urgency'] = 'normal',
  ): Promise<ParentMessage | null> {
    if (!isSupabaseConfigured || !childId || !body.trim()) return null;

    const client = getSupabaseClient();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError) throw userError;
    const userId = userData.user?.id;
    if (!userId) throw new Error('You must be signed in to send a message.');

    const talkingPoints = this.suggestMessageTalkingPoints(body);

    const { data, error } = await client
      .from('parent_teacher_messages')
      .insert({
        child_id: childId,
        sender_id: userId,
        recipient_id: recipientId ?? null,
        body: body.trim(),
        urgency,
        ai_summary: this.summarizeMessage(body),
        ai_talking_points: talkingPoints,
      })
      .select('id, child_id, sender_id, recipient_id, body, urgency, ai_summary, ai_talking_points, created_at, read_at')
      .single();

    if (error) throw error;
    return mapParentMessage(data as ParentMessageRow);
  }

  static async requestMeeting(
    childId: string,
    meetingType: string,
    agenda: string[],
    urgency: CareMeeting['urgency'] = 'routine',
  ): Promise<CareMeeting | null> {
    if (!isSupabaseConfigured || !childId) return null;

    const client = getSupabaseClient();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError) throw userError;
    const userId = userData.user?.id;
    if (!userId) throw new Error('You must be signed in to request a meeting.');

    const { data, error } = await client
      .from('care_meetings')
      .insert({
        child_id: childId,
        requested_by: userId,
        meeting_type: meetingType,
        urgency,
        agenda,
      })
      .select('id, child_id, requested_by, assigned_to, meeting_type, status, urgency, proposed_times, scheduled_at, agenda, notes, action_items, created_at')
      .single();

    if (error) throw error;
    return mapCareMeeting(data as CareMeetingRow);
  }

  static async submitParentFeedback(
    childId: string | null,
    feedbackText: string,
  ): Promise<void> {
    if (!isSupabaseConfigured || !feedbackText.trim()) return;

    const client = getSupabaseClient();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError) throw userError;
    const userId = userData.user?.id;
    if (!userId) throw new Error('You must be signed in to send feedback.');

    const lower = feedbackText.toLowerCase();
    const sentiment: ParentFeedbackTheme['sentiment'] =
      /worried|hard|difficult|confusing|problem|issue|concern|stuck/.test(lower)
        ? 'concerned'
        : /love|great|helpful|easy|better|amazing|good/.test(lower)
          ? 'positive'
          : 'neutral';
    const themes = [
      lower.includes('reading') ? 'reading' : null,
      lower.includes('teacher') || lower.includes('school') ? 'school communication' : null,
      lower.includes('alert') || lower.includes('worry') ? 'safeguarding' : null,
      lower.includes('music') || lower.includes('calm') ? 'calming tools' : null,
      lower.includes('login') || lower.includes('account') ? 'account access' : null,
    ].filter((theme): theme is string => Boolean(theme));

    const { error } = await client.from('parent_feedback').insert({
      parent_id: userId,
      child_id: childId,
      feedback_text: feedbackText.trim(),
      sentiment,
      themes,
    });

    if (error) throw error;
  }

  private static async getRecentEntriesForChildren(
    childIds: string[],
    childNames: Map<string, string>,
    limit: number,
  ): Promise<JournalEntry[]> {
    if (!isSupabaseConfigured || childIds.length === 0) return [];

    const { data, error } = await getSupabaseClient()
      .from('journal_entries')
      .select('id, child_id, emotion, text, ai_analysis, risk_level, created_at')
      .in('child_id', childIds)
      .eq('is_shared', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return ((data ?? []) as JournalEntryRow[]).map((row) => mapJournalEntry(row, childNames));
  }

  private static async getAlertsForChildren(childIds: string[], limit: number): Promise<Alert[]> {
    if (!isSupabaseConfigured || childIds.length === 0) return [];

    const { data, error } = await getSupabaseClient()
      .from('alerts')
      .select('id, child_id, risk_level, created_at, acknowledged_by, acknowledged_at, journal_entries(text)')
      .in('child_id', childIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return ((data ?? []) as AlertRow[]).map(mapAlert);
  }

  private static async getTrustedAdultsForChildren(childIds: string[]): Promise<TrustedAdult[]> {
    if (!isSupabaseConfigured || childIds.length === 0) return [];

    const { data, error } = await getSupabaseClient()
      .from('trusted_adults')
      .select('id, child_id, adult_id, name, role, email, phone, status')
      .in('child_id', childIds)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return ((data ?? []) as TrustedAdultRow[]).map(mapTrustedAdult);
  }

  private static async getMessagesForChildren(childIds: string[], limit: number): Promise<ParentMessage[]> {
    if (!isSupabaseConfigured || childIds.length === 0) return [];

    const { data, error } = await getSupabaseClient()
      .from('parent_teacher_messages')
      .select('id, child_id, sender_id, recipient_id, body, urgency, ai_summary, ai_talking_points, created_at, read_at')
      .in('child_id', childIds)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      if (isSchemaUnavailableError(error)) {
        logOptionalTableWarning('parent_teacher_messages', error);
        return [];
      }
      throw error;
    }
    return ((data ?? []) as ParentMessageRow[]).map(mapParentMessage);
  }

  private static async getMeetingsForChildren(childIds: string[]): Promise<CareMeeting[]> {
    if (!isSupabaseConfigured || childIds.length === 0) return [];

    const { data, error } = await getSupabaseClient()
      .from('care_meetings')
      .select('id, child_id, requested_by, assigned_to, meeting_type, status, urgency, proposed_times, scheduled_at, agenda, notes, action_items, created_at')
      .in('child_id', childIds)
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) {
      if (isSchemaUnavailableError(error)) {
        logOptionalTableWarning('care_meetings', error);
        return [];
      }
      throw error;
    }
    return ((data ?? []) as CareMeetingRow[]).map(mapCareMeeting);
  }

  private static async getGoalsForChildren(childIds: string[]): Promise<SupportGoal[]> {
    if (!isSupabaseConfigured || childIds.length === 0) return [];

    const { data, error } = await getSupabaseClient()
      .from('support_goals')
      .select('id, child_id, title, category, description, progress, status, target_date, ai_suggestion, created_at')
      .in('child_id', childIds)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      if (isSchemaUnavailableError(error)) {
        logOptionalTableWarning('support_goals', error);
        return [];
      }
      throw error;
    }
    return ((data ?? []) as SupportGoalRow[]).map(mapSupportGoal);
  }

  private static async getResourcesForChildren(childIds: string[]): Promise<ParentResource[]> {
    if (!isSupabaseConfigured || childIds.length === 0) return [];

    const { data, error } = await getSupabaseClient()
      .from('parent_resource_recommendations')
      .select('id, child_id, title, resource_type, url, summary, neurotypes, reason, reading_level')
      .in('child_id', childIds)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      if (isSchemaUnavailableError(error)) {
        logOptionalTableWarning('parent_resource_recommendations', error);
        return [];
      }
      throw error;
    }
    return ((data ?? []) as ParentResourceRow[]).map(mapParentResource);
  }

  private static async getSignalsForChildren(childIds: string[]): Promise<ChildSignal[]> {
    if (!isSupabaseConfigured || childIds.length === 0) return [];

    const { data, error } = await getSupabaseClient()
      .from('parent_child_signals')
      .select('id, child_id, emotion, color, note, created_at, seen_at')
      .in('child_id', childIds)
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) {
      if (isSchemaUnavailableError(error)) {
        logOptionalTableWarning('parent_child_signals', error);
        return [];
      }
      throw error;
    }
    return ((data ?? []) as ChildSignalRow[]).map(mapChildSignal);
  }

  private static async getTeacherClassRequestsForChildren(childIds: string[]): Promise<TeacherClassRequest[]> {
    if (!isSupabaseConfigured || childIds.length === 0) return [];

    const { data, error } = await getSupabaseClient().rpc('parent_teacher_class_requests', {
      p_child_ids: childIds,
    });

    if (error) {
      if (isSchemaUnavailableError(error)) {
        logOptionalTableWarning('parent_teacher_class_requests', error);
        return [];
      }
      throw error;
    }

    return ((data ?? []) as ParentTeacherClassRequestRpcRow[]).map(mapParentTeacherClassRequest);
  }

  private static async getAssignmentSummariesForChildren(
    childIds: string[],
    childNames: Map<string, string>,
  ): Promise<ParentAssignmentSummary[]> {
    if (!isSupabaseConfigured || childIds.length === 0) return [];

    const { data, error } = await getSupabaseClient().rpc('parent_assignment_summaries', {
      p_child_ids: childIds,
    });

    if (error) {
      if (isSchemaUnavailableError(error)) {
        logOptionalTableWarning('parent_assignment_summaries', error);
        return [];
      }
      throw error;
    }

    return ((data ?? []) as ParentAssignmentSummaryRpcRow[]).map((row) =>
      mapParentAssignmentSummary(row, childNames),
    );
  }

  private static async getParentFeedbackThemes(): Promise<ParentFeedbackTheme[]> {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await getSupabaseClient()
      .from('parent_feedback')
      .select('sentiment, themes')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      if (isSchemaUnavailableError(error)) {
        logOptionalTableWarning('parent_feedback', error);
        return [];
      }
      throw error;
    }
    return buildFeedbackThemes((data ?? []) as ParentFeedbackRow[]);
  }

  private static summarizeMessage(body: string): string {
    const words = body.trim().split(/\s+/);
    if (words.length <= 18) return body.trim();
    return `${words.slice(0, 18).join(' ')}...`;
  }

  private static suggestMessageTalkingPoints(body: string): string[] {
    const lower = body.toLowerCase();
    const points = new Set<string>();

    if (/anxious|worry|worried|stress|stressed/.test(lower)) {
      points.add('Ask what happens before the anxiety appears.');
      points.add('Agree one calming support that works both at home and school.');
    }
    if (/math|reading|spell|homework|lesson/.test(lower)) {
      points.add('Ask which learning format reduced frustration.');
      points.add('Request one small adaptation for the next week.');
    }
    if (/noise|loud|crowd|sensory/.test(lower)) {
      points.add('Discuss sensory triggers and quiet-space access.');
    }

    if (points.size === 0) {
      points.add('Share one observation from home.');
      points.add('Ask whether the same pattern appears at school.');
    }

    return Array.from(points).slice(0, 4);
  }
}
