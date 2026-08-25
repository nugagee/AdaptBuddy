import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  Clock3,
  Download,
  History,
  Loader2,
  RefreshCw,
  School,
  ShieldCheck,
  Users,
} from 'lucide-react';
import TeacherHubNav from 'features/teacher/components/TeacherHubNav';
import { ClassLiveSessionService } from 'features/classroom/services/classLiveSessionService';
import {
  ACTIVITY_MODE_LABELS,
  MOOD_PULSE_OPTIONS,
  type TeacherClassSessionHistoryItem,
} from 'features/classroom/types/classLiveSession.types';
import { useAuth } from 'hooks/useAuth';

const formatDuration = (totalSeconds: number): string => {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes} min`;
  return `${seconds}s`;
};

const formatDateLabel = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const moodLabel = (mood: string | null): string => {
  if (!mood) return '—';
  const option = MOOD_PULSE_OPTIONS.find((item) => item.id === mood);
  return option ? `${option.emoji} ${option.label}` : mood;
};

type CsvCell = string | number | boolean | null | undefined;

const escapeCsvValue = (value: CsvCell): string => {
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

const ActivityLog: React.FC = () => {
  const { profile, isGuest } = useAuth();
  const teacherId = profile?.id ?? (isGuest ? 'guest-teacher' : undefined);

  const [history, setHistory] = useState<TeacherClassSessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await ClassLiveSessionService.listTeacherSessionHistory(teacherId);
      setHistory(rows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load classroom history.');
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const summary = useMemo(() => {
    const totalSeconds = history.reduce((sum, item) => sum + item.durationSeconds, 0);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = history.filter(
      (item) => new Date(item.endedAt || item.launchedAt).getTime() >= weekAgo,
    ).length;
    const learnerSessions = history.reduce((sum, item) => sum + item.participantCount, 0);
    const removed = history.reduce((sum, item) => sum + item.removedCount, 0);
    return { sessionCount: history.length, totalSeconds, thisWeek, learnerSessions, removed };
  }, [history]);

  const exportAuditCsv = () => {
    const header = [
      'session_id',
      'class_name',
      'subject',
      'year_group',
      'class_code',
      'focus_title',
      'activity_mode',
      'launched_at',
      'ended_at',
      'duration_seconds',
      'participant_count',
      'removed_count',
      'restrict_learner_video',
      'restrict_learner_mic',
      'require_screen_share_approval',
      'allow_learner_hand_raise',
      'child_id',
      'child_name',
      'participant_status',
      'joined_at',
      'left_at',
      'participant_duration_seconds',
      'mood_pulse',
    ];

    const rows: CsvCell[][] = history.flatMap((session) => {
      if (session.participants.length === 0) {
        return [
          [
            session.sessionId,
            session.className,
            session.subject,
            session.yearGroup,
            session.classCode,
            session.focusTitle,
            session.activityMode,
            session.launchedAt,
            session.endedAt,
            session.durationSeconds,
            session.participantCount,
            session.removedCount,
            session.restrictLearnerVideo,
            session.restrictLearnerMic,
            session.requireScreenShareApproval,
            session.allowLearnerHandRaise,
            '',
            '',
            '',
            '',
            '',
            '',
            '',
          ],
        ];
      }

      return session.participants.map((participant) => [
        session.sessionId,
        session.className,
        session.subject,
        session.yearGroup,
        session.classCode,
        session.focusTitle,
        session.activityMode,
        session.launchedAt,
        session.endedAt,
        session.durationSeconds,
        session.participantCount,
        session.removedCount,
        session.restrictLearnerVideo,
        session.restrictLearnerMic,
        session.requireScreenShareApproval,
        session.allowLearnerHandRaise,
        participant.childId,
        participant.childName,
        participant.status,
        participant.joinedAt,
        participant.leftAt,
        participant.durationSeconds,
        participant.moodPulse,
      ]);
    });

    const csv = [header, ...rows]
      .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
      .join('\n');
    downloadTextFile(
      `classroom-activity-audit-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      'text/csv;charset=utf-8',
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <TeacherHubNav />

      <main className="mx-auto max-w-7xl space-y-6 p-4 pb-16 sm:p-6">
        <header className="rounded-3xl border border-adapt-indigo/15 bg-white/90 p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900/85">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                <History className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-adapt-indigo dark:text-adapt-cyan">
                  Classroom audit
                </p>
                <h1 className="mt-1 text-2xl font-extrabold text-adapt-navy dark:text-gray-100 sm:text-3xl">
                  Activity log
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-gray-400">
                  Review past live classrooms, attendance, session settings, and learner outcomes for audit
                  records.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void loadHistory()}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
                Refresh
              </button>
              <button
                type="button"
                onClick={exportAuditCsv}
                disabled={history.length === 0}
                className="inline-flex items-center gap-2 rounded-2xl bg-adapt-navy px-4 py-2.5 text-sm font-black text-white disabled:opacity-60 dark:bg-adapt-cyan dark:text-gray-950"
              >
                <Download className="h-4 w-4" aria-hidden />
                Export CSV
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Past sessions', value: String(summary.sessionCount), icon: School },
            { label: 'Teaching time', value: formatDuration(summary.totalSeconds), icon: Clock3 },
            { label: 'This week', value: String(summary.thisWeek), icon: History },
            { label: 'Learner joins', value: String(summary.learnerSessions), icon: Users },
            { label: 'Removals', value: String(summary.removed), icon: ShieldCheck },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-soft dark:border-gray-800 dark:bg-gray-900/85"
              >
                <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400">
                  <Icon className="h-4 w-4" aria-hidden />
                  <p className="text-xs font-black uppercase tracking-wider">{card.label}</p>
                </div>
                <p className="mt-2 text-2xl font-extrabold text-adapt-navy dark:text-gray-100">
                  {card.value}
                </p>
              </div>
            );
          })}
        </section>

        <section className="rounded-3xl border border-adapt-indigo/15 bg-white/90 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/85">
          <h2 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">Past classrooms</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
            Expand a session for attendance, settings, and learner detail.
          </p>

          {loading && (
            <div className="mt-8 flex items-center justify-center gap-3 py-10 text-slate-500 dark:text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              <p className="text-sm font-semibold">Loading classroom history…</p>
            </div>
          )}

          {!loading && error && (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </p>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center dark:border-gray-700 dark:bg-gray-950">
              <History className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
              <p className="mt-3 font-bold text-adapt-navy dark:text-gray-100">No past sessions yet</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                Ended live classrooms will appear here for audit review.
              </p>
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <ul className="mt-5 space-y-3">
              {history.map((session) => {
                const isOpen = expandedId === session.sessionId;
                return (
                  <li
                    key={session.sessionId}
                    className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/80 dark:border-gray-800 dark:bg-gray-950/70"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : session.sessionId)}
                      className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-white/70 dark:hover:bg-gray-900/80"
                      aria-expanded={isOpen}
                    >
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                        <School className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-extrabold text-adapt-navy dark:text-gray-100">
                            {session.className}
                          </h3>
                          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-700 dark:bg-gray-800 dark:text-gray-300">
                            Ended
                          </span>
                          {session.removedCount > 0 && (
                            <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
                              {session.removedCount} removed
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-gray-300">
                          {session.focusTitle}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 dark:text-gray-400">
                          <span>{formatDateLabel(session.endedAt || session.launchedAt)}</span>
                          <span>{formatDuration(session.durationSeconds)}</span>
                          <span>{session.participantCount} learners</span>
                          <span>{session.subject}</span>
                          <span>{ACTIVITY_MODE_LABELS[session.activityMode]}</span>
                        </div>
                      </div>
                      <ChevronDown
                        className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        aria-hidden
                      />
                    </button>

                    {isOpen && (
                      <div className="space-y-4 border-t border-slate-100 px-4 py-4 dark:border-gray-800">
                        <p className="text-sm leading-6 text-slate-600 dark:text-gray-300">
                          {session.focusMessage || 'No focus message recorded.'}
                        </p>

                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-2xl bg-white px-3 py-3 dark:bg-gray-900">
                            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                              Launched
                            </p>
                            <p className="mt-1 text-sm font-bold text-adapt-navy dark:text-gray-100">
                              {formatDateTime(session.launchedAt)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white px-3 py-3 dark:bg-gray-900">
                            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                              Ended
                            </p>
                            <p className="mt-1 text-sm font-bold text-adapt-navy dark:text-gray-100">
                              {formatDateTime(session.endedAt)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white px-3 py-3 dark:bg-gray-900">
                            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                              Class code
                            </p>
                            <p className="mt-1 text-sm font-bold text-adapt-navy dark:text-gray-100">
                              {session.classCode || '—'}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white px-3 py-3 dark:bg-gray-900">
                            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                              Session ID
                            </p>
                            <p className="mt-1 break-all text-xs font-bold text-adapt-navy dark:text-gray-100">
                              {session.sessionId}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-100 bg-white px-3 py-3 dark:border-gray-800 dark:bg-gray-900">
                          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                            Classroom settings used
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-gray-800">
                              Camera {session.restrictLearnerVideo ? 'restricted' : 'allowed'}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-gray-800">
                              Mic {session.restrictLearnerMic ? 'restricted' : 'allowed'}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-gray-800">
                              Screen share{' '}
                              {session.requireScreenShareApproval ? 'approval required' : 'open'}
                            </span>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-gray-800">
                              Hand raise {session.allowLearnerHandRaise ? 'on' : 'off'}
                            </span>
                          </div>
                        </div>

                        {(session.nowStep || session.nextStep) && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                              <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                Final now step
                              </p>
                              <p className="mt-1 text-sm font-bold text-adapt-navy dark:text-gray-100">
                                {session.nowStep || '—'}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-sky-100 bg-sky-50/80 px-3 py-3 dark:border-sky-900/40 dark:bg-sky-950/20">
                              <p className="text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">
                                Final next step
                              </p>
                              <p className="mt-1 text-sm font-bold text-adapt-navy dark:text-gray-100">
                                {session.nextStep || '—'}
                              </p>
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                            Attendance ({session.participants.length})
                          </p>
                          {session.participants.length === 0 ? (
                            <p className="mt-2 text-sm text-slate-500 dark:text-gray-400">
                              No learners joined this session.
                            </p>
                          ) : (
                            <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-100 dark:border-gray-800">
                              <table className="min-w-full text-left text-sm">
                                <thead className="bg-slate-100/80 text-xs font-black uppercase tracking-wider text-slate-500 dark:bg-gray-900 dark:text-gray-400">
                                  <tr>
                                    <th className="px-3 py-2">Learner</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2">Joined</th>
                                    <th className="px-3 py-2">Left</th>
                                    <th className="px-3 py-2">Time</th>
                                    <th className="px-3 py-2">Mood</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {session.participants.map((participant) => (
                                    <tr
                                      key={`${session.sessionId}-${participant.childId}`}
                                      className="border-t border-slate-100 bg-white dark:border-gray-800 dark:bg-gray-950"
                                    >
                                      <td className="px-3 py-2 font-bold text-adapt-navy dark:text-gray-100">
                                        {participant.childName}
                                      </td>
                                      <td className="px-3 py-2 capitalize text-slate-600 dark:text-gray-300">
                                        {participant.status}
                                      </td>
                                      <td className="px-3 py-2 text-slate-600 dark:text-gray-300">
                                        {formatDateTime(participant.joinedAt)}
                                      </td>
                                      <td className="px-3 py-2 text-slate-600 dark:text-gray-300">
                                        {formatDateTime(participant.leftAt)}
                                      </td>
                                      <td className="px-3 py-2 font-semibold text-slate-700 dark:text-gray-200">
                                        {formatDuration(participant.durationSeconds)}
                                      </td>
                                      <td className="px-3 py-2 text-slate-600 dark:text-gray-300">
                                        {moodLabel(participant.moodPulse)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        <p className="text-xs font-semibold text-slate-400 dark:text-gray-500">
                          {session.yearGroup} · {session.schoolName || 'School'}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};

export default ActivityLog;
