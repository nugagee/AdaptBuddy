import { getSupabaseClient, isSupabaseConfigured } from 'services/supabase/client';
import type { AssignmentStatus, TeacherAssignmentType } from 'features/teacher/services/teacherDashboardService';

export interface ChildTeacherAssignment {
  id: string;
  classId: string;
  title: string;
  description?: string;
  assignmentType: TeacherAssignmentType;
  supportTools: string[];
  dueAt?: string;
  createdAt: string;
  status: AssignmentStatus;
  moodAfterTask?: string;
  supportUsed: string[];
}

interface AssignmentRow {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  assignment_type: string | null;
  support_tools: string[] | null;
  due_at: string | null;
  created_at: string;
  archived_at?: string | null;
}
interface ClassMembershipRow { class_id: string; status: string | null; }
interface SubmissionRow {
  assignment_id: string;
  status: string | null;
  support_used: string[] | null;
  mood_after_task: string | null;
}
const assignmentTypes = ['reading', 'maths', 'writing', 'pronunciation', 'calm_break', 'visual_routine', 'social_story', 'task'] as const;
const submissionStatuses = ['not_started', 'in_progress', 'needs_help', 'completed', 'submitted'] as const;
const taskMoods = ['good', 'calm', 'confused', 'worried', 'tired'];
const normalizeAssignmentType = (value: string | null | undefined): TeacherAssignmentType =>
  assignmentTypes.includes(value as TeacherAssignmentType) ? value as TeacherAssignmentType : 'task';
const normalizeSubmissionStatus = (value: string | null | undefined): AssignmentStatus =>
  submissionStatuses.includes(value as AssignmentStatus) ? value as AssignmentStatus : 'not_started';
const assignmentSelectColumns = 'id, class_id, title, description, assignment_type, support_tools, due_at, created_at, archived_at';
const legacyAssignmentSelectColumns = 'id, class_id, title, description, assignment_type, support_tools, due_at, created_at';
const isMissingAssignmentLifecycleColumn = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error ? String((error as { message?: unknown }).message).toLowerCase() : '';
  return message.includes('archived_at') && (
    message.includes('schema cache') || message.includes('column') || message.includes('could not find')
  );
};
const mapAssignment = (row: AssignmentRow, submission?: SubmissionRow): ChildTeacherAssignment => ({
  id: row.id, classId: row.class_id, title: row.title, description: row.description ?? undefined,
  assignmentType: normalizeAssignmentType(row.assignment_type), supportTools: row.support_tools ?? [],
  dueAt: row.due_at ?? undefined, createdAt: row.created_at,
  status: normalizeSubmissionStatus(submission?.status), moodAfterTask: submission?.mood_after_task ?? undefined,
  supportUsed: submission?.support_used ?? [],
});
const requireWritableTask = (childId: string, assignmentId: string) => {
  if (!childId?.trim() || childId === 'guest-child' || !assignmentId?.trim()) {
    throw new Error('A signed-in child and a teacher task are required to save progress.');
  }
  if (!isSupabaseConfigured) throw new Error('Teacher task saving is unavailable.');
};
const matchesReturnedTask = (data: unknown, assignmentId: string, childId: string, status?: AssignmentStatus): boolean => {
  if (!Array.isArray(data) || data.length !== 1) return false;
  const row = data[0];
  return row?.assignment_id === assignmentId && row?.child_id === childId
    && (status === undefined || row?.status === status);
};

export class ChildAssignmentService {
  static async getAssignments(childId: string): Promise<ChildTeacherAssignment[]> {
    // Demo/no-identity reads never touch the backend; unavailable real reads are not empty inboxes.
    if (!childId || childId === 'guest-child') return [];
    if (!isSupabaseConfigured) throw new Error('Teacher tasks are unavailable.');
    const client = getSupabaseClient();
    const { data: membershipData, error: membershipError } = await client
      .from('class_memberships').select('class_id, status').eq('child_id', childId).eq('status', 'active');
    if (membershipError) throw membershipError;
    const classIds = Array.from(new Set(((membershipData ?? []) as ClassMembershipRow[]).map(row => row.class_id)));
    if (classIds.length === 0) return [];

    const { data: assignmentData, error: assignmentError } = await client
      .from('teacher_assignments').select(assignmentSelectColumns).in('class_id', classIds)
      .is('archived_at', null).order('created_at', { ascending: false }).limit(12);
    if (assignmentError && !isMissingAssignmentLifecycleColumn(assignmentError)) throw assignmentError;
    let assignments = (assignmentData ?? []) as AssignmentRow[];
    // Retain the existing legacy-schema compatibility path; live schema acceptance is separate.
    if (assignmentError) {
      const { data: legacyData, error: legacyError } = await client
        .from('teacher_assignments').select(legacyAssignmentSelectColumns).in('class_id', classIds)
        .order('created_at', { ascending: false }).limit(12);
      if (legacyError) throw legacyError;
      assignments = (legacyData ?? []) as AssignmentRow[];
    }
    const assignmentIds = assignments.map(row => row.id);
    if (assignmentIds.length === 0) return [];
    const { data: submissionData, error: submissionError } = await client
      .from('assignment_submissions').select('assignment_id, status, support_used, mood_after_task')
      .eq('child_id', childId).in('assignment_id', assignmentIds);
    if (submissionError) throw submissionError;
    const submissions = new Map(((submissionData ?? []) as SubmissionRow[]).map(row => [row.assignment_id, row]));
    return assignments.map(row => mapAssignment(row, submissions.get(row.id)));
  }

  static async saveProgress(input: {
    assignmentId: string;
    childId: string;
    status: AssignmentStatus;
    supportUsed?: string[];
    moodAfterTask?: string;
  }): Promise<void> {
    requireWritableTask(input.childId, input.assignmentId);
    if (!submissionStatuses.includes(input.status)) throw new Error('Unknown task status.');
    const completed = input.status === 'completed' || input.status === 'submitted';
    const { data, error } = await getSupabaseClient().from('assignment_submissions')
      .upsert({
        assignment_id: input.assignmentId, child_id: input.childId, status: input.status,
        support_used: input.supportUsed ?? [], mood_after_task: input.moodAfterTask ?? null,
        submitted_at: completed ? new Date().toISOString() : null,
      }, { onConflict: 'assignment_id,child_id' })
      .select('assignment_id, child_id, status');
    if (error) throw error;
    // Do not turn a no-op/empty response into a false saved/celebration message.
    if (!matchesReturnedTask(data, input.assignmentId, input.childId, input.status)) {
      throw new Error('The task update could not be confirmed. Refresh before retrying.');
    }
  }

  static async saveMoodAfterTask(input: {
    assignmentId: string;
    childId: string;
    moodAfterTask: string;
  }): Promise<void> {
    requireWritableTask(input.childId, input.assignmentId);
    if (!taskMoods.includes(input.moodAfterTask)) throw new Error('Choose a listed task feeling.');
    // Optional follow-up must not resubmit, change completed/submitted status,
    // reset its completion timestamp, overwrite supports or create a new row.
    const { data, error } = await getSupabaseClient().from('assignment_submissions')
      .update({ mood_after_task: input.moodAfterTask })
      .eq('assignment_id', input.assignmentId).eq('child_id', input.childId)
      .in('status', ['completed', 'submitted']).select('assignment_id, child_id');
    if (error) throw error;
    if (!matchesReturnedTask(data, input.assignmentId, input.childId)) {
      throw new Error('The task feeling could not be confirmed.');
    }
  }
}
