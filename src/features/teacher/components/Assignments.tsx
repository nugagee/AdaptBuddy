import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RefreshCw,
  Save,
  SlidersHorizontal,
} from 'lucide-react';
import TeacherHubNav from 'features/teacher/components/TeacherHubNav';
import { useAuth } from 'hooks/useAuth';
import {
  TeacherDashboardService,
  type TeacherAssignment,
  type TeacherAssignmentType,
  type TeacherDashboardSummary,
} from 'features/teacher/services/teacherDashboardService';

const assignmentTypes: Array<{ id: TeacherAssignmentType; label: string }> = [
  { id: 'reading', label: 'Reading' },
  { id: 'maths', label: 'Maths' },
  { id: 'writing', label: 'Writing' },
  { id: 'calm_break', label: 'Calm break' },
  { id: 'visual_routine', label: 'Visual routine' },
  { id: 'social_story', label: 'Social story' },
  { id: 'task', label: 'General task' },
];

const supportOptions = [
  { id: 'read_aloud', label: 'Read aloud' },
  { id: 'line_focus', label: 'Line focus' },
  { id: 'visual_steps', label: 'Visual steps' },
  { id: 'task_breaker', label: 'Task breaker' },
  { id: 'calm_break', label: 'Calm break' },
  { id: 'writing_support', label: 'Writing support' },
];

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
};

const formatDate = (isoDate?: string): string => {
  if (!isoDate) return 'No due date';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Due date set';
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const getTypeLabel = (type: TeacherAssignmentType): string =>
  assignmentTypes.find((item) => item.id === type)?.label ?? 'Task';

const AssignmentCard: React.FC<{
  assignment: TeacherAssignment;
  className: string;
}> = ({ assignment, className }) => (
  <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-adapt-indigo dark:text-adapt-cyan">
          {getTypeLabel(assignment.assignmentType)}
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-adapt-navy dark:text-gray-100">{assignment.title}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-gray-400">{className}</p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-2xl bg-violet-50 px-3 py-2 text-sm font-black text-violet-700 dark:bg-violet-950/30 dark:text-violet-100">
        <CalendarClock className="h-4 w-4" aria-hidden />
        {formatDate(assignment.dueAt)}
      </span>
    </div>
    {assignment.description && (
      <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:bg-gray-950 dark:text-gray-300">
        {assignment.description}
      </p>
    )}
    <div className="mt-4 flex flex-wrap gap-2">
      {assignment.supportTools.length ? (
        assignment.supportTools.map((tool) => (
          <span
            key={tool}
            className="rounded-full bg-adapt-indigo/10 px-3 py-1 text-xs font-black text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan"
          >
            {supportOptions.find((option) => option.id === tool)?.label ?? tool.replace(/_/g, ' ')}
          </span>
        ))
      ) : (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 dark:bg-gray-800 dark:text-gray-300">
          Standard task
        </span>
      )}
    </div>
  </article>
);

const Assignments: React.FC = () => {
  const { isGuest } = useAuth();
  const [summary, setSummary] = useState<TeacherDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    classId: '',
    title: '',
    description: '',
    assignmentType: 'reading' as TeacherAssignmentType,
    dueAt: '',
    supportTools: ['visual_steps'] as string[],
  });

  const loadAssignments = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const data = await TeacherDashboardService.getDashboardSummary();
      setSummary(data);
      setForm((current) => ({ ...current, classId: current.classId || data.classes[0]?.id || '' }));
    } catch (loadError) {
      console.error('Error loading assignments:', loadError);
      setError(getErrorMessage(loadError, 'Could not load assignments.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  const classNames = useMemo(
    () => new Map((summary?.classes ?? []).map((teacherClass) => [teacherClass.id, teacherClass.className])),
    [summary?.classes],
  );

  const toggleSupport = (tool: string) => {
    setForm((current) => ({
      ...current,
      supportTools: current.supportTools.includes(tool)
        ? current.supportTools.filter((item) => item !== tool)
        : [...current.supportTools, tool],
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.classId || !form.title.trim() || saving) return;
    setSaving(true);
    setError(null);
    setActionStatus(null);

    try {
      if (isGuest) {
        setActionStatus('Guest demo: sign in with a teacher account to publish assignments to learners.');
        return;
      }

      const assignment = await TeacherDashboardService.createAssignment({
        classId: form.classId,
        title: form.title,
        description: form.description,
        assignmentType: form.assignmentType,
        supportTools: form.supportTools,
        dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : undefined,
      });

      setActionStatus(`${assignment.title} was assigned to ${classNames.get(assignment.classId) ?? 'the class'}.`);
      setForm((current) => ({
        ...current,
        title: '',
        description: '',
        dueAt: '',
        supportTools: ['visual_steps'],
      }));
      await loadAssignments('refresh');
    } catch (saveError) {
      console.error('Error creating assignment:', saveError);
      setError(getErrorMessage(saveError, 'Could not create assignment.'));
    } finally {
      setSaving(false);
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
                Assignments
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-adapt-navy dark:text-gray-100">
                Neuro-inclusive tasks
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-gray-400">
                Create class tasks with built-in supports. Learners see them in their dashboard and can mark progress
                without exposing private journal content.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadAssignments('refresh')}
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

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/80"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                <BookOpenCheck className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">Create assignment</h2>
                <p className="text-sm text-slate-500 dark:text-gray-400">Choose a class, task type, and support tools.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <select
                value={form.classId}
                onChange={(event) => setForm((current) => ({ ...current, classId: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-adapt-navy outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              >
                <option value="">Choose class</option>
                {summary?.classes.map((teacherClass) => (
                  <option key={teacherClass.id} value={teacherClass.id}>{teacherClass.className}</option>
                ))}
              </select>

              <input
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Read page 5 and choose one favourite word"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />

              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Short, gentle instructions for the learner"
                rows={4}
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={form.assignmentType}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, assignmentType: event.target.value as TeacherAssignmentType }))
                  }
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-adapt-navy outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                >
                  {assignmentTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
                <input
                  type="datetime-local"
                  value={form.dueAt}
                  onChange={(event) => setForm((current) => ({ ...current, dueAt: event.target.value }))}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-adapt-navy outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                />
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-gray-950">
                <div className="mb-3 flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
                  <h3 className="text-sm font-black text-adapt-navy dark:text-gray-100">Support tools</h3>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {supportOptions.map((option) => (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-bold transition ${
                        form.supportTools.includes(option.id)
                          ? 'border-adapt-indigo bg-adapt-indigo/10 text-adapt-indigo dark:border-adapt-cyan dark:bg-adapt-cyan/10 dark:text-adapt-cyan'
                          : 'border-slate-200 bg-white text-slate-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.supportTools.includes(option.id)}
                        onChange={() => toggleSupport(option.id)}
                        className="h-4 w-4"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!form.classId || !form.title.trim() || saving}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-4 py-3 text-sm font-black text-white transition hover:bg-adapt-purple disabled:opacity-60 dark:bg-adapt-cyan dark:text-gray-950"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
              {saving ? 'Publishing...' : 'Publish assignment'}
            </button>
          </form>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
                <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">Recent assignments</h2>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm dark:bg-gray-900 dark:text-gray-300">
                {summary?.assignments.length ?? 0} total
              </span>
            </div>

            {summary?.assignments.length ? (
              <div className="grid gap-4">
                {summary.assignments.map((assignment) => (
                  <AssignmentCard
                    key={assignment.id}
                    assignment={assignment}
                    className={classNames.get(assignment.classId) ?? 'Class'}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white/75 p-8 text-center text-slate-500 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-400">
                <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
                No assignments yet. Create one to send a supported task to connected learners.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Assignments;
