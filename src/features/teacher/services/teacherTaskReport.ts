import type { TeacherAssignment, TeacherAssignmentLearnerProgress } from './teacherDashboardService';

export const REPORT_SCOPE_NOTE = 'Snapshot of returned task records and currently visible learner-task pairs. Dates filter task due date, or creation date when no due date exists—not when a learner practised. This is not complete school history.';
export const REPORT_STATUS_NOTE = 'Completed and submitted are recorded task statuses, not teacher assessment or proof of mastery. A help record does not confirm that an adult has read or responded. Suggested tools are not evidence of support use.';
export const reportSupportLabel = (value: string) => value.split('_').filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
export const taskStatusLabel = (row: TeacherAssignmentLearnerProgress) => row.hasRecordedUpdate === true
  ? `${reportSupportLabel(row.status)} (recorded)` : 'No status returned';
export const recordedSupports = (row: TeacherAssignmentLearnerProgress) => row.hasRecordedUpdate === true ? Array.from(new Set(row.supportUsed)) : [];
export const taskRecordTotals = (assignments: TeacherAssignment[]) => {
  const rows = assignments.flatMap(a => a.learnerProgress);
  const recorded = rows.filter(r => r.hasRecordedUpdate === true);
  const completed = recorded.filter(r => ['completed', 'submitted'].includes(r.status)).length;
  return { visiblePairs: rows.length, recorded: recorded.length, unreturned: rows.length - recorded.length,
    completed, needsHelp: recorded.filter(r => r.status === 'needs_help').length,
    inProgress: recorded.filter(r => r.status === 'in_progress').length,
    completionRate: rows.length ? Math.round(completed / rows.length * 100) : null };
};
export const mostRecordedSupport = (assignments: TeacherAssignment[], childId?: string) => {
  const counts = new Map<string, number>();
  assignments.forEach(a => a.learnerProgress.filter(r => childId === undefined || r.childId === childId).forEach(r => {
    recordedSupports(r).forEach(s => counts.set(s, (counts.get(s) ?? 0) + 1));
  }));
  const top = Array.from(counts.entries()).sort((a,b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return top ? reportSupportLabel(top[0]) : 'No support use returned';
};
// A quoted CSV cell alone does not prevent spreadsheet formula interpretation.
export const escapeTeacherCsv = (value: unknown): string => {
  const text = value == null ? '' : String(value);
  const safe = /^[\s\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
};
export const buildTeacherTaskCsv = (className: string, range: string, snapshotAt: string, assignments: TeacherAssignment[], demo = false): string => {
  const rows: unknown[][] = [
    [demo ? 'AdaptBuddy fictional teacher task report — DEMO' : 'AdaptBuddy teacher task report'],
    [`Snapshot loaded: ${snapshotAt}`], [REPORT_SCOPE_NOTE], [REPORT_STATUS_NOTE],
    ['Class','Date filter','Task','Learner','Recorded status','Suggested tools','Recorded support use','Optional shared task feeling','Status timestamp'],
  ];
  for (const a of assignments) {
    if (!a.learnerProgress.length) {
      rows.push([className,range,a.title,'No eligible learner rows returned','Not applicable',a.supportTools.map(reportSupportLabel).join('; '),'','','']);
    } else {
      for (const r of a.learnerProgress) rows.push([className,range,a.title,r.childName,taskStatusLabel(r),
        a.supportTools.map(reportSupportLabel).join('; '),recordedSupports(r).map(reportSupportLabel).join('; '),
        r.hasRecordedUpdate === true ? r.moodAfterTask ?? '' : '',r.hasRecordedUpdate === true ? r.updatedAt ?? '' : '']);
    }
  }
  return rows.map(row => row.map(escapeTeacherCsv).join(',')).join('\r\n');
};
