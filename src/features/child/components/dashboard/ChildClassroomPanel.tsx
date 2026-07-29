import React, { useCallback, useEffect, useState } from 'react';
import { BookOpenCheck, GraduationCap, Loader2, RefreshCw, School } from 'lucide-react';
import {
  ChildClassroomService,
  type ChildClassroom,
} from 'features/child/services/childClassroomService';

interface ChildClassroomPanelProps {
  childId: string;
}

const formatJoinedDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Recently joined';
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

const ChildClassroomPanel: React.FC<ChildClassroomPanelProps> = ({ childId }) => {
  const [classrooms, setClassrooms] = useState<ChildClassroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadClassrooms = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const data = await ChildClassroomService.getClassrooms(childId);
      setClassrooms(data);
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

  if (!classrooms.length && !error) return null;

  return (
    <section className="rounded-3xl border border-adapt-indigo/15 bg-white/90 p-5 shadow-sm dark:border-adapt-cyan/20 dark:bg-gray-900/80">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
            <School className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">My classroom</h2>
            <p className="text-sm text-slate-500 dark:text-gray-400">Classes your teacher has connected to you.</p>
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
        {classrooms.map((classroom) => (
          <article
            key={classroom.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold text-adapt-navy dark:text-gray-100">
                  {classroom.className}
                </h3>
                <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-gray-400">
                  {classroom.schoolName || 'School classroom'}
                </p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-adapt-indigo shadow-sm dark:bg-gray-900 dark:text-adapt-cyan">
                Joined {formatJoinedDate(classroom.joinedAt)}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
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
              {classroom.classCode && (
                <span className="rounded-full bg-adapt-indigo/10 px-3 py-1 font-mono text-xs font-black text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                  {classroom.classCode}
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default ChildClassroomPanel;
