import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAuthStore } from 'store/authStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { getReadyChildProgressForOwner } from 'features/child/store/childProgressReadAccess';
import { ChildAssignmentService, type ChildTeacherAssignment } from 'features/child/services/childAssignmentService';
import type { AssignmentStatus } from 'features/teacher/services/teacherDashboardService';

type Phase = 'loading' | 'ready' | 'error' | 'session_changed';
interface TaskState {
  phase: Phase;
  assignments: ChildTeacherAssignment[];
  savingId: string | null;
  moodPromptId: string | null;
  error: string | null;
  notice: string | null;
}
const emptyState = (phase: Phase): TaskState => ({
  phase, assignments: [], savingId: null, moodPromptId: null, error: null, notice: null,
});
const isDone = (status: AssignmentStatus) => status === 'completed' || status === 'submitted';

/** Client lifecycle protection; database policies remain the authority boundary. */
export const useTeacherAssignments = (childId: string, onCelebrate?: (message: string) => void) => {
  const [state, setState] = useState<TaskState>(() => emptyState('loading'));
  const mounted = useRef(false);
  const revision = useRef(0);
  const busy = useRef(false);
  const writable = useRef(false);
  const rows = useRef<ChildTeacherAssignment[]>([]);
  const celebrate = useRef(onCelebrate);
  celebrate.current = onCelebrate;

  const ownsSession = useCallback(() => Boolean(
    childId && childId !== 'guest-child' && !useAuthStore.getState().isGuest
    && getReadyChildProgressForOwner(childId),
  ), [childId]);
  const current = useCallback((request: number) => (
    mounted.current && revision.current === request && ownsSession()
  ), [ownsSession]);

  const refresh = useCallback(async () => {
    if (!mounted.current || busy.current || !ownsSession()) return;
    const request = ++revision.current;
    busy.current = true;
    writable.current = false;
    rows.current = [];
    setState(emptyState('loading'));
    try {
      const data = await ChildAssignmentService.getAssignments(childId);
      if (!current(request)) return;
      rows.current = data;
      writable.current = true;
      setState({ ...emptyState('ready'), assignments: data });
    } catch {
      if (!current(request)) return;
      setState({ ...emptyState('error'), error: 'Teacher tasks could not be checked. This does not mean there are no tasks. Please refresh to try again.' });
    } finally {
      if (current(request)) busy.current = false;
    }
  }, [childId, current, ownsSession]);

  useLayoutEffect(() => {
    mounted.current = true;
    const invalidate = () => {
      if (ownsSession()) return;
      // Latch even an invalid -> ready transition within one React batch.
      revision.current += 1;
      busy.current = false;
      writable.current = false;
      rows.current = [];
      if (mounted.current) setState(emptyState('session_changed'));
    };
    const stopAuth = useAuthStore.subscribe(invalidate);
    const stopProgress = useChildProgressStore.subscribe(invalidate);
    invalidate();
    return () => {
      mounted.current = false;
      revision.current += 1;
      busy.current = false;
      writable.current = false;
      rows.current = [];
      stopAuth(); stopProgress();
    };
  }, [ownsSession]);
  useEffect(() => { void refresh(); }, [refresh]);

  const canAct = () => mounted.current && ownsSession() && writable.current && !busy.current;

  const save = async (assignmentId: string, status: AssignmentStatus): Promise<boolean> => {
    if (!canAct()) return false;
    const assignment = rows.current.find(row => row.id === assignmentId);
    if (!assignment || isDone(assignment.status)) return false;
    const request = ++revision.current;
    busy.current = true;
    setState(value => ({ ...value, savingId: assignmentId, error: null, notice: null }));
    // Selecting Done is self-report, not evidence a listed support tool was used.
    const supportUsed = Array.from(new Set([
      ...assignment.supportUsed, ...(status === 'needs_help' ? ['teacher_help'] : []),
    ]));
    try {
      await ChildAssignmentService.saveProgress({
        assignmentId, childId, status, supportUsed, moodAfterTask: assignment.moodAfterTask,
      });
      if (!current(request)) return false;
      rows.current = rows.current.map(row => row.id === assignmentId ? { ...row, status, supportUsed } : row);
      const notice = status === 'needs_help'
        ? 'Help request saved in your task record. This does not confirm your teacher has seen it. For help now, speak to an adult nearby.'
        : status === 'completed'
          ? 'Your completion update was saved. This is your own task update, not a teacher assessment.'
          : 'Your task is now recorded as in progress.';
      setState(value => ({ ...value, assignments: rows.current, notice, moodPromptId: status === 'completed' ? assignmentId : null }));
      if (status === 'completed' || status === 'needs_help') celebrate.current?.(notice);
      return true;
    } catch {
      if (!current(request)) return false;
      // A lost response can follow a committed write. Re-read before retrying.
      writable.current = false;
      setState(value => ({ ...value, phase: 'error', error: 'We could not confirm that update was saved. The last confirmed status is shown. Refresh to check before trying again.' }));
      return false;
    } finally {
      if (current(request)) {
        busy.current = false;
        setState(value => ({ ...value, savingId: null }));
      }
    }
  };

  const saveMood = async (assignmentId: string, mood: string): Promise<boolean> => {
    if (!canAct()) return false;
    const assignment = rows.current.find(row => row.id === assignmentId);
    if (!assignment || !isDone(assignment.status)) return false;
    const request = ++revision.current;
    busy.current = true;
    setState(value => ({ ...value, savingId: assignmentId, error: null, notice: null }));
    try {
      await ChildAssignmentService.saveMoodAfterTask({ assignmentId, childId, moodAfterTask: mood });
      if (!current(request)) return false;
      rows.current = rows.current.map(row => row.id === assignmentId ? { ...row, moodAfterTask: mood } : row);
      setState(value => ({ ...value, assignments: rows.current, moodPromptId: null, notice: 'Your optional task feeling was saved.' }));
      return true;
    } catch {
      if (!current(request)) return false;
      // This narrow, idempotent field update may be retried or skipped.
      setState(value => ({ ...value, error: 'We could not confirm your task feeling was saved. You can try again or skip it.' }));
      return false;
    } finally {
      if (current(request)) {
        busy.current = false;
        setState(value => ({ ...value, savingId: null }));
      }
    }
  };

  const openMood = (id: string) => {
    if (canAct() && rows.current.some(row => row.id === id && isDone(row.status))) {
      setState(value => ({ ...value, moodPromptId: id, error: null, notice: null }));
    }
  };
  const dismissMood = () => {
    if (canAct()) setState(value => ({ ...value, moodPromptId: null, error: null }));
  };
  return { state, refresh, save, saveMood, openMood, dismissMood, canAct };
};
