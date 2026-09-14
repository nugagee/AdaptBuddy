import { useMemo, useSyncExternalStore } from 'react';
import { useAuthStore } from 'store/authStore';

export interface TeacherReportSession { key: string; teacherId: string; guest: boolean; isCurrent: () => boolean; }
const stamp = () => {
  const { user, profile, isGuest } = useAuthStore.getState();
  return JSON.stringify([isGuest, user?.id, profile?.id, profile?.role, profile?.status, profile?.is_authorized]);
};
const allowed = () => {
  const { user, profile, isGuest } = useAuthStore.getState();
  if (isGuest) return !user && profile?.role === 'teacher';
  return Boolean(user?.id && profile?.id === user.id && ['teacher', 'admin'].includes(profile.role)
    && profile.status === 'active' && profile.is_authorized === true);
};
/** Clear the entire report (including exports/selections) on authority changes,
 * even an invalid-to-valid change batched in one render. This is not an SQL policy.
 */
export const useTeacherReportSession = (): TeacherReportSession | null => {
  const monitor = useMemo(() => {
    let identity = stamp(); let generation = 0; let snapshot = `${generation}:${identity}`;
    const read = () => { const next = stamp(); if (next !== identity) { identity = next; snapshot = `${++generation}:${identity}`; } return snapshot; };
    return { read, subscribe: (notify: () => void) => useAuthStore.subscribe(() => { const before = snapshot; if (read() !== before) notify(); }) };
  }, []);
  const key = useSyncExternalStore(monitor.subscribe, monitor.read, monitor.read);
  return useMemo(() => {
    if (!allowed()) return null;
    const { user, profile, isGuest } = useAuthStore.getState();
    return { key, teacherId: user?.id ?? profile!.id, guest: isGuest,
      isCurrent: () => monitor.read() === key && allowed() };
  }, [key, monitor]);
};
