import React from 'react';
import type { TeacherAssignment } from '../services/teacherDashboardService';
import { recordedSupports, reportSupportLabel, taskRecordTotals, taskStatusLabel } from '../services/teacherTaskReport';

const TeacherTaskRecordList: React.FC<{ assignments: TeacherAssignment[]; classSelected: boolean }> = ({ assignments, classSelected }) => {
  if (!classSelected) return <p>Select a returned class to view its task records.</p>;
  if (!assignments.length) return <p>No task records returned for this class and date filter. This does not establish that no other school work exists.</p>;
  return <div className="space-y-4">{assignments.map(a => {
    const totals = taskRecordTotals([a]);
    return <article key={a.id} className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-700 dark:bg-gray-950">
      <h3 className="break-words text-lg font-bold">{a.title}</h3>
      <p className="mt-2 text-sm">{totals.completed}/{totals.visiblePairs} visible learner-task pairs have a completed or submitted record. {totals.unreturned} have no status returned.</p>
      <p className="mt-2 text-sm"><strong>Suggested tools:</strong> {a.supportTools.length ? a.supportTools.map(reportSupportLabel).join(', ') : 'None listed'}</p>
      <details className="mt-3">
        <summary className="min-h-12 cursor-pointer rounded-lg p-3 font-semibold focus-visible:outline focus-visible:outline-2">View learner records for {a.title}</summary>
        {a.learnerProgress.length ? <ul className="mt-2 space-y-3">{a.learnerProgress.map(r => <li key={r.childId} className="break-words rounded-xl bg-white p-3 dark:bg-gray-900">
          <p><strong>{r.childName}</strong> — {taskStatusLabel(r)}</p>
          <p className="mt-1 text-sm">Recorded support use: {recordedSupports(r).length ? recordedSupports(r).map(reportSupportLabel).join(', ') : 'No support use returned'}</p>
          {r.hasRecordedUpdate === true && r.moodAfterTask && <p className="mt-1 text-sm">Optional shared task feeling: {reportSupportLabel(r.moodAfterTask)}</p>}
          <p className="mt-1 text-sm">Status timestamp: {r.hasRecordedUpdate === true && r.updatedAt ? new Date(r.updatedAt).toLocaleString('en-GB') : 'Not returned'}</p>
        </li>)}</ul> : <p className="p-3 text-sm">No eligible learner rows returned. There is no completion percentage for this task.</p>}
      </details>
    </article>;
  })}</div>;
};
export default TeacherTaskRecordList;
