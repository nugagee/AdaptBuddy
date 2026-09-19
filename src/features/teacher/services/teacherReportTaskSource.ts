import { getSupabaseClient, isSupabaseConfigured } from 'services/supabase/client';

// A complete, bounded snapshot of rows visible to this teacher. This validates
// responses; database permissions remain the authority. No writes or RPC fallback.
export const TEACHER_REPORT_LIMITS = { classes: 100, memberships: 1000, assignments: 500, submissions: 1000 };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TYPES = ['reading', 'maths', 'writing', 'pronunciation', 'calm_break', 'visual_routine', 'social_story', 'task'];
const STATUSES = ['not_started', 'in_progress', 'needs_help', 'completed', 'submitted'];
type Row = Record<string, unknown>;
export interface ReportClassRow {
  id: string; teacher_id: string; school_name: string | null; class_name: string; class_code: string;
  subject: string | null; year_group: string | null; created_at: string;
}
export interface ReportMembershipRow {
  id: string; class_id: string; child_id: string; teacher_id: string; visibility_settings: Row;
  status: string; joined_at: string;
}
export interface ReportAssignmentRow {
  id: string; class_id: string; teacher_id: string; title: string; description: string | null;
  assignment_type: string; support_tools: string[] | null; due_at: string | null;
  created_at: string; updated_at: string | null; archived_at: null;
}
export interface ReportSubmissionRow {
  assignment_id: string; child_id: string; status: string; support_used: string[] | null;
  mood_after_task: string | null; submitted_at: string | null; updated_at: string | null;
}
const fail = (): never => { throw new Error('Teacher report data is unavailable or incomplete.'); };
const object = (value: unknown): value is Row => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const id = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.length <= 20000;
const optionalText = (value: unknown) => value === null || text(value);
const date = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const optionalDate = (value: unknown) => value === null || date(value);
const strings = (value: unknown) => value === null || (Array.isArray(value) && value.length <= 100 && value.every(item => text(item) && item.length <= 200));

export function verifiedReportRows<T>(result: { data: unknown; error: unknown; count: number | null }, limit: number, valid: (row: Row) => boolean, key: (row: Row) => string): T[] {
  if (result.error || !Array.isArray(result.data) || !Number.isInteger(result.count) || result.count !== result.data.length || result.data.length > limit) return fail();
  const seen = new Set<string>();
  for (const row of result.data) {
    if (!object(row) || !valid(row)) return fail();
    const identifier = key(row);
    if (seen.has(identifier)) return fail();
    seen.add(identifier);
  }
  return result.data as T[];
}

export async function readTeacherReportTaskSource(teacherId: string) {
  if (!isSupabaseConfigured || !id(teacherId)) return fail();
  const client = getSupabaseClient();
  const auth = await client.auth.getUser();
  if (auth.error || auth.data.user?.id !== teacherId || !auth.data.user.email_confirmed_at) return fail();
  const actor = await client.from('profiles').select('id,role,status,is_authorized').eq('id', teacherId).maybeSingle();
  if (actor.error || actor.data?.id !== teacherId || !['teacher', 'admin'].includes(actor.data.role)
      || actor.data.status !== 'active' || actor.data.is_authorized !== true) return fail();

  const classes = verifiedReportRows<ReportClassRow>(await client.from('teacher_classes')
    .select('id,teacher_id,school_name,class_name,class_code,subject,year_group,created_at', { count: 'exact' })
    .eq('teacher_id', teacherId).order('id').limit(TEACHER_REPORT_LIMITS.classes), TEACHER_REPORT_LIMITS.classes,
    r => id(r.id) && r.teacher_id === teacherId && text(r.class_name) && Boolean(r.class_name.trim()) && text(r.class_code)
      && optionalText(r.school_name) && optionalText(r.subject) && optionalText(r.year_group) && date(r.created_at), r => String(r.id));
  const classIds = classes.map(r => r.id);
  if (!classIds.length) return { teacherId, classes, memberships: [] as ReportMembershipRow[], assignments: [] as ReportAssignmentRow[], submissions: [] as ReportSubmissionRow[] };

  const memberships = verifiedReportRows<ReportMembershipRow>(await client.from('class_memberships')
    .select('id,class_id,child_id,teacher_id,visibility_settings,status,joined_at', { count: 'exact' })
    .eq('teacher_id', teacherId).in('class_id', classIds).eq('status', 'active').order('id').limit(TEACHER_REPORT_LIMITS.memberships), TEACHER_REPORT_LIMITS.memberships,
    r => id(r.id) && id(r.child_id) && classIds.includes(String(r.class_id)) && r.teacher_id === teacherId
      && r.status === 'active' && object(r.visibility_settings) && date(r.joined_at), r => `${r.class_id}:${r.child_id}`);

  const assignments = verifiedReportRows<ReportAssignmentRow>(await client.from('teacher_assignments')
    .select('id,class_id,teacher_id,title,description,assignment_type,support_tools,due_at,created_at,updated_at,archived_at', { count: 'exact' })
    .eq('teacher_id', teacherId).in('class_id', classIds).is('archived_at', null).order('id').limit(TEACHER_REPORT_LIMITS.assignments), TEACHER_REPORT_LIMITS.assignments,
    r => id(r.id) && classIds.includes(String(r.class_id)) && r.teacher_id === teacherId && text(r.title) && Boolean(r.title.trim())
      && optionalText(r.description) && TYPES.includes(String(r.assignment_type)) && strings(r.support_tools)
      && optionalDate(r.due_at) && date(r.created_at) && optionalDate(r.updated_at) && r.archived_at === null, r => String(r.id));
  const eligible = memberships.filter(r => r.visibility_settings.academicTasks === true);
  const childIds = Array.from(new Set(eligible.map(r => r.child_id)));
  const assignmentIds = assignments.map(r => r.id);
  const permittedPairs = new Set(assignments.flatMap(a => eligible.filter(m => m.class_id === a.class_id).map(m => `${a.id}:${m.child_id}`)));
  const submissions = !assignmentIds.length || !childIds.length ? [] : verifiedReportRows<ReportSubmissionRow>(await client.from('assignment_submissions')
    .select('assignment_id,child_id,status,support_used,mood_after_task,submitted_at,updated_at', { count: 'exact' })
    .in('assignment_id', assignmentIds).in('child_id', childIds).order('assignment_id').order('child_id').limit(TEACHER_REPORT_LIMITS.submissions), TEACHER_REPORT_LIMITS.submissions,
    r => permittedPairs.has(`${r.assignment_id}:${r.child_id}`) && STATUSES.includes(String(r.status))
      && strings(r.support_used) && optionalText(r.mood_after_task) && optionalDate(r.submitted_at) && optionalDate(r.updated_at), r => `${r.assignment_id}:${r.child_id}`);
  return { teacherId, classes, memberships, assignments, submissions };
}
