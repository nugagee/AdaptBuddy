import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  Clock3,
  History,
  Loader2,
  School,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import ChildDashboardNavbar from 'features/child/components/layout/ChildDashboardNavbar';
import { NEURO_ACTIVITIES } from 'features/child/data/neuroDashboardContent';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { ClassLiveSessionService } from 'features/classroom/services/classLiveSessionService';
import {
  ACTIVITY_MODE_LABELS,
  MOOD_PULSE_OPTIONS,
  type ChildClassSessionHistoryItem,
} from 'features/classroom/types/classLiveSession.types';
import { NEURO_OPTION_MAP } from 'constants/neuroOptions';
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

const formatTimeLabel = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

const moodLabel = (mood: string | null): { emoji: string; label: string } | null => {
  if (!mood) return null;
  const option = MOOD_PULSE_OPTIONS.find((item) => item.id === mood);
  return option ? { emoji: option.emoji, label: option.label } : { emoji: '·', label: mood };
};

const statusBadge = (status: ChildClassSessionHistoryItem['participantStatus']) => {
  if (status === 'removed') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200';
  }
  if (status === 'joined') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200';
  }
  return 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-300';
};

const ActivityLogPage: React.FC = () => {
  const { profile } = useAuth();
  const childId = profile?.id ?? 'guest-child';
  const completions = useChildProgressStore((state) => state.completions);

  const [history, setHistory] = useState<ChildClassSessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await ClassLiveSessionService.listChildSessionHistory(childId);
        if (!cancelled) setHistory(rows);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load activity history.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [childId]);

  const summary = useMemo(() => {
    const totalSeconds = history.reduce((sum, item) => sum + item.durationSeconds, 0);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = history.filter(
      (item) => new Date(item.endedAt || item.leftAt || item.joinedAt).getTime() >= weekAgo,
    ).length;
    const lastMood = history.find((item) => item.moodPulse)?.moodPulse ?? null;
    return {
      classCount: history.length,
      totalSeconds,
      thisWeek,
      lastMood: moodLabel(lastMood),
    };
  }, [history]);

  const practiceHistory = useMemo(
    () =>
      [...completions]
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
        .slice(0, 12),
    [completions],
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <ChildDashboardNavbar />

      <main className="mx-auto max-w-6xl space-y-6 p-4 pb-16 sm:p-6">
        <header className="animate-fade-in rounded-3xl border border-adapt-indigo/15 bg-white/90 p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900/85">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
              <History className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-adapt-indigo dark:text-adapt-cyan">
                Activity log
              </p>
              <h1 className="mt-1 text-2xl font-extrabold text-adapt-navy dark:text-gray-100 sm:text-3xl">
                Your past classes & practice
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-gray-400">
                Look back at the classrooms you joined, how long you stayed, and the focus of each session.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-soft dark:border-gray-800 dark:bg-gray-900/85">
            <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400">
              <School className="h-4 w-4" aria-hidden />
              <p className="text-xs font-black uppercase tracking-wider">Classes logged</p>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-adapt-navy dark:text-gray-100">
              {summary.classCount}
            </p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-soft dark:border-gray-800 dark:bg-gray-900/85">
            <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400">
              <Clock3 className="h-4 w-4" aria-hidden />
              <p className="text-xs font-black uppercase tracking-wider">Time in class</p>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-adapt-navy dark:text-gray-100">
              {formatDuration(summary.totalSeconds)}
            </p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-soft dark:border-gray-800 dark:bg-gray-900/85">
            <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400">
              <CalendarDays className="h-4 w-4" aria-hidden />
              <p className="text-xs font-black uppercase tracking-wider">This week</p>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-adapt-navy dark:text-gray-100">
              {summary.thisWeek}
            </p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/90 p-4 shadow-soft dark:border-gray-800 dark:bg-gray-900/85">
            <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400">
              <Sparkles className="h-4 w-4" aria-hidden />
              <p className="text-xs font-black uppercase tracking-wider">Last mood</p>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-adapt-navy dark:text-gray-100">
              {summary.lastMood ? `${summary.lastMood.emoji} ${summary.lastMood.label}` : '—'}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-adapt-indigo/15 bg-white/90 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/85">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
            <h2 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">Past classes</h2>
          </div>

          {loading && (
            <div className="mt-8 flex items-center justify-center gap-3 py-10 text-slate-500 dark:text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              <p className="text-sm font-semibold">Loading your classroom history…</p>
            </div>
          )}

          {!loading && error && (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </p>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center dark:border-gray-700 dark:bg-gray-950">
              <BookOpen className="mx-auto h-8 w-8 text-slate-400" aria-hidden />
              <p className="mt-3 font-bold text-adapt-navy dark:text-gray-100">No past classes yet</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                When you join a live classroom, it will show up here with time spent and class details.
              </p>
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <ul className="mt-5 space-y-3">
              {history.map((item) => {
                const mood = moodLabel(item.moodPulse);
                const isOpen = expandedId === item.sessionId;
                return (
                  <li
                    key={item.sessionId}
                    className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50/80 dark:border-gray-800 dark:bg-gray-950/70"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : item.sessionId)}
                      className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-white/70 dark:hover:bg-gray-900/80"
                      aria-expanded={isOpen}
                    >
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                        <School className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-base font-extrabold text-adapt-navy dark:text-gray-100">
                            {item.className}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${statusBadge(item.participantStatus)}`}
                          >
                            {item.participantStatus === 'removed'
                              ? 'Removed'
                              : item.sessionStatus === 'ended'
                                ? 'Completed'
                                : item.participantStatus}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-gray-300">
                          {item.focusTitle}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate-500 dark:text-gray-400">
                          <span>{formatDateLabel(item.endedAt || item.joinedAt)}</span>
                          <span>{formatDuration(item.durationSeconds)}</span>
                          <span>{item.subject}</span>
                          {mood && (
                            <span>
                              {mood.emoji} {mood.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronDown
                        className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        aria-hidden
                      />
                    </button>

                    {isOpen && (
                      <div className="space-y-3 border-t border-slate-100 px-4 py-4 dark:border-gray-800">
                        <p className="text-sm leading-6 text-slate-600 dark:text-gray-300">
                          {item.focusMessage || 'No focus message was saved for this class.'}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-2xl bg-white px-3 py-3 dark:bg-gray-900">
                            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                              Teacher
                            </p>
                            <p className="mt-1 text-sm font-bold text-adapt-navy dark:text-gray-100">
                              {item.teacherName}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white px-3 py-3 dark:bg-gray-900">
                            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                              Activity mode
                            </p>
                            <p className="mt-1 text-sm font-bold text-adapt-navy dark:text-gray-100">
                              {ACTIVITY_MODE_LABELS[item.activityMode]}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white px-3 py-3 dark:bg-gray-900">
                            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                              Joined
                            </p>
                            <p className="mt-1 text-sm font-bold text-adapt-navy dark:text-gray-100">
                              {formatTimeLabel(item.joinedAt)}
                            </p>
                          </div>
                          <div className="rounded-2xl bg-white px-3 py-3 dark:bg-gray-900">
                            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                              Left / ended
                            </p>
                            <p className="mt-1 text-sm font-bold text-adapt-navy dark:text-gray-100">
                              {formatTimeLabel(item.leftAt || item.endedAt)}
                            </p>
                          </div>
                        </div>
                        {(item.nowStep || item.nextStep) && (
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-3 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                              <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                                Now
                              </p>
                              <p className="mt-1 text-sm font-bold text-adapt-navy dark:text-gray-100">
                                {item.nowStep || '—'}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-sky-100 bg-sky-50/80 px-3 py-3 dark:border-sky-900/40 dark:bg-sky-950/20">
                              <p className="text-[11px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-300">
                                Next
                              </p>
                              <p className="mt-1 text-sm font-bold text-adapt-navy dark:text-gray-100">
                                {item.nextStep || '—'}
                              </p>
                            </div>
                          </div>
                        )}
                        <p className="text-xs font-semibold text-slate-400 dark:text-gray-500">
                          {item.yearGroup} · {item.classCode}
                          {item.schoolName ? ` · ${item.schoolName}` : ''}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-3xl border border-adapt-indigo/15 bg-white/90 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/85">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" aria-hidden />
            <h2 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">
              Practice activities
            </h2>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
            Neuro zone and focus activities you completed on AdaptBuddy.
          </p>

          {practiceHistory.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center dark:border-gray-700 dark:bg-gray-950">
              <p className="font-bold text-adapt-navy dark:text-gray-100">No practice logged yet</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                Finish an activity from your dashboard and it will appear here.
              </p>
            </div>
          ) : (
            <ul className="mt-5 space-y-2">
              {practiceHistory.map((item) => {
                const activity = NEURO_ACTIVITIES.find((entry) => entry.id === item.activityId);
                const zoneName =
                  NEURO_OPTION_MAP[item.neuroId]?.name?.replace(/^[^\s]+\s/, '') || item.neuroId;
                return (
                  <li
                    key={`${item.activityId}-${item.completedAt}`}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-gray-800 dark:bg-gray-950/70"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-adapt-navy dark:text-gray-100">
                        {activity?.title ?? item.activityId}
                      </p>
                      <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-gray-400">
                        {zoneName} · {formatDateLabel(item.completedAt)} · {item.durationMinutes} min
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                      +{item.starsEarned} ★
                    </span>
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

export default ActivityLogPage;
