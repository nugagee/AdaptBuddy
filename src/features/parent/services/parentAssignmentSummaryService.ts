import { getSupabaseClient, isSupabaseConfigured } from 'services/supabase/client';
import type { ParentAssignmentSummary } from './parentDashboardService';

const statuses = ['not_started', 'in_progress', 'needs_help', 'completed', 'submitted'] as const;
const types = ['reading', 'maths', 'writing', 'pronunciation', 'calm_break', 'visual_routine', 'social_story', 'task'] as const;
const failure = () => new Error('School task summaries are unavailable.');
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const optionalText = (value: unknown): value is string | null | undefined => value == null || typeof value === 'string';
const strings = (value: unknown): value is string[] | null | undefined => value == null || (Array.isArray(value) && value.every(text));

/** Read the existing authorised RPC only. Never fall back to raw task tables.
 * Scope and shape validation are defensive client checks, not a grant of authority.
 */
export const readParentAssignmentSummaries = async (
  childIds: string[],
  childNames: Map<string, string>,
): Promise<ParentAssignmentSummary[]> => {
  if (childIds.length === 0) return [];
  if (!isSupabaseConfigured || childIds.some(id => !text(id) || id === 'guest-child')) throw failure();
  const ids = Array.from(new Set(childIds));
  const { data, error } = await getSupabaseClient().rpc('parent_assignment_summaries', { p_child_ids: ids });
  if (error || !Array.isArray(data) || data.length > 50) throw failure();
  const seen = new Set<string>();
  return data.map((value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw failure();
    const row = value as Record<string, unknown>;
    if (!text(row.assignment_id) || !text(row.child_id) || !ids.includes(row.child_id)
      || !text(row.class_id) || !text(row.teacher_id) || !text(row.title) || !text(row.created_at)
      || !Number.isFinite(Date.parse(row.created_at)) || !statuses.includes(row.status as typeof statuses[number])
      || !types.includes(row.assignment_type as typeof types[number])
      || !['child_name', 'class_name', 'school_name', 'teacher_name', 'teacher_email', 'description', 'due_at', 'updated_at', 'mood_after_task'].every(key => optionalText(row[key]))
      || !['due_at', 'updated_at'].every(key => row[key] == null || (text(row[key]) && Number.isFinite(Date.parse(row[key] as string))))
      || !strings(row.support_tools) || !strings(row.support_used)) throw failure();
    const identity = JSON.stringify([row.child_id, row.assignment_id]);
    if (seen.has(identity)) throw failure();
    seen.add(identity);
    return {
      id: row.assignment_id, childId: row.child_id,
      childName: (row.child_name as string) || childNames.get(row.child_id) || 'Child',
      classId: row.class_id, className: (row.class_name as string) || 'Class', schoolName: (row.school_name as string) || '',
      teacherId: row.teacher_id, teacherName: (row.teacher_name as string) || 'Teacher', teacherEmail: (row.teacher_email as string) || '',
      title: row.title, description: (row.description as string | null) ?? undefined,
      assignmentType: row.assignment_type as ParentAssignmentSummary['assignmentType'],
      supportTools: (row.support_tools as string[] | null) ?? [],
      dueAt: (row.due_at as string | null) ?? undefined, createdAt: row.created_at,
      status: row.status as ParentAssignmentSummary['status'], supportUsed: (row.support_used as string[] | null) ?? [],
      moodAfterTask: (row.mood_after_task as string | null) ?? undefined, updatedAt: (row.updated_at as string | null) ?? undefined,
    };
  });
};
