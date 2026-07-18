import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck,
  CalendarClock,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import TeacherHubNav from 'features/teacher/components/TeacherHubNav';
import { useAuth } from 'hooks/useAuth';
import {
  TeacherDashboardService,
  type TeacherCareMeeting,
  type TeacherDashboardSummary,
  type TeacherFamilyMessage,
  type TeacherMeetingStatus,
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
  return days === 1 ? 'Yesterday' : `${days} days ago`;
};

const urgencyStyles: Record<TeacherFamilyMessage['urgency'], string> = {
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

const supportUrgencyFromText = (value: string): TeacherFamilyMessage['urgency'] => {
  if (/urgent|unsafe|risk|safeguard|crisis/i.test(value)) return 'urgent';
  if (/worried|anxious|overwhelmed|support|help|sensory|noise/i.test(value)) return 'support';
  return 'normal';
};

const MetricCard: React.FC<{
  label: string;
  value: string | number;
  detail: string;
  icon: typeof MessageSquare;
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

const Messages: React.FC = () => {
  const { isGuest } = useAuth();
  const [summary, setSummary] = useState<TeacherDashboardSummary | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [meetingNotes, setMeetingNotes] = useState<Record<string, string>>({});
  const [busyMessageId, setBusyMessageId] = useState<string | null>(null);
  const [busyMeetingId, setBusyMeetingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const loadMessages = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const data = await TeacherDashboardService.getDashboardSummary();
      setSummary(data);
    } catch (loadError) {
      console.error('Error loading teacher messages:', loadError);
      setError(getErrorMessage(loadError, 'Could not load teacher messages.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const selectedClass = useMemo(
    () => summary?.classes.find((teacherClass) => teacherClass.id === selectedClassId) ?? null,
    [selectedClassId, summary?.classes],
  );

  const selectedClassChildIds = useMemo(() => {
    if (!selectedClassId) return null;
    return new Set(
      summary?.students
        .filter((student) => student.classId === selectedClassId)
        .map((student) => student.childId) ?? [],
    );
  }, [selectedClassId, summary?.students]);

  const messages = useMemo(
    () =>
      selectedClassChildIds
        ? summary?.familyMessages.filter((message) => selectedClassChildIds.has(message.childId)) ?? []
        : summary?.familyMessages ?? [],
    [selectedClassChildIds, summary?.familyMessages],
  );

  const meetings = useMemo(
    () =>
      selectedClassChildIds
        ? summary?.careMeetings.filter((meeting) => selectedClassChildIds.has(meeting.childId)) ?? []
        : summary?.careMeetings ?? [],
    [selectedClassChildIds, summary?.careMeetings],
  );

  const unreadMessages = messages.filter((message) => !message.isFromTeacher && !message.readAt).length;
  const supportMessages = messages.filter((message) => message.urgency !== 'normal').length;
  const requestedMeetings = meetings.filter((meeting) => meeting.status === 'requested').length;
  const urgentItems =
    messages.filter((message) => message.urgency === 'urgent').length +
    meetings.filter((meeting) => meeting.urgency === 'urgent' && meeting.status !== 'completed').length;

  const handleReply = async (message: TeacherFamilyMessage) => {
    const draft = replyDrafts[message.id]?.trim() ?? '';
    if (!draft || busyMessageId) return;
    setBusyMessageId(message.id);
    setActionStatus(null);
    setError(null);

    try {
      if (isGuest) {
        setActionStatus('Guest demo: replies save after signing in as a teacher.');
      } else {
        await TeacherDashboardService.sendFamilyMessage(
          message.childId,
          draft,
          message.senderId,
          supportUrgencyFromText(draft),
        );
        setReplyDrafts((current) => ({ ...current, [message.id]: '' }));
        setActionStatus('Reply sent to the family thread.');
      }
      await loadMessages('refresh');
    } catch (replyError) {
      console.error('Error sending family reply:', replyError);
      setError(getErrorMessage(replyError, 'Could not send reply.'));
    } finally {
      setBusyMessageId(null);
    }
  };

  const handleMeetingStatusUpdate = async (meeting: TeacherCareMeeting, status: TeacherMeetingStatus) => {
    if (busyMeetingId) return;
    setBusyMeetingId(meeting.id);
    setActionStatus(null);
    setError(null);

    try {
      if (isGuest) {
        setActionStatus('Guest demo: meeting updates save after signing in as a teacher.');
      } else {
        await TeacherDashboardService.updateCareMeetingStatus(meeting.id, status, meetingNotes[meeting.id]);
        setMeetingNotes((current) => ({ ...current, [meeting.id]: '' }));
        setActionStatus(`Meeting marked ${status}.`);
      }
      await loadMessages('refresh');
    } catch (meetingError) {
      console.error('Error updating meeting:', meetingError);
      setError(getErrorMessage(meetingError, 'Could not update meeting.'));
    } finally {
      setBusyMeetingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <TeacherHubNav />
        <div className="flex items-center justify-center px-4 py-16">
          <Loader2 className="h-10 w-10 animate-spin text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <TeacherHubNav />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        <header className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card dark:border-gray-800 dark:bg-gray-900/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-adapt-indigo dark:text-adapt-cyan">
                Messages
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-adapt-navy dark:text-gray-100">
                Family communication centre
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-gray-400">
                Coordinate with families, turn concerns into meeting actions, and keep private child journal content
                protected unless a family explicitly shares it.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <select
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-adapt-navy outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                aria-label="Filter messages by class"
              >
                <option value="">All classes</option>
                {summary?.classes.map((teacherClass) => (
                  <option key={teacherClass.id} value={teacherClass.id}>
                    {teacherClass.className}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => loadMessages('refresh')}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-adapt-indigo/40 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
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

        {actionStatus && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            {actionStatus}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Family communication metrics">
          <MetricCard
            label="Unread"
            value={unreadMessages}
            detail="Family messages needing reply"
            icon={MessageSquare}
            tone="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-100"
          />
          <MetricCard
            label="Support"
            value={supportMessages}
            detail="Threads marked support or urgent"
            icon={ShieldCheck}
            tone="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
          />
          <MetricCard
            label="Meetings"
            value={requestedMeetings}
            detail="Requests waiting for action"
            icon={CalendarClock}
            tone="bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-100"
          />
          <MetricCard
            label="Urgent"
            value={urgentItems}
            detail="Priority follow-up items"
            icon={Users}
            tone="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-100"
          />
        </section>

        <section className="rounded-3xl border border-adapt-indigo/15 bg-white/85 p-5 shadow-soft dark:border-adapt-cyan/20 dark:bg-gray-900/80">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">Privacy boundary</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-gray-400">
                {selectedClass ? `${selectedClass.className}: ` : ''}
                Teachers can only see communication for learners with active parent-approved class membership.
                Journal text remains hidden unless the family chooses to share it.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
              <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">Family threads</h2>
            </div>

            {messages.length > 0 ? (
              messages.map((message) => (
                <article
                  key={message.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-adapt-indigo dark:text-adapt-cyan">
                        {message.isFromTeacher ? 'Teacher reply' : 'Family message'} · {message.childName}
                      </p>
                      <p className="mt-3 text-sm font-semibold leading-6 text-slate-700 dark:text-gray-300">
                        {message.body}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${urgencyStyles[message.urgency]}`}>
                        {message.urgency}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">
                        {formatRelativeTime(message.createdAt)}
                      </span>
                    </div>
                  </div>

                  {message.aiSummary && (
                    <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-600 dark:bg-gray-950 dark:text-gray-300">
                      {message.aiSummary}
                    </p>
                  )}

                  {message.aiTalkingPoints.length > 0 && (
                    <div className="mt-3 rounded-2xl bg-slate-50 p-3 dark:bg-gray-950">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        Suggested talking points
                      </p>
                      <ul className="mt-2 space-y-1 text-sm font-semibold text-slate-600 dark:text-gray-300">
                        {message.aiTalkingPoints.slice(0, 4).map((point) => (
                          <li key={point}>• {point}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!message.isFromTeacher && (
                    <div className="mt-4">
                      <textarea
                        value={replyDrafts[message.id] ?? ''}
                        onChange={(event) =>
                          setReplyDrafts((current) => ({ ...current, [message.id]: event.target.value }))
                        }
                        rows={3}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                        placeholder="Reply with one calm, practical support step..."
                      />
                      <button
                        type="button"
                        onClick={() => void handleReply(message)}
                        disabled={!replyDrafts[message.id]?.trim() || busyMessageId === message.id}
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-4 py-3 text-sm font-black text-white transition hover:bg-adapt-purple disabled:opacity-60 dark:bg-adapt-cyan dark:text-gray-950"
                      >
                        {busyMessageId === message.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <Send className="h-4 w-4" aria-hidden />
                        )}
                        {busyMessageId === message.id ? 'Sending...' : 'Send reply'}
                      </button>
                    </div>
                  )}
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white/75 p-8 text-center text-slate-500 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-400">
                No family messages yet.
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
              <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">Meeting requests</h2>
            </div>

            {meetings.length > 0 ? (
              meetings.map((meeting) => (
                <article
                  key={meeting.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-adapt-indigo dark:text-adapt-cyan">
                        {meeting.meetingType.replace(/_/g, ' ')} · {meeting.childName}
                      </p>
                      <h3 className="mt-2 text-lg font-extrabold text-adapt-navy dark:text-gray-100">
                        {meeting.urgency === 'urgent' ? 'Urgent support review' : 'Support-plan conversation'}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {formatRelativeTime(meeting.createdAt)}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${meetingStatusStyles[meeting.status]}`}>
                      {meeting.status}
                    </span>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-gray-950">
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
                    value={meetingNotes[meeting.id] ?? ''}
                    onChange={(event) =>
                      setMeetingNotes((current) => ({ ...current, [meeting.id]: event.target.value }))
                    }
                    rows={2}
                    className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                    placeholder={meeting.notes || 'Add teacher note before updating...'}
                  />

                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => void handleMeetingStatusUpdate(meeting, 'scheduled')}
                      disabled={
                        busyMeetingId === meeting.id ||
                        meeting.status === 'scheduled' ||
                        meeting.status === 'completed' ||
                        meeting.status === 'cancelled'
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-100 px-3 py-2 text-xs font-black text-sky-700 transition hover:bg-sky-200 disabled:opacity-60 dark:bg-sky-950/40 dark:text-sky-100"
                    >
                      <CalendarClock className="h-4 w-4" aria-hidden />
                      Schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleMeetingStatusUpdate(meeting, 'completed')}
                      disabled={
                        busyMeetingId === meeting.id ||
                        meeting.status === 'completed' ||
                        meeting.status === 'cancelled'
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-60 dark:bg-emerald-950/40 dark:text-emerald-100"
                    >
                      {busyMeetingId === meeting.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <CalendarCheck className="h-4 w-4" aria-hidden />
                      )}
                      Complete
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleMeetingStatusUpdate(meeting, 'cancelled')}
                      disabled={
                        busyMeetingId === meeting.id ||
                        meeting.status === 'completed' ||
                        meeting.status === 'cancelled'
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-200 disabled:opacity-60 dark:bg-gray-800 dark:text-gray-200"
                    >
                      <XCircle className="h-4 w-4" aria-hidden />
                      Cancel
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white/75 p-8 text-center text-slate-500 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-400">
                No meeting requests yet.
              </div>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
};

export default Messages;
