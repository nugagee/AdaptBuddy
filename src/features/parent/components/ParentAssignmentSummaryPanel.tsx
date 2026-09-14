import React from 'react';
import type { ParentAssignmentSummary } from '../services/parentDashboardService';

const statusLabels: Record<ParentAssignmentSummary['status'], string> = {
  not_started: 'Not started', in_progress: 'In progress', needs_help: 'Help requested',
  completed: 'Marked completed', submitted: 'Marked submitted',
};
const label = (id: string) => id.replace(/_/g, ' ');
const dateLabel = (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('en-GB') : 'Not recorded';

export const getParentTaskEvidence = (assignments: ParentAssignmentSummary[], available: boolean) => ({
  completed: available ? assignments.filter(row => ['completed', 'submitted'].includes(row.status)).length : null,
  needsHelp: available ? assignments.filter(row => row.status === 'needs_help').length : null,
  // Suggestions are not evidence that a tool was used or that it helped.
  recordedTools: available ? Array.from(new Set(assignments.flatMap(row => row.supportUsed))) : [],
});

const ParentAssignmentSummaryPanel: React.FC<{
  assignments: ParentAssignmentSummary[];
  available: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  isDemo: boolean;
}> = ({ assignments, available, onRefresh, refreshing, isDemo }) => (
  <section aria-labelledby="parent-school-tasks-title" aria-busy={refreshing} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card dark:border-gray-800 dark:bg-gray-900">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="parent-school-tasks-title" className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">Teacher assignment summary</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{isDemo ? 'Fictional demo tasks — not a live school record.' : 'A snapshot of school-task records returned for this account. Refresh to check for changes.'}</p>
      </div>
      <button type="button" disabled={refreshing} onClick={onRefresh} className="min-h-12 rounded-xl border-2 border-slate-300 px-4 py-2 font-bold focus-visible:outline focus-visible:outline-2 dark:text-white">
        {refreshing ? 'Refreshing school tasks…' : 'Refresh school tasks'}
      </button>
    </div>
    {refreshing ? <p role="status" className="mt-4">Loading school-task records. Earlier task details are hidden.</p>
      : !available ? <div role="status" className="mt-4 rounded-xl border border-amber-300 p-4 dark:text-gray-100">
        <h3 className="font-bold">School-task data unavailable</h3>
        <p>We could not verify the task list. This does not mean there are no tasks or help requests. Refresh to try again.</p>
      </div>
      : assignments.length === 0 ? <div role="status" className="mt-4 dark:text-gray-100">
        <h3 className="font-bold">No school tasks returned for this child</h3>
        <p>This does not confirm whether there are unshared tasks or a pending class connection.</p>
      </div>
      : <>
        <p className="mt-4 text-sm dark:text-gray-200">Showing {Math.min(6, assignments.length)} of {assignments.length} returned task records. This snapshot is not a complete school history or an assessment of ability.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">{assignments.slice(0, 6).map(assignment => (
          <article key={`${assignment.childId}:${assignment.id}`} className="min-w-0 break-words rounded-2xl border border-slate-200 p-4 dark:border-gray-700 dark:text-gray-100">
            <h3 className="font-bold">{assignment.title}</h3>
            <p className="mt-2 font-semibold">{statusLabels[assignment.status]}</p>
            <p className="text-sm">{assignment.className} · {assignment.teacherName}</p>
            <p className="text-sm">Due: {assignment.dueAt ? dateLabel(assignment.dueAt) : 'No due date'}</p>
            <p className="text-sm">Last recorded update: {dateLabel(assignment.updatedAt)}</p>
            {assignment.description && <p className="mt-2 text-sm">{assignment.description}</p>}
            <p className="mt-3 text-sm"><strong>Suggested tools:</strong> {assignment.supportTools.length ? assignment.supportTools.map(label).join(', ') : 'None listed'}</p>
            <p className="mt-2 text-sm"><strong>Recorded support use:</strong> {assignment.supportUsed.length ? assignment.supportUsed.map(label).join(', ') : 'Not recorded'}</p>
            {assignment.moodAfterTask && <p className="mt-2 text-sm">Optional task feeling shared: {label(assignment.moodAfterTask)}</p>}
            {assignment.status === 'needs_help' && <p className="mt-3 text-sm">A help request is recorded. This does not confirm that a teacher has seen it or sent a response. Contact the school directly when a response is needed.</p>}
            {['completed', 'submitted'].includes(assignment.status) && <p className="mt-3 text-sm">This is a recorded task status, not a teacher assessment or proof that a learning skill was mastered.</p>}
          </article>
        ))}</div>
      </>}
  </section>
);
export default ParentAssignmentSummaryPanel;
