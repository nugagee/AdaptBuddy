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
}

interface SubmissionRow {
  assignment_id: string;
  status: string | null;
  support_used: string[] | null;
  mood_after_task: string | null;
}

const assignmentTypes = [
  'reading',
  'maths',
  'writing',
  'calm_break',
  'visual_routine',
  'social_story',
  'task',
] as const;

const submissionStatuses = ['not_started', 'in_progress', 'needs_help', 'completed', 'submitted'] as const;

const normalizeAssignmentType = (value: string | null | undefined): TeacherAssignmentType =>
  assignmentTypes.includes(value as TeacherAssignmentType) ? (value as TeacherAssignmentType) : 'task';

const normalizeSubmissionStatus = (value: string | null | undefined): AssignmentStatus =>
  submissionStatuses.includes(value as AssignmentStatus) ? (value as AssignmentStatus) : 'not_started';

const mapAssignment = (row: AssignmentRow, submission?: SubmissionRow): ChildTeacherAssignment => ({
  id: row.id,
  classId: row.class_id,
  title: row.title,
  description: row.description ?? undefined,
  assignmentType: normalizeAssignmentType(row.assignment_type),
  supportTools: row.support_tools ?? [],
  dueAt: row.due_at ?? undefined,
  createdAt: row.created_at,
  status: normalizeSubmissionStatus(submission?.status),
  moodAfterTask: submission?.mood_after_task ?? undefined,
  supportUsed: submission?.support_used ?? [],
});

export class ChildAssignmentService {
  static async getAssignments(childId: string): Promise<ChildTeacherAssignment[]> {
    if (!isSupabaseConfigured || !childId || childId === 'guest-child') return [];

    const client = getSupabaseClient();
    const { data: assignmentData, error: assignmentError } = await client
      .from('teacher_assignments')
      .select('id, class_id, title, description, assignment_type, support_tools, due_at, created_at')
      .order('created_at', { ascending: false })
      .limit(12);

    if (assignmentError) throw assignmentError;
    const assignments = (assignmentData ?? []) as AssignmentRow[];
    const assignmentIds = assignments.map((assignment) => assignment.id);

    if (assignmentIds.length === 0) return [];

    const { data: submissionData, error: submissionError } = await client
      .from('assignment_submissions')
      .select('assignment_id, status, support_used, mood_after_task')
      .eq('child_id', childId)
      .in('assignment_id', assignmentIds);

    if (submissionError) throw submissionError;
    const submissions = new Map(
      ((submissionData ?? []) as SubmissionRow[]).map((submission) => [submission.assignment_id, submission]),
    );

    return assignments.map((assignment) => mapAssignment(assignment, submissions.get(assignment.id)));
  }

  static async saveProgress(input: {
    assignmentId: string;
    childId: string;
    status: AssignmentStatus;
    supportUsed?: string[];
    moodAfterTask?: string;
  }): Promise<void> {
    if (!isSupabaseConfigured || !input.childId || input.childId === 'guest-child') return;

    const completed = input.status === 'completed' || input.status === 'submitted';
    const { error } = await getSupabaseClient()
      .from('assignment_submissions')
      .upsert(
        {
          assignment_id: input.assignmentId,
          child_id: input.childId,
          status: input.status,
          support_used: input.supportUsed ?? [],
          mood_after_task: input.moodAfterTask ?? null,
          submitted_at: completed ? new Date().toISOString() : null,
        },
        { onConflict: 'assignment_id,child_id' },
      );

    if (error) throw error;
  }
}
