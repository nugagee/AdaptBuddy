import React, { useCallback, useEffect, useState } from 'react';
import { Clipboard, Loader2, Plus, RefreshCw, School, Users } from 'lucide-react';
import TeacherHubNav from 'features/teacher/components/TeacherHubNav';
import { useAuth } from 'hooks/useAuth';
import {
  TeacherDashboardService,
  type TeacherClass,
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

const ClassTile: React.FC<{ teacherClass: TeacherClass }> = ({ teacherClass }) => (
  <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-adapt-indigo dark:text-adapt-cyan">
          {teacherClass.yearGroup || 'Class'}
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-adapt-navy dark:text-gray-100">{teacherClass.className}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
          {teacherClass.subject} {teacherClass.schoolName ? `• ${teacherClass.schoolName}` : ''}
        </p>
      </div>
      <span className="rounded-2xl bg-adapt-indigo/10 px-3 py-2 font-mono text-sm font-black text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
        {teacherClass.classCode}
      </span>
    </div>
    <div className="mt-5 grid grid-cols-3 gap-2 text-center">
      <div className="rounded-2xl bg-slate-50 p-3 dark:bg-gray-950">
        <p className="font-black text-adapt-navy dark:text-gray-100">{teacherClass.studentCount}</p>
        <p className="text-xs text-slate-500 dark:text-gray-400">Students</p>
      </div>
      <div className="rounded-2xl bg-amber-50 p-3 dark:bg-amber-950/20">
        <p className="font-black text-amber-700 dark:text-amber-100">{teacherClass.pendingRequests}</p>
        <p className="text-xs text-amber-700/70 dark:text-amber-100/70">Requests</p>
      </div>
      <div className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/20">
        <p className="font-black text-emerald-700 dark:text-emerald-100">{teacherClass.assignmentsDue}</p>
        <p className="text-xs text-emerald-700/70 dark:text-emerald-100/70">Due</p>
      </div>
    </div>
    <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm leading-6 text-slate-500 dark:bg-gray-950 dark:text-gray-400">
      Share the class code when children join themselves. Use Buddy ID for a teacher-initiated request.
    </p>
  </article>
);

const Classes: React.FC = () => {
  const { isGuest } = useAuth();
  const [summary, setSummary] = useState<TeacherDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    className: '',
    schoolName: '',
    subject: '',
    yearGroup: '',
  });

  const loadClasses = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const data = await TeacherDashboardService.getDashboardSummary();
      setSummary(data);
    } catch (loadError) {
      console.error('Error loading teacher classes:', loadError);
      setError(getErrorMessage(loadError, 'Could not load classes.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadClasses();
  }, [loadClasses]);

  const handleCreateClass = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.className.trim() || creating) return;
    setCreating(true);
    setError(null);
    setActionStatus(null);

    try {
      if (isGuest) {
        setActionStatus('Guest demo: sign in with a teacher account to save new classes.');
        return;
      }
      const teacherClass = await TeacherDashboardService.createClass(form);
      setActionStatus(`${teacherClass.className} created with class code ${teacherClass.classCode}.`);
      setForm({ className: '', schoolName: '', subject: '', yearGroup: '' });
      await loadClasses('refresh');
    } catch (createError) {
      console.error('Error creating class:', createError);
      setError(getErrorMessage(createError, 'Could not create class.'));
    } finally {
      setCreating(false);
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
                Classes
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-adapt-navy dark:text-gray-100">
                Classroom setup
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-gray-400">
                Create classes, share class codes, and use Buddy IDs to request learner access.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadClasses('refresh')}
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

        <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <form
            onSubmit={handleCreateClass}
            className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/80"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                <Plus className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">Create class</h2>
                <p className="text-sm text-slate-500 dark:text-gray-400">A unique class code is generated automatically.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <input
                value={form.className}
                onChange={(event) => setForm((current) => ({ ...current, className: event.target.value }))}
                placeholder="Class name"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
              <input
                value={form.schoolName}
                onChange={(event) => setForm((current) => ({ ...current, schoolName: event.target.value }))}
                placeholder="School name"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={form.subject}
                  onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                  placeholder="Subject"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                />
                <input
                  value={form.yearGroup}
                  onChange={(event) => setForm((current) => ({ ...current, yearGroup: event.target.value }))}
                  placeholder="Year group"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={!form.className.trim() || creating}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-4 py-3 text-sm font-black text-white transition hover:bg-adapt-purple disabled:opacity-60 dark:bg-adapt-cyan dark:text-gray-950"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <School className="h-4 w-4" aria-hidden />}
              {creating ? 'Creating...' : 'Create class'}
            </button>
          </form>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Clipboard className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
              <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">Your classes</h2>
            </div>
            {summary?.classes.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {summary.classes.map((teacherClass) => <ClassTile key={teacherClass.id} teacherClass={teacherClass} />)}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white/75 p-8 text-center text-slate-500 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-400">
                <Users className="mx-auto mb-3 h-8 w-8 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
                Create a class to invite learners.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Classes;
