import { getSupabaseClient, isSupabaseConfigured, type Profile, type UserRole } from 'services/supabase/client';

export type SupportPlanPriority = 'steady' | 'watch' | 'urgent';
export type SupportPlanConfidence = 'early' | 'emerging' | 'strong';

export interface SupportPlanPattern {
  id: string;
  label: string;
  count: number;
  lastSeenAt?: string;
  detail: string;
  supports: string[];
  adultDo: string;
  adultAvoid: string;
}

export interface SupportPlanDraft {
  childId: string;
  childName: string;
  buddyId?: string | null;
  neurotypes: string[];
  generatedAt: string;
  reviewDate: string;
  priority: SupportPlanPriority;
  confidence: SupportPlanConfidence;
  evidenceCount: number;
  highRiskCount: number;
  needsHelpCount: number;
  openMeetingsCount: number;
  patterns: SupportPlanPattern[];
  triggers: string[];
  helpfulSupports: string[];
  adultActions: string[];
  avoid: string[];
  homeSchoolNextStep: string;
  privacyNote: string;
}

export interface SupportPlanOptions {
  childIds?: string[];
  limit?: number;
}

interface ProfileRow {
  id: string;
  email?: string | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  child_name?: string | null;
  buddy_id?: string | null;
  neuro_types?: string[] | null;
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
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  created_at: string;
}

interface AssignmentSubmissionRow {
  assignment_id: string;
  child_id: string;
  status?: string | null;
  mood_after_task?: string | null;
  updated_at?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
}

interface CareMeetingRow {
  id: string;
  child_id: string;
  status?: string | null;
}

interface PatternDefinition {
  id: string;
  label: string;
  match: RegExp;
  detail: string;
  supports: string[];
  adultDo: string;
  adultAvoid: string;
}

const PATTERNS: PatternDefinition[] = [
  {
    id: 'noise',
    label: 'Noise or sensory load',
    match: /too noisy|noise|noisy|loud|sound|crowd|busy/,
    detail: 'Noise, busy spaces, or sound levels may be increasing cognitive load.',
    supports: ['Offer headphones or a quieter space', 'Reduce verbal instructions', 'Use a short reset before continuing'],
    adultDo: 'Offer a quieter option early and confirm the child can still take part.',
    adultAvoid: 'Avoid treating sensory withdrawal as refusal.',
  },
  {
    id: 'light',
    label: 'Brightness or visual load',
    match: /too bright|bright|light|glare|visual/,
    detail: 'Brightness, glare, or visual clutter may be making tasks harder to access.',
    supports: ['Reduce glare where possible', 'Use clean visual steps', 'Offer a lower-light calm option'],
    adultDo: 'Simplify the visual field and check whether lighting is affecting attention.',
    adultAvoid: 'Avoid adding more worksheets, colours, or visual prompts at once.',
  },
  {
    id: 'confusion',
    label: 'Confused or stuck',
    match: /confused|stuck|unclear|instruction|don't understand|dont understand|hard|difficult/,
    detail: 'The child may need smaller steps or a clearer example before continuing.',
    supports: ['One instruction at a time', 'Show an example first', 'Use a checklist or visual step card'],
    adultDo: 'Restate one step only, then check whether the child wants help or thinking time.',
    adultAvoid: 'Avoid repeating the same long instruction louder or faster.',
  },
  {
    id: 'worry',
    label: 'Worried or anxious',
    match: /worried|anxious|anxiety|overwhelm|panic|scared|sad|upset/,
    detail: 'Emotional load may be affecting learning, communication, or transitions.',
    supports: ['Validate the feeling', 'Lower demands briefly', 'Offer a predictable next step'],
    adultDo: 'Acknowledge the feeling calmly and move to one clear next step.',
    adultAvoid: 'Avoid debating the feeling or rushing the child into performance.',
  },
  {
    id: 'frustration',
    label: 'Frustration or anger',
    match: /frustrated|angry|mad|annoyed|upset|not fair/,
    detail: 'Frustration may be signalling overload, unclear expectations, or a need for agency.',
    supports: ['Offer two acceptable choices', 'Use a short movement/reset break', 'Return with one small step'],
    adultDo: 'Name the difficulty without blame and offer a regulated choice.',
    adultAvoid: 'Avoid power struggles or public correction when the child is dysregulated.',
  },
  {
    id: 'fatigue',
    label: 'Tired or low energy',
    match: /tired|sleep|sleepy|fatigue|exhausted|low energy/,
    detail: 'Low energy may be reducing tolerance for noise, demands, or transitions.',
    supports: ['Reduce pace', 'Offer a short break', 'Prioritise the most important task only'],
    adultDo: 'Adjust pace and separate low energy from unwillingness.',
    adultAvoid: 'Avoid interpreting fatigue as laziness.',
  },
  {
    id: 'transition',
    label: 'Transition difficulty',
    match: /transition|change|switch|later|next|routine|now next|timer|finish/,
    detail: 'Moving between activities may need extra predictability and warning.',
    supports: ['Use Now/Next/Later language', 'Give a gentle countdown', 'Preview the next safe step'],
    adultDo: 'Give a short warning and keep the next step visible.',
    adultAvoid: 'Avoid sudden changes without a reason or replacement plan.',
  },
  {
    id: 'task-help',
    label: 'Task help needed',
    match: /help|assignment|task|homework|writing|reading|maths|needs help/,
    detail: 'The child may need access support before the task can be completed independently.',
    supports: ['Break the task into smaller parts', 'Use read-aloud or speech-to-text when useful', 'Confirm success criteria'],
    adultDo: 'Make the first step small enough to start and celebrate completion of that step.',
    adultAvoid: 'Avoid using completion speed as the only measure of effort.',
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function getAnalysisText(row: JournalEntryRow): string {
  const analysis = isRecord(row.ai_analysis) ? row.ai_analysis : {};
  return [
    row.emotion,
    row.text,
    analysis.signalLabel,
    analysis.signalCategory,
    analysis.supportLevel,
    analysis.parentInsight,
    analysis.suggestedAction,
  ].map((value) => asString(value)).filter(Boolean).join(' ').toLowerCase();
}

function getDisplayName(profile?: ProfileRow, fallback = 'Learner'): string {
  if (!profile) return fallback;
  const fullName = asString(profile.full_name);
  if (fullName) return fullName;
  const composed = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
  if (composed) return composed;
  return asString(profile.child_name, asString(profile.email, fallback));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function getReviewDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString();
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
      .select('id, email, full_name, first_name, last_name, child_name, buddy_id, neuro_types, role')
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
    return children.map((row) => row.id);
  }

  return [];
}

function filterChildIds(scopedChildIds: string[], requestedChildIds?: string[]): string[] {
  if (!requestedChildIds?.length) return scopedChildIds;
  const scoped = new Set(scopedChildIds);
  return Array.from(new Set(requestedChildIds.filter((id) => scoped.has(id))));
}

function buildDraftForChild(
  childId: string,
  profile: ProfileRow | undefined,
  journalRows: JournalEntryRow[],
  alerts: AlertRow[],
  assignments: AssignmentSubmissionRow[],
  meetings: CareMeetingRow[],
): SupportPlanDraft {
  const patternMap = new Map<string, SupportPlanPattern>();

  const touchPattern = (definition: PatternDefinition, createdAt?: string) => {
    const current = patternMap.get(definition.id);
    if (current) {
      current.count += 1;
      if (createdAt && (!current.lastSeenAt || new Date(createdAt) > new Date(current.lastSeenAt))) {
        current.lastSeenAt = createdAt;
      }
      return;
    }

    patternMap.set(definition.id, {
      id: definition.id,
      label: definition.label,
      count: 1,
      lastSeenAt: createdAt,
      detail: definition.detail,
      supports: definition.supports,
      adultDo: definition.adultDo,
      adultAvoid: definition.adultAvoid,
    });
  };

  journalRows.forEach((row) => {
    const text = getAnalysisText(row);
    let matched = false;
    PATTERNS.forEach((definition) => {
      if (definition.match.test(text)) {
        touchPattern(definition, row.created_at);
        matched = true;
      }
    });
    if (!matched && ['medium', 'high'].includes(asString(row.risk_level).toLowerCase())) {
      touchPattern(PATTERNS.find((pattern) => pattern.id === 'worry') ?? PATTERNS[0], row.created_at);
    }
  });

  assignments
    .filter((row) => asString(row.status).toLowerCase() === 'needs_help')
    .forEach((row) => touchPattern(PATTERNS.find((pattern) => pattern.id === 'task-help') ?? PATTERNS[0], row.updated_at || row.submitted_at || row.created_at || undefined));

  const highRiskCount =
    alerts.filter((alert) => asString(alert.risk_level).toLowerCase() === 'high').length
    + journalRows.filter((row) => asString(row.risk_level).toLowerCase() === 'high').length;
  const needsHelpCount = assignments.filter((row) => asString(row.status).toLowerCase() === 'needs_help').length;
  const openMeetingsCount = meetings.filter((meeting) => !['completed', 'cancelled'].includes(asString(meeting.status))).length;
  const patterns = Array.from(patternMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);
  const evidenceCount = journalRows.length + alerts.length + assignments.length + meetings.length;
  const priority: SupportPlanPriority =
    highRiskCount > 0 ? 'urgent' : patterns.some((pattern) => pattern.count >= 2) || needsHelpCount > 0 ? 'watch' : 'steady';
  const confidence: SupportPlanConfidence = evidenceCount >= 8 ? 'strong' : evidenceCount >= 3 ? 'emerging' : 'early';
  const fallbackPattern: SupportPlanPattern = {
    id: 'steady',
    label: 'No repeated pattern yet',
    count: 0,
    detail: 'There is not enough repeated signal evidence to identify a clear pattern yet.',
    supports: ['Keep using gentle check-ins', 'Review again after more journal or task reflections'],
    adultDo: 'Invite short, pressure-free check-ins and watch for repeated themes.',
    adultAvoid: 'Avoid over-interpreting one isolated signal.',
  };
  const visiblePatterns = patterns.length > 0 ? patterns : [fallbackPattern];

  return {
    childId,
    childName: getDisplayName(profile),
    buddyId: profile?.buddy_id ?? null,
    neurotypes: Array.isArray(profile?.neuro_types) ? profile?.neuro_types ?? [] : [],
    generatedAt: new Date().toISOString(),
    reviewDate: getReviewDate(),
    priority,
    confidence,
    evidenceCount,
    highRiskCount,
    needsHelpCount,
    openMeetingsCount,
    patterns: visiblePatterns,
    triggers: visiblePatterns.map((pattern) => `${pattern.label}: ${pattern.detail}`),
    helpfulSupports: unique(visiblePatterns.flatMap((pattern) => pattern.supports)).slice(0, 8),
    adultActions: unique([
      ...visiblePatterns.map((pattern) => pattern.adultDo),
      highRiskCount > 0 ? 'Follow the agreed safeguarding route and document who has checked in.' : '',
      openMeetingsCount > 0 ? 'Use the open meeting to agree one home action and one school action.' : '',
    ]).slice(0, 8),
    avoid: unique(visiblePatterns.map((pattern) => pattern.adultAvoid)).slice(0, 6),
    homeSchoolNextStep:
      priority === 'urgent'
        ? 'Agree same-day adult follow-up and confirm who will update the child.'
        : priority === 'watch'
          ? 'Agree one shared support adjustment to try for two weeks, then review the evidence.'
          : 'Keep collecting gentle check-ins and review again when a pattern appears.',
    privacyNote:
      'This is a support planning draft, not a diagnosis. It uses shared/support-visible evidence only; private journal text and hidden profile details remain excluded.',
  };
}

export class SupportPlanService {
  static async getDrafts(profile: Profile, options: SupportPlanOptions = {}): Promise<SupportPlanDraft[]> {
    if (!isSupabaseConfigured || !profile?.id) return this.getGuestDrafts(options.childIds?.[0]);

    const scopedChildIds = await getScopedChildIds(profile);
    const childIds = filterChildIds(scopedChildIds, options.childIds);
    if (childIds.length === 0 && profile.role !== 'admin') return [];

    const limit = Math.max(options.limit ?? 6, 1);
    const profileMap = await getProfiles(childIds);
    const [journalRows, alerts, assignments, meetings] = await Promise.all([
      this.getJournalRows(childIds),
      this.getAlertRows(childIds),
      this.getAssignmentRows(childIds),
      this.getMeetingRows(childIds),
    ]);

    return childIds.slice(0, limit).map((childId) => buildDraftForChild(
      childId,
      profileMap.get(childId),
      journalRows.filter((row) => row.child_id === childId),
      alerts.filter((row) => row.child_id === childId),
      assignments.filter((row) => row.child_id === childId),
      meetings.filter((row) => row.child_id === childId),
    ));
  }

  private static async getJournalRows(childIds: string[]): Promise<JournalEntryRow[]> {
    if (childIds.length === 0) return [];
    return safeRows<JournalEntryRow>(
      getSupabaseClient()
        .from('journal_entries')
        .select('id, child_id, emotion, text, ai_analysis, risk_level, created_at')
        .in('child_id', childIds)
        .eq('is_shared', true)
        .order('created_at', { ascending: false })
        .limit(120),
    );
  }

  private static async getAlertRows(childIds: string[]): Promise<AlertRow[]> {
    if (childIds.length === 0) return [];
    return safeRows<AlertRow>(
      getSupabaseClient()
        .from('alerts')
        .select('id, child_id, risk_level, acknowledged_at, acknowledged_by, created_at')
        .in('child_id', childIds)
        .order('created_at', { ascending: false })
        .limit(120),
    );
  }

  private static async getAssignmentRows(childIds: string[]): Promise<AssignmentSubmissionRow[]> {
    if (childIds.length === 0) return [];
    return safeRows<AssignmentSubmissionRow>(
      getSupabaseClient()
        .from('assignment_submissions')
        .select('assignment_id, child_id, status, mood_after_task, created_at, submitted_at, updated_at')
        .in('child_id', childIds)
        .order('updated_at', { ascending: false })
        .limit(120),
    );
  }

  private static async getMeetingRows(childIds: string[]): Promise<CareMeetingRow[]> {
    if (childIds.length === 0) return [];
    return safeRows<CareMeetingRow>(
      getSupabaseClient()
        .from('care_meetings')
        .select('id, child_id, status')
        .in('child_id', childIds)
        .order('created_at', { ascending: false })
        .limit(80),
    );
  }

  private static getGuestDrafts(childId?: string): SupportPlanDraft[] {
    return [
      {
        childId: childId ?? 'guest-child',
        childName: 'Alex',
        buddyId: 'AB-DEMO-24',
        neurotypes: ['autism'],
        generatedAt: new Date().toISOString(),
        reviewDate: getReviewDate(),
        priority: 'watch',
        confidence: 'emerging',
        evidenceCount: 6,
        highRiskCount: 0,
        needsHelpCount: 1,
        openMeetingsCount: 1,
        patterns: [
          {
            id: 'noise',
            label: 'Noise or sensory load',
            count: 3,
            detail: 'Noise after lunch appears linked with regulation difficulty.',
            supports: ['Offer headphones or a quieter space', 'Use a short reset before continuing'],
            adultDo: 'Offer a quieter option early and confirm Alex can still take part.',
            adultAvoid: 'Avoid treating sensory withdrawal as refusal.',
          },
        ],
        triggers: ['Noise or sensory load: Noise after lunch appears linked with regulation difficulty.'],
        helpfulSupports: ['Offer headphones or a quieter space', 'Use a short reset before continuing'],
        adultActions: ['Offer a quieter option early and confirm Alex can still take part.'],
        avoid: ['Avoid treating sensory withdrawal as refusal.'],
        homeSchoolNextStep: 'Agree one shared support adjustment to try for two weeks, then review the evidence.',
        privacyNote: 'This is a support planning draft, not a diagnosis. It uses shared/support-visible evidence only.',
      },
    ];
  }
}
