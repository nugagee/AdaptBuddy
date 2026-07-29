import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpenCheck,
  CheckCircle2,
  HandHeart,
  Loader2,
  MessageCircleWarning,
  Mic2,
  Play,
  RefreshCw,
} from 'lucide-react';
import type { AssignmentStatus } from 'features/teacher/services/teacherDashboardService';
import {
  ChildAssignmentService,
  type ChildTeacherAssignment,
} from 'features/child/services/childAssignmentService';
import { ROUTES } from 'constants/routes';

interface TeacherAssignmentsPanelProps {
  childId: string;
  onCelebrate?: (message: string) => void;
}

const supportLabels: Record<string, string> = {
  read_aloud: 'Read aloud',
  line_focus: 'Line focus',
  visual_steps: 'Visual steps',
  task_breaker: 'Task breaker',
  calm_break: 'Calm break',
  writing_support: 'Writing support',
  pronunciation_practice: 'Pronunciation practice',
};

const moodOptions = [
  { id: 'good', label: 'Good' },
  { id: 'calm', label: 'Calm' },
  { id: 'confused', label: 'Confused' },
  { id: 'worried', label: 'Worried' },
  { id: 'tired', label: 'Tired' },
];

const statusLabels: Record<AssignmentStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  needs_help: 'Need help',
  completed: 'Completed',
  submitted: 'Submitted',
};

const formatDueDate = (isoDate?: string): string => {
  if (!isoDate) return 'No due date';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Due soon';
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
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
  return 'Could not load teacher tasks.';
};

const TeacherAssignmentsPanel: React.FC<TeacherAssignmentsPanelProps> = ({ childId, onCelebrate }) => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<ChildTeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [moodPromptId, setMoodPromptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const data = await ChildAssignmentService.getAssignments(childId);
      setAssignments(data);
    } catch (loadError) {
      console.error('Error loading teacher assignments:', loadError);
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [childId]);

  useEffect(() => {
    void loadAssignments();
  }, [loadAssignments]);

  const isPronunciationAssignment = (assignment: ChildTeacherAssignment) =>
    assignment.assignmentType === 'pronunciation' || assignment.supportTools.includes('pronunciation_practice');

  const getPronunciationPhrase = (assignment: ChildTeacherAssignment) => {
    const description = assignment.description?.trim() ?? '';
    const labelledPhrase = description.match(/(?:word|words|phrase|sentence)\s*:\s*(.+)$/i)?.[1]?.trim();
    if (labelledPhrase) return labelledPhrase.slice(0, 80);

    return assignment.title
      .replace(/^practi[cs]e\s+/i, '')
      .replace(/^say\s+/i, '')
      .trim()
      .slice(0, 80) || assignment.title;
  };

  const getSupportUsedForStatus = (
    assignment: ChildTeacherAssignment,
    status: AssignmentStatus,
  ) => {
    const supportUsed = new Set(assignment.supportUsed);
    if (status === 'needs_help') supportUsed.add('teacher_help');
    if (status === 'completed' && isPronunciationAssignment(assignment)) supportUsed.add('pronunciation_practice');
    return Array.from(supportUsed);
  };

  const saveProgress = async (
    assignment: ChildTeacherAssignment,
    status: AssignmentStatus,
    moodAfterTask?: string,
  ): Promise<boolean> => {
    setSavingId(assignment.id);
    setError(null);

    try {
      const supportUsed = getSupportUsedForStatus(assignment, status);
      await ChildAssignmentService.saveProgress({
        assignmentId: assignment.id,
        childId,
        status,
        supportUsed,
        moodAfterTask,
      });

      setAssignments((current) =>
        current.map((item) =>
          item.id === assignment.id
            ? { ...item, status, supportUsed, moodAfterTask: moodAfterTask ?? item.moodAfterTask }
            : item,
        ),
      );

      if (status === 'completed') {
        setMoodPromptId(assignment.id);
        onCelebrate?.(`${assignment.title} complete. Nice steady work.`);
      } else if (status === 'needs_help') {
        onCelebrate?.('Help signal saved for your teacher.');
      }

      return true;
    } catch (saveError) {
      console.error('Error saving assignment progress:', saveError);
      setError(getErrorMessage(saveError));
      return false;
    } finally {
      setSavingId(null);
    }
  };

  const handleStartAssignment = async (assignment: ChildTeacherAssignment) => {
    const saved = await saveProgress(assignment, 'in_progress');
    if (!saved || !isPronunciationAssignment(assignment)) return;

    navigate(ROUTES.PRONUNCIATION_BUDDY, {
      state: {
        assignmentPractice: {
          assignmentId: assignment.id,
          title: assignment.title,
          phrase: getPronunciationPhrase(assignment),
          hint: assignment.description || 'Your teacher sent this pronunciation practice.',
        },
      },
    });
  };

  if (loading) {
    return (
      <section className="rounded-3xl border border-adapt-indigo/15 bg-white/80 p-5 shadow-sm dark:border-adapt-cyan/20 dark:bg-gray-900/80">
        <div className="flex items-center gap-3 text-sm font-bold text-slate-500 dark:text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
          Checking for teacher tasks...
        </div>
      </section>
    );
  }

  if (!assignments.length && !error) return null;

  return (
    <section className="rounded-3xl border border-adapt-indigo/15 bg-white/90 p-5 shadow-sm dark:border-adapt-cyan/20 dark:bg-gray-900/80">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
            <BookOpenCheck className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">Teacher tasks</h2>
            <p className="text-sm text-slate-500 dark:text-gray-400">Small steps sent by your class teacher.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => loadAssignments('refresh')}
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

      <div className="mt-5 grid gap-3">
        {assignments.map((assignment) => {
          const done = assignment.status === 'completed' || assignment.status === 'submitted';
          return (
            <article
              key={assignment.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm dark:bg-gray-900 dark:text-gray-300">
                    {formatDueDate(assignment.dueAt)}
                  </span>
                  <h3 className="mt-3 text-base font-extrabold text-adapt-navy dark:text-gray-100">
                    {assignment.title}
                  </h3>
                  {assignment.description && (
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-gray-400">
                      {assignment.description}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-black ${
                    done
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
                      : assignment.status === 'needs_help'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200'
                        : 'bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan'
                  }`}
                >
                  {statusLabels[assignment.status]}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {assignment.supportTools.map((tool) => (
                  <span
                    key={tool}
                    className="rounded-full bg-white px-3 py-1 text-xs font-black text-adapt-indigo shadow-sm dark:bg-gray-900 dark:text-adapt-cyan"
                  >
                    {supportLabels[tool] ?? tool.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => void handleStartAssignment(assignment)}
                  disabled={savingId === assignment.id || done}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-sm font-black text-adapt-indigo shadow-sm disabled:opacity-50 dark:bg-gray-900 dark:text-adapt-cyan"
                >
                  {isPronunciationAssignment(assignment) ? (
                    <Mic2 className="h-4 w-4" aria-hidden />
                  ) : (
                    <Play className="h-4 w-4" aria-hidden />
                  )}
                  {isPronunciationAssignment(assignment) ? 'Practise' : 'Start'}
                </button>
                <button
                  type="button"
                  onClick={() => saveProgress(assignment, 'needs_help')}
                  disabled={savingId === assignment.id || done}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-100 px-3 py-2 text-sm font-black text-amber-800 disabled:opacity-50 dark:bg-amber-950/40 dark:text-amber-100"
                >
                  <MessageCircleWarning className="h-4 w-4" aria-hidden />
                  Need help
                </button>
                <button
                  type="button"
                  onClick={() => saveProgress(assignment, 'completed')}
                  disabled={savingId === assignment.id}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-3 py-2 text-sm font-black text-white disabled:opacity-50 dark:bg-adapt-cyan dark:text-gray-950"
                >
                  {savingId === assignment.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                  )}
                  Done
                </button>
              </div>

              {moodPromptId === assignment.id && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-2">
                    <HandHeart className="h-4 w-4 text-emerald-700 dark:text-emerald-200" aria-hidden />
                    <p className="text-sm font-black text-emerald-800 dark:text-emerald-100">
                      How did that feel?
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {moodOptions.map((mood) => (
                      <button
                        key={mood.id}
                        type="button"
                        onClick={() => {
                          void saveProgress(assignment, 'completed', mood.id);
                          setMoodPromptId(null);
                        }}
                        className="rounded-full bg-white px-3 py-2 text-xs font-black text-emerald-700 shadow-sm dark:bg-gray-900 dark:text-emerald-100"
                      >
                        {mood.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default TeacherAssignmentsPanel;
