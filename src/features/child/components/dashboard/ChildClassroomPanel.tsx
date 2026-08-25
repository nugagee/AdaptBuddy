import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpenCheck,
  GraduationCap,
  Loader2,
  Radio,
  RefreshCw,
  School,
  Video,
} from 'lucide-react';
import {
  ChildClassroomService,
  type ChildClassroom,
} from 'features/child/services/childClassroomService';
import { ClassLiveSessionService } from 'features/classroom/services/classLiveSessionService';
import type { ChildLiveClassroom } from 'features/classroom/types/classLiveSession.types';
import { ROUTES } from 'constants/routes';

interface ChildClassroomPanelProps {
  childId: string;
}

const LIVE_POLL_MS = 5000;

const statusLabels: Record<ChildClassroom['status'], string> = {
  active: 'Connected',
  pending: 'Pending',
  pending_parent: 'Parent approval',
  pending_teacher: 'Teacher approval',
};

const statusStyles: Record<ChildClassroom['status'], string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
  pending_parent: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
  pending_teacher: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-200',
};

const formatConnectedDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Recently added';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(date);
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Could not load your classroom yet.';
};

const mergeClassrooms = (
  classrooms: ChildClassroom[],
  liveClassrooms: ChildLiveClassroom[],
): Array<ChildClassroom & { live?: ChildLiveClassroom }> => {
  const liveByClassId = new Map(liveClassrooms.map((live) => [live.classId, live]));

  const merged = classrooms.map((classroom) => ({
    ...classroom,
    live: liveByClassId.get(classroom.id),
  }));

  liveClassrooms.forEach((live) => {
    if (!merged.some((item) => item.id === live.classId)) {
      merged.push({
        id: live.classId,
        className: live.className,
        schoolName: live.schoolName,
        subject: live.subject,
        yearGroup: live.yearGroup,
        classCode: live.classCode,
        status: 'active',
        teacherName: live.teacherName,
        connectedAt: live.launchedAt ?? new Date().toISOString(),
        live,
      });
    }
  });

  return merged;
};

const ChildClassroomPanel: React.FC<ChildClassroomPanelProps> = ({ childId }) => {
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState<ChildClassroom[]>([]);
  const [liveClassrooms, setLiveClassrooms] = useState<ChildLiveClassroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClassrooms = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const [classroomData, liveData] = await Promise.all([
        ChildClassroomService.getClassrooms(childId),
        ClassLiveSessionService.listChildLiveClassrooms(childId),
      ]);
      setClassrooms(classroomData);
      setLiveClassrooms(liveData);
    } catch (loadError) {
      console.error('Error loading child classrooms:', loadError);
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [childId]);

  useEffect(() => {
    void loadClassrooms();
  }, [loadClassrooms]);

  useEffect(() => {
    const timer = window.setInterval(() => void loadClassrooms('refresh'), LIVE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadClassrooms]);

  const merged = mergeClassrooms(classrooms, liveClassrooms);
  const hasLiveSession = merged.some((item) => item.live?.isLive);

  if (loading) {
    return (
      <section className="rounded-3xl border border-adapt-indigo/15 bg-white/80 p-5 shadow-sm dark:border-adapt-cyan/20 dark:bg-gray-900/80">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-500 dark:text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
          Checking your classroom...
        </div>
      </section>
    );
  }

  if (!merged.length && !error) return null;

  return (
    <section className="rounded-3xl border border-adapt-indigo/15 bg-white/90 p-5 shadow-sm transition-all duration-500 dark:border-adapt-cyan/20 dark:bg-gray-900/80">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
            <School className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">My classroom</h2>
            <p className="text-sm text-slate-500 dark:text-gray-400">
              {hasLiveSession
                ? 'Your teacher has opened a live classroom — you can join when ready.'
                : 'Classes connected to you or waiting for approval.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => loadClassrooms('refresh')}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          {error}
        </div>
      )}

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {merged.map((classroom) => {
          const isLive = Boolean(classroom.live?.isLive && classroom.live.sessionId);
          const canJoin = isLive && classroom.status === 'active';

          return (
            <article
              key={classroom.id}
              className={`rounded-2xl border p-4 transition-all duration-500 ${
                isLive
                  ? 'border-red-200 bg-gradient-to-br from-red-50/80 via-white to-orange-50/60 shadow-md shadow-red-100/50 dark:border-red-900/40 dark:from-red-950/20 dark:via-gray-950 dark:to-orange-950/20'
                  : 'border-slate-200 bg-slate-50 dark:border-gray-800 dark:bg-gray-950'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-adapt-navy dark:text-gray-100">
                    {classroom.className}
                  </h3>
                  <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-gray-400">
                    {classroom.schoolName || 'School classroom'}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400 dark:text-gray-500">
                    {classroom.teacherName}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {isLive ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-red-500/30 animate-pulse">
                      <Radio className="h-3 w-3" aria-hidden />
                      Live
                    </span>
                  ) : (
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusStyles[classroom.status]}`}>
                      {statusLabels[classroom.status]}
                    </span>
                  )}
                </div>
              </div>

              {isLive && classroom.live?.focusTitle && (
                <p className="mt-3 rounded-xl border border-red-100 bg-white/80 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-red-900/30 dark:bg-gray-900/60 dark:text-gray-300">
                  {classroom.live.focusTitle}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm dark:bg-gray-900 dark:text-gray-300">
                  {classroom.status === 'active' ? 'Joined' : 'Requested'}{' '}
                  {formatConnectedDate(classroom.connectedAt)}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm dark:bg-gray-900 dark:text-gray-300">
                  <BookOpenCheck className="h-3.5 w-3.5" aria-hidden />
                  {classroom.subject}
                </span>
                {classroom.yearGroup && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm dark:bg-gray-900 dark:text-gray-300">
                    <GraduationCap className="h-3.5 w-3.5" aria-hidden />
                    {classroom.yearGroup}
                  </span>
                )}
                {isLive && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700 dark:bg-red-950/40 dark:text-red-200">
                    {classroom.live?.participantCount ?? 0} in room
                  </span>
                )}
              </div>

              {canJoin && classroom.live?.sessionId && (
                <button
                  type="button"
                  onClick={() =>
                    navigate(ROUTES.CHILD_CLASSROOM_LIVE.replace(':sessionId', classroom.live!.sessionId!))
                  }
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-adapt-indigo px-4 py-3.5 text-sm font-black text-white shadow-lg shadow-adapt-indigo/25 transition-all duration-300 hover:scale-[1.02] hover:bg-adapt-purple dark:bg-adapt-cyan dark:text-gray-950 dark:shadow-adapt-cyan/20"
                >
                  <Video className="h-5 w-5" aria-hidden />
                  Join classroom
                </button>
              )}

              {!isLive && classroom.status === 'active' && (
                <p className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-3 text-sm font-semibold text-slate-500 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-400">
                  Your teacher will open the live classroom when it is time to learn together.
                </p>
              )}

              {classroom.status !== 'active' && (
                <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
                  This class will unlock teacher tasks after the approval steps are complete.
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default ChildClassroomPanel;
