import { getSupabaseClient, isSupabaseConfigured, type Profile, type UserRole } from 'services/supabase/client';
import { ROUTES } from 'constants/routes';

export type NotificationSourceType =
  | 'alert'
  | 'journal_signal'
  | 'teacher_message'
  | 'care_meeting'
  | 'class_request'
  | 'assignment_help'
  | 'adult_response';

export type NotificationSeverity = 'low' | 'medium' | 'high' | 'urgent';
export type NotificationStatus = 'unread' | 'seen' | 'responded' | 'escalated' | 'resolved';

export interface SupportNotification {
  id: string;
  sourceType: NotificationSourceType;
  sourceId: string;
  role: UserRole;
  childId?: string;
  childName?: string;
  buddyId?: string | null;
  title: string;
  body: string;
  severity: NotificationSeverity;
  status: NotificationStatus;
  createdAt: string;
  actionUrl: string;
  actionLabel: string;
  canResolve: boolean;
  allowedStatuses?: NotificationStatus[];
}

interface ReceiptRow {
  source_type: NotificationSourceType;
  source_id: string;
  status: NotificationStatus | null;
}

interface AdultResponseReceiptRow {
  id: string;
  source_id: string;
  status: NotificationStatus | null;
  note?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string | null;
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
  teacher_id: string;
  class_name?: string | null;
  school_name?: string | null;
}

interface ClassMembershipRow {
  class_id: string;
  child_id: string;
  status?: string | null;
}

interface ClassJoinRequestRow {
  id: string;
  class_id: string;
  child_id: string;
  status?: string | null;
  parent_approved?: boolean | null;
  teacher_approved?: boolean | null;
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

interface JournalSignalRow {
  id: string;
  child_id: string;
  emotion?: string | null;
  text?: string | null;
  ai_analysis?: Record<string, unknown> | null;
  risk_level?: string | null;
  created_at: string;
}

interface ParentTeacherMessageRow {
  id: string;
  child_id: string;
  sender_id: string;
  recipient_id?: string | null;
  urgency?: string | null;
  ai_summary?: string | null;
  body?: string | null;
  read_at?: string | null;
  created_at: string;
}

interface CareMeetingRow {
  id: string;
  child_id: string;
  requested_by: string;
  assigned_to?: string | null;
  meeting_type?: string | null;
  status?: string | null;
  urgency?: string | null;
  created_at: string;
}

interface TeacherAssignmentRow {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
}

interface AssignmentSubmissionRow {
  assignment_id: string;
  child_id: string;
  status?: string | null;
  mood_after_task?: string | null;
  updated_at?: string | null;
  submitted_at?: string | null;
}

interface NotificationContext {
  userId: string;
  role: UserRole;
  profile: Profile;
  profileMap: Map<string, ProfileRow>;
  receipts: Map<string, NotificationStatus>;
}

const pendingRequestStatuses = ['pending', 'pending_parent', 'pending_teacher'];
const unresolvedStatuses: NotificationStatus[] = ['unread', 'seen', 'escalated'];

function sourceKey(sourceType: NotificationSourceType, sourceId: string): string {
  return `${sourceType}:${sourceId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getDisplayName(profile?: ProfileRow, fallback = 'Learner'): string {
  if (!profile) return fallback;
  const fullName = asString(profile.full_name);
  if (fullName) return fullName;
  const composed = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  if (composed) return composed;
  return asString(profile.child_name, asString(profile.email, fallback));
}

function summarizeText(value: unknown, fallback: string): string {
  const text = asString(value, fallback);
  return text.length > 130 ? `${text.slice(0, 129)}...` : text;
}

function normalizeSeverity(value: unknown): NotificationSeverity {
  const normalized = asString(value, 'low').toLowerCase();
  if (normalized === 'urgent') return 'urgent';
  if (normalized === 'high') return 'high';
  if (normalized === 'medium' || normalized === 'support') return 'medium';
  return 'low';
}

function statusFor(ctx: NotificationContext, sourceType: NotificationSourceType, sourceId: string): NotificationStatus {
  return ctx.receipts.get(sourceKey(sourceType, sourceId)) ?? 'unread';
}

function adultResponseTitle(status: string): string {
  switch (status) {
    case 'seen':
      return 'An adult has seen your signal';
    case 'responded':
      return 'An adult responded to your signal';
    case 'escalated':
      return 'An adult is getting extra support';
    case 'resolved':
      return 'Your support signal was resolved';
    default:
      return 'A trusted adult responded';
  }
}

function buildChildResponseNote(notification: SupportNotification, status: NotificationStatus): string {
  switch (status) {
    case 'seen':
      return 'A trusted adult has seen this and knows you asked for support.';
    case 'responded':
      return 'A trusted adult has responded. You do not have to hold this alone.';
    case 'escalated':
      return 'A trusted adult is getting extra support so the right person can help.';
    case 'resolved':
      return 'A trusted adult marked this as resolved. You can ask again if you still need help.';
    default:
      return 'A trusted adult has responded to your support signal.';
  }
}

function getMeetingUrgencyForNotification(notification: SupportNotification): 'routine' | 'soon' | 'urgent' {
  if (notification.severity === 'urgent' || notification.severity === 'high') return 'urgent';
  if (notification.severity === 'medium' || notification.status === 'escalated') return 'soon';
  return 'routine';
}

function getStructuredSupportSuggestion(notification: SupportNotification): string {
  const text = `${notification.title} ${notification.body} ${notification.sourceType}`.toLowerCase();

  if (notification.severity === 'urgent' || notification.severity === 'high' || /safeguard|risk|alert/.test(text)) {
    return 'Confirm the safeguarding response, who has checked in with the child, and what follow-up is needed today.';
  }
  if (/noise|noisy|loud|sound/.test(text)) {
    return 'Agree a sensory plan for noise: quieter seat, headphones, reduced verbal load, and a predictable reset option.';
  }
  if (/bright|light|glare|visual/.test(text)) {
    return 'Agree visual comfort adjustments: reduce glare, simplify the visual field, and offer a low-light reset if needed.';
  }
  if (/confused|stuck|unclear|instruction/.test(text)) {
    return 'Agree how adults will break work into one visible step at a time and check understanding without pressure.';
  }
  if (/worried|anxious|overwhelm|panic/.test(text)) {
    return 'Agree a calm check-in plan, predictable next step, and a low-demand recovery option.';
  }
  if (/assignment|task|homework|needs help/.test(text)) {
    return 'Agree task support: smaller steps, clear success criteria, and whether the child needs adult help before continuing.';
  }
  if (/message|meeting|family|teacher/.test(text)) {
    return 'Clarify the family-school next step, owner, and follow-up date so the concern does not drift.';
  }

  return 'Agree one home action, one school action, and the adult responsible for follow-up.';
}

function buildMeetingAgenda(notification: SupportNotification): string[] {
  return [
    `Review support item: ${notification.title}.`,
    `Current level: ${notification.severity}. Current status: ${notification.status}.`,
    `Shared detail: ${notification.body}`,
    getStructuredSupportSuggestion(notification),
    'Agree what the child should see next: reassurance, calm break, task adjustment, or trusted-adult follow-up.',
    'Confirm one owner, one next step, and when this will be reviewed.',
    'Privacy note: use parent-approved visibility only. Private journal text stays hidden unless explicitly shared.',
  ];
}

function buildMeetingActionItems(notification: SupportNotification): string[] {
  return [
    `Respond to ${notification.sourceType.replace(/_/g, ' ')} for ${notification.childName ?? 'the child'}.`,
    'Agree the support adjustment to try first.',
    'Record whether the support helped and close the loop with the child.',
  ];
}

function isMissingChildResponseRpc(error: unknown): boolean {
  if (!isRecord(error)) return false;
  const code = asString(error.code);
  const message = asString(error.message).toLowerCase();
  return (
    code === '42883'
    || code === 'PGRST202'
    || message.includes('notify_child_of_adult_response')
    || message.includes('could not find the function')
  );
}

function mapChildInfo(ctx: NotificationContext, childId: string): Pick<SupportNotification, 'childId' | 'childName' | 'buddyId'> {
  const child = ctx.profileMap.get(childId);
  return {
    childId,
    childName: getDisplayName(child),
    buddyId: child?.buddy_id ?? null,
  };
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

  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('id, email, full_name, first_name, last_name, child_name, buddy_id, role')
    .in('id', cleanIds);

  if (error) return new Map();
  return new Map(((data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
}

async function getReceipts(userId: string): Promise<Map<string, NotificationStatus>> {
  const rows = await safeRows<ReceiptRow>(
    getSupabaseClient()
      .from('support_notification_receipts')
      .select('source_type, source_id, status')
      .eq('user_id', userId),
  );

  return new Map(
    rows.map((receipt) => [
      sourceKey(receipt.source_type, receipt.source_id),
      receipt.status ?? 'unread',
    ]),
  );
}

async function getParentChildIds(userId: string): Promise<string[]> {
  const [relationships, trustedAdults] = await Promise.all([
    safeRows<ChildRelationshipRow>(
      getSupabaseClient().from('child_relationships').select('child_id').eq('parent_id', userId),
    ),
    safeRows<ChildRelationshipRow>(
      getSupabaseClient()
        .from('trusted_adults')
        .select('child_id')
        .eq('adult_id', userId)
        .in('status', ['active', 'connected']),
    ),
  ]);

  return Array.from(new Set([...relationships, ...trustedAdults].map((row) => row.child_id).filter(Boolean)));
}

async function getTeacherScope(userId: string): Promise<{
  classIds: string[];
  childIds: string[];
  classMap: Map<string, TeacherClassRow>;
  assignments: TeacherAssignmentRow[];
}> {
  const classes = await safeRows<TeacherClassRow>(
    getSupabaseClient()
      .from('teacher_classes')
      .select('id, teacher_id, class_name, school_name')
      .eq('teacher_id', userId),
  );
  const classIds = classes.map((row) => row.id);
  const memberships = classIds.length > 0
    ? await safeRows<ClassMembershipRow>(
        getSupabaseClient()
          .from('class_memberships')
          .select('class_id, child_id, status')
          .in('class_id', classIds)
          .eq('status', 'active'),
      )
    : [];
  const assignments = classIds.length > 0
    ? await safeRows<TeacherAssignmentRow>(
        getSupabaseClient()
          .from('teacher_assignments')
          .select('id, class_id, teacher_id, title')
          .in('class_id', classIds),
      )
    : [];

  return {
    classIds,
    childIds: Array.from(new Set(memberships.map((row) => row.child_id).filter(Boolean))),
    classMap: new Map(classes.map((row) => [row.id, row])),
    assignments,
  };
}

async function buildAlerts(ctx: NotificationContext, childIds: string[]): Promise<SupportNotification[]> {
  if (childIds.length === 0) return [];
  const alerts = await safeRows<AlertRow>(
    getSupabaseClient()
      .from('alerts')
      .select('id, child_id, risk_level, created_at, acknowledged_at, acknowledged_by')
      .in('child_id', childIds)
      .order('created_at', { ascending: false })
      .limit(20),
  );

  return alerts
    .filter((alert) => !alert.acknowledged_at && !alert.acknowledged_by)
    .map((alert) => ({
      id: sourceKey('alert', alert.id),
      sourceType: 'alert',
      sourceId: alert.id,
      role: ctx.role,
      ...mapChildInfo(ctx, alert.child_id),
      title: `${getDisplayName(ctx.profileMap.get(alert.child_id))} needs adult follow-up`,
      body: `${normalizeSeverity(alert.risk_level)} safeguarding alert is awaiting acknowledgement.`,
      severity: normalizeSeverity(alert.risk_level),
      status: statusFor(ctx, 'alert', alert.id),
      createdAt: alert.created_at,
      actionUrl: ctx.role === 'admin' ? ROUTES.ADMIN_AUDIT : ROUTES.PARENT_HUB,
      actionLabel: ctx.role === 'admin' ? 'Open audit' : 'Open alerts',
      canResolve: true,
    }));
}

async function buildJournalSignals(ctx: NotificationContext, childIds: string[]): Promise<SupportNotification[]> {
  if (childIds.length === 0) return [];
  const rows = await safeRows<JournalSignalRow>(
    getSupabaseClient()
      .from('journal_entries')
      .select('id, child_id, emotion, text, ai_analysis, risk_level, created_at')
      .in('child_id', childIds)
      .eq('is_shared', true)
      .order('created_at', { ascending: false })
      .limit(20),
  );

  return rows
    .map((row) => {
      const analysis = isRecord(row.ai_analysis) ? row.ai_analysis : {};
      const label = asString(analysis.signalLabel, row.emotion ?? 'support signal');
      const supportLevel = asString(analysis.supportLevel);
      const severity = supportLevel === 'urgent' ? 'urgent' : normalizeSeverity(row.risk_level);
      return { row, label, severity };
    })
    .filter(({ label, severity }) => {
      const lowered = label.toLowerCase();
      return severity !== 'low' || /help|worried|confused|too noisy|too bright|frustrated/.test(lowered);
    })
    .map(({ row, label, severity }) => ({
      id: sourceKey('journal_signal', row.id),
      sourceType: 'journal_signal',
      sourceId: row.id,
      role: ctx.role,
      ...mapChildInfo(ctx, row.child_id),
      title: `${getDisplayName(ctx.profileMap.get(row.child_id))}: ${label}`,
      body: summarizeText(row.text, 'Shared support signal needs a calm adult check-in.'),
      severity,
      status: statusFor(ctx, 'journal_signal', row.id),
      createdAt: row.created_at,
      actionUrl: ctx.role === 'teacher' ? ROUTES.TEACHER_SIGNALS : ctx.role === 'admin' ? ROUTES.ADMIN_AUDIT : ROUTES.PARENT_HUB,
      actionLabel: ctx.role === 'teacher' ? 'Open signals' : 'Review',
      canResolve: true,
    }));
}

async function buildMessages(ctx: NotificationContext, childIds: string[]): Promise<SupportNotification[]> {
  if (childIds.length === 0) return [];
  const rows = await safeRows<ParentTeacherMessageRow>(
    getSupabaseClient()
      .from('parent_teacher_messages')
      .select('id, child_id, sender_id, recipient_id, urgency, ai_summary, body, read_at, created_at')
      .in('child_id', childIds)
      .order('created_at', { ascending: false })
      .limit(20),
  );

  return rows
    .filter((message) => ctx.role === 'admin' || !message.read_at)
    .filter((message) => ctx.role === 'admin' || message.sender_id !== ctx.userId)
    .map((message) => {
      const senderName = getDisplayName(ctx.profileMap.get(message.sender_id), 'Adult');
      return {
        id: sourceKey('teacher_message', message.id),
        sourceType: 'teacher_message' as const,
        sourceId: message.id,
        role: ctx.role,
        ...mapChildInfo(ctx, message.child_id),
        title: `${senderName} sent a ${asString(message.urgency, 'normal')} message`,
        body: summarizeText(message.ai_summary || message.body, 'Parent-school message needs review.'),
        severity: normalizeSeverity(message.urgency),
        status: statusFor(ctx, 'teacher_message', message.id),
        createdAt: message.created_at,
        actionUrl: ctx.role === 'teacher' ? ROUTES.TEACHER_MESSAGES : ctx.role === 'admin' ? ROUTES.ADMIN_AUDIT : ROUTES.PARENT_HUB,
        actionLabel: 'Open message',
        canResolve: true,
      };
    });
}

async function buildMeetings(ctx: NotificationContext, childIds: string[]): Promise<SupportNotification[]> {
  if (childIds.length === 0) return [];
  const rows = await safeRows<CareMeetingRow>(
    getSupabaseClient()
      .from('care_meetings')
      .select('id, child_id, requested_by, assigned_to, meeting_type, status, urgency, created_at')
      .in('child_id', childIds)
      .order('created_at', { ascending: false })
      .limit(20),
  );

  return rows
    .filter((meeting) => !['completed', 'cancelled'].includes(asString(meeting.status)))
    .filter((meeting) => ctx.role === 'admin' || meeting.requested_by !== ctx.userId)
    .map((meeting) => ({
      id: sourceKey('care_meeting', meeting.id),
      sourceType: 'care_meeting',
      sourceId: meeting.id,
      role: ctx.role,
      ...mapChildInfo(ctx, meeting.child_id),
      title: `${asString(meeting.meeting_type, 'Support')} meeting requested`,
      body: `${getDisplayName(ctx.profileMap.get(meeting.child_id))} has an open ${asString(meeting.urgency, 'routine')} meeting request.`,
      severity: normalizeSeverity(meeting.urgency),
      status: statusFor(ctx, 'care_meeting', meeting.id),
      createdAt: meeting.created_at,
      actionUrl: ctx.role === 'teacher' ? ROUTES.TEACHER_MESSAGES : ctx.role === 'admin' ? ROUTES.ADMIN_AUDIT : ROUTES.PARENT_HUB,
      actionLabel: 'Open meetings',
      canResolve: true,
    }));
}

async function buildClassRequests(
  ctx: NotificationContext,
  childIds: string[],
  classIds: string[],
  classMap: Map<string, TeacherClassRow>,
): Promise<SupportNotification[]> {
  if (childIds.length === 0 && classIds.length === 0) return [];
  let query = getSupabaseClient()
    .from('class_join_requests')
    .select('id, class_id, child_id, status, parent_approved, teacher_approved, created_at')
    .in('status', pendingRequestStatuses)
    .order('created_at', { ascending: false })
    .limit(20);

  if (ctx.role === 'teacher' && classIds.length > 0) {
    query = query.in('class_id', classIds);
  } else if (childIds.length > 0) {
    query = query.in('child_id', childIds);
  }

  const rows = await safeRows<ClassJoinRequestRow>(query);

  return rows.map((request) => {
    const classRow = classMap.get(request.class_id);
    const isParentGate = request.status === 'pending_parent' || !request.parent_approved;
    const title = isParentGate ? 'Parent approval needed' : 'Teacher approval needed';
    return {
      id: sourceKey('class_request', request.id),
      sourceType: 'class_request',
      sourceId: request.id,
      role: ctx.role,
      ...mapChildInfo(ctx, request.child_id),
      title,
      body: `${getDisplayName(ctx.profileMap.get(request.child_id))} has a pending request for ${asString(classRow?.class_name, 'a class')}.`,
      severity: 'medium' as const,
      status: statusFor(ctx, 'class_request', request.id),
      createdAt: request.created_at,
      actionUrl: ctx.role === 'teacher' ? ROUTES.TEACHER_STUDENTS : ctx.role === 'admin' ? ROUTES.ADMIN_AUDIT : ROUTES.PARENT_HUB,
      actionLabel: ctx.role === 'teacher' ? 'Open students' : 'Review request',
      canResolve: false,
    };
  });
}

async function buildAssignmentHelp(
  ctx: NotificationContext,
  childIds: string[],
  assignments: TeacherAssignmentRow[],
): Promise<SupportNotification[]> {
  if (assignments.length === 0 && childIds.length === 0) return [];
  const assignmentIds = assignments.map((assignment) => assignment.id);
  let rows: AssignmentSubmissionRow[] = [];

  if (assignmentIds.length > 0) {
    rows = await safeRows<AssignmentSubmissionRow>(
      getSupabaseClient()
        .from('assignment_submissions')
        .select('assignment_id, child_id, status, mood_after_task, updated_at, submitted_at')
        .in('assignment_id', assignmentIds)
        .eq('status', 'needs_help')
        .limit(20),
    );
  } else if (childIds.length > 0) {
    rows = await safeRows<AssignmentSubmissionRow>(
      getSupabaseClient()
        .from('assignment_submissions')
        .select('assignment_id, child_id, status, mood_after_task, updated_at, submitted_at')
        .in('child_id', childIds)
        .eq('status', 'needs_help')
        .limit(20),
    );
  }

  const assignmentMap = new Map(assignments.map((assignment) => [assignment.id, assignment]));

  return rows.map((submission) => {
    const assignment = assignmentMap.get(submission.assignment_id);
    return {
      id: sourceKey('assignment_help', submission.assignment_id),
      sourceType: 'assignment_help',
      sourceId: submission.assignment_id,
      role: ctx.role,
      ...mapChildInfo(ctx, submission.child_id),
      title: `${getDisplayName(ctx.profileMap.get(submission.child_id))} needs help with a task`,
      body: `${asString(assignment?.title, 'Assignment')} is marked as needs help${submission.mood_after_task ? ` after feeling ${submission.mood_after_task}` : ''}.`,
      severity: 'medium' as const,
      status: statusFor(ctx, 'assignment_help', submission.assignment_id),
      createdAt: submission.updated_at || submission.submitted_at || new Date().toISOString(),
      actionUrl: ctx.role === 'teacher' ? ROUTES.TEACHER_ASSIGNMENTS : ctx.role === 'admin' ? ROUTES.ADMIN_AUDIT : ROUTES.PARENT_HUB,
      actionLabel: 'Open assignments',
      canResolve: true,
    };
  });
}

async function buildChildAdultResponses(ctx: NotificationContext): Promise<SupportNotification[]> {
  if (ctx.role !== 'child') return [];

  const rows = await safeRows<AdultResponseReceiptRow>(
    getSupabaseClient()
      .from('support_notification_receipts')
      .select('id, source_id, status, note, metadata, created_at, updated_at')
      .eq('user_id', ctx.userId)
      .eq('source_type', 'adult_response')
      .eq('status', 'unread')
      .order('updated_at', { ascending: false })
      .limit(12),
  );

  return rows.map((row) => {
    const metadata = isRecord(row.metadata) ? row.metadata : {};
    const adultStatus = asString(metadata.adult_status, 'responded');
    const severity: NotificationSeverity = adultStatus === 'escalated' ? 'medium' : 'low';

    return {
      id: sourceKey('adult_response', row.source_id),
      sourceType: 'adult_response',
      sourceId: row.source_id,
      role: ctx.role,
      childId: ctx.userId,
      childName: getDisplayName(ctx.profileMap.get(ctx.userId), 'You'),
      buddyId: ctx.profileMap.get(ctx.userId)?.buddy_id ?? null,
      title: adultResponseTitle(adultStatus),
      body: asString(row.note, 'A trusted adult has responded to your support signal.'),
      severity,
      status: statusFor(ctx, 'adult_response', row.source_id),
      createdAt: row.updated_at || row.created_at,
      actionUrl: ROUTES.CHILD_DASHBOARD,
      actionLabel: 'Back to dashboard',
      canResolve: false,
      allowedStatuses: ['seen'],
    };
  });
}

export class NotificationService {
  static async getNotifications(profile: Profile): Promise<SupportNotification[]> {
    if (!isSupabaseConfigured || !profile?.id) return [];

    const userId = profile.id;
    const role = profile.role;
    let childIds: string[] = [];
    let classIds: string[] = [];
    let classMap = new Map<string, TeacherClassRow>();
    let assignments: TeacherAssignmentRow[] = [];

    if (role === 'child') {
      childIds = [userId];
    } else if (role === 'parent') {
      childIds = await getParentChildIds(userId);
    } else if (role === 'teacher') {
      const teacherScope = await getTeacherScope(userId);
      childIds = teacherScope.childIds;
      classIds = teacherScope.classIds;
      classMap = teacherScope.classMap;
      assignments = teacherScope.assignments;
    } else if (role === 'admin') {
      const recentChildren = await safeRows<ProfileRow>(
        getSupabaseClient()
          .from('profiles')
          .select('id')
          .eq('role', 'child')
          .order('created_at', { ascending: false })
          .limit(80),
      );
      childIds = recentChildren.map((child) => child.id);
      const classes = await safeRows<TeacherClassRow>(
        getSupabaseClient()
          .from('teacher_classes')
          .select('id, teacher_id, class_name, school_name')
          .limit(80),
      );
      classIds = classes.map((row) => row.id);
      classMap = new Map(classes.map((row) => [row.id, row]));
      assignments = await safeRows<TeacherAssignmentRow>(
        getSupabaseClient()
          .from('teacher_assignments')
          .select('id, class_id, teacher_id, title')
          .limit(80),
      );
    }

    const profileIds = new Set<string>([userId, ...childIds]);
    assignments.forEach((assignment) => profileIds.add(assignment.teacher_id));
    const [profileMap, receipts] = await Promise.all([
      getProfiles(Array.from(profileIds)),
      getReceipts(userId),
    ]);
    profileMap.set(userId, profile as ProfileRow);

    const ctx: NotificationContext = { userId, role, profile, profileMap, receipts };

    const [
      alerts,
      journalSignals,
      messages,
      meetings,
      classRequests,
      assignmentHelp,
      childAdultResponses,
    ] = await Promise.all([
      buildAlerts(ctx, childIds),
      role === 'child' ? Promise.resolve([]) : buildJournalSignals(ctx, childIds),
      role === 'child' ? Promise.resolve([]) : buildMessages(ctx, childIds),
      role === 'child' ? Promise.resolve([]) : buildMeetings(ctx, childIds),
      role === 'child' ? Promise.resolve([]) : buildClassRequests(ctx, childIds, classIds, classMap),
      buildAssignmentHelp(ctx, childIds, assignments),
      role === 'child' ? buildChildAdultResponses(ctx) : Promise.resolve([]),
    ]);

    return [...alerts, ...journalSignals, ...messages, ...meetings, ...classRequests, ...assignmentHelp, ...childAdultResponses]
      .filter((notification) => unresolvedStatuses.includes(notification.status) || notification.severity === 'urgent')
      .sort((a, b) => {
        const severityRank: Record<NotificationSeverity, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
        const severityDelta = severityRank[b.severity] - severityRank[a.severity];
        if (severityDelta !== 0) return severityDelta;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 24);
  }

  static async setStatus(
    notification: SupportNotification,
    status: NotificationStatus,
    note?: string,
  ): Promise<void> {
    if (!isSupabaseConfigured) return;

    const client = getSupabaseClient();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError) throw userError;
    const userId = userData.user?.id;
    if (!userId) throw new Error('You must be signed in to update notifications.');

    const now = new Date().toISOString();
    const statusPatch = {
      seen_at: ['seen', 'responded', 'escalated', 'resolved'].includes(status) ? now : null,
      responded_at: status === 'responded' ? now : null,
      escalated_at: status === 'escalated' ? now : null,
      resolved_at: status === 'resolved' ? now : null,
    };
    const metadata = {
      child_id: notification.childId ?? null,
      child_name: notification.childName ?? null,
      buddy_id: notification.buddyId ?? null,
      severity: notification.severity,
      title: notification.title,
    };

    const { data: receipt, error } = await client
      .from('support_notification_receipts')
      .upsert(
        {
          user_id: userId,
          source_type: notification.sourceType,
          source_id: notification.sourceId,
          status,
          note: note?.trim() || null,
          metadata,
          ...statusPatch,
        },
        { onConflict: 'user_id,source_type,source_id' },
      )
      .select('id')
      .single();

    if (error) throw error;

    await client.from('support_notification_events').insert({
      receipt_id: (receipt as { id?: string } | null)?.id ?? null,
      user_id: userId,
      source_type: notification.sourceType,
      source_id: notification.sourceId,
      status,
      note: note?.trim() || null,
      metadata,
    });

    if (notification.sourceType === 'alert' && ['responded', 'resolved'].includes(status)) {
      await client
        .from('alerts')
        .update({ acknowledged_by: userId, acknowledged_at: now })
        .eq('id', notification.sourceId);
    }

    if (notification.sourceType === 'teacher_message' && ['seen', 'responded', 'resolved'].includes(status)) {
      await client
        .from('parent_teacher_messages')
        .update({ read_at: now })
        .eq('id', notification.sourceId)
        .is('read_at', null);
    }

    if (
      notification.role !== 'child'
      && notification.sourceType !== 'adult_response'
      && notification.childId
      && ['seen', 'responded', 'escalated', 'resolved'].includes(status)
    ) {
      const { error: childResponseError } = await client.rpc('notify_child_of_adult_response', {
        p_child_id: notification.childId,
        p_source_type: notification.sourceType,
        p_source_id: notification.sourceId,
        p_status: status,
        p_note: buildChildResponseNote(notification, status),
      });

      if (childResponseError && !isMissingChildResponseRpc(childResponseError)) {
        throw childResponseError;
      }
    }
  }

  static async requestMeetingFromNotification(notification: SupportNotification): Promise<void> {
    if (!isSupabaseConfigured) return;
    if (!notification.childId) throw new Error('This support item is not linked to a child space.');
    if (notification.sourceType === 'care_meeting') throw new Error('A meeting already exists for this item.');
    if (notification.sourceType === 'adult_response') throw new Error('Child reassurance items do not create meetings.');

    const client = getSupabaseClient();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError) throw userError;
    const userId = userData.user?.id;
    if (!userId) throw new Error('You must be signed in to request a meeting.');

    const agenda = buildMeetingAgenda(notification);
    const actionItems = buildMeetingActionItems(notification);
    const { error } = await client
      .from('care_meetings')
      .insert({
        child_id: notification.childId,
        requested_by: userId,
        assigned_to: notification.role === 'teacher' ? userId : null,
        meeting_type: 'support_signal_review',
        status: 'requested',
        urgency: getMeetingUrgencyForNotification(notification),
        proposed_times: [],
        agenda,
        notes: [
          `Created from AdaptBuddy support action queue.`,
          `Source: ${notification.sourceType}:${notification.sourceId}.`,
          notification.buddyId ? `Buddy ID: ${notification.buddyId}.` : null,
        ].filter(Boolean).join(' '),
        action_items: actionItems,
      });

    if (error) throw error;

    await this.setStatus(
      notification,
      'escalated',
      `Meeting requested with structured agenda. ${getStructuredSupportSuggestion(notification)}`,
    );
  }
}
