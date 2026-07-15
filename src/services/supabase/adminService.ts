import {
  getSupabaseClient,
  normalizeProfile,
  type Profile,
  type UserGender,
  type UserSex,
  type UserRole,
  type UserStatus,
} from './client';

export interface AdminAnalytics {
  total_users: number;
  by_role: Record<string, number>;
  by_sex: Record<string, number>;
  by_gender: Record<string, number>;
  by_status: Record<string, number>;
  by_neuro_type: Record<string, number>;
  authorized: number;
  unauthorized: number;
  onboarding_complete: number;
  companion_onboarding_complete: number;
  children_with_buddy_id: number;
  parent_child_links: number;
  trusted_adult_links: number;
  parents_with_linked_children: number;
  shared_journal_entries: number;
  active_alerts: number;
  avg_age: number | null;
  recent_signups_7d: number;
  recent_signups_30d: number;
}

export interface AdminRelationshipCounts {
  childrenByParent: Record<string, number>;
  parentsByChild: Record<string, number>;
}

export interface AdminCreateUserPayload {
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  sex?: UserSex | null;
  gender?: UserGender | null;
  age?: number | null;
  childName?: string | null;
}

export interface AdminUpdateUserPayload {
  id: string;
  role?: UserRole;
  firstName?: string;
  lastName?: string;
  sex?: UserSex | null;
  gender?: UserGender | null;
  age?: number | null;
  childName?: string | null;
  isAuthorized?: boolean;
  status?: UserStatus;
  onboardingCompleted?: boolean;
  companionOnboardingCompleted?: boolean;
  neuroTypes?: string[];
}

const EMPTY_ANALYTICS: AdminAnalytics = {
  total_users: 0,
  by_role: { child: 0, parent: 0, teacher: 0, admin: 0 },
  by_sex: {
    male: 0,
    female: 0,
    intersex: 0,
    prefer_not_to_say: 0,
    unspecified: 0,
  },
  by_gender: {
    woman: 0,
    man: 0,
    non_binary: 0,
    other: 0,
    prefer_not_to_say: 0,
    unspecified: 0,
  },
  by_status: { active: 0, suspended: 0, pending: 0 },
  by_neuro_type: { autism: 0, adhd: 0, dyslexia: 0, unspecified: 0 },
  authorized: 0,
  unauthorized: 0,
  onboarding_complete: 0,
  companion_onboarding_complete: 0,
  children_with_buddy_id: 0,
  parent_child_links: 0,
  trusted_adult_links: 0,
  parents_with_linked_children: 0,
  shared_journal_entries: 0,
  active_alerts: 0,
  avg_age: null,
  recent_signups_7d: 0,
  recent_signups_30d: 0,
};

function normalizeAnalytics(raw: Partial<AdminAnalytics> | null | undefined): AdminAnalytics {
  if (!raw) {
    return {
      ...EMPTY_ANALYTICS,
      by_role: { ...EMPTY_ANALYTICS.by_role },
      by_sex: { ...EMPTY_ANALYTICS.by_sex },
      by_gender: { ...EMPTY_ANALYTICS.by_gender },
      by_status: { ...EMPTY_ANALYTICS.by_status },
      by_neuro_type: { ...EMPTY_ANALYTICS.by_neuro_type },
    };
  }

  const legacyGender = raw.by_gender as Record<string, number> | undefined;
  const bySex = { ...EMPTY_ANALYTICS.by_sex, ...raw.by_sex };

  // Pre-007 RPC returned sex counts inside by_gender (male/female/intersex)
  if (!raw.by_sex && legacyGender) {
    for (const key of ['male', 'female', 'intersex', 'prefer_not_to_say'] as const) {
      if (legacyGender[key]) bySex[key] = (bySex[key] ?? 0) + legacyGender[key];
    }
    if (legacyGender.unspecified) {
      bySex.unspecified = (bySex.unspecified ?? 0) + legacyGender.unspecified;
    }
  }

  const byGender = { ...EMPTY_ANALYTICS.by_gender, ...raw.by_gender };

  // Map legacy gender keys from pre-007 analytics
  if (legacyGender?.male) byGender.man = (byGender.man ?? 0) + legacyGender.male;
  if (legacyGender?.female) byGender.woman = (byGender.woman ?? 0) + legacyGender.female;
  if (legacyGender?.non_binary) {
    byGender.non_binary = (byGender.non_binary ?? 0) + legacyGender.non_binary;
  }
  if (legacyGender?.other) byGender.other = (byGender.other ?? 0) + legacyGender.other;

  return {
    ...EMPTY_ANALYTICS,
    ...raw,
    by_role: { ...EMPTY_ANALYTICS.by_role, ...raw.by_role },
    by_sex: bySex,
    by_gender: byGender,
    by_status: { ...EMPTY_ANALYTICS.by_status, ...raw.by_status },
    by_neuro_type: { ...EMPTY_ANALYTICS.by_neuro_type, ...raw.by_neuro_type },
    companion_onboarding_complete: raw.companion_onboarding_complete ?? 0,
    children_with_buddy_id: raw.children_with_buddy_id ?? 0,
    parent_child_links: raw.parent_child_links ?? 0,
    trusted_adult_links: raw.trusted_adult_links ?? 0,
    parents_with_linked_children: raw.parents_with_linked_children ?? 0,
    shared_journal_entries: raw.shared_journal_entries ?? 0,
    active_alerts: raw.active_alerts ?? 0,
  };
}

export async function fetchAdminAnalytics(): Promise<AdminAnalytics> {
  const { data, error } = await getSupabaseClient().rpc('admin_get_analytics');
  if (error) throw error;
  return normalizeAnalytics(data as Partial<AdminAnalytics> | null);
}

export async function fetchAllUsers(): Promise<Profile[]> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Profile[]).map(normalizeProfile);
}

export async function adminCreateUser(payload: AdminCreateUserPayload): Promise<Profile> {
  const { data, error } = await getSupabaseClient().rpc('admin_create_user', {
    p_email: payload.email.trim(),
    p_password: payload.password,
    p_role: payload.role,
    p_first_name: payload.firstName.trim(),
    p_last_name: payload.lastName.trim(),
    p_sex: payload.sex ?? null,
    p_gender: payload.gender ?? null,
    p_age: payload.age ?? null,
    p_child_name: payload.childName?.trim() || null,
  });

  if (error) throw error;

  const createdId = (data as { id?: string })?.id;
  if (!createdId) throw new Error('User created but no ID returned.');

  const { data: profile, error: profileError } = await getSupabaseClient()
    .from('profiles')
    .select('*')
    .eq('id', createdId)
    .single();

  if (profileError) throw profileError;
  return normalizeProfile(profile as Profile);
}

export async function adminUpdateUser(payload: AdminUpdateUserPayload): Promise<Profile> {
  const updates: Record<string, unknown> = {};

  if (payload.role !== undefined) updates.role = payload.role;
  if (payload.firstName !== undefined) updates.first_name = payload.firstName.trim();
  if (payload.lastName !== undefined) updates.last_name = payload.lastName.trim();
  if (payload.sex !== undefined) updates.sex = payload.sex;
  if (payload.gender !== undefined) updates.gender = payload.gender;
  if (payload.age !== undefined) updates.age = payload.age;
  if (payload.childName !== undefined) updates.child_name = payload.childName?.trim() || null;
  if (payload.isAuthorized !== undefined) updates.is_authorized = payload.isAuthorized;
  if (payload.status !== undefined) updates.status = payload.status;
  if (payload.onboardingCompleted !== undefined) {
    updates.onboarding_completed = payload.onboardingCompleted;
  }
  if (payload.companionOnboardingCompleted !== undefined) {
    updates.companion_onboarding_completed = payload.companionOnboardingCompleted;
  }
  if (payload.neuroTypes !== undefined) {
    updates.neuro_types = payload.neuroTypes;
  }

  if (payload.firstName !== undefined || payload.lastName !== undefined) {
    const first = payload.firstName?.trim() ?? '';
    const last = payload.lastName?.trim() ?? '';
    if (first || last) updates.full_name = `${first} ${last}`.trim();
  }

  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .update(updates)
    .eq('id', payload.id)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeProfile(data as Profile);
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('admin_delete_user', {
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function adminResetUserPassword(userId: string, newPassword: string): Promise<void> {
  const { error } = await getSupabaseClient().rpc('admin_reset_user_password', {
    p_user_id: userId,
    p_new_password: newPassword,
  });
  if (error) throw error;
}

/** Client-side analytics fallback when RPC not migrated yet */
export async function computeAnalyticsFromProfiles(users: Profile[]): Promise<AdminAnalytics> {
  const analytics = {
    ...EMPTY_ANALYTICS,
    by_role: { ...EMPTY_ANALYTICS.by_role },
    by_sex: { ...EMPTY_ANALYTICS.by_sex },
    by_gender: { ...EMPTY_ANALYTICS.by_gender },
    by_status: { ...EMPTY_ANALYTICS.by_status },
    by_neuro_type: { ...EMPTY_ANALYTICS.by_neuro_type },
  };
  analytics.total_users = users.length;

  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  let ageSum = 0;
  let ageCount = 0;

  for (const user of users) {
    const role = user.role as keyof typeof analytics.by_role;
    if (role in analytics.by_role) analytics.by_role[role] += 1;

    const sexKey = user.sex ?? 'unspecified';
    if (sexKey in analytics.by_sex) analytics.by_sex[sexKey] += 1;

    const genderKey = user.gender ?? 'unspecified';
    if (genderKey in analytics.by_gender) analytics.by_gender[genderKey] += 1;

    const statusKey = user.status ?? 'active';
    if (statusKey in analytics.by_status) analytics.by_status[statusKey] += 1;

    if (user.is_authorized !== false) analytics.authorized += 1;
    else analytics.unauthorized += 1;

    if (user.onboarding_completed) analytics.onboarding_complete += 1;
    if (user.companion_onboarding_completed) analytics.companion_onboarding_complete += 1;
    if (user.role === 'child' && user.buddy_id) analytics.children_with_buddy_id += 1;

    const neuroTypes = user.neuro_types ?? [];
    if (neuroTypes.length === 0) {
      analytics.by_neuro_type.unspecified += 1;
    } else {
      for (const neuroId of ['autism', 'adhd', 'dyslexia'] as const) {
        if (neuroTypes.includes(neuroId)) analytics.by_neuro_type[neuroId] += 1;
      }
    }

    if (user.age != null) {
      ageSum += user.age;
      ageCount += 1;
    }

    const created = new Date(user.created_at).getTime();
    if (now - created <= sevenDays) analytics.recent_signups_7d += 1;
    if (now - created <= thirtyDays) analytics.recent_signups_30d += 1;
  }

  analytics.avg_age = ageCount > 0 ? Math.round((ageSum / ageCount) * 10) / 10 : null;
  return analytics;
}

export async function fetchAdminRelationshipCounts(): Promise<AdminRelationshipCounts> {
  try {
    const { data, error } = await getSupabaseClient().rpc('admin_get_relationship_counts');
    if (error) throw error;

    const raw = (data ?? {}) as {
      children_by_parent?: Record<string, number>;
      parents_by_child?: Record<string, number>;
    };

    return {
      childrenByParent: raw.children_by_parent ?? {},
      parentsByChild: raw.parents_by_child ?? {},
    };
  } catch {
    return { childrenByParent: {}, parentsByChild: {} };
  }
}

export async function fetchAdminAnalyticsSafe(): Promise<AdminAnalytics> {
  try {
    return await fetchAdminAnalytics();
  } catch {
    const users = await fetchAllUsers();
    return computeAnalyticsFromProfiles(users);
  }
}

export type AdminVisibilityMoodLevel = 'hidden' | 'summary' | 'full';

export interface AdminTeacherVisibilitySettings {
  childName: boolean;
  neuroProfile: boolean;
  dailyMood: AdminVisibilityMoodLevel;
  worryDiaryText: boolean;
  safeguardingAlerts: boolean;
  academicTasks: boolean;
  personalNotes: boolean;
}

export interface AdminVisibilitySummary {
  activeMemberships: number;
  nameShared: number;
  nameHidden: number;
  neuroProfileShared: number;
  moodSummaryShared: number;
  moodFullyShared: number;
  journalTextShared: number;
  safeguardingHidden: number;
  academicTasksShared: number;
}

export interface AdminSchoolRequestAudit {
  id: string;
  childId: string;
  childName: string;
  buddyId: string;
  teacherName: string;
  teacherEmail: string;
  className: string;
  schoolName: string;
  classCode: string;
  status: string;
  requestMethod: string;
  parentApproved: boolean;
  teacherApproved: boolean;
  visibility: AdminTeacherVisibilitySettings;
  requestedAt: string;
  teacherApprovedAt: string | null;
  parentApprovedAt: string | null;
  approvedAt: string | null;
  declinedAt: string | null;
}

export interface AdminSafeguardingAlertAudit {
  id: string;
  childId: string;
  childName: string;
  buddyId: string;
  riskLevel: string;
  acknowledged: boolean;
  createdAt: string;
  source: string;
}

export interface AdminJournalSignalAudit {
  id: string;
  childId: string;
  childName: string;
  buddyId: string;
  emotion: string;
  riskLevel: string;
  shared: boolean;
  excerpt: string;
  createdAt: string;
}

export interface AdminCommunicationAudit {
  id: string;
  childName: string;
  buddyId: string;
  senderName: string;
  recipientName: string;
  urgency: string;
  summary: string;
  read: boolean;
  createdAt: string;
}

export interface AdminCareMeetingAudit {
  id: string;
  childName: string;
  buddyId: string;
  requestedBy: string;
  assignedTo: string;
  meetingType: string;
  status: string;
  urgency: string;
  scheduledAt: string | null;
  createdAt: string;
}

export interface AdminAssignmentAudit {
  id: string;
  title: string;
  className: string;
  schoolName: string;
  teacherName: string;
  assigned: number;
  notStarted: number;
  inProgress: number;
  needsHelp: number;
  completed: number;
  submitted: number;
  dueAt: string | null;
  createdAt: string;
}

export interface AdminAuditSnapshot {
  generatedAt: string;
  metrics: {
    schoolRequestsPending: number;
    activeSchoolLinks: number;
    unresolvedAlerts: number;
    highRiskAlerts: number;
    sharedJournalSignals: number;
    urgentMessages: number;
    openMeetings: number;
    assignmentsNeedingHelp: number;
    visibilityExceptions: number;
  };
  visibilitySummary: AdminVisibilitySummary;
  schoolRequests: AdminSchoolRequestAudit[];
  safeguardingAlerts: AdminSafeguardingAlertAudit[];
  journalSignals: AdminJournalSignalAudit[];
  communications: AdminCommunicationAudit[];
  careMeetings: AdminCareMeetingAudit[];
  assignments: AdminAssignmentAudit[];
  dataSources: Record<string, boolean>;
  notes: string[];
}

interface DbErrorLike {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

interface DbResultLike {
  data: unknown;
  error: DbErrorLike | null;
}

interface TeacherClassAuditRow {
  id?: string;
  teacher_id?: string;
  school_name?: string;
  class_name?: string;
  class_code?: string;
  subject?: string;
  year_group?: string;
  created_at?: string;
}

interface ClassJoinRequestAuditRow {
  id?: string;
  class_id?: string;
  child_id?: string;
  requested_by?: string;
  request_method?: string;
  requested_buddy_id?: string;
  status?: string;
  parent_approved?: boolean;
  teacher_approved?: boolean;
  visibility_settings?: unknown;
  teacher_approved_at?: string | null;
  parent_approved_at?: string | null;
  approved_at?: string | null;
  declined_at?: string | null;
  created_at?: string;
}

interface ClassMembershipAuditRow {
  id?: string;
  class_id?: string;
  child_id?: string;
  teacher_id?: string;
  visibility_settings?: unknown;
  status?: string;
  joined_at?: string;
}

interface AlertAuditRow {
  id?: string;
  child_id?: string;
  risk_level?: string;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  created_at?: string;
  journal_entry_id?: string | null;
}

interface JournalAuditRow {
  id?: string;
  child_id?: string;
  emotion?: string;
  text?: string;
  risk_level?: string;
  is_shared?: boolean;
  created_at?: string;
}

interface ParentTeacherMessageAuditRow {
  id?: string;
  child_id?: string;
  sender_id?: string;
  recipient_id?: string | null;
  body?: string;
  urgency?: string;
  ai_summary?: string | null;
  read_at?: string | null;
  created_at?: string;
}

interface CareMeetingAuditRow {
  id?: string;
  child_id?: string;
  requested_by?: string;
  assigned_to?: string | null;
  meeting_type?: string;
  status?: string;
  urgency?: string;
  scheduled_at?: string | null;
  created_at?: string;
}

interface TeacherAssignmentAuditRow {
  id?: string;
  class_id?: string;
  teacher_id?: string;
  title?: string;
  due_at?: string | null;
  created_at?: string;
}

interface AssignmentSubmissionAuditRow {
  id?: string;
  assignment_id?: string;
  child_id?: string;
  status?: string;
  support_used?: string[];
  mood_after_task?: string | null;
  submitted_at?: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeVisibilitySettings(value: unknown): AdminTeacherVisibilitySettings {
  const raw = isRecord(value) ? value : {};
  const legacyMoodSummary = raw.show_mood_summary ?? raw.showMoodSummary;
  const moodValue = asString(raw.dailyMood, '');
  const dailyMood: AdminVisibilityMoodLevel =
    moodValue === 'hidden' || moodValue === 'summary' || moodValue === 'full'
      ? moodValue
      : legacyMoodSummary === false
        ? 'hidden'
        : 'summary';

  return {
    childName: asBoolean(raw.childName ?? raw.show_name ?? raw.showName, false),
    neuroProfile: asBoolean(raw.neuroProfile ?? raw.show_neurotypes ?? raw.showNeurotypes, false),
    dailyMood,
    worryDiaryText: asBoolean(raw.worryDiaryText ?? raw.show_journal ?? raw.showJournal, false),
    safeguardingAlerts: asBoolean(raw.safeguardingAlerts, true),
    academicTasks: asBoolean(raw.academicTasks, true),
    personalNotes: asBoolean(raw.personalNotes, false),
  };
}

function profileDisplayName(profile: Profile | undefined, fallback = 'Unknown'): string {
  if (!profile) return fallback;
  const fullName = asString(profile.full_name);
  if (fullName) return fullName;
  const composed = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  if (composed) return composed;
  return asString(profile.child_name, asString(profile.email, fallback));
}

function profileBuddyId(profile: Profile | undefined): string {
  return asString(profile?.buddy_id, 'No Buddy ID');
}

function excerpt(value: unknown, maxLength = 110): string {
  const text = asString(value, 'No shared text.');
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

async function readAuditRows<T>(
  source: string,
  query: PromiseLike<DbResultLike>,
  dataSources: Record<string, boolean>,
  notes: string[],
): Promise<T[]> {
  try {
    const { data, error } = await query;
    if (error) {
      dataSources[source] = false;
      notes.push(`${source}: ${error.message ?? 'not available'}`);
      return [];
    }

    dataSources[source] = true;
    return Array.isArray(data) ? (data as T[]) : [];
  } catch (err: unknown) {
    dataSources[source] = false;
    notes.push(`${source}: ${err instanceof Error ? err.message : 'not available'}`);
    return [];
  }
}

export async function fetchAdminAuditSnapshot(): Promise<AdminAuditSnapshot> {
  const client = getSupabaseClient();
  const notes: string[] = [];
  const dataSources: Record<string, boolean> = {};

  const [analytics, users] = await Promise.all([
    fetchAdminAnalyticsSafe().catch((err: unknown) => {
      notes.push(`analytics: ${err instanceof Error ? err.message : 'not available'}`);
      return normalizeAnalytics(null);
    }),
    fetchAllUsers().catch((err: unknown) => {
      notes.push(`profiles: ${err instanceof Error ? err.message : 'not available'}`);
      return [] as Profile[];
    }),
  ]);

  const profileMap = new Map(users.map((user) => [user.id, user]));

  const [
    classes,
    requests,
    memberships,
    alerts,
    journalEntries,
    messages,
    meetings,
    assignments,
    submissions,
  ] = await Promise.all([
    readAuditRows<TeacherClassAuditRow>(
      'teacher_classes',
      client.from('teacher_classes').select('*').order('created_at', { ascending: false }).limit(80),
      dataSources,
      notes,
    ),
    readAuditRows<ClassJoinRequestAuditRow>(
      'class_join_requests',
      client.from('class_join_requests').select('*').order('created_at', { ascending: false }).limit(80),
      dataSources,
      notes,
    ),
    readAuditRows<ClassMembershipAuditRow>(
      'class_memberships',
      client.from('class_memberships').select('*').order('joined_at', { ascending: false }).limit(120),
      dataSources,
      notes,
    ),
    readAuditRows<AlertAuditRow>(
      'alerts',
      client.from('alerts').select('*').order('created_at', { ascending: false }).limit(50),
      dataSources,
      notes,
    ),
    readAuditRows<JournalAuditRow>(
      'journal_entries',
      client.from('journal_entries').select('*').order('created_at', { ascending: false }).limit(50),
      dataSources,
      notes,
    ),
    readAuditRows<ParentTeacherMessageAuditRow>(
      'parent_teacher_messages',
      client.from('parent_teacher_messages').select('*').order('created_at', { ascending: false }).limit(50),
      dataSources,
      notes,
    ),
    readAuditRows<CareMeetingAuditRow>(
      'care_meetings',
      client.from('care_meetings').select('*').order('created_at', { ascending: false }).limit(50),
      dataSources,
      notes,
    ),
    readAuditRows<TeacherAssignmentAuditRow>(
      'teacher_assignments',
      client.from('teacher_assignments').select('*').order('created_at', { ascending: false }).limit(80),
      dataSources,
      notes,
    ),
    readAuditRows<AssignmentSubmissionAuditRow>(
      'assignment_submissions',
      client.from('assignment_submissions').select('*').order('updated_at', { ascending: false }).limit(200),
      dataSources,
      notes,
    ),
  ]);

  const classMap = new Map(classes.map((row) => [asString(row.id), row]));
  const submissionsByAssignment = submissions.reduce<Record<string, AssignmentSubmissionAuditRow[]>>(
    (acc, submission) => {
      const assignmentId = asString(submission.assignment_id);
      if (!assignmentId) return acc;
      acc[assignmentId] = [...(acc[assignmentId] ?? []), submission];
      return acc;
    },
    {},
  );
  const membershipsByClass = memberships.reduce<Record<string, ClassMembershipAuditRow[]>>(
    (acc, membership) => {
      const classId = asString(membership.class_id);
      if (!classId || membership.status !== 'active') return acc;
      acc[classId] = [...(acc[classId] ?? []), membership];
      return acc;
    },
    {},
  );

  const activeMemberships = memberships.filter((membership) => membership.status === 'active');
  const visibilitySummary = activeMemberships.reduce<AdminVisibilitySummary>(
    (summary, membership) => {
      const visibility = normalizeVisibilitySettings(membership.visibility_settings);
      summary.activeMemberships += 1;
      if (visibility.childName) summary.nameShared += 1;
      else summary.nameHidden += 1;
      if (visibility.neuroProfile) summary.neuroProfileShared += 1;
      if (visibility.dailyMood === 'summary') summary.moodSummaryShared += 1;
      if (visibility.dailyMood === 'full') summary.moodFullyShared += 1;
      if (visibility.worryDiaryText) summary.journalTextShared += 1;
      if (!visibility.safeguardingAlerts) summary.safeguardingHidden += 1;
      if (visibility.academicTasks) summary.academicTasksShared += 1;
      return summary;
    },
    {
      activeMemberships: 0,
      nameShared: 0,
      nameHidden: 0,
      neuroProfileShared: 0,
      moodSummaryShared: 0,
      moodFullyShared: 0,
      journalTextShared: 0,
      safeguardingHidden: 0,
      academicTasksShared: 0,
    },
  );

  const schoolRequests: AdminSchoolRequestAudit[] = requests.map((request) => {
    const classRow = classMap.get(asString(request.class_id));
    const child = profileMap.get(asString(request.child_id));
    const teacher = profileMap.get(asString(classRow?.teacher_id ?? request.requested_by));

    return {
      id: asString(request.id),
      childId: asString(request.child_id),
      childName: profileDisplayName(child, 'Learner'),
      buddyId: profileBuddyId(child),
      teacherName: profileDisplayName(teacher, 'Teacher'),
      teacherEmail: asString(teacher?.email, 'No email'),
      className: asString(classRow?.class_name, 'Class'),
      schoolName: asString(classRow?.school_name, 'School not set'),
      classCode: asString(classRow?.class_code, 'No code'),
      status: asString(request.status, 'pending'),
      requestMethod: asString(request.request_method, 'buddy_id'),
      parentApproved: request.parent_approved === true,
      teacherApproved: request.teacher_approved === true,
      visibility: normalizeVisibilitySettings(request.visibility_settings),
      requestedAt: asString(request.created_at),
      teacherApprovedAt: request.teacher_approved_at ?? null,
      parentApprovedAt: request.parent_approved_at ?? null,
      approvedAt: request.approved_at ?? null,
      declinedAt: request.declined_at ?? null,
    };
  });

  const safeguardingAlerts: AdminSafeguardingAlertAudit[] = alerts.map((alert) => {
    const child = profileMap.get(asString(alert.child_id));
    return {
      id: asString(alert.id),
      childId: asString(alert.child_id),
      childName: profileDisplayName(child, 'Learner'),
      buddyId: profileBuddyId(child),
      riskLevel: asString(alert.risk_level, 'medium'),
      acknowledged: Boolean(alert.acknowledged_at || alert.acknowledged_by),
      createdAt: asString(alert.created_at),
      source: alert.journal_entry_id ? 'journal' : 'support signal',
    };
  });

  const journalSignals: AdminJournalSignalAudit[] = journalEntries.map((entry) => {
    const child = profileMap.get(asString(entry.child_id));
    return {
      id: asString(entry.id),
      childId: asString(entry.child_id),
      childName: profileDisplayName(child, 'Learner'),
      buddyId: profileBuddyId(child),
      emotion: asString(entry.emotion, 'signal'),
      riskLevel: asString(entry.risk_level, 'low'),
      shared: entry.is_shared !== false,
      excerpt: excerpt(entry.text),
      createdAt: asString(entry.created_at),
    };
  });

  const communications: AdminCommunicationAudit[] = messages.map((message) => {
    const child = profileMap.get(asString(message.child_id));
    const sender = profileMap.get(asString(message.sender_id));
    const recipient = profileMap.get(asString(message.recipient_id));
    return {
      id: asString(message.id),
      childName: profileDisplayName(child, 'Learner'),
      buddyId: profileBuddyId(child),
      senderName: profileDisplayName(sender, 'Sender'),
      recipientName: profileDisplayName(recipient, 'Family or school'),
      urgency: asString(message.urgency, 'normal'),
      summary: excerpt(message.ai_summary || message.body, 120),
      read: Boolean(message.read_at),
      createdAt: asString(message.created_at),
    };
  });

  const careMeetings: AdminCareMeetingAudit[] = meetings.map((meeting) => {
    const child = profileMap.get(asString(meeting.child_id));
    const requestedBy = profileMap.get(asString(meeting.requested_by));
    const assignedTo = profileMap.get(asString(meeting.assigned_to));
    return {
      id: asString(meeting.id),
      childName: profileDisplayName(child, 'Learner'),
      buddyId: profileBuddyId(child),
      requestedBy: profileDisplayName(requestedBy, 'Requester'),
      assignedTo: profileDisplayName(assignedTo, 'Not assigned'),
      meetingType: asString(meeting.meeting_type, 'parent_teacher'),
      status: asString(meeting.status, 'requested'),
      urgency: asString(meeting.urgency, 'routine'),
      scheduledAt: meeting.scheduled_at ?? null,
      createdAt: asString(meeting.created_at),
    };
  });

  const assignmentAudits: AdminAssignmentAudit[] = assignments.map((assignment) => {
    const assignmentId = asString(assignment.id);
    const classRow = classMap.get(asString(assignment.class_id));
    const teacher = profileMap.get(asString(classRow?.teacher_id ?? assignment.teacher_id));
    const classMemberships = membershipsByClass[asString(assignment.class_id)] ?? [];
    const assignmentSubmissions = submissionsByAssignment[assignmentId] ?? [];
    const statusCounts = assignmentSubmissions.reduce<Record<string, number>>((acc, submission) => {
      const status = asString(submission.status, 'not_started');
      acc[status] = (acc[status] ?? 0) + 1;
      return acc;
    }, {});

    const assigned = Math.max(classMemberships.length, assignmentSubmissions.length);
    const started =
      (statusCounts.in_progress ?? 0) +
      (statusCounts.needs_help ?? 0) +
      (statusCounts.completed ?? 0) +
      (statusCounts.submitted ?? 0);

    return {
      id: assignmentId,
      title: asString(assignment.title, 'Untitled assignment'),
      className: asString(classRow?.class_name, 'Class'),
      schoolName: asString(classRow?.school_name, 'School not set'),
      teacherName: profileDisplayName(teacher, 'Teacher'),
      assigned,
      notStarted: Math.max(assigned - started, 0),
      inProgress: statusCounts.in_progress ?? 0,
      needsHelp: statusCounts.needs_help ?? 0,
      completed: statusCounts.completed ?? 0,
      submitted: statusCounts.submitted ?? 0,
      dueAt: assignment.due_at ?? null,
      createdAt: asString(assignment.created_at),
    };
  });

  const schoolRequestsPending = schoolRequests.filter((request) =>
    ['pending', 'pending_parent', 'pending_teacher'].includes(request.status),
  ).length;
  const unresolvedAlerts = safeguardingAlerts.filter((alert) => !alert.acknowledged).length;
  const highRiskAlerts = safeguardingAlerts.filter(
    (alert) => !alert.acknowledged && alert.riskLevel === 'high',
  ).length;

  return {
    generatedAt: new Date().toISOString(),
    metrics: {
      schoolRequestsPending,
      activeSchoolLinks: visibilitySummary.activeMemberships,
      unresolvedAlerts,
      highRiskAlerts,
      sharedJournalSignals: analytics.shared_journal_entries || journalSignals.filter((signal) => signal.shared).length,
      urgentMessages: communications.filter((message) => message.urgency === 'urgent').length,
      openMeetings: careMeetings.filter((meeting) => !['completed', 'cancelled'].includes(meeting.status)).length,
      assignmentsNeedingHelp: assignmentAudits.reduce((sum, assignment) => sum + assignment.needsHelp, 0),
      visibilityExceptions: visibilitySummary.journalTextShared + visibilitySummary.safeguardingHidden,
    },
    visibilitySummary,
    schoolRequests,
    safeguardingAlerts,
    journalSignals,
    communications,
    careMeetings,
    assignments: assignmentAudits,
    dataSources,
    notes,
  };
}
