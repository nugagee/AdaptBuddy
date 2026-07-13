import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserRoundPlus,
  XCircle,
} from 'lucide-react';
import TeacherHubNav from 'features/teacher/components/TeacherHubNav';
import {
  TeacherDashboardService,
  type TeacherDashboardSummary,
  type TeacherJoinRequest,
  type TeacherStudent,
} from 'features/teacher/services/teacherDashboardService';
import { useAuth } from 'hooks/useAuth';

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
};

const formatBuddyIdInput = (value: string): string => {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = cleaned.startsWith('AB') ? cleaned.slice(2) : cleaned;
  const limited = body.slice(0, 6);
  if (!limited) return cleaned.startsWith('AB') ? 'AB-' : '';
  const first = limited.slice(0, 4);
  const second = limited.slice(4, 6);
  return `AB-${first}${second ? `-${second}` : ''}`;
};

const formatNeurotypes = (values: string[]): string =>
  values.length
    ? values
        .slice(0, 3)
        .map((value) =>
          value
            .split(/[-_]/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' '),
        )
        .join(', ')
    : 'Profile hidden or not set';

const isPendingRequestStatus = (status: TeacherJoinRequest['status']): boolean =>
  status === 'pending' || status === 'pending_parent' || status === 'pending_teacher';

const StudentCard: React.FC<{ student: TeacherStudent; className: string }> = ({ student, className }) => (
  <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">{student.childName}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{className}</p>
      </div>
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
        Connected
      </span>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-gray-950">
        <p className="text-xs font-bold text-slate-500 dark:text-gray-400">Buddy ID</p>
        <p className="mt-1 font-mono text-sm font-black text-adapt-indigo dark:text-adapt-cyan">
          {student.buddyId ?? 'Hidden'}
        </p>
      </div>
      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-gray-950">
        <p className="text-xs font-bold text-slate-500 dark:text-gray-400">Support profile</p>
        <p className="mt-1 text-sm font-black text-adapt-navy dark:text-gray-100">
          {student.visibilitySettings.neuroProfile ? formatNeurotypes(student.neurotypes) : 'Hidden by family'}
        </p>
      </div>
    </div>
    <div className="mt-4 rounded-2xl border border-adapt-indigo/15 bg-adapt-indigo/5 p-3 text-sm text-slate-600 dark:border-adapt-cyan/20 dark:bg-adapt-cyan/10 dark:text-gray-300">
      <p className="font-black text-adapt-navy dark:text-gray-100">Visibility</p>
      <p className="mt-1">
        Mood: {student.visibilitySettings.dailyMood}. Worry diary text:{' '}
        {student.visibilitySettings.worryDiaryText ? 'shared' : 'hidden'}.
      </p>
    </div>
    {student.latestSignal && (
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-black">Latest signal: {student.latestSignal.signalLabel ?? student.latestSignal.emotion}</p>
      </div>
    )}
  </article>
);

const RequestCard: React.FC<{
  request: TeacherJoinRequest;
  className: string;
  busy: boolean;
  onApprove: (requestId: string) => void;
  onDecline: (requestId: string) => void;
}> = ({ request, className, busy, onApprove, onDecline }) => (
  <article className="rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">
          Student request
        </p>
        <h2 className="mt-1 text-lg font-extrabold text-amber-950 dark:text-amber-50">{request.childName}</h2>
        <p className="mt-1 text-sm text-amber-800/80 dark:text-amber-100/80">{className}</p>
        <p className="mt-2 font-mono text-sm font-black text-amber-700 dark:text-amber-200">
          {request.buddyId ?? 'Buddy ID hidden'}
        </p>
        <p className="mt-3 text-sm text-amber-900/80 dark:text-amber-100/80">
          Profiles: {request.parentApproved ? formatNeurotypes(request.neurotypes) : 'Hidden until parent approval'}
        </p>
        <p className="mt-1 text-xs font-bold text-amber-700 dark:text-amber-200">
          {request.parentApproved
            ? 'Parent visibility settings are ready for teacher review.'
            : 'Teacher approval is only a request. The learner is not connected until a parent approves.'}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => onApprove(request.id)}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:opacity-60"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          {request.parentApproved ? 'Approve' : 'Teacher approve'}
        </button>
        <button
          type="button"
          onClick={() => onDecline(request.id)}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-black text-red-600 disabled:opacity-60 dark:bg-gray-900"
        >
          <XCircle className="h-4 w-4" aria-hidden />
          Decline
        </button>
      </div>
    </div>
  </article>
);

const Students: React.FC = () => {
  const { isGuest } = useAuth();
  const [summary, setSummary] = useState<TeacherDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [buddyIdInput, setBuddyIdInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const loadStudents = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const data = await TeacherDashboardService.getDashboardSummary();
      setSummary(data);
      setSelectedClassId((current) => current || data.classes[0]?.id || '');
    } catch (loadError) {
      console.error('Error loading teacher students:', loadError);
      setError(getErrorMessage(loadError, 'Could not load students.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadStudents();
  }, [loadStudents]);

  const classNames = useMemo(
    () => new Map((summary?.classes ?? []).map((teacherClass) => [teacherClass.id, teacherClass.className])),
    [summary?.classes],
  );

  const pendingRequests = summary?.joinRequests.filter((request) => isPendingRequestStatus(request.status)) ?? [];
  const visibleStudents = selectedClassId
    ? summary?.students.filter((student) => student.classId === selectedClassId) ?? []
    : summary?.students ?? [];
  const visibleRequests = selectedClassId
    ? pendingRequests.filter((request) => request.classId === selectedClassId)
    : pendingRequests;

  const handleRequestStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClassId || !buddyIdInput.trim() || requesting) return;
    setRequesting(true);
    setError(null);
    setActionStatus(null);

    try {
      if (isGuest) {
        setActionStatus('Guest demo: sign in with a teacher account to request student access.');
        return;
      }
      const request = await TeacherDashboardService.requestStudentByBuddyId(selectedClassId, buddyIdInput);
      setBuddyIdInput('');
      setActionStatus(`${request.buddyId ?? 'This Buddy ID'} is waiting for parent approval.`);
      await loadStudents('refresh');
    } catch (requestError) {
      console.error('Error requesting student:', requestError);
      setError(getErrorMessage(requestError, 'Could not request student access.'));
    } finally {
      setRequesting(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setBusyRequestId(requestId);
    setError(null);
    setActionStatus(null);

    try {
      if (isGuest) {
        setActionStatus('Guest demo: approval saves after signing in with a teacher account.');
        return;
      }
      const result = await TeacherDashboardService.approveJoinRequest(requestId);
      setActionStatus(
        result.status === 'pending_parent'
          ? 'Teacher approval saved. Waiting for parent approval before the learner appears here.'
          : 'Student request approved.',
      );
      await loadStudents('refresh');
    } catch (approveError) {
      console.error('Error approving student request:', approveError);
      setError(getErrorMessage(approveError, 'Could not approve request.'));
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    setBusyRequestId(requestId);
    setError(null);
    setActionStatus(null);

    try {
      if (isGuest) {
        setActionStatus('Guest demo: decline saves after signing in with a teacher account.');
        return;
      }
      await TeacherDashboardService.declineJoinRequest(requestId);
      setActionStatus('Student request declined.');
      await loadStudents('refresh');
    } catch (declineError) {
      console.error('Error declining student request:', declineError);
      setError(getErrorMessage(declineError, 'Could not decline request.'));
    } finally {
      setBusyRequestId(null);
    }
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
        <TeacherHubNav />

        <header className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card dark:border-gray-800 dark:bg-gray-900/80">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-adapt-indigo dark:text-adapt-cyan">
                Students
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-adapt-navy dark:text-gray-100">
                Learner access and support visibility
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-gray-400">
                Connect learners by Buddy ID, approve requests, and view only the support information families allow.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadStudents('refresh')}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        )}
        {actionStatus && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            {actionStatus}
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[0.75fr_1.25fr]">
          <div className="space-y-6">
            <form
              onSubmit={handleRequestStudent}
              className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/80"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                  <UserRoundPlus className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h2 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">Connect by Buddy ID</h2>
                  <p className="text-sm text-slate-500 dark:text-gray-400">
                    Creates a request. The learner appears only after parent approval.
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <select
                  value={selectedClassId}
                  onChange={(event) => setSelectedClassId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-adapt-navy outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                >
                  <option value="">Choose class</option>
                  {summary?.classes.map((teacherClass) => (
                    <option key={teacherClass.id} value={teacherClass.id}>{teacherClass.className}</option>
                  ))}
                </select>
                <input
                  value={buddyIdInput}
                  onChange={(event) => setBuddyIdInput(formatBuddyIdInput(event.target.value))}
                  placeholder="AB-7K4M-23"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm font-black tracking-wide text-adapt-navy outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                />
              </div>
              <button
                type="submit"
                disabled={!selectedClassId || !buddyIdInput.trim() || requesting}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-4 py-3 text-sm font-black text-white transition hover:bg-adapt-purple disabled:opacity-60 dark:bg-adapt-cyan dark:text-gray-950"
              >
                {requesting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
                {requesting ? 'Requesting...' : 'Request access'}
              </button>
            </form>

            <article className="rounded-3xl border border-adapt-indigo/15 bg-white/85 p-5 shadow-soft dark:border-adapt-cyan/20 dark:bg-gray-900/80">
              <ShieldCheck className="h-6 w-6 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
              <h2 className="mt-3 text-lg font-extrabold text-adapt-navy dark:text-gray-100">Default visibility</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-gray-300">
                <p>Child name: parent-approved.</p>
                <p>Daily mood: summary only.</p>
                <p>Worry diary text: hidden unless shared.</p>
                <p>Safeguarding alerts: visible to approved adults.</p>
              </div>
            </article>
          </div>

          <div className="space-y-6">
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden />
                <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">
                  Pending requests
                </h2>
              </div>
              {visibleRequests.length ? (
                visibleRequests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    className={classNames.get(request.classId) ?? 'Class'}
                    busy={busyRequestId === request.id}
                    onApprove={(requestId) => void handleApprove(requestId)}
                    onDecline={(requestId) => void handleDecline(requestId)}
                  />
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white/75 p-6 text-center text-slate-500 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-400">
                  No pending requests for this view.
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
                <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">
                  Connected students
                </h2>
              </div>
              {visibleStudents.length ? (
                <div className="grid gap-4 lg:grid-cols-2">
                  {visibleStudents.map((student) => (
                    <StudentCard
                      key={student.membershipId}
                      student={student}
                      className={classNames.get(student.classId) ?? 'Class'}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white/75 p-6 text-center text-slate-500 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-400">
                  Approved students will appear here.
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Students;
