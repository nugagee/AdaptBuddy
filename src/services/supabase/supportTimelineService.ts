import { getSupabaseClient, isSupabaseConfigured, type Profile, type UserRole } from 'services/supabase/client';

export type SupportTimelineKind =
  | 'signal'
  | 'alert'
  | 'adult_response'
  | 'assignment'
  | 'message'
  | 'meeting'
  | 'class_request';

export type SupportTimelineSeverity = 'low' | 'medium' | 'high' | 'urgent';

export interface SupportTimelineItem {
  id: string;
  kind: SupportTimelineKind;
  childId?: string;
  childName: string;
  buddyId?: string | null;
  title: string;
  detail: string;
  status?: string;
  severity: SupportTimelineSeverity;
  actorLabel: string;
  evidenceLabel: string;
  createdAt: string;
}

export interface SupportTimelineOptions {
  childIds?: string[];
  limit?: number;
}

export interface SupportResponseMetrics {
  sourceCount: number;
  responseEventCount: number;
  seenCount: number;
  respondedCount: number;
  resolvedCount: number;
  escalatedCount: number;
  openAlertCount: number;
  averageFirstResponseMinutes: number | null;
  averageSeenMinutes: number | null;
  averageRespondedMinutes: number | null;
  averageResolvedMinutes: number | null;
  fastestResponseMinutes: number | null;
  latestResponseAt?: string;
}

export interface SupportTimelineBundle {
  items: SupportTimelineItem[];
  metrics: SupportResponseMetrics;
}

interface ProfileRow {
  id: string;
  email?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  child_name?: string | null;
  buddy_id?: string | null;
  role?: UserRole | null;
}

interface ChildRelationshipRow {
  child_id: string;
}

interface TeacherClassRow {
  id: string;
}

interface ClassMembershipRow {
  child_id: string;
}

interface JournalEntryRow {
  id: string;
  child_id: string;
  emotion?: string | null;
  text?: string | null;
  ai_analysis?: Record<string, unknown> | null;
  risk_level?: string | null;
  created_at: string;
}

interface AlertRow {
  id: string;
  child_id: string;
  risk_level?: string | null;
  created_at: string;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
}

interface AssignmentSubmissionRow {
  assignment_id: string;
  child_id: string;
  status?: string | null;
  support_used?: string[] | null;
  mood_after_task?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  submitted_at?: string | null;
  teacher_assignments?: { title?: string | null } | { title?: string | null }[] | null;
}

interface ParentTeacherMessageRow {
  id: string;
  child_id: string;
  sender_id: string;
  urgency?: string | null;
  ai_summary?: string | null;
  body?: string | null;
  created_at: string;
}

interface CareMeetingRow {
  id: string;
  child_id: string;
  requested_by: string;
  status?: string | null;
  urgency?: string | null;
  meeting_type?: string | null;
  created_at: string;
}

interface ClassRequestRow {
  id: string;
  child_id: string;
  status?: string | null;
  parent_approved?: boolean | null;
  teacher_approved?: boolean | null;
  created_at: string;
}

interface NotificationEventRow {
  id: string;
  user_id: string;
  source_type: string;
  source_id: string;
  status?: string | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

interface SourceInfo {
  childId?: string;
  title?: string;
  detail?: string;
  severity?: SupportTimelineSeverity;
  createdAt?: string;
}

const supportSourceTypes = [
  'alert',
  'journal_signal',
  'teacher_message',
  'care_meeting',
  'class_request',
  'assignment_help',
  'adult_response',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeSeverity(value: unknown): SupportTimelineSeverity {
  const normalized = asString(value, 'low').toLowerCase();
  if (normalized === 'urgent') return 'urgent';
  if (normalized === 'high') return 'high';
  if (normalized === 'medium' || normalized === 'support') return 'medium';
  return 'low';
}

function labelize(value: string): string {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function summarize(value: unknown, fallback: string): string {
  const text = asString(value, fallback);
  return text.length > 150 ? `${text.slice(0, 149)}...` : text;
}

function getDisplayName(profile?: ProfileRow, fallback = 'Learner'): string {
  if (!profile) return fallback;
  const fullName = asString(profile.full_name);
  if (fullName) return fullName;
  const composed = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  if (composed) return composed;
  return asString(profile.child_name, asString(profile.email, fallback));
}

async function safeRows<T>(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  try {
    const { data, error } = await query;
    if (error) return [];
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

async function getProfiles(ids: string[]): Promise<Map<string, ProfileRow>> {
  const cleanIds = Array.from(new Set(ids.filter(Boolean)));
  if (cleanIds.length === 0) return new Map();

  const rows = await safeRows<ProfileRow>(
    getSupabaseClient()
      .from('profiles')
      .select('id, email, full_name, first_name, last_name, child_name, buddy_id, role')
      .in('id', cleanIds),
  );

  return new Map(rows.map((profile) => [profile.id, profile]));
}

async function getScopedChildIds(profile: Profile): Promise<string[]> {
  if (profile.role === 'child') return [profile.id];

  if (profile.role === 'parent') {
    const [relationships, trustedAdults] = await Promise.all([
      safeRows<ChildRelationshipRow>(
        getSupabaseClient().from('child_relationships').select('child_id').eq('parent_id', profile.id),
      ),
      safeRows<ChildRelationshipRow>(
        getSupabaseClient()
          .from('trusted_adults')
          .select('child_id')
          .eq('adult_id', profile.id)
          .in('status', ['active', 'connected']),
      ),
    ]);

    return Array.from(new Set([...relationships, ...trustedAdults].map((row) => row.child_id).filter(Boolean)));
  }

  if (profile.role === 'teacher') {
    const classes = await safeRows<TeacherClassRow>(
      getSupabaseClient().from('teacher_classes').select('id').eq('teacher_id', profile.id),
    );
    const classIds = classes.map((row) => row.id);
    if (classIds.length === 0) return [];

    const memberships = await safeRows<ClassMembershipRow>(
      getSupabaseClient()
        .from('class_memberships')
        .select('child_id')
        .in('class_id', classIds)
        .eq('status', 'active'),
    );

    return Array.from(new Set(memberships.map((row) => row.child_id).filter(Boolean)));
  }

  if (profile.role === 'admin') {
    const children = await safeRows<ProfileRow>(
      getSupabaseClient()
        .from('profiles')
        .select('id')
        .eq('role', 'child')
        .order('created_at', { ascending: false })
        .limit(120),
    );

    return children.map((child) => child.id);
  }

  return [];
}

function filterChildIds(scopedChildIds: string[], requestedChildIds?: string[]): string[] {
  if (!requestedChildIds?.length) return scopedChildIds;
  const scoped = new Set(scopedChildIds);
  return Array.from(new Set(requestedChildIds.filter((id) => scoped.has(id))));
}

function mapChild(
  childId: string | undefined,
  profiles: Map<string, ProfileRow>,
): Pick<SupportTimelineItem, 'childId' | 'childName' | 'buddyId'> {
  const profile = childId ? profiles.get(childId) : undefined;
  return {
    childId,
    childName: getDisplayName(profile),
    buddyId: profile?.buddy_id ?? null,
  };
}

function sourceKey(sourceType: string, sourceId: string): string {
  return `${sourceType}:${sourceId}`;
}

function createEmptyMetrics(overrides: Partial<SupportResponseMetrics> = {}): SupportResponseMetrics {
  return {
    sourceCount: 0,
    responseEventCount: 0,
    seenCount: 0,
    respondedCount: 0,
    resolvedCount: 0,
    escalatedCount: 0,
    openAlertCount: 0,
    averageFirstResponseMinutes: null,
    averageSeenMinutes: null,
    averageRespondedMinutes: null,
    averageResolvedMinutes: null,
    fastestResponseMinutes: null,
    ...overrides,
  };
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 10) / 10;
}

function minutesBetween(start?: string | null, end?: string | null): number | null {
  const startTime = new Date(start ?? '').getTime();
  const endTime = new Date(end ?? '').getTime();
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return null;
  return Math.max(0, Math.round(((endTime - startTime) / 60000) * 10) / 10);
}

export class SupportTimelineService {
  static async getTimelineBundle(
    profile: Profile,
    options: SupportTimelineOptions = {},
  ): Promise<SupportTimelineBundle> {
    const [items, metrics] = await Promise.all([
      this.getTimeline(profile, options),
      this.getResponseMetrics(profile, options),
    ]);

    return { items, metrics };
  }

  static async getTimeline(profile: Profile, options: SupportTimelineOptions = {}): Promise<SupportTimelineItem[]> {
    if (!isSupabaseConfigured || !profile?.id) return this.getGuestTimeline(options.childIds?.[0]);

    const scopedChildIds = await getScopedChildIds(profile);
    const childIds = filterChildIds(scopedChildIds, options.childIds);
    if (childIds.length === 0 && profile.role !== 'admin') return [];

    const limit = options.limit ?? 36;
    const [profiles, journalRows, alertRows, assignmentRows, messageRows, meetingRows, classRequestRows, eventRows] =
      await Promise.all([
        getProfiles([profile.id, ...childIds]),
        this.getJournalRows(childIds, limit),
        this.getAlertRows(childIds, limit),
        this.getAssignmentRows(childIds, limit),
        this.getMessageRows(childIds, limit),
        this.getMeetingRows(childIds, limit),
        this.getClassRequestRows(childIds, limit),
        this.getNotificationEvents(profile, limit),
      ]);

    profiles.set(profile.id, profile as ProfileRow);

    const sourceInfo = new Map<string, SourceInfo>();
    const timeline: SupportTimelineItem[] = [];

    journalRows.forEach((row) => {
      const analysis = isRecord(row.ai_analysis) ? row.ai_analysis : {};
      const label = asString(analysis.signalLabel, row.emotion ?? 'support signal');
      const severity = asString(analysis.supportLevel) === 'urgent' ? 'urgent' : normalizeSeverity(row.risk_level);
      sourceInfo.set(sourceKey('journal_signal', row.id), {
        childId: row.child_id,
        title: label,
        detail: summarize(row.text, 'Shared check-in was saved.'),
        severity,
        createdAt: row.created_at,
      });
      timeline.push({
        id: sourceKey('signal', row.id),
        kind: 'signal',
        ...mapChild(row.child_id, profiles),
        title: `${labelize(label)} signal created`,
        detail: summarize(row.text, 'A shared support signal was saved.'),
        status: labelize(asString(analysis.supportLevel, row.risk_level ?? 'low')),
        severity,
        actorLabel: 'Child',
        evidenceLabel: 'Journal signal',
        createdAt: row.created_at,
      });
    });

    alertRows.forEach((row) => {
      const severity = normalizeSeverity(row.risk_level);
      sourceInfo.set(sourceKey('alert', row.id), {
        childId: row.child_id,
        title: `${labelize(severity)} alert`,
        detail: row.acknowledged_at ? 'Alert acknowledged by an adult.' : 'Alert is awaiting adult acknowledgement.',
        severity,
        createdAt: row.created_at,
      });
      timeline.push({
        id: sourceKey('alert', row.id),
        kind: 'alert',
        ...mapChild(row.child_id, profiles),
        title: `${labelize(severity)} alert raised`,
        detail: row.acknowledged_at ? 'Alert acknowledged by an adult.' : 'Alert is awaiting adult acknowledgement.',
        status: row.acknowledged_at ? 'Acknowledged' : 'Open',
        severity,
        actorLabel: 'System',
        evidenceLabel: 'Safeguarding alert',
        createdAt: row.created_at,
      });
    });

    assignmentRows.forEach((row) => {
      const title = this.getAssignmentTitle(row);
      const status = asString(row.status, 'updated');
      const severity = status === 'needs_help' ? 'medium' : 'low';
      sourceInfo.set(sourceKey('assignment_help', row.assignment_id), {
        childId: row.child_id,
        title,
        detail: `Assignment status: ${labelize(status)}.`,
        severity,
        createdAt: row.updated_at || row.submitted_at || row.created_at || undefined,
      });
      timeline.push({
        id: `${sourceKey('assignment', row.assignment_id)}:${row.child_id}`,
        kind: 'assignment',
        ...mapChild(row.child_id, profiles),
        title: `${title}: ${labelize(status)}`,
        detail: [
          row.mood_after_task ? `Mood after task: ${row.mood_after_task}.` : null,
          row.support_used?.length ? `Support used: ${row.support_used.map(labelize).join(', ')}.` : null,
        ].filter(Boolean).join(' ') || 'Assignment progress was updated.',
        status: labelize(status),
        severity,
        actorLabel: 'Child',
        evidenceLabel: 'Assignment progress',
        createdAt: row.updated_at || row.submitted_at || row.created_at || new Date().toISOString(),
      });
    });

    messageRows.forEach((row) => {
      const severity = normalizeSeverity(row.urgency);
      sourceInfo.set(sourceKey('teacher_message', row.id), {
        childId: row.child_id,
        title: 'Family-school message',
        detail: summarize(row.ai_summary || row.body, 'Message was sent.'),
        severity,
        createdAt: row.created_at,
      });
      timeline.push({
        id: sourceKey('message', row.id),
        kind: 'message',
        ...mapChild(row.child_id, profiles),
        title: 'Family-school message sent',
        detail: summarize(row.ai_summary || row.body, 'Message was sent.'),
        status: labelize(asString(row.urgency, 'normal')),
        severity,
        actorLabel: row.sender_id === profile.id ? 'You' : 'Care team',
        evidenceLabel: 'Communication',
        createdAt: row.created_at,
      });
    });

    meetingRows.forEach((row) => {
      const severity = normalizeSeverity(row.urgency);
      sourceInfo.set(sourceKey('care_meeting', row.id), {
        childId: row.child_id,
        title: `${labelize(asString(row.meeting_type, 'support'))} meeting`,
        detail: `Meeting status: ${labelize(asString(row.status, 'requested'))}.`,
        severity,
        createdAt: row.created_at,
      });
      timeline.push({
        id: sourceKey('meeting', row.id),
        kind: 'meeting',
        ...mapChild(row.child_id, profiles),
        title: `${labelize(asString(row.meeting_type, 'support'))} meeting requested`,
        detail: `Meeting status: ${labelize(asString(row.status, 'requested'))}.`,
        status: labelize(asString(row.status, 'requested')),
        severity,
        actorLabel: row.requested_by === profile.id ? 'You' : 'Care team',
        evidenceLabel: 'Meeting',
        createdAt: row.created_at,
      });
    });

    classRequestRows.forEach((row) => {
      sourceInfo.set(sourceKey('class_request', row.id), {
        childId: row.child_id,
        title: 'School access request',
        detail: `Request status: ${labelize(asString(row.status, 'pending'))}.`,
        severity: 'medium',
        createdAt: row.created_at,
      });
      timeline.push({
        id: sourceKey('class_request', row.id),
        kind: 'class_request',
        ...mapChild(row.child_id, profiles),
        title: 'School access request updated',
        detail: `Parent approved: ${row.parent_approved ? 'yes' : 'no'} · Teacher approved: ${row.teacher_approved ? 'yes' : 'no'}.`,
        status: labelize(asString(row.status, 'pending')),
        severity: 'medium',
        actorLabel: 'School access',
        evidenceLabel: 'Privacy gate',
        createdAt: row.created_at,
      });
    });

    eventRows.forEach((row) => {
      const metadata = isRecord(row.metadata) ? row.metadata : {};
      const originalSourceType = asString(metadata.original_source_type, row.source_type);
      const sourceId = asString(metadata.original_source_id, row.source_id);
      const info = sourceInfo.get(sourceKey(originalSourceType, sourceId)) ?? sourceInfo.get(sourceKey(row.source_type, row.source_id));
      const metadataChildId = asString(metadata.child_id);
      const childId = info?.childId ?? (metadataChildId || undefined);
      if (childIds.length > 0 && childId && !childIds.includes(childId)) return;

      const actor = row.user_id === profile.id ? 'You' : getDisplayName(profiles.get(row.user_id), 'Adult');
      const status = asString(row.status, 'updated');
      const isChildResponse = row.source_type === 'adult_response';
      timeline.push({
        id: sourceKey('event', row.id),
        kind: isChildResponse ? 'adult_response' : this.kindForSource(row.source_type),
        ...mapChild(childId, profiles),
        title: isChildResponse
          ? `Child reassurance: ${labelize(asString(metadata.adult_status, status))}`
          : `${labelize(status)}: ${info?.title ?? asString(metadata.title, labelize(row.source_type))}`,
        detail: summarize(row.note, info?.detail ?? 'Notification response recorded.'),
        status: labelize(status),
        severity: info?.severity ?? normalizeSeverity(metadata.severity ?? metadata.adult_status ?? status),
        actorLabel: isChildResponse ? 'System to child' : actor,
        evidenceLabel: isChildResponse ? 'Child reassurance' : 'Notification receipt',
        createdAt: row.created_at,
      });
    });

    return timeline
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  static async getResponseMetrics(
    profile: Profile,
    options: SupportTimelineOptions = {},
  ): Promise<SupportResponseMetrics> {
    if (!isSupabaseConfigured || !profile?.id) return this.getGuestMetrics();

    const scopedChildIds = await getScopedChildIds(profile);
    const childIds = filterChildIds(scopedChildIds, options.childIds);
    if (childIds.length === 0 && profile.role !== 'admin') return createEmptyMetrics();

    const limit = Math.max(options.limit ?? 36, 80);
    const [journalRows, alertRows, assignmentRows, messageRows, meetingRows, classRequestRows, eventRows] =
      await Promise.all([
        this.getJournalRows(childIds, limit),
        this.getAlertRows(childIds, limit),
        this.getAssignmentRows(childIds, limit),
        this.getMessageRows(childIds, limit),
        this.getMeetingRows(childIds, limit),
        this.getClassRequestRows(childIds, limit),
        this.getNotificationEvents(profile, limit),
      ]);

    const sourceInfo = new Map<string, SourceInfo>();
    const registerSource = (sourceType: string, sourceId: string, childId?: string, createdAt?: string | null) => {
      if (!sourceId) return;
      sourceInfo.set(sourceKey(sourceType, sourceId), {
        childId,
        createdAt: createdAt ?? undefined,
      });
    };

    journalRows.forEach((row) => registerSource('journal_signal', row.id, row.child_id, row.created_at));
    alertRows.forEach((row) => registerSource('alert', row.id, row.child_id, row.created_at));
    assignmentRows.forEach((row) => {
      registerSource(
        'assignment_help',
        row.assignment_id,
        row.child_id,
        row.updated_at || row.submitted_at || row.created_at,
      );
    });
    messageRows.forEach((row) => registerSource('teacher_message', row.id, row.child_id, row.created_at));
    meetingRows.forEach((row) => registerSource('care_meeting', row.id, row.child_id, row.created_at));
    classRequestRows.forEach((row) => registerSource('class_request', row.id, row.child_id, row.created_at));

    const childScope = new Set(childIds);
    const firstResponseBySource = new Map<string, number>();
    const seenDurations: number[] = [];
    const respondedDurations: number[] = [];
    const resolvedDurations: number[] = [];
    const allDurations: number[] = [];
    let responseEventCount = 0;
    let seenCount = 0;
    let respondedCount = 0;
    let resolvedCount = 0;
    let escalatedCount = 0;
    let latestResponseAt: string | undefined;

    eventRows.forEach((row) => {
      const metadata = isRecord(row.metadata) ? row.metadata : {};
      const originalSourceType = asString(metadata.original_source_type, row.source_type);
      const originalSourceId = asString(metadata.original_source_id, row.source_id);
      const originalKey = sourceKey(originalSourceType, originalSourceId);
      const fallbackKey = sourceKey(row.source_type, row.source_id);
      const info = sourceInfo.get(originalKey) ?? sourceInfo.get(fallbackKey);
      const metadataChildId = asString(metadata.child_id);
      const childId = info?.childId ?? (metadataChildId || undefined);

      if (childScope.size > 0 && childId && !childScope.has(childId)) return;
      if (childScope.size > 0 && !childId && profile.role !== 'admin') return;

      const status = asString(row.status).toLowerCase();
      if (!['seen', 'responded', 'resolved', 'escalated'].includes(status)) return;

      responseEventCount += 1;
      if (status === 'seen') seenCount += 1;
      if (status === 'responded') respondedCount += 1;
      if (status === 'resolved') resolvedCount += 1;
      if (status === 'escalated') escalatedCount += 1;

      if (!latestResponseAt || new Date(row.created_at).getTime() > new Date(latestResponseAt).getTime()) {
        latestResponseAt = row.created_at;
      }

      const duration = minutesBetween(info?.createdAt, row.created_at);
      if (duration === null) return;

      allDurations.push(duration);
      const sourceResponseKey = info ? originalKey : fallbackKey;
      const previousFirst = firstResponseBySource.get(sourceResponseKey);
      if (previousFirst === undefined || duration < previousFirst) {
        firstResponseBySource.set(sourceResponseKey, duration);
      }

      if (status === 'seen') seenDurations.push(duration);
      if (status === 'responded') respondedDurations.push(duration);
      if (status === 'resolved') resolvedDurations.push(duration);
    });

    return createEmptyMetrics({
      sourceCount: sourceInfo.size,
      responseEventCount,
      seenCount,
      respondedCount,
      resolvedCount,
      escalatedCount,
      openAlertCount: alertRows.filter((row) => !row.acknowledged_at && !row.acknowledged_by).length,
      averageFirstResponseMinutes: average(Array.from(firstResponseBySource.values())),
      averageSeenMinutes: average(seenDurations),
      averageRespondedMinutes: average(respondedDurations),
      averageResolvedMinutes: average(resolvedDurations),
      fastestResponseMinutes: allDurations.length ? Math.min(...allDurations) : null,
      latestResponseAt,
    });
  }

  private static async getJournalRows(childIds: string[], limit: number): Promise<JournalEntryRow[]> {
    if (childIds.length === 0) return [];
    return safeRows<JournalEntryRow>(
      getSupabaseClient()
        .from('journal_entries')
        .select('id, child_id, emotion, text, ai_analysis, risk_level, created_at')
        .in('child_id', childIds)
        .eq('is_shared', true)
        .order('created_at', { ascending: false })
        .limit(limit),
    );
  }

  private static async getAlertRows(childIds: string[], limit: number): Promise<AlertRow[]> {
    if (childIds.length === 0) return [];
    return safeRows<AlertRow>(
      getSupabaseClient()
        .from('alerts')
        .select('id, child_id, risk_level, created_at, acknowledged_at, acknowledged_by')
        .in('child_id', childIds)
        .order('created_at', { ascending: false })
        .limit(limit),
    );
  }

  private static async getAssignmentRows(childIds: string[], limit: number): Promise<AssignmentSubmissionRow[]> {
    if (childIds.length === 0) return [];
    return safeRows<AssignmentSubmissionRow>(
      getSupabaseClient()
        .from('assignment_submissions')
        .select('assignment_id, child_id, status, support_used, mood_after_task, created_at, submitted_at, updated_at, teacher_assignments(title)')
        .in('child_id', childIds)
        .order('updated_at', { ascending: false })
        .limit(limit),
    );
  }

  private static async getMessageRows(childIds: string[], limit: number): Promise<ParentTeacherMessageRow[]> {
    if (childIds.length === 0) return [];
    return safeRows<ParentTeacherMessageRow>(
      getSupabaseClient()
        .from('parent_teacher_messages')
        .select('id, child_id, sender_id, urgency, ai_summary, body, created_at')
        .in('child_id', childIds)
        .order('created_at', { ascending: false })
        .limit(limit),
    );
  }

  private static async getMeetingRows(childIds: string[], limit: number): Promise<CareMeetingRow[]> {
    if (childIds.length === 0) return [];
    return safeRows<CareMeetingRow>(
      getSupabaseClient()
        .from('care_meetings')
        .select('id, child_id, requested_by, meeting_type, status, urgency, created_at')
        .in('child_id', childIds)
        .order('created_at', { ascending: false })
        .limit(limit),
    );
  }

  private static async getClassRequestRows(childIds: string[], limit: number): Promise<ClassRequestRow[]> {
    if (childIds.length === 0) return [];
    return safeRows<ClassRequestRow>(
      getSupabaseClient()
        .from('class_join_requests')
        .select('id, child_id, status, parent_approved, teacher_approved, created_at')
        .in('child_id', childIds)
        .order('created_at', { ascending: false })
        .limit(limit),
    );
  }

  private static async getNotificationEvents(profile: Profile, limit: number): Promise<NotificationEventRow[]> {
    let query = getSupabaseClient()
      .from('support_notification_events')
      .select('id, user_id, source_type, source_id, status, note, metadata, created_at')
      .in('source_type', supportSourceTypes)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (profile.role !== 'admin') {
      query = query.eq('user_id', profile.id);
    }

    return safeRows<NotificationEventRow>(query);
  }

  private static getAssignmentTitle(row: AssignmentSubmissionRow): string {
    const assignment = Array.isArray(row.teacher_assignments)
      ? row.teacher_assignments[0]
      : row.teacher_assignments;
    return asString(assignment?.title, 'Assignment');
  }

  private static kindForSource(sourceType: string): SupportTimelineKind {
    switch (sourceType) {
      case 'alert':
        return 'alert';
      case 'assignment_help':
        return 'assignment';
      case 'teacher_message':
        return 'message';
      case 'care_meeting':
        return 'meeting';
      case 'class_request':
        return 'class_request';
      case 'adult_response':
        return 'adult_response';
      default:
        return 'signal';
    }
  }

  private static getGuestTimeline(childId?: string): SupportTimelineItem[] {
    const now = Date.now();
    return [
      {
        id: 'guest-signal',
        kind: 'signal',
        childId,
        childName: 'Alex',
        buddyId: 'AB-DEMO-24',
        title: 'Too Noisy signal created',
        detail: 'Alex used a quiet support signal after lunch.',
        status: 'Concern',
        severity: 'medium',
        actorLabel: 'Child',
        evidenceLabel: 'Journal signal',
        createdAt: new Date(now - 18 * 60000).toISOString(),
      },
      {
        id: 'guest-response',
        kind: 'adult_response',
        childId,
        childName: 'Alex',
        buddyId: 'AB-DEMO-24',
        title: 'Seen: Too Noisy',
        detail: 'A trusted adult has seen this and knows you asked for support.',
        status: 'Seen',
        severity: 'low',
        actorLabel: 'Parent',
        evidenceLabel: 'Notification receipt',
        createdAt: new Date(now - 12 * 60000).toISOString(),
      },
      {
        id: 'guest-meeting',
        kind: 'meeting',
        childId,
        childName: 'Alex',
        buddyId: 'AB-DEMO-24',
        title: 'Teacher Signal Review meeting requested',
        detail: 'Agenda created from repeated sensory signals.',
        status: 'Requested',
        severity: 'medium',
        actorLabel: 'Teacher',
        evidenceLabel: 'Meeting',
        createdAt: new Date(now - 5 * 60000).toISOString(),
      },
    ];
  }

  private static getGuestMetrics(): SupportResponseMetrics {
    return createEmptyMetrics({
      sourceCount: 4,
      responseEventCount: 3,
      seenCount: 1,
      respondedCount: 1,
      resolvedCount: 1,
      escalatedCount: 0,
      openAlertCount: 1,
      averageFirstResponseMinutes: 6,
      averageSeenMinutes: 6,
      averageRespondedMinutes: 9,
      averageResolvedMinutes: 18,
      fastestResponseMinutes: 6,
      latestResponseAt: new Date(Date.now() - 12 * 60000).toISOString(),
    });
  }
}
