import { getSupabaseClient } from 'services/supabase/client';
import supportCatalog from 'features/teacher/data/assignmentSupportCatalog.json';
import type { TeacherAssignmentType } from './teacherDashboardService';

export interface AssignmentSupportInput {
  classId: string;
  title: string;
  description: string;
  assignmentType: TeacherAssignmentType;
}

export async function suggestAssignmentSupport(input: AssignmentSupportInput, signal: AbortSignal): Promise<string[]> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (signal.aborted) throw new Error('Request cancelled.');
  if (error || !data.session?.access_token) throw new Error('Sign in with your teacher account to request suggestions.');
  const response = await fetch('/api/assignment-support', {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
    // Do not spread the form: selected class details and learner data stay out.
    body: JSON.stringify({ classId: input.classId, title: input.title, description: input.description, assignmentType: input.assignmentType }),
  });
  let result;
  try { result = await response.json(); } catch { throw new Error('Assignment AI is unavailable here. You can still choose support tools yourself.'); }
  if (!response.ok) throw new Error(typeof result?.error === 'string' ? result.error : 'Could not get suggestions. Please try later.');
  if (result?.source !== 'openai' || !Array.isArray(result.toolIds) || result.toolIds.length > 3
      || new Set(result.toolIds).size !== result.toolIds.length
      || result.toolIds.some((id: unknown) => !supportCatalog.some((tool) => tool.id === id))) {
    throw new Error('Could not verify these suggestions. Choose support tools yourself or try later.');
  }
  return result.toolIds;
}
