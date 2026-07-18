import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileText,
  HeartPulse,
  Loader2,
  Printer,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';
import TeacherHubNav from 'features/teacher/components/TeacherHubNav';
import WeeklyDigestSchedulerPanel from 'components/digest/WeeklyDigestSchedulerPanel';
import EvidencePackPanel from 'components/support/EvidencePackPanel';
import {
  TeacherDashboardService,
  type TeacherAssignment,
  type TeacherDashboardSummary,
  type TeacherStudent,
  type TeacherSupportSignal,
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

const escapeCsvValue = (value: string | number | null | undefined): string => {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const downloadTextFile = (filename: string, contents: string, mimeType: string) => {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'class-report';

type ReportRange = 'this_week' | 'last_week' | 'all';

const rangeLabels: Record<ReportRange, string> = {
  this_week: 'This week',
  last_week: 'Last week',
  all: 'All time',
};

const getWeekStart = (date: Date): Date => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
};

const isAssignmentInRange = (assignment: TeacherAssignment, range: ReportRange): boolean => {
  if (range === 'all') return true;

  const source = assignment.dueAt ?? assignment.createdAt;
  const timestamp = new Date(source).getTime();
  if (!Number.isFinite(timestamp)) return false;

  const now = new Date();
  const thisWeekStart = getWeekStart(now);
  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  if (range === 'this_week') {
    return timestamp >= thisWeekStart.getTime() && timestamp < nextWeekStart.getTime();
  }

  return timestamp >= lastWeekStart.getTime() && timestamp < thisWeekStart.getTime();
};

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

const formatNeurotypes = (values: string[]): string =>
  values.length
    ? values
        .slice(0, 4)
        .map((value) => supportLabel(value))
        .join(', ')
    : 'Hidden or not set';

const getSignalLabel = (signal: TeacherSupportSignal): string =>
  signal.signalLabel || supportLabel(signal.emotion);

const getSignalCategory = (signal: TeacherSupportSignal): string =>
  supportLabel(signal.signalCategory || signal.supportLevel || 'wellbeing');

const getLearnerAssignments = (assignments: TeacherAssignment[], childId: string) =>
  assignments
    .map((assignment) => ({
      assignment,
      progress: assignment.learnerProgress.find((learner) => learner.childId === childId),
    }))
    .filter((row) => row.progress);

const getLearnerMostUsedSupport = (assignments: TeacherAssignment[], childId: string): string => {
  const counts = new Map<string, number>();

  getLearnerAssignments(assignments, childId).forEach(({ assignment, progress }) => {
    const supports = progress?.supportUsed.length ? progress.supportUsed : assignment.supportTools;
    supports.forEach((support) => counts.set(support, (counts.get(support) ?? 0) + 1));
  });

  const [top] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return top ? supportLabel(top[0]) : 'Visual steps';
};

const getLearnerMoodSummary = (assignments: TeacherAssignment[], childId: string): string => {
  const counts = new Map<string, number>();

  getLearnerAssignments(assignments, childId).forEach(({ progress }) => {
    if (progress?.moodAfterTask) {
      counts.set(progress.moodAfterTask, (counts.get(progress.moodAfterTask) ?? 0) + 1);
    }
  });

  const [top] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  return top ? supportLabel(top[0]) : 'No mood check-ins yet';
};

const getPlanRecommendations = (
  student: TeacherStudent | null,
  assignments: TeacherAssignment[],
  signals: TeacherSupportSignal[],
): string[] => {
  const joinedSignals = signals
    .map((signal) => `${signal.signalLabel ?? ''} ${signal.signalCategory ?? ''} ${signal.emotion} ${signal.text}`)
    .join(' ')
    .toLowerCase();
  const supports = getLearnerMostUsedSupport(assignments, student?.childId ?? '').toLowerCase();
  const recommendations = new Set<string>();

  if (student?.neurotypes.some((value) => /autism/i.test(value))) {
    recommendations.add('Use visual steps, predictable transitions, and one instruction at a time.');
  }
  if (student?.neurotypes.some((value) => /dyslexia/i.test(value))) {
    recommendations.add('Offer read aloud, line focus, and oral response options where appropriate.');
  }
  if (student?.neurotypes.some((value) => /adhd/i.test(value))) {
    recommendations.add('Keep tasks short, add movement breaks, and check back after the first step.');
  }
  if (/noise|loud|sound/.test(joinedSignals)) {
    recommendations.add('Reduce noise load with a quieter seat, headphones, or a brief calm reset.');
  }
  if (/light|bright/.test(joinedSignals)) {
    recommendations.add('Reduce visual glare and avoid dense written instructions.');
  }
  if (/confused|stuck|help/.test(joinedSignals)) {
    recommendations.add('Restate the task as one small next step and show an example.');
  }
  if (/worried|anxious|overwhelm/.test(joinedSignals)) {
    recommendations.add('Lower demands briefly, validate the feeling, then return to a predictable step.');
  }
  if (supports && supports !== 'visual steps') {
    recommendations.add(`Prioritise ${supports} because it already appears useful for this learner.`);
  }

  recommendations.add('Message family if the same signal repeats or support needs increase.');
  return Array.from(recommendations).slice(0, 5);
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
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedRange, setSelectedRange] = useState<ReportRange>('this_week');
  const [printMode, setPrintMode] = useState<'class' | 'support' | null>(null);
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
    () =>
      summary?.assignments.filter(
        (assignment) => assignment.classId === selectedClassId && isAssignmentInRange(assignment, selectedRange),
      ) ?? [],
    [selectedClassId, selectedRange, summary?.assignments],
  );

  const classStudents = useMemo(
    () => summary?.students.filter((student) => student.classId === selectedClassId) ?? [],
    [selectedClassId, summary?.students],
  );
  const classStudentIds = useMemo(
    () => classStudents.map((student) => student.childId),
    [classStudents],
  );

  useEffect(() => {
    setSelectedStudentId((current) => {
      if (current && classStudents.some((student) => student.childId === current)) return current;
      return classStudents[0]?.childId ?? '';
    });
  }, [classStudents]);

  const selectedStudent = useMemo(
    () => classStudents.find((student) => student.childId === selectedStudentId) ?? null,
    [classStudents, selectedStudentId],
  );

  const learnerAssignmentRows = useMemo(
    () => (selectedStudent ? getLearnerAssignments(classAssignments, selectedStudent.childId) : []),
    [classAssignments, selectedStudent],
  );

  const learnerSignals = useMemo(
    () =>
      selectedStudent
        ? (summary?.liveSignals.filter((signal) => signal.childId === selectedStudent.childId) ?? []).slice(0, 4)
        : [],
    [selectedStudent, summary?.liveSignals],
  );

  const learnerMeetings = useMemo(
    () =>
      selectedStudent
        ? (summary?.careMeetings.filter((meeting) => meeting.childId === selectedStudent.childId) ?? [])
        : [],
    [selectedStudent, summary?.careMeetings],
  );

  const learnerCompleted = learnerAssignmentRows.filter(({ progress }) =>
    progress?.status === 'completed' || progress?.status === 'submitted',
  ).length;
  const learnerNeedsHelp = learnerAssignmentRows.filter(({ progress }) => progress?.status === 'needs_help').length;
  const learnerMostUsedSupport = selectedStudent
    ? getLearnerMostUsedSupport(classAssignments, selectedStudent.childId)
    : 'Visual steps';
  const learnerMoodSummary = selectedStudent
    ? getLearnerMoodSummary(classAssignments, selectedStudent.childId)
    : 'No mood check-ins yet';
  const learnerRecommendations = getPlanRecommendations(selectedStudent, classAssignments, learnerSignals);

  const helpRequests = classAssignments.reduce((total, assignment) => total + assignment.progress.needsHelp, 0);
  const completed = classAssignments.reduce(
    (total, assignment) => total + assignment.progress.completed + assignment.progress.submitted,
    0,
  );
  const assigned = classAssignments.reduce((total, assignment) => total + assignment.progress.assignedCount, 0);
  const reportGeneratedAt = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const handleExportCsv = () => {
    if (!selectedClass) {
      setError('Choose a class before exporting a report.');
      return;
    }

    const headers = [
      'Class',
      'Range',
      'Assignment',
      'Learner',
      'Buddy ID',
      'Neurotypes',
      'Status',
      'Mood after task',
      'Support used',
      'Updated at',
    ];
    const rows = classAssignments.flatMap((assignment) => {
      if (assignment.learnerProgress.length === 0) {
        return [[
          selectedClass.className,
          rangeLabels[selectedRange],
          assignment.title,
          '',
          '',
          '',
          'not_started',
          '',
          assignment.supportTools.map(supportLabel).join('; '),
          assignment.createdAt,
        ]];
      }

      return assignment.learnerProgress.map((learner) => [
        selectedClass.className,
        rangeLabels[selectedRange],
        assignment.title,
        learner.childName,
        learner.buddyId ?? '',
        learner.neurotypes.join('; '),
        learner.status,
        learner.moodAfterTask ?? '',
        learner.supportUsed.map(supportLabel).join('; '),
        learner.updatedAt ?? assignment.createdAt,
      ]);
    });

    const csv = [
      ['AdaptBuddy teacher class support report'],
      [`Generated: ${reportGeneratedAt}`],
      [`Class: ${selectedClass.className}`],
      [`Range: ${rangeLabels[selectedRange]}`],
      [],
      headers,
      ...rows,
    ]
      .map((row) => row.map(escapeCsvValue).join(','))
      .join('\n');

    downloadTextFile(
      `${slugify(selectedClass.className)}-${selectedRange}-support-report.csv`,
      csv,
      'text/csv;charset=utf-8',
    );
  };

  const handlePrint = (mode: 'class' | 'support') => {
    setPrintMode(mode);
    window.setTimeout(() => {
      const resetPrintMode = () => setPrintMode(null);
      window.addEventListener('afterprint', resetPrintMode, { once: true });
      window.print();
      window.setTimeout(resetPrintMode, 1000);
    }, 0);
  };

  const handleExportSupportPlan = () => {
    if (!selectedClass || !selectedStudent) {
      setError('Choose a learner before exporting a support plan.');
      return;
    }

    const assignmentLines = learnerAssignmentRows.length
      ? learnerAssignmentRows.map(({ assignment, progress }) =>
          `- ${assignment.title}: ${supportLabel(progress?.status ?? 'not_started')}`
        )
      : ['- No assignment activity yet.'];
    const signalLines = learnerSignals.length
      ? learnerSignals.map((signal) => `- ${getSignalLabel(signal)} (${signal.riskLevel})`)
      : ['- No shared support signals in this range.'];

    const plan = [
      'AdaptBuddy Learner Support Plan',
      `Generated: ${reportGeneratedAt}`,
      `Class: ${selectedClass.className}`,
      `Learner: ${selectedStudent.childName}`,
      `Buddy ID: ${selectedStudent.buddyId ?? 'Hidden'}`,
      `Support profile: ${selectedStudent.visibilitySettings.neuroProfile ? formatNeurotypes(selectedStudent.neurotypes) : 'Hidden by family'}`,
      '',
      'Current Snapshot',
      `- Assignments completed: ${learnerCompleted}/${learnerAssignmentRows.length}`,
      `- Needs help: ${learnerNeedsHelp}`,
      `- Most useful support: ${learnerMostUsedSupport}`,
      `- Common mood after tasks: ${learnerMoodSummary}`,
      '',
      'Recommended Classroom Adjustments',
      ...learnerRecommendations.map((recommendation) => `- ${recommendation}`),
      '',
      'Recent Assignment Activity',
      ...assignmentLines,
      '',
      'Recent Shared Signals',
      ...signalLines,
      '',
      'Privacy Boundary',
      'This plan uses parent-approved visibility. Private journal text and personal notes remain hidden unless explicitly shared.',
    ].join('\n');

    downloadTextFile(
      `${slugify(selectedStudent.childName)}-${slugify(selectedClass.className)}-support-plan.txt`,
      plan,
      'text/plain;charset=utf-8',
    );
  };

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
        <div className="adaptbuddy-no-print">
          <TeacherHubNav />
        </div>

        <section className={`${printMode === 'support' ? 'adaptbuddy-no-print' : 'adaptbuddy-report-print'} space-y-6`}>
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
              <p className="mt-3 text-xs font-bold text-slate-500 dark:text-gray-400">
                Generated {reportGeneratedAt}
                {selectedClass ? ` · ${selectedClass.className} · ${rangeLabels[selectedRange]}` : ''}
              </p>
            </div>
            <div className="adaptbuddy-no-print flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportCsv}
                disabled={!selectedClass}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
              >
                <Download className="h-4 w-4" aria-hidden />
                Export CSV
              </button>
              <button
                type="button"
                onClick={() => handlePrint('class')}
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
          <div className="adaptbuddy-no-print rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        )}

        <section className="adaptbuddy-no-print grid gap-4 rounded-3xl border border-white/70 bg-white/85 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/80 md:grid-cols-2">
          <label className="text-sm font-black text-adapt-navy dark:text-gray-100" htmlFor="report-class">
            Select class
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
          </label>
          <label className="text-sm font-black text-adapt-navy dark:text-gray-100" htmlFor="report-range">
            Date range
            <select
              id="report-range"
              value={selectedRange}
              onChange={(event) => setSelectedRange(event.target.value as ReportRange)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-adapt-navy outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            >
              {Object.entries(rangeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </section>

        {classStudentIds.length > 0 && (
          <div className="adaptbuddy-no-print space-y-4">
            <EvidencePackPanel
              title={selectedClass ? `${selectedClass.className} Evidence Pack` : 'Class Evidence Pack'}
              subtitle="A print-ready class support summary using approved learners, task progress, signals, meetings, and adult responses."
              childIds={classStudentIds}
              scope="class"
              compact
            />
            <WeeklyDigestSchedulerPanel
              title={selectedClass ? `${selectedClass.className} weekly digest schedule` : 'Class weekly digest schedule'}
              subtitle="Generate email-ready class support snapshots for families, SENCO review, and planning meetings."
              childIds={classStudentIds}
              classId={selectedClassId}
              scope="class"
              compact
            />
          </div>
        )}

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
            detail={`Tasks in ${rangeLabels[selectedRange].toLowerCase()}`}
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
        </section>

        <section className={`${printMode === 'support' ? 'adaptbuddy-support-plan-print' : ''} space-y-6`}>
          <header className="adaptbuddy-no-print rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card dark:border-gray-800 dark:bg-gray-900/80">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-adapt-indigo dark:text-adapt-cyan">
                  Learner support plan
                </p>
                <h2 className="mt-2 text-3xl font-extrabold text-adapt-navy dark:text-gray-100">
                  One-page printable plan
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-gray-400">
                  A concise support sheet for classroom use, parent meetings, SENCO reviews, or clinician conversations.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-[minmax(15rem,1fr)_auto_auto]">
                <select
                  value={selectedStudentId}
                  onChange={(event) => setSelectedStudentId(event.target.value)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-adapt-navy outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                  aria-label="Choose learner for support plan"
                >
                  <option value="">Choose learner</option>
                  {classStudents.map((student) => (
                    <option key={student.childId} value={student.childId}>
                      {student.childName} · {student.buddyId ?? 'Buddy ID hidden'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handlePrint('support')}
                  disabled={!selectedStudent}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                >
                  <Printer className="h-4 w-4" aria-hidden />
                  Print plan
                </button>
                <button
                  type="button"
                  onClick={handleExportSupportPlan}
                  disabled={!selectedStudent}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-4 py-3 text-sm font-black text-white shadow-sm disabled:opacity-50 dark:bg-adapt-cyan dark:text-gray-950"
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Download
                </button>
              </div>
            </div>
          </header>

          {selectedStudent && selectedClass ? (
            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card dark:border-gray-800 dark:bg-gray-900">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 dark:border-gray-800 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-adapt-indigo dark:text-adapt-cyan">
                    AdaptBuddy support plan
                  </p>
                  <h2 className="mt-2 text-3xl font-extrabold text-adapt-navy dark:text-gray-100">
                    {selectedStudent.childName}
                  </h2>
                  <p className="mt-2 text-sm font-semibold text-slate-500 dark:text-gray-400">
                    {selectedClass.className} · {selectedClass.schoolName || 'School not set'} · Generated {reportGeneratedAt}
                  </p>
                </div>
                <div className="grid gap-2 text-sm lg:min-w-72">
                  <div className="rounded-2xl bg-slate-50 p-3 dark:bg-gray-950">
                    <p className="text-xs font-bold text-slate-500 dark:text-gray-400">Buddy ID</p>
                    <p className="mt-1 font-mono font-black text-adapt-indigo dark:text-adapt-cyan">
                      {selectedStudent.buddyId ?? 'Hidden'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3 dark:bg-gray-950">
                    <p className="text-xs font-bold text-slate-500 dark:text-gray-400">Support profile</p>
                    <p className="mt-1 font-black text-adapt-navy dark:text-gray-100">
                      {selectedStudent.visibilitySettings.neuroProfile
                        ? formatNeurotypes(selectedStudent.neurotypes)
                        : 'Hidden by family'}
                    </p>
                  </div>
                </div>
              </div>

              <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl bg-sky-50 p-4 dark:bg-sky-950/20">
                  <ClipboardCheck className="h-5 w-5 text-sky-700 dark:text-sky-200" aria-hidden />
                  <p className="mt-2 text-2xl font-black text-adapt-navy dark:text-gray-100">
                    {learnerCompleted}/{learnerAssignmentRows.length}
                  </p>
                  <p className="text-xs font-bold text-slate-500 dark:text-gray-400">Tasks complete</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4 dark:bg-amber-950/20">
                  <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-200" aria-hidden />
                  <p className="mt-2 text-2xl font-black text-adapt-navy dark:text-gray-100">{learnerNeedsHelp}</p>
                  <p className="text-xs font-bold text-slate-500 dark:text-gray-400">Needs-help tasks</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/20">
                  <HeartPulse className="h-5 w-5 text-emerald-700 dark:text-emerald-200" aria-hidden />
                  <p className="mt-2 text-lg font-black text-adapt-navy dark:text-gray-100">{learnerMoodSummary}</p>
                  <p className="text-xs font-bold text-slate-500 dark:text-gray-400">Mood after tasks</p>
                </div>
                <div className="rounded-2xl bg-violet-50 p-4 dark:bg-violet-950/20">
                  <Brain className="h-5 w-5 text-violet-700 dark:text-violet-200" aria-hidden />
                  <p className="mt-2 text-lg font-black text-adapt-navy dark:text-gray-100">{learnerMostUsedSupport}</p>
                  <p className="text-xs font-bold text-slate-500 dark:text-gray-400">Most useful support</p>
                </div>
              </section>

              <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.9fr]">
                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 dark:border-gray-800 dark:bg-gray-950">
                  <h3 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">
                    Classroom adjustments
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-600 dark:text-gray-300">
                    {learnerRecommendations.map((recommendation) => (
                      <li key={recommendation}>• {recommendation}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 dark:border-gray-800 dark:bg-gray-950">
                  <h3 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">Recent shared signals</h3>
                  <div className="mt-3 space-y-2">
                    {learnerSignals.length > 0 ? (
                      learnerSignals.map((signal) => (
                        <div key={signal.id} className="rounded-2xl bg-white p-3 text-sm dark:bg-gray-900">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-black text-adapt-navy dark:text-gray-100">{getSignalLabel(signal)}</p>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black capitalize text-slate-600 dark:bg-gray-800 dark:text-gray-200">
                              {signal.riskLevel}
                            </span>
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-gray-400">
                            {getSignalCategory(signal)}
                          </p>
                          {signal.text && (
                            <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-gray-300">{signal.text}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm font-semibold text-slate-500 dark:border-gray-800 dark:text-gray-400">
                        No shared support signals yet.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section className="mt-5 grid gap-5 xl:grid-cols-2">
                <div className="rounded-3xl border border-slate-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
                  <h3 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">Assignment focus</h3>
                  <div className="mt-3 space-y-2">
                    {learnerAssignmentRows.length > 0 ? (
                      learnerAssignmentRows.slice(0, 4).map(({ assignment, progress }) => (
                        <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3 text-sm dark:bg-gray-900">
                          <p className="font-semibold text-slate-700 dark:text-gray-300">{assignment.title}</p>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-adapt-indigo dark:bg-gray-950 dark:text-adapt-cyan">
                            {supportLabel(progress?.status ?? 'not_started')}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">No learner assignment activity yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-adapt-indigo/15 bg-adapt-indigo/5 p-5 dark:border-adapt-cyan/20 dark:bg-adapt-cyan/10">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
                    <h3 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">Family coordination</h3>
                  </div>
                  <div className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-600 dark:text-gray-300">
                    <p>Open meetings: {learnerMeetings.filter((meeting) => meeting.status !== 'completed' && meeting.status !== 'cancelled').length}</p>
                    <p>Daily mood visibility: {selectedStudent.visibilitySettings.dailyMood}</p>
                    <p>Worry diary text: {selectedStudent.visibilitySettings.worryDiaryText ? 'shared' : 'hidden'}</p>
                    <p>Private notes: {selectedStudent.visibilitySettings.personalNotes ? 'shared' : 'hidden'}</p>
                  </div>
                </div>
              </section>

              <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-semibold leading-5 text-slate-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                Privacy boundary: this support plan uses parent-approved visibility only. It is a classroom support aid,
                not a diagnostic document. Private journal text, personal notes, and hidden profile information remain
                excluded unless the family explicitly shares them.
              </p>
            </article>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white/75 p-8 text-center text-slate-500 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-400">
              Choose a class with a connected learner to create a support plan.
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Reports;
