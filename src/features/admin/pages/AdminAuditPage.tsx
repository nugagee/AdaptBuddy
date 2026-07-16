import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  Eye,
  GraduationCap,
  Link2,
  Loader2,
  MessageSquareWarning,
  Printer,
  RefreshCw,
  ShieldAlert,
  FileDown,
  UsersRound,
} from 'lucide-react';
import AdminLayout from 'features/admin/components/AdminLayout';
import AdminStatCard from 'features/admin/components/AdminStatCard';
import SupportActionQueue from 'components/support/SupportActionQueue';
import SupportPlanDraftPanel from 'components/support/SupportPlanDraftPanel';
import SupportTimelinePanel from 'components/support/SupportTimelinePanel';
import {
  fetchAdminAuditSnapshot,
  type AdminAuditSnapshot,
  type AdminSchoolRequestAudit,
  type AdminTeacherVisibilitySettings,
} from 'services/supabase/adminService';

const statusClassNames: Record<string, string> = {
  approved: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/20',
  pending_parent: 'bg-amber-500/15 text-amber-300 ring-amber-500/20',
  pending_teacher: 'bg-sky-500/15 text-sky-300 ring-sky-500/20',
  pending: 'bg-amber-500/15 text-amber-300 ring-amber-500/20',
  declined: 'bg-rose-500/15 text-rose-300 ring-rose-500/20',
  cancelled: 'bg-slate-500/15 text-slate-300 ring-slate-500/20',
};

const riskClassNames: Record<string, string> = {
  high: 'bg-rose-500/15 text-rose-300 ring-rose-500/20',
  medium: 'bg-amber-500/15 text-amber-300 ring-amber-500/20',
  low: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/20',
};

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function labelize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function Pill({ children, tone }: { children: React.ReactNode; tone: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${tone}`}>
      {children}
    </span>
  );
}

function SourceHealth({ snapshot }: { snapshot: AdminAuditSnapshot }) {
  const sources = Object.entries(snapshot.dataSources);

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">
            Data source health
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Shows whether admin can read each live support table. Missing sources usually mean the
            latest SQL policy migration has not been run yet.
          </p>
        </div>
        <p className="text-xs text-gray-500">Generated {formatDate(snapshot.generatedAt)}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {sources.map(([source, ok]) => (
          <Pill
            key={source}
            tone={ok ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/20' : 'bg-rose-500/15 text-rose-300 ring-rose-500/20'}
          >
            {source}: {ok ? 'live' : 'blocked'}
          </Pill>
        ))}
      </div>

      {snapshot.notes.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
          <p className="text-sm font-bold text-amber-200">Audit notes</p>
          <div className="mt-2 space-y-1 text-sm text-amber-100/80">
            {snapshot.notes.slice(0, 5).map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function visibilityTags(visibility: AdminTeacherVisibilitySettings): string[] {
  return [
    visibility.childName ? 'Name shared' : 'Name hidden',
    visibility.neuroProfile ? 'Profile shared' : 'Profile hidden',
    `Mood: ${visibility.dailyMood}`,
    visibility.worryDiaryText ? 'Journal text shared' : 'Journal text hidden',
    visibility.safeguardingAlerts ? 'Safeguarding alerts on' : 'Safeguarding hidden',
    visibility.academicTasks ? 'Tasks shared' : 'Tasks hidden',
  ];
}

function SchoolRequestTimeline({ request }: { request: AdminSchoolRequestAudit }) {
  const steps = [
    { label: 'Requested', value: request.requestedAt, done: Boolean(request.requestedAt) },
    { label: 'Teacher', value: request.teacherApprovedAt, done: request.teacherApproved },
    { label: 'Parent', value: request.parentApprovedAt, done: request.parentApproved },
    { label: 'Final', value: request.approvedAt || request.declinedAt, done: Boolean(request.approvedAt || request.declinedAt) },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-4">
      {steps.map((step) => (
        <div key={step.label} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
          <p className={step.done ? 'text-xs font-bold text-emerald-300' : 'text-xs font-bold text-gray-500'}>
            {step.label}
          </p>
          <p className="mt-1 text-[11px] text-gray-500">{formatDate(step.value)}</p>
        </div>
      ))}
    </div>
  );
}

function buildAuditEvidenceReport(snapshot: AdminAuditSnapshot): string {
  const liveSources = Object.entries(snapshot.dataSources)
    .filter(([, ok]) => ok)
    .map(([source]) => source)
    .join(', ') || 'None';
  const blockedSources = Object.entries(snapshot.dataSources)
    .filter(([, ok]) => !ok)
    .map(([source]) => source)
    .join(', ') || 'None';

  const lines = [
    'AdaptBuddy Admin Audit Evidence Report',
    `Generated: ${new Date(snapshot.generatedAt).toLocaleString('en-GB')}`,
    '',
    'Executive Snapshot',
    `- Pending school requests: ${snapshot.metrics.schoolRequestsPending}`,
    `- Active school links: ${snapshot.metrics.activeSchoolLinks}`,
    `- Unresolved safeguarding alerts: ${snapshot.metrics.unresolvedAlerts}`,
    `- High-risk unresolved alerts: ${snapshot.metrics.highRiskAlerts}`,
    `- Shared journal signals: ${snapshot.metrics.sharedJournalSignals}`,
    `- Urgent messages: ${snapshot.metrics.urgentMessages}`,
    `- Open meetings: ${snapshot.metrics.openMeetings}`,
    `- Needs-help assignment submissions: ${snapshot.metrics.assignmentsNeedingHelp}`,
    `- Visibility exceptions requiring review: ${snapshot.metrics.visibilityExceptions}`,
    '',
    'Privacy Visibility Posture',
    `- Active memberships: ${snapshot.visibilitySummary.activeMemberships}`,
    `- Child names shared: ${snapshot.visibilitySummary.nameShared}`,
    `- Child names hidden: ${snapshot.visibilitySummary.nameHidden}`,
    `- Neuro profiles shared: ${snapshot.visibilitySummary.neuroProfileShared}`,
    `- Mood summaries shared: ${snapshot.visibilitySummary.moodSummaryShared}`,
    `- Full mood shared: ${snapshot.visibilitySummary.moodFullyShared}`,
    `- Journal text shared: ${snapshot.visibilitySummary.journalTextShared}`,
    `- Safeguarding hidden: ${snapshot.visibilitySummary.safeguardingHidden}`,
    '',
    'Data Source Health',
    `- Live: ${liveSources}`,
    `- Blocked or unavailable: ${blockedSources}`,
    '',
    'Recent School Access Requests',
    ...snapshot.schoolRequests.slice(0, 12).map(
      (request) =>
        `- ${request.className} (${request.schoolName}) | ${request.teacherName} -> ${request.childName} ${request.buddyId} | ${request.status} | parent=${request.parentApproved ? 'yes' : 'no'} teacher=${request.teacherApproved ? 'yes' : 'no'}`,
    ),
    '',
    'Recent Safeguarding Alerts',
    ...snapshot.safeguardingAlerts.slice(0, 12).map(
      (alert) =>
        `- ${alert.childName} ${alert.buddyId} | ${alert.riskLevel} | ${alert.acknowledged ? 'acknowledged' : 'unresolved'} | ${formatDate(alert.createdAt)}`,
    ),
    '',
    'Assignment Support Demand',
    ...snapshot.assignments.slice(0, 12).map(
      (assignment) =>
        `- ${assignment.title} | ${assignment.className} | assigned=${assignment.assigned} help=${assignment.needsHelp} complete=${assignment.completed + assignment.submitted}`,
    ),
    '',
    'Audit Notes',
    ...(snapshot.notes.length > 0 ? snapshot.notes.map((note) => `- ${note}`) : ['- No audit notes.']),
    '',
    'Posture Statement',
    'This report is generated from a read-only administrator console. It supports governance, safeguarding review, funding due diligence, and internal operational monitoring without expanding parent or teacher permissions.',
  ];

  return lines.join('\n');
}

function downloadAuditEvidenceReport(snapshot: AdminAuditSnapshot): void {
  const report = buildAuditEvidenceReport(snapshot);
  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const date = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `adaptbuddy-admin-audit-${date}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

const AdminAuditPage: React.FC = () => {
  const [snapshot, setSnapshot] = useState<AdminAuditSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminAuditSnapshot();
      setSnapshot(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit console');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const recentSchoolRequests = useMemo(
    () => snapshot?.schoolRequests.slice(0, 8) ?? [],
    [snapshot],
  );

  return (
    <AdminLayout title="Audit & safeguarding">
      <div className="adaptbuddy-admin-audit-print space-y-8">
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-indigo-300">
                Platform governance
              </p>
              <h2 className="mt-2 text-2xl font-black text-white">Monitoring console</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                One read-only view for school access, family visibility settings, safeguarding
                signals, assignment support, messages, and meeting coordination.
              </p>
            </div>
            <div className="adaptbuddy-no-print flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void load()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden />
                )}
                Refresh
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={!snapshot}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Printer className="h-4 w-4" aria-hidden />
                Print
              </button>
              <button
                type="button"
                onClick={() => snapshot && downloadAuditEvidenceReport(snapshot)}
                disabled={!snapshot}
                className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-4 py-2 text-sm font-bold text-indigo-200 transition hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FileDown className="h-4 w-4" aria-hidden />
                Evidence report
              </button>
            </div>
          </div>
        </section>

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-gray-400">Loading audit evidence…</p>
        ) : snapshot ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <AdminStatCard
                label="Pending school requests"
                value={snapshot.metrics.schoolRequestsPending}
                sub={`${snapshot.metrics.activeSchoolLinks} active school links`}
                icon={GraduationCap}
                accent="from-sky-500/20 to-indigo-500/10"
              />
              <AdminStatCard
                label="Unresolved alerts"
                value={snapshot.metrics.unresolvedAlerts}
                sub={`${snapshot.metrics.highRiskAlerts} high risk`}
                icon={ShieldAlert}
                accent="from-rose-500/20 to-orange-500/10"
              />
              <AdminStatCard
                label="Urgent messages"
                value={snapshot.metrics.urgentMessages}
                sub={`${snapshot.metrics.openMeetings} open meetings`}
                icon={MessageSquareWarning}
                accent="from-amber-500/20 to-yellow-500/10"
              />
              <AdminStatCard
                label="Needs-help submissions"
                value={snapshot.metrics.assignmentsNeedingHelp}
                sub={`${snapshot.metrics.visibilityExceptions} visibility exceptions`}
                icon={BookOpenCheck}
                accent="from-violet-500/20 to-fuchsia-500/10"
              />
            </section>

            <SourceHealth snapshot={snapshot} />

            <SupportActionQueue
              title="Open safeguarding/support actions"
              subtitle="Cross-role work queue for unresolved alerts, urgent support signals, assignment-help requests, messages, and escalations."
              limit={12}
              variant="dark"
            />

            <SupportPlanDraftPanel
              title="Support plan drafts"
              subtitle="Early cross-role planning drafts generated from repeated evidence. These are support aids, not diagnostic documents."
              limit={4}
              variant="dark"
            />

            <SupportTimelinePanel
              title="Support response history"
              subtitle="Cross-role evidence of signals, acknowledgements, escalations, child reassurance, meetings, messages, and assignment help."
              limit={28}
              variant="dark"
            />

            <section className="grid gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 xl:col-span-2">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                    <Link2 className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h2 className="font-bold text-white">School access audit</h2>
                    <p className="text-sm text-gray-500">
                      Teacher requests, parent approval, and visibility scope.
                    </p>
                  </div>
                </div>

                {recentSchoolRequests.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
                    No school access requests found yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentSchoolRequests.map((request) => (
                      <article key={request.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-white">
                              {request.className} · {request.schoolName}
                            </h3>
                            <p className="mt-1 text-sm text-gray-400">
                              {request.teacherName} requested {request.childName} ({request.buddyId})
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              Class code {request.classCode} · {labelize(request.requestMethod)}
                            </p>
                          </div>
                          <Pill tone={statusClassNames[request.status] ?? statusClassNames.pending}>
                            {labelize(request.status)}
                          </Pill>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {visibilityTags(request.visibility).map((tag) => (
                            <Pill key={tag} tone="bg-slate-500/15 text-slate-300 ring-slate-500/20">
                              {tag}
                            </Pill>
                          ))}
                        </div>

                        <div className="mt-4">
                          <SchoolRequestTimeline request={request} />
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                    <Eye className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h2 className="font-bold text-white">Visibility posture</h2>
                    <p className="text-sm text-gray-500">Parent-approved school visibility.</p>
                  </div>
                </div>
                <div className="grid gap-3">
                  {[
                    ['Active links', snapshot.visibilitySummary.activeMemberships],
                    ['Child names shared', snapshot.visibilitySummary.nameShared],
                    ['Child names hidden', snapshot.visibilitySummary.nameHidden],
                    ['Neuro profiles shared', snapshot.visibilitySummary.neuroProfileShared],
                    ['Mood summaries shared', snapshot.visibilitySummary.moodSummaryShared],
                    ['Full mood shared', snapshot.visibilitySummary.moodFullyShared],
                    ['Journal text shared', snapshot.visibilitySummary.journalTextShared],
                    ['Safeguarding hidden', snapshot.visibilitySummary.safeguardingHidden],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                      <p className="text-sm text-gray-400">{label}</p>
                      <p className="text-lg font-black text-white">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300">
                    <AlertTriangle className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h2 className="font-bold text-white">Safeguarding queue</h2>
                    <p className="text-sm text-gray-500">Recent alerts and shared wellbeing signals.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {snapshot.safeguardingAlerts.slice(0, 6).map((alert) => (
                    <article key={alert.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-white">{alert.childName}</p>
                          <p className="text-xs text-gray-500">
                            {alert.buddyId} · {alert.source} · {formatDate(alert.createdAt)}
                          </p>
                        </div>
                        <Pill tone={riskClassNames[alert.riskLevel] ?? riskClassNames.medium}>
                          {labelize(alert.riskLevel)}
                        </Pill>
                      </div>
                      <p className="mt-2 text-sm text-gray-400">
                        {alert.acknowledged ? 'Acknowledged' : 'Awaiting adult acknowledgement'}
                      </p>
                    </article>
                  ))}
                  {snapshot.safeguardingAlerts.length === 0 && (
                    <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
                      No safeguarding alerts found.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                    <UsersRound className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h2 className="font-bold text-white">Family coordination</h2>
                    <p className="text-sm text-gray-500">Recent urgent messages and meeting requests.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {snapshot.communications.slice(0, 4).map((message) => (
                    <article key={message.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-white">{message.childName}</p>
                          <p className="text-xs text-gray-500">
                            {message.senderName} to {message.recipientName} · {formatDate(message.createdAt)}
                          </p>
                        </div>
                        <Pill tone={message.urgency === 'urgent' ? riskClassNames.high : riskClassNames.low}>
                          {labelize(message.urgency)}
                        </Pill>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-400">{message.summary}</p>
                    </article>
                  ))}
                  {snapshot.careMeetings.slice(0, 3).map((meeting) => (
                    <article key={meeting.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-white">{labelize(meeting.meetingType)} meeting</p>
                          <p className="text-xs text-gray-500">
                            {meeting.childName} · requested by {meeting.requestedBy}
                          </p>
                        </div>
                        <Pill tone={statusClassNames[meeting.status] ?? statusClassNames.pending}>
                          {labelize(meeting.status)}
                        </Pill>
                      </div>
                      <p className="mt-2 text-sm text-gray-400">
                        Scheduled: {formatDate(meeting.scheduledAt)}
                      </p>
                    </article>
                  ))}
                  {snapshot.communications.length === 0 && snapshot.careMeetings.length === 0 && (
                    <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
                      No family coordination records found yet.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                  <BookOpenCheck className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="font-bold text-white">Assignment support monitor</h2>
                  <p className="text-sm text-gray-500">
                    Shows where school tasks are creating support demand.
                  </p>
                </div>
              </div>

              {snapshot.assignments.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
                  No assignment activity found yet.
                </p>
              ) : (
                <div className="overflow-hidden rounded-xl border border-white/10">
                  <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                    <thead className="bg-white/5 text-xs uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Assignment</th>
                        <th className="px-4 py-3">Class</th>
                        <th className="px-4 py-3">Assigned</th>
                        <th className="px-4 py-3">Needs help</th>
                        <th className="px-4 py-3">Complete</th>
                        <th className="px-4 py-3">Due</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {snapshot.assignments.slice(0, 8).map((assignment) => (
                        <tr key={assignment.id} className="bg-slate-950/20">
                          <td className="px-4 py-3">
                            <p className="font-bold text-white">{assignment.title}</p>
                            <p className="text-xs text-gray-500">{assignment.teacherName}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-300">
                            {assignment.className}
                            <p className="text-xs text-gray-500">{assignment.schoolName}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-300">{assignment.assigned}</td>
                          <td className="px-4 py-3">
                            <Pill tone={assignment.needsHelp > 0 ? riskClassNames.medium : riskClassNames.low}>
                              {assignment.needsHelp}
                            </Pill>
                          </td>
                          <td className="px-4 py-3 text-gray-300">
                            {assignment.completed + assignment.submitted}
                          </td>
                          <td className="px-4 py-3 text-gray-400">{formatDate(assignment.dueAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-300" aria-hidden />
                <div>
                  <h2 className="font-bold text-emerald-100">Audit posture</h2>
                  <p className="mt-1 text-sm leading-6 text-emerald-100/80">
                    This console is read-only. It is designed for governance, safeguarding review,
                    funding due diligence, and internal operational monitoring without expanding
                    teacher or parent permissions.
                  </p>
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default AdminAuditPage;
