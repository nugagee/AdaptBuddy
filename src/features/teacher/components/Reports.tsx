import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Users,
} from 'lucide-react';
import TeacherHubNav from 'features/teacher/components/TeacherHubNav';
import {
  TeacherDashboardService,
  type TeacherAssignment,
  type TeacherDashboardSummary,
} from 'features/teacher/services/teacherDashboardService';

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
};

const supportLabel = (value: string): string =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const getCompletionRate = (assignments: TeacherAssignment[]): number => {
  const assigned = assignments.reduce((total, assignment) => total + assignment.progress.assignedCount, 0);
  if (assigned === 0) return 0;
  const completed = assignments.reduce(
    (total, assignment) => total + assignment.progress.completed + assignment.progress.submitted,
    0,
  );
  return Math.round((completed / assigned) * 100);
};

const getMostUsedSupport = (assignments: TeacherAssignment[]): string => {
  const counts = new Map<string, number>();
  assignments.forEach((assignment) => {
    assignment.learnerProgress.forEach((learner) => {
      learner.supportUsed.forEach((support) => counts.set(support, (counts.get(support) ?? 0) + 1));
    });
  });

  const [top] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return top ? supportLabel(top[0]) : 'No supports used yet';
};

const getMoodSummary = (assignments: TeacherAssignment[]): string => {
  const counts = new Map<string, number>();
  assignments.forEach((assignment) => {
    assignment.learnerProgress.forEach((learner) => {
      if (learner.moodAfterTask) {
        counts.set(learner.moodAfterTask, (counts.get(learner.moodAfterTask) ?? 0) + 1);
      }
    });
  });

  const [top] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return top ? supportLabel(top[0]) : 'No mood check-ins yet';
};

const ReportMetric: React.FC<{
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Users;
  tone: string;
}> = ({ label, value, detail, icon: Icon, tone }) => (
  <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-bold text-slate-500 dark:text-gray-400">{label}</p>
        <p className="mt-3 text-3xl font-extrabold text-adapt-navy dark:text-gray-100">{value}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{detail}</p>
      </div>
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-6 w-6" aria-hidden />
      </span>
    </div>
  </article>
);

const Reports: React.FC = () => {
  const [summary, setSummary] = useState<TeacherDashboardSummary | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const data = await TeacherDashboardService.getDashboardSummary();
      setSummary(data);
      setSelectedClassId((current) => current || data.classes[0]?.id || '');
    } catch (loadError) {
      console.error('Error loading teacher reports:', loadError);
      setError(getErrorMessage(loadError, 'Could not load reports.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const selectedClass = useMemo(
    () => summary?.classes.find((teacherClass) => teacherClass.id === selectedClassId) ?? null,
    [selectedClassId, summary?.classes],
  );

  const classAssignments = useMemo(
    () => summary?.assignments.filter((assignment) => assignment.classId === selectedClassId) ?? [],
    [selectedClassId, summary?.assignments],
  );

  const classStudents = useMemo(
    () => summary?.students.filter((student) => student.classId === selectedClassId) ?? [],
    [selectedClassId, summary?.students],
  );

  const helpRequests = classAssignments.reduce((total, assignment) => total + assignment.progress.needsHelp, 0);
  const completed = classAssignments.reduce(
    (total, assignment) => total + assignment.progress.completed + assignment.progress.submitted,
    0,
  );
  const assigned = classAssignments.reduce((total, assignment) => total + assignment.progress.assignedCount, 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/40 px-4 py-6 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <TeacherHubNav />

        <header className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card dark:border-gray-800 dark:bg-gray-900/80">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-adapt-indigo dark:text-adapt-cyan">
                Reports
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-adapt-navy dark:text-gray-100">
                Class support snapshot
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-gray-400">
                Privacy-aware reports built from assignments, learner progress, support tools, and parent-approved
                visibility.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
              >
                <Printer className="h-4 w-4" aria-hidden />
                Print
              </button>
              <button
                type="button"
                onClick={() => loadReports('refresh')}
                disabled={refreshing}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
                Refresh
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        )}

        <section className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/80">
          <label className="text-sm font-black text-adapt-navy dark:text-gray-100" htmlFor="report-class">
            Select class
          </label>
          <select
            id="report-class"
            value={selectedClassId}
            onChange={(event) => setSelectedClassId(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-adapt-navy outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          >
            <option value="">Choose class</option>
            {summary?.classes.map((teacherClass) => (
              <option key={teacherClass.id} value={teacherClass.id}>{teacherClass.className}</option>
            ))}
          </select>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ReportMetric
            label="Students"
            value={classStudents.length}
            detail={selectedClass?.className ?? 'No class selected'}
            icon={Users}
            tone="bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200"
          />
          <ReportMetric
            label="Completion"
            value={`${getCompletionRate(classAssignments)}%`}
            detail={`${completed}/${assigned || 0} learner tasks completed`}
            icon={CheckCircle2}
            tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
          />
          <ReportMetric
            label="Need help"
            value={helpRequests}
            detail="Assignment help requests"
            icon={AlertTriangle}
            tone="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
          />
          <ReportMetric
            label="Assignments"
            value={classAssignments.length}
            detail="Tasks sent to this class"
            icon={FileText}
            tone="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/80">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
              <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">Assignment progress</h2>
            </div>
            <div className="mt-4 space-y-3">
              {classAssignments.length ? (
                classAssignments.map((assignment) => {
                  const rate = assignment.progress.assignedCount
                    ? Math.round(((assignment.progress.completed + assignment.progress.submitted) / assignment.progress.assignedCount) * 100)
                    : 0;
                  return (
                    <article key={assignment.id} className="rounded-2xl bg-slate-50 p-4 dark:bg-gray-950">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black text-adapt-navy dark:text-gray-100">{assignment.title}</h3>
                          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                            {assignment.progress.needsHelp} need help · {assignment.progress.inProgress} in progress
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-adapt-indigo shadow-sm dark:bg-gray-900 dark:text-adapt-cyan">
                          {rate}%
                        </span>
                      </div>
                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-white dark:bg-gray-900">
                        <div className="h-full rounded-full bg-adapt-indigo dark:bg-adapt-cyan" style={{ width: `${rate}%` }} />
                      </div>
                    </article>
                  );
                })
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-500 dark:border-gray-800 dark:text-gray-400">
                  No assignments have been sent to this class yet.
                </p>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/80">
              <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">Support insight</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-gray-300">
                <p>
                  Most used support: <span className="font-black text-adapt-navy dark:text-gray-100">{getMostUsedSupport(classAssignments)}</span>
                </p>
                <p>
                  Common mood after tasks: <span className="font-black text-adapt-navy dark:text-gray-100">{getMoodSummary(classAssignments)}</span>
                </p>
                <p>
                  Suggested classroom response: keep tasks short, use visual steps first, and follow up quickly on
                  needs-help signals.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-adapt-indigo/15 bg-adapt-indigo/5 p-5 dark:border-adapt-cyan/20 dark:bg-adapt-cyan/10">
              <h2 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">Privacy note</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-gray-300">
                Reports use parent-approved visibility only. Worry diary text and private child notes remain hidden
                unless the family explicitly shares them.
              </p>
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
};

export default Reports;
