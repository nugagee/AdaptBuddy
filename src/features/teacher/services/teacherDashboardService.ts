import { getSupabaseClient, isSupabaseConfigured } from 'services/supabase/client';

export type TeacherRequestStatus =
  | 'pending'
  | 'pending_parent'
  | 'pending_teacher'
  | 'approved'
  | 'declined'
  | 'cancelled';
export type TeacherMembershipStatus = 'active' | 'paused' | 'removed';
export type AssignmentStatus = 'not_started' | 'in_progress' | 'needs_help' | 'completed' | 'submitted';
export type TeacherAssignmentType =
  | 'reading'
  | 'maths'
  | 'writing'
  | 'pronunciation'
  | 'calm_break'
  | 'visual_routine'
  | 'social_story'
  | 'task';

export interface TeacherClass {
  id: string;
  teacherId: string;
  schoolName: string;
  className: string;
  classCode: string;
  subject: string;
  yearGroup: string;
  createdAt: string;
  studentCount: number;
  pendingRequests: number;
  assignmentsDue: number;
}

export interface TeacherStudent {
  membershipId: string;
  classId: string;
  childId: string;
  childName: string;
  buddyId: string | null;
  neurotypes: string[];
  age?: number | null;
  visibilitySettings: TeacherVisibilitySettings;
  status: TeacherMembershipStatus;
  joinedAt: string;
  latestSignal?: TeacherSupportSignal;
  completionSummary: string;
}

export interface TeacherJoinRequest {
  id: string;
  classId: string;
  childId: string;
  childName: string;
  buddyId: string | null;
  neurotypes: string[];
  requestedBy: string;
  requestMethod: string;
  status: TeacherRequestStatus;
  parentApproved: boolean;
  teacherApproved: boolean;
  visibilitySettings: TeacherVisibilitySettings;
  createdAt: string;
}

export interface TeacherAssignment {
  id: string;
  classId: string;
  teacherId: string;
  title: string;
  description?: string;
  assignmentType: TeacherAssignmentType;
  supportTools: string[];
  dueAt?: string;
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string;
  progress: TeacherAssignmentProgressSummary;
  learnerProgress: TeacherAssignmentLearnerProgress[];
}

export interface CreateTeacherAssignmentInput {
  classId: string;
  title: string;
  description: string;
  assignmentType: TeacherAssignmentType;
  supportTools: string[];
  dueAt?: string;
}

export interface UpdateTeacherAssignmentInput {
  assignmentId: string;
  title: string;
  description: string;
  assignmentType: TeacherAssignmentType;
  supportTools: string[];
  dueAt?: string;
}

export interface TeacherAssignmentProgressSummary {
  assignedCount: number;
  notStarted: number;
  inProgress: number;
  needsHelp: number;
  completed: number;
  submitted: number;
}

export interface TeacherAssignmentLearnerProgress {
  childId: string;
  childName: string;
  buddyId: string | null;
  neurotypes: string[];
  status: AssignmentStatus;
  moodAfterTask?: string;
  supportUsed: string[];
  updatedAt?: string;
}

export interface TeacherSupportSignal {
  id: string;
  childId: string;
  childName?: string;
  emotion: string;
  signalLabel?: string;
  signalCategory?: string;
  supportLevel?: string;
  text: string;
  riskLevel: 'low' | 'medium' | 'high';
  createdAt: string;
}

export type TeacherMessageUrgency = 'normal' | 'support' | 'urgent';

export interface TeacherFamilyMessage {
  id: string;
  childId: string;
  childName: string;
  senderId: string;
  recipientId?: string | null;
  body: string;
  urgency: TeacherMessageUrgency;
  aiSummary?: string | null;
  aiTalkingPoints: string[];
  createdAt: string;
  readAt?: string | null;
  isFromTeacher: boolean;
}

export type TeacherMeetingStatus = 'requested' | 'scheduled' | 'completed' | 'cancelled';
export type TeacherMeetingUrgency = 'routine' | 'soon' | 'urgent';

export interface TeacherCareMeeting {
  id: string;
  childId: string;
  childName: string;
  requestedBy: string;
  assignedTo?: string | null;
  meetingType: string;
  status: TeacherMeetingStatus;
  urgency: TeacherMeetingUrgency;
  proposedTimes: string[];
  scheduledAt?: string | null;
  agenda: string[];
  notes?: string | null;
  actionItems: string[];
  createdAt: string;
}

export interface CreateTeacherCareMeetingInput {
  childId: string;
  urgency: TeacherMeetingUrgency;
  agenda: string[];
  notes?: string;
}

export interface TeacherVisibilitySettings {
  childName: boolean;
  neuroProfile: boolean;
  dailyMood: 'hidden' | 'summary' | 'full';
  worryDiaryText: boolean;
  safeguardingAlerts: boolean;
  academicTasks: boolean;
  personalNotes: boolean;
}

export interface TeacherDashboardSummary {
  classes: TeacherClass[];
  students: TeacherStudent[];
  joinRequests: TeacherJoinRequest[];
  assignments: TeacherAssignment[];
  liveSignals: TeacherSupportSignal[];
  familyMessages: TeacherFamilyMessage[];
  careMeetings: TeacherCareMeeting[];
  totals: {
    classes: number;
    students: number;
    pendingRequests: number;
    supportAlerts: number;
    assignmentsDue: number;
    unreadMessages: number;
    meetingRequests: number;
  };
}

interface TeacherClassRow {
  id: string;
  teacher_id: string;
  school_name: string | null;
  class_name: string;
  class_code: string;
  subject: string | null;
  year_group: string | null;
  created_at: string;
}

interface ClassMembershipRow {
  id: string;
  class_id: string;
  child_id: string;
  teacher_id: string;
  visibility_settings: unknown;
  status: string | null;
  joined_at: string;
}

interface ClassJoinRequestRow {
  id: string;
  class_id: string;
  child_id: string;
  requested_buddy_id: string | null;
  requested_by: string;
  request_method: string | null;
  status: string | null;
  parent_approved: boolean | null;
  teacher_approved: boolean | null;
  visibility_settings: unknown;
  created_at: string;
}

interface TeacherAssignmentRow {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  assignment_type: string | null;
  support_tools: string[] | null;
  due_at: string | null;
  created_at: string;
  updated_at?: string | null;
  archived_at?: string | null;
}

interface AssignmentSubmissionRow {
  assignment_id: string;
  child_id: string;
  status: string | null;
  support_used: string[] | null;
  mood_after_task: string | null;
  submitted_at: string | null;
  updated_at: string | null;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  first_name: string | null;
  child_name: string | null;
  buddy_id: string | null;
  neuro_types: string[] | null;
  age: number | null;
}

interface JournalEntryRow {
  id: string;
  child_id: string;
  emotion: string | null;
  text: string | null;
  ai_analysis: Record<string, unknown> | null;
  risk_level: string | null;
  created_at: string;
}

interface ParentTeacherMessageRow {
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

interface BuddyRequestRow {
  request_id: string;
  class_id: string;
  child_id: string;
  child_name: string;
  buddy_id: string;
  status: string;
  created_at: string;
}

interface MembershipResultRow {
  membership_id: string | null;
  class_id: string;
  child_id: string;
  status: string;
  joined_at: string | null;
}

const defaultVisibilitySettings: TeacherVisibilitySettings = {
  childName: false,
  neuroProfile: true,
  dailyMood: 'summary',
  worryDiaryText: false,
  safeguardingAlerts: true,
  academicTasks: true,
  personalNotes: false,
};

const teacherRequestStatuses = [
  'pending',
  'pending_parent',
  'pending_teacher',
  'approved',
  'declined',
  'cancelled',
] as const;

const pendingRequestStatuses: TeacherRequestStatus[] = ['pending', 'pending_parent', 'pending_teacher'];

const normalizeStatus = <T extends string>(value: string | null | undefined, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;

const normalizeVisibility = (value: unknown): TeacherVisibilitySettings => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaultVisibilitySettings;
  const raw = value as Record<string, unknown>;
  const dailyMood = raw.dailyMood === 'hidden' || raw.dailyMood === 'full' || raw.dailyMood === 'summary'
    ? raw.dailyMood
    : defaultVisibilitySettings.dailyMood;

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

const getProfileName = (profile: ProfileRow | undefined): string =>
  profile?.full_name?.trim()
  || profile?.child_name?.trim()
  || profile?.first_name?.trim()
  || 'Learner';

const getAnalysisString = (analysis: Record<string, unknown> | null, keys: string[]): string | undefined => {
  if (!analysis) return undefined;
  for (const key of keys) {
    const value = analysis[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return undefined;
};

const normalizeRiskLevel = (value: string | null | undefined): TeacherSupportSignal['riskLevel'] => {
  if (value === 'medium' || value === 'high') return value;
  return 'low';
};

const normalizeMessageUrgency = (value: string | null | undefined): TeacherMessageUrgency => {
  if (value === 'support' || value === 'urgent') return value;
  return 'normal';
};

const normalizeMeetingStatus = (value: string | null | undefined): TeacherMeetingStatus => {
  if (value === 'scheduled' || value === 'completed' || value === 'cancelled') return value;
  return 'requested';
};

const normalizeMeetingUrgency = (value: string | null | undefined): TeacherMeetingUrgency => {
  if (value === 'soon' || value === 'urgent') return value;
  return 'routine';
};

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
};

const isSchemaUnavailableError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code?: unknown }).code) : '';
  const message = 'message' in error ? String((error as { message?: unknown }).message).toLowerCase() : '';
  return (
    code === '42P01'
    || code === 'PGRST205'
    || message.includes('schema cache')
    || message.includes('does not exist')
    || message.includes('could not find the table')
  );
};

const assignmentSelectColumns =
  'id, class_id, teacher_id, title, description, assignment_type, support_tools, due_at, created_at, updated_at, archived_at';
const legacyAssignmentSelectColumns =
  'id, class_id, teacher_id, title, description, assignment_type, support_tools, due_at, created_at';

const isMissingAssignmentLifecycleColumn = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String((error as { message?: unknown }).message).toLowerCase() : '';
  return message.includes('archived_at') && (
    message.includes('schema cache')
    || message.includes('column')
    || message.includes('could not find')
  );
};

const mapClass = (
  row: TeacherClassRow,
  memberships: ClassMembershipRow[],
  requests: ClassJoinRequestRow[],
  assignments: TeacherAssignmentRow[],
): TeacherClass => {
  const now = Date.now();
  const assignmentsDue = assignments.filter((assignment) => {
    if (assignment.class_id !== row.id || !assignment.due_at) return false;
    const due = new Date(assignment.due_at).getTime();
    return Number.isFinite(due) && due >= now && due <= now + 7 * 24 * 60 * 60 * 1000;
  }).length;

  return {
    id: row.id,
    teacherId: row.teacher_id,
    schoolName: row.school_name ?? '',
    className: row.class_name,
    classCode: row.class_code,
    subject: row.subject ?? 'General',
    yearGroup: row.year_group ?? '',
    createdAt: row.created_at,
    studentCount: memberships.filter((membership) => membership.class_id === row.id && membership.status !== 'removed').length,
    pendingRequests: requests.filter((request) => {
      const status = normalizeStatus(request.status, teacherRequestStatuses, 'pending');
      return request.class_id === row.id && pendingRequestStatuses.includes(status);
    }).length,
    assignmentsDue,
  };
};

const teacherAssignmentTypes = [
  'reading',
  'maths',
  'writing',
  'pronunciation',
  'calm_break',
  'visual_routine',
  'social_story',
  'task',
] as const;

const assignmentStatuses = ['not_started', 'in_progress', 'needs_help', 'completed', 'submitted'] as const;

const normalizeAssignmentType = (value: string | null | undefined): TeacherAssignmentType =>
  normalizeStatus(value, teacherAssignmentTypes, 'task');

const normalizeAssignmentStatus = (value: string | null | undefined): AssignmentStatus =>
  normalizeStatus(value, assignmentStatuses, 'not_started');

const emptyAssignmentProgress = (): TeacherAssignmentProgressSummary => ({
  assignedCount: 0,
  notStarted: 0,
  inProgress: 0,
  needsHelp: 0,
  completed: 0,
  submitted: 0,
});

const buildAssignmentProgress = (
  row: TeacherAssignmentRow,
  memberships: ClassMembershipRow[],
  submissions: AssignmentSubmissionRow[],
  profiles: Map<string, ProfileRow>,
): { progress: TeacherAssignmentProgressSummary; learnerProgress: TeacherAssignmentLearnerProgress[] } => {
  const activeMemberships = memberships.filter(
    (membership) =>
      membership.class_id === row.class_id
      && normalizeStatus(membership.status, ['active', 'paused', 'removed'] as const, 'active') === 'active',
  );
  const submissionsByChild = new Map(
    submissions
      .filter((submission) => submission.assignment_id === row.id)
      .map((submission) => [submission.child_id, submission]),
  );

  const progress = emptyAssignmentProgress();
  progress.assignedCount = activeMemberships.length;

  const learnerProgress = activeMemberships.map((membership) => {
    const submission = submissionsByChild.get(membership.child_id);
    const status = normalizeAssignmentStatus(submission?.status);
    const visibilitySettings = normalizeVisibility(membership.visibility_settings);
    const profile = profiles.get(membership.child_id);

    if (status === 'in_progress') progress.inProgress += 1;
    else if (status === 'needs_help') progress.needsHelp += 1;
    else if (status === 'completed') progress.completed += 1;
    else if (status === 'submitted') progress.submitted += 1;
    else progress.notStarted += 1;

    return {
      childId: membership.child_id,
      childName: visibilitySettings.childName ? getProfileName(profile) : 'Learner',
      buddyId: profile?.buddy_id ?? null,
      neurotypes: visibilitySettings.neuroProfile ? profile?.neuro_types ?? [] : [],
      status,
      moodAfterTask: submission?.mood_after_task ?? undefined,
      supportUsed: submission?.support_used ?? [],
      updatedAt: submission?.updated_at ?? submission?.submitted_at ?? undefined,
    };
  });

  return { progress, learnerProgress };
};

const mapAssignment = (
  row: TeacherAssignmentRow,
  progressData?: { progress: TeacherAssignmentProgressSummary; learnerProgress: TeacherAssignmentLearnerProgress[] },
): TeacherAssignment => ({
  id: row.id,
  classId: row.class_id,
  teacherId: row.teacher_id,
  title: row.title,
  description: row.description ?? undefined,
  assignmentType: normalizeAssignmentType(row.assignment_type),
  supportTools: row.support_tools ?? [],
  dueAt: row.due_at ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at ?? undefined,
  archivedAt: row.archived_at ?? undefined,
  progress: progressData?.progress ?? emptyAssignmentProgress(),
  learnerProgress: progressData?.learnerProgress ?? [],
});

const mapSignal = (
  row: JournalEntryRow,
  profiles: Map<string, ProfileRow>,
  visibility: TeacherVisibilitySettings = defaultVisibilitySettings,
): TeacherSupportSignal => ({
  id: row.id,
  childId: row.child_id,
  childName: visibility.childName ? getProfileName(profiles.get(row.child_id)) : 'Learner',
  emotion: row.emotion || getAnalysisString(row.ai_analysis, ['emotion']) || 'check-in',
  signalLabel: getAnalysisString(row.ai_analysis, ['signalLabel', 'signal_label']),
  signalCategory: getAnalysisString(row.ai_analysis, ['signalCategory', 'signal_category']),
  supportLevel: getAnalysisString(row.ai_analysis, ['supportLevel', 'support_level']),
  riskLevel: normalizeRiskLevel(row.risk_level || getAnalysisString(row.ai_analysis, ['riskLevel', 'risk_level'])),
  text: '',
  createdAt: row.created_at,
});

const withVisibleSignalText = (
  signal: TeacherSupportSignal,
  row: JournalEntryRow,
  visibility: TeacherVisibilitySettings,
): TeacherSupportSignal => {
  const canShowText =
    visibility.worryDiaryText
    || visibility.dailyMood === 'full'
    || (signal.riskLevel === 'high' && visibility.safeguardingAlerts);

  return {
    ...signal,
    text: canShowText ? row.text ?? '' : '',
  };
};

const getVisibleChildName = (
  childId: string,
  profiles: Map<string, ProfileRow>,
  visibilityByChild: Map<string, TeacherVisibilitySettings>,
): string => {
  const visibility = visibilityByChild.get(childId) ?? defaultVisibilitySettings;
  return visibility.childName ? getProfileName(profiles.get(childId)) : 'Learner';
};

const mapFamilyMessage = (
  row: ParentTeacherMessageRow,
  teacherId: string | null,
  profiles: Map<string, ProfileRow>,
  visibilityByChild: Map<string, TeacherVisibilitySettings>,
): TeacherFamilyMessage => ({
  id: row.id,
  childId: row.child_id,
  childName: getVisibleChildName(row.child_id, profiles, visibilityByChild),
  senderId: row.sender_id,
  recipientId: row.recipient_id,
  body: row.body,
  urgency: normalizeMessageUrgency(row.urgency),
  aiSummary: row.ai_summary,
  aiTalkingPoints: row.ai_talking_points ?? [],
  createdAt: row.created_at,
  readAt: row.read_at,
  isFromTeacher: Boolean(teacherId && row.sender_id === teacherId),
});

const mapCareMeeting = (
  row: CareMeetingRow,
  profiles: Map<string, ProfileRow>,
  visibilityByChild: Map<string, TeacherVisibilitySettings>,
): TeacherCareMeeting => ({
  id: row.id,
  childId: row.child_id,
  childName: getVisibleChildName(row.child_id, profiles, visibilityByChild),
  requestedBy: row.requested_by,
  assignedTo: row.assigned_to,
  meetingType: row.meeting_type,
  status: normalizeMeetingStatus(row.status),
  urgency: normalizeMeetingUrgency(row.urgency),
  proposedTimes: toStringArray(row.proposed_times),
  scheduledAt: row.scheduled_at,
  agenda: toStringArray(row.agenda),
  notes: row.notes,
  actionItems: toStringArray(row.action_items),
  createdAt: row.created_at,
});

const createClassCode = (yearGroup: string, subject: string): string => {
  const year = yearGroup.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'CLS';
  const topic = subject.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'ROOM';
  const suffix = Math.floor(10 + Math.random() * 90);
  return `${year}-${topic}-${suffix}`;
};

const isAuthSessionMissingError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error ? String((error as { name?: unknown }).name).toLowerCase() : '';
  const message = 'message' in error ? String((error as { message?: unknown }).message).toLowerCase() : '';
  return name.includes('authsessionmissing') || message.includes('auth session missing');
};

export class TeacherDashboardService {
  static async createClass(input: {
    className: string;
    schoolName: string;
    subject: string;
    yearGroup: string;
  }): Promise<TeacherClass> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');

    const client = getSupabaseClient();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError) {
      if (isAuthSessionMissingError(userError)) {
        throw new Error('Please sign in with a teacher account to create saved classes. Guest mode is view-only.');
      }
      throw userError;
    }
    const userId = userData.user?.id;
    if (!userId) throw new Error('Please sign in with a teacher account to create saved classes.');

    const classCode = createClassCode(input.yearGroup, input.subject);
    const { data, error } = await client
      .from('teacher_classes')
      .insert({
        teacher_id: userId,
        class_name: input.className.trim(),
        school_name: input.schoolName.trim(),
        subject: input.subject.trim() || 'General',
        year_group: input.yearGroup.trim(),
        class_code: classCode,
      })
      .select('id, teacher_id, school_name, class_name, class_code, subject, year_group, created_at')
      .single();

    if (error) throw error;
    return mapClass(data as TeacherClassRow, [], [], []);
  }

  static async requestStudentByBuddyId(classId: string, buddyId: string): Promise<TeacherJoinRequest> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    if (!classId) throw new Error('Choose a class first.');
    if (!buddyId.trim()) throw new Error('Enter a Buddy ID first.');

    const { data, error } = await getSupabaseClient().rpc('teacher_request_student_by_buddy_id', {
      p_class_id: classId,
      p_buddy_id: buddyId.trim(),
    });

    if (error) throw error;
    const rows = Array.isArray(data) ? (data as BuddyRequestRow[]) : data ? [data as BuddyRequestRow] : [];
    const row = rows[0];
    if (!row) throw new Error('No request was created.');

    return {
      id: row.request_id,
      classId: row.class_id,
      childId: row.child_id,
      childName: row.child_name || 'Pending learner',
      buddyId: row.buddy_id,
      neurotypes: [],
      requestedBy: '',
      requestMethod: 'buddy_id',
      status: normalizeStatus(row.status, teacherRequestStatuses, 'pending_parent'),
      parentApproved: false,
      teacherApproved: true,
      visibilitySettings: defaultVisibilitySettings,
      createdAt: row.created_at,
    };
  }

  static async createAssignment(input: CreateTeacherAssignmentInput): Promise<TeacherAssignment> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    if (!input.classId) throw new Error('Choose a class first.');
    if (!input.title.trim()) throw new Error('Add an assignment title first.');

    const client = getSupabaseClient();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError) {
      if (isAuthSessionMissingError(userError)) {
        throw new Error('Please sign in with a teacher account to create assignments. Guest mode is view-only.');
      }
      throw userError;
    }
    const userId = userData.user?.id;
    if (!userId) throw new Error('Please sign in with a teacher account to create assignments.');

    const { data, error } = await client
      .from('teacher_assignments')
      .insert({
        class_id: input.classId,
        teacher_id: userId,
        title: input.title.trim(),
        description: input.description.trim() || null,
        assignment_type: input.assignmentType,
        support_tools: input.supportTools,
        due_at: input.dueAt || null,
      })
      .select(legacyAssignmentSelectColumns)
      .single();

    if (error) throw error;
    return mapAssignment(data as TeacherAssignmentRow);
  }

  static async updateAssignment(input: UpdateTeacherAssignmentInput): Promise<TeacherAssignment> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    if (!input.assignmentId) throw new Error('Choose an assignment first.');
    if (!input.title.trim()) throw new Error('Add an assignment title first.');

    const { data, error } = await getSupabaseClient()
      .from('teacher_assignments')
      .update({
        title: input.title.trim(),
        description: input.description.trim() || null,
        assignment_type: input.assignmentType,
        support_tools: input.supportTools,
        due_at: input.dueAt || null,
      })
      .eq('id', input.assignmentId)
      .select(legacyAssignmentSelectColumns)
      .single();

    if (error) throw error;
    return mapAssignment(data as TeacherAssignmentRow);
  }

  static async archiveAssignment(assignmentId: string): Promise<void> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    if (!assignmentId) throw new Error('Choose an assignment first.');

    const { error } = await getSupabaseClient()
      .from('teacher_assignments')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', assignmentId);

    if (error) {
      if (isMissingAssignmentLifecycleColumn(error)) {
        throw new Error('Assignment archiving needs the latest Supabase migration. Run migration 023 first.');
      }
      throw error;
    }
  }

  static async approveJoinRequest(requestId: string): Promise<MembershipResultRow> {
    const { data, error } = await getSupabaseClient().rpc('approve_class_join_request', {
      p_request_id: requestId,
    });

    if (error) throw error;
    const rows = Array.isArray(data) ? (data as MembershipResultRow[]) : data ? [data as MembershipResultRow] : [];
    const row = rows[0];
    if (!row) throw new Error('No membership was created.');
    return row;
  }

  static async declineJoinRequest(requestId: string): Promise<void> {
    const { error } = await getSupabaseClient().rpc('decline_class_join_request', {
      p_request_id: requestId,
    });
    if (error) throw error;
  }

  static async sendFamilyMessage(
    childId: string,
    body: string,
    recipientId?: string | null,
    urgency: TeacherMessageUrgency = 'normal',
  ): Promise<void> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    if (!childId) throw new Error('Choose a learner first.');
    if (!body.trim()) throw new Error('Write a message first.');

    const client = getSupabaseClient();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError) throw userError;
    const userId = userData.user?.id;
    if (!userId) throw new Error('Please sign in with a teacher account to send messages.');

    const { error } = await client
      .from('parent_teacher_messages')
      .insert({
        child_id: childId,
        sender_id: userId,
        recipient_id: recipientId ?? null,
        body: body.trim(),
        urgency,
        ai_summary: TeacherDashboardService.summarizeTeacherMessage(body),
        ai_talking_points: TeacherDashboardService.suggestTeacherTalkingPoints(body),
      });

    if (error) throw error;
  }

  static async updateCareMeetingStatus(
    meetingId: string,
    status: TeacherMeetingStatus,
    notes?: string,
  ): Promise<void> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    if (!meetingId) throw new Error('Choose a meeting first.');

    const client = getSupabaseClient();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError) throw userError;
    const userId = userData.user?.id;
    if (!userId) throw new Error('Please sign in with a teacher account to update meetings.');

    const update: Record<string, unknown> = {
      status,
      assigned_to: userId,
    };
    if (status === 'scheduled') update.scheduled_at = new Date().toISOString();
    if (notes?.trim()) update.notes = notes.trim();

    const { error } = await client
      .from('care_meetings')
      .update(update)
      .eq('id', meetingId);

    if (error) throw error;
  }

  static async requestCareMeeting(input: CreateTeacherCareMeetingInput): Promise<void> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    if (!input.childId) throw new Error('Choose a learner first.');
    if (input.agenda.length === 0) throw new Error('Add at least one meeting point.');

    const client = getSupabaseClient();
    const { data: userData, error: userError } = await client.auth.getUser();
    if (userError) throw userError;
    const userId = userData.user?.id;
    if (!userId) throw new Error('Please sign in with a teacher account to request meetings.');

    const { error } = await client
      .from('care_meetings')
      .insert({
        child_id: input.childId,
        requested_by: userId,
        assigned_to: userId,
        meeting_type: 'teacher_signal_review',
        status: 'requested',
        urgency: input.urgency,
        proposed_times: [],
        agenda: input.agenda,
        notes: input.notes?.trim() || null,
        action_items: [],
      });

    if (error) throw error;
  }

  static async getDashboardSummary(): Promise<TeacherDashboardSummary> {
    if (!isSupabaseConfigured) return this.getGuestSummary();

    const client = getSupabaseClient();
    const { data: userData } = await client.auth.getUser();
    const teacherId = userData.user?.id ?? null;
    const { data: classRows, error: classError } = await client
      .from('teacher_classes')
      .select('id, teacher_id, school_name, class_name, class_code, subject, year_group, created_at')
      .order('created_at', { ascending: false });

    if (classError) throw classError;
    const rawClasses = (classRows ?? []) as TeacherClassRow[];
    const classIds = rawClasses.map((teacherClass) => teacherClass.id);

    if (classIds.length === 0) {
      return {
        classes: [],
        students: [],
        joinRequests: [],
        assignments: [],
        liveSignals: [],
        familyMessages: [],
        careMeetings: [],
        totals: {
          classes: 0,
          students: 0,
          pendingRequests: 0,
          supportAlerts: 0,
          assignmentsDue: 0,
          unreadMessages: 0,
          meetingRequests: 0,
        },
      };
    }

    const [membershipRows, requestRows, assignmentRows] = await Promise.all([
      this.getMembershipRows(classIds),
      this.getJoinRequestRows(classIds),
      this.getAssignmentRows(classIds),
    ]);

    const activeMembershipRows = membershipRows.filter((membership) => membership.status === 'active');
    const profileChildIds = Array.from(new Set([
      ...membershipRows.map((membership) => membership.child_id),
      ...requestRows
        .filter((request) => request.parent_approved === true || request.status === 'approved')
        .map((request) => request.child_id),
    ]));
    const signalChildIds = Array.from(new Set(activeMembershipRows.map((membership) => membership.child_id)));
    const profiles = await this.getProfiles(profileChildIds);
    const visibilityByChild = new Map(
      activeMembershipRows.map((membership) => [
        membership.child_id,
        normalizeVisibility(membership.visibility_settings),
      ]),
    );
    const [signals, submissionRows, familyMessages, careMeetings] = await Promise.all([
      this.getLiveSignals(signalChildIds, profiles, visibilityByChild),
      this.getSubmissionRows(assignmentRows.map((assignment) => assignment.id)),
      this.getFamilyMessages(signalChildIds, teacherId, profiles, visibilityByChild),
      this.getCareMeetings(signalChildIds, profiles, visibilityByChild),
    ]);
    const assignments = assignmentRows.map((row) =>
      mapAssignment(row, buildAssignmentProgress(row, membershipRows, submissionRows, profiles)),
    );

    const classes = rawClasses.map((row) => mapClass(row, membershipRows, requestRows, assignmentRows));
    const students = membershipRows
      .filter((membership) => membership.status !== 'removed')
      .map((membership) => {
        const profile = profiles.get(membership.child_id);
        const latestSignal = signals.find((signal) => signal.childId === membership.child_id);
        const visibilitySettings = normalizeVisibility(membership.visibility_settings);
        return {
          membershipId: membership.id,
          classId: membership.class_id,
          childId: membership.child_id,
          childName: visibilitySettings.childName ? getProfileName(profile) : 'Learner',
          buddyId: profile?.buddy_id ?? null,
          neurotypes: visibilitySettings.neuroProfile ? profile?.neuro_types ?? [] : [],
          age: profile?.age,
          visibilitySettings,
          status: normalizeStatus(membership.status, ['active', 'paused', 'removed'] as const, 'active'),
          joinedAt: membership.joined_at,
          latestSignal,
          completionSummary: this.getCompletionSummary(membership.child_id, membership.class_id, assignmentRows, submissionRows),
        };
      });

    const joinRequests = requestRows.map((request) => {
      const profile = profiles.get(request.child_id);
      const parentApproved = request.parent_approved === true;
      const visibilitySettings = normalizeVisibility(request.visibility_settings);
      return {
        id: request.id,
        classId: request.class_id,
        childId: request.child_id,
        childName: parentApproved && visibilitySettings.childName ? getProfileName(profile) : 'Pending learner',
        buddyId: request.requested_buddy_id ?? profile?.buddy_id ?? null,
        neurotypes: parentApproved && visibilitySettings.neuroProfile ? profile?.neuro_types ?? [] : [],
        requestedBy: request.requested_by,
        requestMethod: request.request_method ?? 'buddy_id',
        status: normalizeStatus(request.status, teacherRequestStatuses, 'pending'),
        parentApproved,
        teacherApproved: request.teacher_approved === true,
        visibilitySettings,
        createdAt: request.created_at,
      };
    });

    const now = Date.now();
    const assignmentsDue = assignmentRows.filter((assignment) => {
      if (!assignment.due_at) return false;
      const due = new Date(assignment.due_at).getTime();
      return Number.isFinite(due) && due >= now && due <= now + 7 * 24 * 60 * 60 * 1000;
    }).length;

    return {
      classes,
      students,
      joinRequests,
      assignments,
      liveSignals: signals,
      familyMessages,
      careMeetings,
      totals: {
        classes: classes.length,
        students: students.length,
        pendingRequests: joinRequests.filter((request) => pendingRequestStatuses.includes(request.status)).length,
        supportAlerts: signals.filter((signal) => signal.riskLevel !== 'low' || signal.supportLevel === 'urgent').length,
        assignmentsDue,
        unreadMessages: familyMessages.filter((message) => !message.isFromTeacher && !message.readAt).length,
        meetingRequests: careMeetings.filter((meeting) => meeting.status === 'requested').length,
      },
    };
  }

  private static async getMembershipRows(classIds: string[]): Promise<ClassMembershipRow[]> {
    const { data, error } = await getSupabaseClient()
      .from('class_memberships')
      .select('id, class_id, child_id, teacher_id, visibility_settings, status, joined_at')
      .in('class_id', classIds)
      .order('joined_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as ClassMembershipRow[];
  }

  private static async getJoinRequestRows(classIds: string[]): Promise<ClassJoinRequestRow[]> {
    const { data, error } = await getSupabaseClient()
      .from('class_join_requests')
      .select('id, class_id, child_id, requested_buddy_id, requested_by, request_method, status, parent_approved, teacher_approved, visibility_settings, created_at')
      .in('class_id', classIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as ClassJoinRequestRow[];
  }

  private static async getAssignmentRows(classIds: string[]): Promise<TeacherAssignmentRow[]> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('teacher_assignments')
      .select(assignmentSelectColumns)
      .in('class_id', classIds)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingAssignmentLifecycleColumn(error)) {
        const { data: legacyData, error: legacyError } = await client
          .from('teacher_assignments')
          .select(legacyAssignmentSelectColumns)
          .in('class_id', classIds)
          .order('created_at', { ascending: false });

        if (legacyError) throw legacyError;
        return ((legacyData ?? []) as TeacherAssignmentRow[]).map((row) => ({ ...row, archived_at: null }));
      }
      throw error;
    }
    return (data ?? []) as TeacherAssignmentRow[];
  }

  private static async getSubmissionRows(assignmentIds: string[]): Promise<AssignmentSubmissionRow[]> {
    if (assignmentIds.length === 0) return [];

    const { data, error } = await getSupabaseClient()
      .from('assignment_submissions')
      .select('assignment_id, child_id, status, support_used, mood_after_task, submitted_at, updated_at')
      .in('assignment_id', assignmentIds);

    if (error) throw error;
    return (data ?? []) as AssignmentSubmissionRow[];
  }

  private static getCompletionSummary(
    childId: string,
    classId: string,
    assignments: TeacherAssignmentRow[],
    submissions: AssignmentSubmissionRow[],
  ): string {
    const classAssignments = assignments.filter((assignment) => assignment.class_id === classId);
    if (classAssignments.length === 0) return 'No assignments yet';

    const assignmentIds = new Set(classAssignments.map((assignment) => assignment.id));
    const childSubmissions = submissions.filter(
      (submission) => submission.child_id === childId && assignmentIds.has(submission.assignment_id),
    );
    const completed = childSubmissions.filter((submission) => {
      const status = normalizeAssignmentStatus(submission.status);
      return status === 'completed' || status === 'submitted';
    }).length;
    const needsHelp = childSubmissions.filter((submission) => normalizeAssignmentStatus(submission.status) === 'needs_help').length;

    return needsHelp > 0
      ? `${completed}/${classAssignments.length} complete · ${needsHelp} need help`
      : `${completed}/${classAssignments.length} complete`;
  }

  private static async getProfiles(childIds: string[]): Promise<Map<string, ProfileRow>> {
    if (childIds.length === 0) return new Map();

    const { data, error } = await getSupabaseClient()
      .from('profiles')
      .select('id, full_name, first_name, child_name, buddy_id, neuro_types, age')
      .in('id', childIds);

    if (error) throw error;
    return new Map(((data ?? []) as ProfileRow[]).map((profile) => [profile.id, profile]));
  }

  private static async getLiveSignals(
    childIds: string[],
    profiles: Map<string, ProfileRow>,
    visibilityByChild: Map<string, TeacherVisibilitySettings>,
  ): Promise<TeacherSupportSignal[]> {
    if (childIds.length === 0) return [];

    const { data, error } = await getSupabaseClient()
      .from('journal_entries')
      .select('id, child_id, emotion, text, ai_analysis, risk_level, created_at')
      .in('child_id', childIds)
      .eq('is_shared', true)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return ((data ?? []) as JournalEntryRow[])
      .map((row) => {
        const visibility = visibilityByChild.get(row.child_id) ?? defaultVisibilitySettings;
        return withVisibleSignalText(mapSignal(row, profiles, visibility), row, visibility);
      })
      .filter((signal) => {
        const visibility = visibilityByChild.get(signal.childId) ?? defaultVisibilitySettings;
        const concernNeedsSafeguarding =
          signal.riskLevel === 'high'
          || signal.supportLevel === 'urgent'
          || signal.signalLabel?.toLowerCase().includes('help');

        if (concernNeedsSafeguarding) return visibility.safeguardingAlerts || visibility.dailyMood !== 'hidden';
        return visibility.dailyMood !== 'hidden';
      });
  }

  private static async getFamilyMessages(
    childIds: string[],
    teacherId: string | null,
    profiles: Map<string, ProfileRow>,
    visibilityByChild: Map<string, TeacherVisibilitySettings>,
  ): Promise<TeacherFamilyMessage[]> {
    if (childIds.length === 0) return [];

    const { data, error } = await getSupabaseClient()
      .from('parent_teacher_messages')
      .select('id, child_id, sender_id, recipient_id, body, urgency, ai_summary, ai_talking_points, created_at, read_at')
      .in('child_id', childIds)
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) {
      if (isSchemaUnavailableError(error)) return [];
      throw error;
    }

    return ((data ?? []) as ParentTeacherMessageRow[]).map((row) =>
      mapFamilyMessage(row, teacherId, profiles, visibilityByChild),
    );
  }

  private static async getCareMeetings(
    childIds: string[],
    profiles: Map<string, ProfileRow>,
    visibilityByChild: Map<string, TeacherVisibilitySettings>,
  ): Promise<TeacherCareMeeting[]> {
    if (childIds.length === 0) return [];

    const { data, error } = await getSupabaseClient()
      .from('care_meetings')
      .select('id, child_id, requested_by, assigned_to, meeting_type, status, urgency, proposed_times, scheduled_at, agenda, notes, action_items, created_at')
      .in('child_id', childIds)
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) {
      if (isSchemaUnavailableError(error)) return [];
      throw error;
    }

    return ((data ?? []) as CareMeetingRow[]).map((row) =>
      mapCareMeeting(row, profiles, visibilityByChild),
    );
  }

  private static summarizeTeacherMessage(body: string): string {
    const normalized = body.trim();
    if (!normalized) return 'Teacher reply saved for the family.';
    if (/urgent|unsafe|risk|safeguard|crisis/i.test(normalized)) {
      return 'Teacher flagged this as requiring urgent adult follow-up.';
    }
    if (/homework|assignment|task|reading|math|writing/i.test(normalized)) {
      return 'Teacher reply focuses on learning support and task progress.';
    }
    if (/anxious|worried|overwhelmed|upset|frustrated/i.test(normalized)) {
      return 'Teacher reply focuses on wellbeing and regulation support.';
    }
    return 'Teacher reply saved for parent-teacher coordination.';
  }

  private static suggestTeacherTalkingPoints(body: string): string[] {
    const normalized = body.toLowerCase();
    const points = ['Agree one small next step for home and school.'];

    if (/homework|assignment|task|reading|math|writing/.test(normalized)) {
      points.push('Clarify which support tool helped or was missing during the task.');
    }
    if (/anxious|worried|overwhelmed|frustrated|too noisy|too bright/.test(normalized)) {
      points.push('Compare the timing of the signal with classroom demands and transitions.');
    }
    if (/meeting|senco|review|plan/.test(normalized)) {
      points.push('Bring one example, one pattern, and one proposed adjustment to the meeting.');
    }

    return points.slice(0, 3);
  }

  private static getGuestSummary(): TeacherDashboardSummary {
    const now = new Date().toISOString();
    const classId = 'guest-class';
    const childId = 'guest-child';

    const visibilitySettings = defaultVisibilitySettings;
    const classes: TeacherClass[] = [
      {
        id: classId,
        teacherId: 'guest-teacher',
        schoolName: 'AdaptBuddy Demo School',
        className: 'Year 4 Maths',
        classCode: 'Y4-MATH-82',
        subject: 'Maths',
        yearGroup: 'Year 4',
        createdAt: now,
        studentCount: 1,
        pendingRequests: 1,
        assignmentsDue: 2,
      },
    ];

    const liveSignals: TeacherSupportSignal[] = [
      {
        id: 'guest-signal-1',
        childId,
        childName: 'Alex A.',
        emotion: 'Too noisy',
        signalLabel: 'Too noisy',
        signalCategory: 'sensory',
        supportLevel: 'concern',
        text: 'The room felt too loud before lunch.',
        riskLevel: 'medium',
        createdAt: now,
      },
    ];

    return {
      classes,
      students: [
        {
          membershipId: 'guest-membership',
          classId,
          childId,
          childName: 'Alex A.',
          buddyId: 'AB-7K4M-23',
          neurotypes: ['autism', 'dyslexia'],
          age: 9,
          visibilitySettings,
          status: 'active',
          joinedAt: now,
          latestSignal: liveSignals[0],
          completionSummary: '3/5 activities complete',
        },
      ],
      joinRequests: [
        {
          id: 'guest-request',
          classId,
          childId: 'guest-request-child',
          childName: 'New learner',
          buddyId: 'AB-2H8Q-K9',
          neurotypes: ['autism'],
          requestedBy: 'guest-teacher',
          requestMethod: 'buddy_id',
          status: 'pending',
          parentApproved: false,
          teacherApproved: true,
          visibilitySettings,
          createdAt: now,
        },
      ],
      assignments: [
        {
          id: 'guest-assignment',
          classId,
          teacherId: 'guest-teacher',
          title: 'Read page 5',
          description: 'Use read aloud and line focus if needed.',
          assignmentType: 'reading',
          supportTools: ['read_aloud', 'line_focus'],
          dueAt: now,
          createdAt: now,
          progress: {
            assignedCount: 1,
            notStarted: 0,
            inProgress: 0,
            needsHelp: 1,
            completed: 0,
            submitted: 0,
          },
          learnerProgress: [
            {
              childId,
              childName: 'Alex A.',
              buddyId: 'AB-7K4M-23',
              neurotypes: ['autism', 'dyslexia'],
              status: 'needs_help',
              moodAfterTask: 'confused',
              supportUsed: ['teacher_help', 'read_aloud'],
              updatedAt: now,
            },
          ],
        },
      ],
      liveSignals,
      familyMessages: [
        {
          id: 'guest-message-1',
          childId,
          childName: 'Alex A.',
          senderId: 'guest-parent',
          recipientId: 'guest-teacher',
          body: 'Alex said the writing task felt too noisy today. Could we try line focus and a quieter start tomorrow?',
          urgency: 'support',
          aiSummary: 'Family is asking for sensory and writing support after a noisy task.',
          aiTalkingPoints: [
            'Review noise level before writing tasks.',
            'Try line focus and a quiet first step.',
          ],
          createdAt: now,
          readAt: null,
          isFromTeacher: false,
        },
      ],
      careMeetings: [
        {
          id: 'guest-meeting-1',
          childId,
          childName: 'Alex A.',
          requestedBy: 'guest-parent',
          assignedTo: 'guest-teacher',
          meetingType: 'support_plan',
          status: 'requested',
          urgency: 'soon',
          proposedTimes: [],
          agenda: [
            'Review writing support after noisy lessons.',
            'Agree visual steps for longer tasks.',
          ],
          notes: null,
          actionItems: [],
          createdAt: now,
        },
      ],
      totals: {
        classes: 1,
        students: 1,
        pendingRequests: 1,
        supportAlerts: 1,
        assignmentsDue: 2,
        unreadMessages: 1,
        meetingRequests: 1,
      },
    };
  }
}
