import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenCheck, CheckCircle2, HandHeart, Loader2, MessageCircleWarning, Mic2, Play, RefreshCw } from 'lucide-react';
import type { ChildTeacherAssignment } from 'features/child/services/childAssignmentService';
import { useTeacherAssignments } from 'features/child/hooks/useTeacherAssignments';
import { useChildProgressReadAccess } from 'features/child/store/childProgressReadAccess';
import { useAuthStore } from 'store/authStore';
import { ROUTES } from 'constants/routes';

interface TeacherAssignmentsPanelProps {
  childId: string;
  onCelebrate?: (message: string) => void;
}
const supportLabels: Record<string, string> = {
  read_aloud: 'Read aloud', line_focus: 'Line focus', visual_steps: 'Visual steps',
  task_breaker: 'Task breaker', calm_break: 'Calm break', writing_support: 'Writing support',
  pronunciation_practice: 'Pronunciation practice',
};
const moodOptions = [
  { id: 'good', label: 'Good' }, { id: 'calm', label: 'Calm' }, { id: 'confused', label: 'Confused' },
  { id: 'worried', label: 'Worried' }, { id: 'tired', label: 'Tired' },
];
const statusLabels = {
  not_started: 'Not started', in_progress: 'In progress', needs_help: 'Need help', completed: 'Completed', submitted: 'Submitted',
};
const PANEL = 'rounded-3xl border border-adapt-indigo/15 bg-white/90 p-5 shadow-sm dark:border-adapt-cyan/20 dark:bg-gray-900/80';
const BUTTON = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600';
const isPronunciationAssignment = (assignment: ChildTeacherAssignment) =>
  assignment.assignmentType === 'pronunciation' || assignment.supportTools.includes('pronunciation_practice');
const getPronunciationPhrase = (assignment: ChildTeacherAssignment) => {
  const labelled = (assignment.description?.trim() ?? '').match(/(?:word|words|phrase|sentence)\s*:\s*(.+)$/i)?.[1]?.trim();
  if (labelled) return labelled.slice(0, 80);
  return assignment.title.replace(/^practi[cs]e\s+/i, '').replace(/^say\s+/i, '').trim().slice(0, 80) || assignment.title;
};
const formatDueDate = (value?: string) => {
  if (!value) return 'No due date';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Due date unavailable'
    : new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
};

const ReadyTeacherAssignmentsPanel: React.FC<TeacherAssignmentsPanelProps> = ({ childId, onCelebrate }) => {
  const navigate = useNavigate();
  const { state, refresh, save, saveMood, openMood, dismissMood, canAct } = useTeacherAssignments(childId, onCelebrate);
  const busy = state.phase === 'loading' || state.savingId !== null;
  const actionsDisabled = busy || state.phase !== 'ready';

  const start = async (assignment: ChildTeacherAssignment) => {
    const saved = await save(assignment.id, 'in_progress');
    if (!saved || !canAct() || !isPronunciationAssignment(assignment)) return;
    navigate(ROUTES.PRONUNCIATION_BUDDY, { state: { assignmentPractice: {
      assignmentId: assignment.id, title: assignment.title, phrase: getPronunciationPhrase(assignment),
      hint: assignment.description || 'Your teacher sent this pronunciation practice.',
    } } });
  };

  return <section className={PANEL} aria-label="Teacher tasks" aria-busy={busy}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:text-adapt-cyan"><BookOpenCheck className="h-5 w-5" aria-hidden /></span>
        <div>
          <h2 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">Teacher tasks</h2>
          <p className="text-sm text-slate-500 dark:text-gray-400">Small steps sent by your class teacher.</p>
        </div>
      </div>
      <button type="button" onClick={() => void refresh()} disabled={busy} className={`${BUTTON} border border-slate-200 bg-white text-slate-600 dark:bg-gray-950 dark:text-gray-200`}>
        <RefreshCw className={`h-4 w-4 ${state.phase === 'loading' ? 'motion-safe:animate-spin' : ''}`} aria-hidden />Refresh
      </button>
    </div>

    {state.phase === 'loading' && <p role="status" className="mt-4 text-sm text-slate-600 dark:text-slate-300">Checking for teacher tasks...</p>}
    {state.phase === 'session_changed' && <p role="status" className="mt-4 text-sm text-slate-600 dark:text-slate-300">Your session changed. Refresh to check your teacher tasks again.</p>}
    {state.error && <p role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">{state.error}</p>}
    {state.notice && <p role="status" className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300">{state.notice}</p>}
    {state.phase === 'ready' && state.assignments.length === 0 && <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:text-slate-300">
      <p className="font-semibold">No teacher tasks are available to this account right now.</p>
      <p className="mt-1">Tasks appear after class access is approved and your teacher sends one. You can still use your other activities.</p>
    </div>}

    <div className="mt-5 grid gap-3">
      {state.assignments.map(assignment => {
        const done = assignment.status === 'completed' || assignment.status === 'submitted';
        return <article key={assignment.id} aria-label={assignment.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 dark:bg-gray-900 dark:text-gray-300">{formatDueDate(assignment.dueAt)}</span>
              <h3 className="mt-3 text-base font-extrabold text-adapt-navy dark:text-gray-100">{assignment.title}</h3>
              {assignment.description && <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-gray-400">{assignment.description}</p>}
            </div>
            <span className={`h-fit rounded-full px-3 py-1 text-xs font-black ${done ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200'}`}>{statusLabels[assignment.status]}</span>
          </div>
          {assignment.supportTools.length > 0 && <div className="mt-4">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Suggested supports — not a record of tools used</p>
            <div className="mt-2 flex flex-wrap gap-2">{assignment.supportTools.map(tool => <span key={tool} className="rounded-full bg-white px-3 py-1 text-xs font-black text-adapt-indigo dark:bg-gray-900 dark:text-adapt-cyan">{supportLabels[tool] ?? tool.replace(/_/g, ' ')}</span>)}</div>
          </div>}
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-300">Done records your own task update, not a teacher assessment.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button type="button" onClick={() => void start(assignment)} disabled={actionsDisabled || done} className={`${BUTTON} bg-white text-adapt-indigo dark:bg-gray-900 dark:text-adapt-cyan`}>
              {isPronunciationAssignment(assignment) ? <Mic2 className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
              {isPronunciationAssignment(assignment) ? 'Practise' : 'Start'}
            </button>
            <button type="button" onClick={() => void save(assignment.id, 'needs_help')} disabled={actionsDisabled || done} className={`${BUTTON} bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-100`}><MessageCircleWarning className="h-4 w-4" aria-hidden />Need help</button>
            <button type="button" onClick={() => void save(assignment.id, 'completed')} disabled={actionsDisabled || done} className={`${BUTTON} bg-adapt-navy text-white dark:bg-adapt-cyan dark:text-gray-950`}>
              {state.savingId === assignment.id ? <Loader2 className="h-4 w-4 motion-safe:animate-spin" aria-hidden /> : <CheckCircle2 className="h-4 w-4" aria-hidden />}Done
            </button>
          </div>
          {done && state.moodPromptId !== assignment.id && <button type="button" onClick={() => openMood(assignment.id)} disabled={actionsDisabled} className={`${BUTTON} mt-3 border border-slate-300 text-slate-700 dark:text-slate-200`}>Share how it felt (optional)</button>}
          {state.moodPromptId === assignment.id && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950">
            <div className="flex items-center gap-2"><HandHeart className="h-4 w-4 text-emerald-700 dark:text-emerald-200" aria-hidden /><p className="text-sm font-black text-emerald-800 dark:text-emerald-100">How did that feel? (Optional)</p></div>
            <p className="mt-2 text-sm text-emerald-900 dark:text-emerald-100">Choosing a feeling shares it with adults authorised to see this task record. You can skip without changing your completed task.</p>
            <div className="mt-3 flex flex-wrap gap-2">{moodOptions.map(mood => <button key={mood.id} type="button" disabled={actionsDisabled} onClick={() => void saveMood(assignment.id, mood.id)} className={`${BUTTON} bg-white text-emerald-800 dark:bg-gray-900 dark:text-emerald-100`}>{mood.label}</button>)}
              <button type="button" disabled={actionsDisabled} onClick={dismissMood} className={`${BUTTON} border border-emerald-600 text-emerald-900 dark:text-emerald-100`}>Skip for now</button>
            </div>
          </div>}
        </article>;
      })}
    </div>
  </section>;
};

const TeacherAssignmentsPanel: React.FC<TeacherAssignmentsPanelProps> = props => {
  const access = useChildProgressReadAccess();
  const isGuest = useAuthStore(value => value.isGuest);
  if (isGuest) return <section className={PANEL}><p role="status">Demo mode — real teacher tasks are not loaded or saved.</p></section>;
  if (!props.childId || props.childId !== access.childId || !access.isReady) {
    return <section className={PANEL}><p role="status">Teacher tasks are available after your child account is ready.</p></section>;
  }
  // The previous child's component is never reused for a new child's task list.
  return <ReadyTeacherAssignmentsPanel key={props.childId} {...props} />;
};
export default TeacherAssignmentsPanel;
