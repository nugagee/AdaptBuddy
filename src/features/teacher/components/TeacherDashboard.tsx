import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BookOpenCheck,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  KeyRound,
  Layers3,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  School,
  Send,
  ShieldAlert,
  Users,
  XCircle,
} from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import BuddyDigestPanel from 'components/digest/BuddyDigestPanel';
import TeacherHubNav from 'features/teacher/components/TeacherHubNav';
import {
  TeacherDashboardService,
  type TeacherCareMeeting,
  type TeacherClass,
  type TeacherDashboardSummary,
  type TeacherFamilyMessage,
  type TeacherJoinRequest,
  type TeacherMeetingStatus,
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

const formatRelativeTime = (isoDate: string): string => {
  const timestamp = new Date(isoDate).getTime();
  if (!Number.isFinite(timestamp)) return 'Recently';
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

const formatNeurotypes = (values: string[]): string =>
  values.length
    ? values
        .slice(0, 2)
        .map((value) =>
          value
            .split(/[-_]/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' '),
        )
        .join(', ')
    : 'Profile hidden or not set';

const formatBuddyIdInput = (value: string): string => {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = cleaned.startsWith('AB') ? cleaned.slice(2) : cleaned;
  const limited = body.slice(0, 6);
  if (!limited) return cleaned.startsWith('AB') ? 'AB-' : '';
  const first = limited.slice(0, 4);
  const second = limited.slice(4, 6);
  return `AB-${first}${second ? `-${second}` : ''}`;
};

const isPendingRequestStatus = (status: TeacherJoinRequest['status']): boolean =>
  status === 'pending' || status === 'pending_parent' || status === 'pending_teacher';

const messageUrgencyStyles: Record<TeacherFamilyMessage['urgency'], string> = {
  normal: 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-200',
  support: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-100',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-100',
};

const meetingStatusStyles: Record<TeacherCareMeeting['status'], string> = {
  requested: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-100',
  scheduled: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-100',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100',
  cancelled: 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-200',
};

const StatCard: React.FC<{
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Users;
  tone: string;
}> = ({ label, value, detail, icon: Icon, tone }) => (
  <article className="rounded-2xl border border-white/80 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
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

const ClassCard: React.FC<{ teacherClass: TeacherClass }> = ({ teacherClass }) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-adapt-indigo dark:text-adapt-cyan">
          {teacherClass.yearGroup || 'Class'}
        </p>
        <h3 className="mt-1 text-lg font-extrabold text-adapt-navy dark:text-gray-100">{teacherClass.className}</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
          {teacherClass.subject} {teacherClass.schoolName ? `at ${teacherClass.schoolName}` : ''}
        </p>
      </div>
      <span className="rounded-xl bg-adapt-indigo/10 px-3 py-2 font-mono text-sm font-black text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
        {teacherClass.classCode}
      </span>
    </div>
    <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
      <div className="rounded-xl bg-slate-50 p-3 dark:bg-gray-950">
        <p className="font-black text-adapt-navy dark:text-gray-100">{teacherClass.studentCount}</p>
        <p className="text-xs text-slate-500 dark:text-gray-400">Students</p>
      </div>
      <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/20">
        <p className="font-black text-amber-700 dark:text-amber-200">{teacherClass.pendingRequests}</p>
        <p className="text-xs text-amber-700/70 dark:text-amber-200/70">Requests</p>
      </div>
      <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/20">
        <p className="font-black text-emerald-700 dark:text-emerald-200">{teacherClass.assignmentsDue}</p>
        <p className="text-xs text-emerald-700/70 dark:text-emerald-200/70">Due</p>
      </div>
    </div>
  </article>
);

const StudentCard: React.FC<{ student: TeacherStudent }> = ({ student }) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">{student.childName}</h3>
        <p className="mt-1 font-mono text-xs font-black text-adapt-indigo dark:text-adapt-cyan">
          {student.buddyId ?? 'Buddy ID hidden'}
        </p>
      </div>
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
        {student.status}
      </span>
    </div>
    <p className="mt-3 text-sm text-slate-600 dark:text-gray-300">
      Profiles: {student.visibilitySettings.neuroProfile ? formatNeurotypes(student.neurotypes) : 'Hidden by family'}
    </p>
    <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{student.completionSummary}</p>
    {student.latestSignal && (
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-black">Latest signal: {student.latestSignal.signalLabel ?? student.latestSignal.emotion}</p>
        <p className="mt-1 text-xs">{formatRelativeTime(student.latestSignal.createdAt)}</p>
      </div>
    )}
    <div className="mt-4 flex flex-wrap gap-2">
      <button className="rounded-xl bg-adapt-indigo/10 px-3 py-2 text-xs font-black text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
        View support
      </button>
      <button className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 dark:bg-gray-800 dark:text-gray-200">
        Message parent
      </button>
    </div>
  </article>
);

const RequestCard: React.FC<{
  request: TeacherJoinRequest;
  onApprove: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  busy: boolean;
}> = ({ request, onApprove, onDecline, busy }) => (
  <article className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm font-black text-amber-900 dark:text-amber-100">{request.childName}</p>
        <p className="mt-1 font-mono text-xs font-black text-amber-700 dark:text-amber-200">
          {request.buddyId ?? 'Buddy ID hidden'}
        </p>
        <p className="mt-2 text-sm text-amber-800/80 dark:text-amber-100/80">
          {request.parentApproved ? formatNeurotypes(request.neurotypes) : 'Profile hidden until parent approval'} •{' '}
          {request.requestMethod.replace('_', ' ')}
        </p>
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-200">
          {request.parentApproved
            ? 'Parent has approved visibility settings.'
            : 'Waiting for parent approval before this learner becomes visible.'}
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

const SignalRow: React.FC<{ signal: TeacherSupportSignal }> = ({ signal }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-black text-adapt-navy dark:text-gray-100">{signal.childName ?? 'Learner'}</p>
        <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
          {signal.signalLabel ?? signal.emotion}
          {signal.signalCategory ? ` • ${signal.signalCategory}` : ''}
        </p>
        {signal.text && <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">{signal.text}</p>}
      </div>
      <span
        className={`rounded-full px-3 py-1 text-xs font-black ${
          signal.riskLevel === 'high'
            ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200'
            : signal.riskLevel === 'medium'
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
        }`}
      >
        {signal.riskLevel}
      </span>
    </div>
    <p className="mt-2 text-xs text-slate-400">{formatRelativeTime(signal.createdAt)}</p>
  </div>
);

const FamilyMessageCard: React.FC<{
  message: TeacherFamilyMessage;
  replyDraft: string;
  busy: boolean;
  onReplyDraftChange: (value: string) => void;
  onReply: () => void;
}> = ({ message, replyDraft, busy, onReplyDraftChange, onReply }) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-gray-800 dark:bg-gray-900">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-adapt-indigo dark:text-adapt-cyan">
          {message.isFromTeacher ? 'Teacher reply' : 'Family message'} · {message.childName}
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-gray-300">{message.body}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${messageUrgencyStyles[message.urgency]}`}>
          {message.urgency}
        </span>
        <span className="text-xs font-semibold text-slate-400">{formatRelativeTime(message.createdAt)}</span>
      </div>
    </div>

    {message.aiTalkingPoints.length > 0 && (
      <div className="mt-3 rounded-2xl bg-slate-50 p-3 dark:bg-gray-950">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Meeting talking points</p>
        <ul className="mt-2 space-y-1 text-sm font-semibold text-slate-600 dark:text-gray-300">
          {message.aiTalkingPoints.slice(0, 3).map((point) => (
            <li key={point}>• {point}</li>
          ))}
        </ul>
      </div>
    )}

    {!message.isFromTeacher && (
      <div className="mt-4">
        <textarea
          value={replyDraft}
          onChange={(event) => onReplyDraftChange(event.target.value)}
          rows={3}
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          placeholder="Reply with one clear support step..."
        />
        <button
          type="button"
          onClick={onReply}
          disabled={!replyDraft.trim() || busy}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-4 py-3 text-sm font-black text-white transition hover:bg-adapt-purple disabled:opacity-60 dark:bg-adapt-cyan dark:text-gray-950"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
          {busy ? 'Sending...' : 'Send reply'}
        </button>
      </div>
    )}
  </article>
);

const CareMeetingCard: React.FC<{
  meeting: TeacherCareMeeting;
  noteDraft: string;
  busy: boolean;
  onNoteChange: (value: string) => void;
  onStatusUpdate: (status: TeacherMeetingStatus) => void;
}> = ({ meeting, noteDraft, busy, onNoteChange, onStatusUpdate }) => (
  <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft dark:border-gray-800 dark:bg-gray-900">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-adapt-indigo dark:text-adapt-cyan">
          {meeting.meetingType.replace(/_/g, ' ')} · {meeting.childName}
        </p>
        <h3 className="mt-1 text-lg font-extrabold text-adapt-navy dark:text-gray-100">
          {meeting.urgency === 'urgent' ? 'Urgent meeting request' : 'Support meeting request'}
        </h3>
        <p className="mt-1 text-xs font-semibold text-slate-400">{formatRelativeTime(meeting.createdAt)}</p>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${meetingStatusStyles[meeting.status]}`}>
        {meeting.status}
      </span>
    </div>

    <div className="mt-3 rounded-2xl bg-slate-50 p-3 dark:bg-gray-950">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Agenda</p>
      {meeting.agenda.length > 0 ? (
        <ul className="mt-2 space-y-1 text-sm font-semibold text-slate-600 dark:text-gray-300">
          {meeting.agenda.slice(0, 4).map((point) => (
            <li key={point}>• {point}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">No agenda yet.</p>
      )}
    </div>

    <textarea
      value={noteDraft}
      onChange={(event) => onNoteChange(event.target.value)}
      rows={2}
      className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
      placeholder={meeting.notes || 'Add teacher note before updating...'}
    />
    <div className="mt-3 grid gap-2 sm:grid-cols-3">
      <button
        type="button"
        onClick={() => onStatusUpdate('scheduled')}
        disabled={busy || meeting.status === 'scheduled'}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-100 px-3 py-2 text-xs font-black text-sky-700 transition hover:bg-sky-200 disabled:opacity-60 dark:bg-sky-950/40 dark:text-sky-100"
      >
        <CalendarClock className="h-4 w-4" aria-hidden />
        Schedule
      </button>
      <button
        type="button"
        onClick={() => onStatusUpdate('completed')}
        disabled={busy || meeting.status === 'completed'}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-60 dark:bg-emerald-950/40 dark:text-emerald-100"
      >
        <CalendarCheck className="h-4 w-4" aria-hidden />
        Complete
      </button>
      <button
        type="button"
        onClick={() => onStatusUpdate('cancelled')}
        disabled={busy || meeting.status === 'cancelled'}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-200"
      >
        <XCircle className="h-4 w-4" aria-hidden />
        Cancel
      </button>
    </div>
  </article>
);

const TeacherDashboard: React.FC = () => {
  const { profile, user, isGuest } = useAuth();
  const [summary, setSummary] = useState<TeacherDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [creatingClass, setCreatingClass] = useState(false);
  const [requestingStudent, setRequestingStudent] = useState(false);
  const [classForm, setClassForm] = useState({
    className: '',
    schoolName: '',
    subject: '',
    yearGroup: '',
  });
  const [buddyIdInput, setBuddyIdInput] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [meetingNotes, setMeetingNotes] = useState<Record<string, string>>({});
  const [busyMessageId, setBusyMessageId] = useState<string | null>(null);
  const [busyMeetingId, setBusyMeetingId] = useState<string | null>(null);

  const teacherName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
    || profile?.full_name
    || user?.email?.split('@')[0]
    || 'Teacher';

  const loadDashboard = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const data = await TeacherDashboardService.getDashboardSummary();
      setSummary(data);
      setSelectedClassId((current) => current || data.classes[0]?.id || '');
    } catch (loadError) {
      console.error('Error loading teacher dashboard:', loadError);
      setError(getErrorMessage(loadError, 'Could not load teacher dashboard.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const selectedClass = useMemo(
    () => summary?.classes.find((teacherClass) => teacherClass.id === selectedClassId) ?? null,
    [selectedClassId, summary?.classes],
  );

  const pendingRequests = summary?.joinRequests.filter((request) => isPendingRequestStatus(request.status)) ?? [];
  const selectedClassRequests = selectedClass
    ? pendingRequests.filter((request) => request.classId === selectedClass.id)
    : pendingRequests;
  const selectedClassStudents = selectedClass
    ? summary?.students.filter((student) => student.classId === selectedClass.id) ?? []
    : summary?.students ?? [];
  const selectedClassChildIds = new Set(selectedClassStudents.map((student) => student.childId));
  const selectedClassMessages = selectedClass
    ? summary?.familyMessages.filter((message) => selectedClassChildIds.has(message.childId)) ?? []
    : summary?.familyMessages ?? [];
  const selectedClassMeetings = selectedClass
    ? summary?.careMeetings.filter((meeting) => selectedClassChildIds.has(meeting.childId)) ?? []
    : summary?.careMeetings ?? [];

  const handleCreateClass = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!classForm.className.trim() || creatingClass) return;
    setCreatingClass(true);
    setActionStatus(null);
    setError(null);

    try {
      if (isGuest) {
        setActionStatus('Guest demo: create a teacher account to save classes.');
        return;
      }
      const teacherClass = await TeacherDashboardService.createClass(classForm);
      setActionStatus(`${teacherClass.className} created with class code ${teacherClass.classCode}.`);
      setClassForm({ className: '', schoolName: '', subject: '', yearGroup: '' });
      await loadDashboard('refresh');
      setSelectedClassId(teacherClass.id);
    } catch (createError) {
      console.error('Error creating teacher class:', createError);
      setError(getErrorMessage(createError, 'Could not create class.'));
    } finally {
      setCreatingClass(false);
    }
  };

  const handleRequestStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedClassId || !buddyIdInput.trim() || requestingStudent) return;
    setRequestingStudent(true);
    setActionStatus(null);
    setError(null);

    try {
      if (isGuest) {
        setActionStatus('Guest demo: Buddy ID requests save after signing in as a teacher.');
        return;
      }
      const request = await TeacherDashboardService.requestStudentByBuddyId(selectedClassId, buddyIdInput);
      setBuddyIdInput('');
      setActionStatus(`${request.buddyId ?? 'This Buddy ID'} is waiting for parent approval.`);
      await loadDashboard('refresh');
    } catch (requestError) {
      console.error('Error requesting student by Buddy ID:', requestError);
      setError(getErrorMessage(requestError, 'Could not request this student.'));
    } finally {
      setRequestingStudent(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    setBusyRequestId(requestId);
    setError(null);
    setActionStatus(null);

    try {
      const result = !isGuest ? await TeacherDashboardService.approveJoinRequest(requestId) : null;
      setActionStatus(
        result?.status === 'pending_parent'
          ? 'Teacher approval saved. Waiting for parent approval before the student appears in class.'
          : 'Student request approved.',
      );
      await loadDashboard('refresh');
    } catch (approveError) {
      console.error('Error approving join request:', approveError);
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
      if (!isGuest) await TeacherDashboardService.declineJoinRequest(requestId);
      setActionStatus('Student request declined.');
      await loadDashboard('refresh');
    } catch (declineError) {
      console.error('Error declining join request:', declineError);
      setError(getErrorMessage(declineError, 'Could not decline request.'));
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleReplyToMessage = async (message: TeacherFamilyMessage) => {
    const draft = replyDrafts[message.id]?.trim() ?? '';
    if (!draft || busyMessageId) return;
    setBusyMessageId(message.id);
    setError(null);
    setActionStatus(null);

    try {
      if (isGuest) {
        setActionStatus('Guest demo: replies save after signing in as a teacher.');
      } else {
        const urgency = /urgent|unsafe|risk|safeguard|crisis/i.test(draft)
          ? 'urgent'
          : /worried|anxious|overwhelmed|support|help/i.test(draft)
            ? 'support'
            : 'normal';
        await TeacherDashboardService.sendFamilyMessage(message.childId, draft, message.senderId, urgency);
        setReplyDrafts((current) => ({ ...current, [message.id]: '' }));
        setActionStatus('Reply sent to the family thread.');
      }
      await loadDashboard('refresh');
    } catch (replyError) {
      console.error('Error sending family reply:', replyError);
      setError(getErrorMessage(replyError, 'Could not send the reply.'));
    } finally {
      setBusyMessageId(null);
    }
  };

  const handleMeetingStatusUpdate = async (meeting: TeacherCareMeeting, status: TeacherMeetingStatus) => {
    if (busyMeetingId) return;
    setBusyMeetingId(meeting.id);
    setError(null);
    setActionStatus(null);

    try {
      if (isGuest) {
        setActionStatus('Guest demo: meeting updates save after signing in as a teacher.');
      } else {
        await TeacherDashboardService.updateCareMeetingStatus(meeting.id, status, meetingNotes[meeting.id]);
        setMeetingNotes((current) => ({ ...current, [meeting.id]: '' }));
        setActionStatus(`Meeting marked ${status.replace(/_/g, ' ')}.`);
      }
      await loadDashboard('refresh');
    } catch (meetingError) {
      console.error('Error updating meeting:', meetingError);
      setError(getErrorMessage(meetingError, 'Could not update the meeting.'));
    } finally {
      setBusyMeetingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <TeacherHubNav />
        <div className="flex items-center justify-center px-4 py-16">
          <div className="rounded-3xl border border-white/70 bg-white p-8 text-center shadow-card dark:border-gray-800 dark:bg-gray-900">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
            <p className="mt-4 font-bold text-adapt-navy dark:text-gray-100">Loading teacher dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const totals = summary?.totals ?? {
    classes: 0,
    students: 0,
    pendingRequests: 0,
    supportAlerts: 0,
    assignmentsDue: 0,
    unreadMessages: 0,
    meetingRequests: 0,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <TeacherHubNav />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-adapt-indigo dark:text-adapt-cyan">
                Teacher Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-adapt-navy dark:text-gray-100">
                Welcome back, {teacherName}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-gray-400">
                Manage classes, approve learner requests, track support signals, and coordinate with families without
                entering a child&apos;s private app space.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadDashboard('refresh')}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-adapt-indigo/40 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6" aria-label="Teacher dashboard metrics">
          <StatCard label="Classes" value={totals.classes} detail="Active teaching groups" icon={School} tone="bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200" />
          <StatCard label="Students" value={totals.students} detail="Connected learners" icon={Users} tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200" />
          <StatCard label="Requests" value={totals.pendingRequests} detail="Waiting for review" icon={Bell} tone="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200" />
          <StatCard label="Signals" value={totals.supportAlerts} detail="Need attention" icon={ShieldAlert} tone="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-200" />
          <StatCard label="Due" value={totals.assignmentsDue} detail="Assignments this week" icon={ClipboardList} tone="bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-200" />
          <StatCard label="Messages" value={totals.unreadMessages} detail={`${totals.meetingRequests} meeting requests`} icon={MessageSquare} tone="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-100" />
        </section>

        <BuddyDigestPanel
          title="Class Buddy Digest"
          subtitle="A weekly class support snapshot built from approved learner signals, assignments, meetings, and adult responses."
          scope="class"
          compact
        />

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form
            onSubmit={handleCreateClass}
            className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/80"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                <Plus className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">Create classroom</h2>
                <p className="text-sm text-slate-500 dark:text-gray-400">Generate a class code for learners and families.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <input
                value={classForm.className}
                onChange={(event) => setClassForm((current) => ({ ...current, className: event.target.value }))}
                placeholder="Year 4 Maths"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
              <input
                value={classForm.schoolName}
                onChange={(event) => setClassForm((current) => ({ ...current, schoolName: event.target.value }))}
                placeholder="Bradford Primary"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
              <input
                value={classForm.subject}
                onChange={(event) => setClassForm((current) => ({ ...current, subject: event.target.value }))}
                placeholder="Maths"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
              <input
                value={classForm.yearGroup}
                onChange={(event) => setClassForm((current) => ({ ...current, yearGroup: event.target.value }))}
                placeholder="Year 4"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
            </div>
            <button
              type="submit"
              disabled={!classForm.className.trim() || creatingClass}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-4 py-3 text-sm font-black text-white transition hover:bg-adapt-purple disabled:opacity-60 dark:bg-adapt-cyan dark:text-gray-950"
            >
              {creatingClass ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <School className="h-4 w-4" aria-hidden />}
              {creatingClass ? 'Creating...' : 'Create class'}
            </button>
          </form>

          <form
            onSubmit={handleRequestStudent}
            className="rounded-3xl border border-adapt-indigo/15 bg-white/85 p-5 shadow-soft dark:border-adapt-cyan/20 dark:bg-gray-900/80"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                <KeyRound className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">Request student access</h2>
                <p className="text-sm text-slate-500 dark:text-gray-400">
                  Use a Buddy ID to request access. A parent or guardian must approve visibility before the learner appears.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-[0.8fr_1fr]">
              <select
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-adapt-navy outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
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
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm font-black tracking-wide text-adapt-navy outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
            </div>
            <button
              type="submit"
              disabled={!selectedClassId || !buddyIdInput.trim() || requestingStudent}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-4 py-3 text-sm font-black text-white transition hover:bg-adapt-purple disabled:opacity-60 dark:bg-adapt-cyan dark:text-gray-950"
            >
              {requestingStudent ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
              {requestingStudent ? 'Requesting...' : 'Request access'}
            </button>
          </form>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">Classes</h2>
              <p className="text-sm text-slate-500 dark:text-gray-400">{summary?.classes.length ?? 0} total</p>
            </div>
            {summary?.classes.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {summary.classes.map((teacherClass) => <ClassCard key={teacherClass.id} teacherClass={teacherClass} />)}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white/75 p-8 text-center text-slate-500 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-400">
                Create your first class to start linking learners.
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">Student requests</h2>
            {selectedClassRequests.length ? (
              selectedClassRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  busy={busyRequestId === request.id}
                  onApprove={(requestId) => void handleApprove(requestId)}
                  onDecline={(requestId) => void handleDecline(requestId)}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/75 p-5 text-sm text-slate-500 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-400">
                No pending student requests.
              </div>
            )}
          </aside>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
              <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">
                {selectedClass ? `${selectedClass.className} students` : 'Connected students'}
              </h2>
            </div>
            {selectedClassStudents.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {selectedClassStudents.map((student) => <StudentCard key={student.membershipId} student={student} />)}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white/75 p-8 text-center text-slate-500 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-400">
                Approved learners will appear here.
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden />
              <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">Live support signals</h2>
            </div>
            {summary?.liveSignals.length ? (
              summary.liveSignals.slice(0, 5).map((signal) => <SignalRow key={signal.id} signal={signal} />)
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/75 p-5 text-sm text-slate-500 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-400">
                Shared learner signals will appear here.
              </div>
            )}
          </aside>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
              <div>
                <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">Family messages</h2>
                <p className="text-sm text-slate-500 dark:text-gray-400">
                  Reply with one clear support step. Private journal text stays hidden unless a family shares it.
                </p>
              </div>
            </div>
            {selectedClassMessages.length ? (
              selectedClassMessages.slice(0, 4).map((message) => (
                <FamilyMessageCard
                  key={message.id}
                  message={message}
                  replyDraft={replyDrafts[message.id] ?? ''}
                  busy={busyMessageId === message.id}
                  onReplyDraftChange={(value) =>
                    setReplyDrafts((current) => ({ ...current, [message.id]: value }))
                  }
                  onReply={() => void handleReplyToMessage(message)}
                />
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white/75 p-8 text-center text-slate-500 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-400">
                Parent-teacher messages for connected learners will appear here.
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
              <div>
                <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">Meeting requests</h2>
                <p className="text-sm text-slate-500 dark:text-gray-400">
                  Turn family concerns into scheduled reviews and support-plan actions.
                </p>
              </div>
            </div>
            {selectedClassMeetings.length ? (
              selectedClassMeetings.slice(0, 4).map((meeting) => (
                <CareMeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  noteDraft={meetingNotes[meeting.id] ?? ''}
                  busy={busyMeetingId === meeting.id}
                  onNoteChange={(value) =>
                    setMeetingNotes((current) => ({ ...current, [meeting.id]: value }))
                  }
                  onStatusUpdate={(status) => void handleMeetingStatusUpdate(meeting, status)}
                />
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white/75 p-8 text-center text-slate-500 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-400">
                Meeting requests from families will appear here.
              </div>
            )}
          </aside>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { title: 'Assignments', detail: 'Create supported class tasks and let learners mark progress from their dashboard.', icon: BookOpenCheck },
            { title: 'Messages', detail: 'Family threads now show on the teacher dashboard with reply support and talking points.', icon: MessageSquare },
            { title: 'Reports', detail: 'Next phase: weekly class support reports and printable accommodations.', icon: Layers3 },
          ].map(({ title, detail, icon: Icon }) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
              <Icon className="h-6 w-6 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
              <h3 className="mt-3 font-extrabold text-adapt-navy dark:text-gray-100">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-gray-400">{detail}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
};

export default TeacherDashboard;
