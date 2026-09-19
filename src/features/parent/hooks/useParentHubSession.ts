import { useMemo, useSyncExternalStore } from 'react';
import { useAuthStore } from 'store/authStore';

export interface ParentHubSession {
  key: string;
  isCurrent: () => boolean;
}

const stamp = () => {
  const { user, profile, isGuest } = useAuthStore.getState();
  return JSON.stringify([isGuest, user?.id, profile?.id, profile?.role, profile?.status, profile?.is_authorized]);
};
const allowed = () => {
  const { user, profile, isGuest } = useAuthStore.getState();
  if (!profile || !['parent', 'teacher', 'admin'].includes(profile.role)) return false;
  if (isGuest) return !user;
  return Boolean(user?.id && profile.id === user.id && profile.status === 'active' && profile.is_authorized === true);
};

/** A generation changes even when an account briefly changes and returns in one batch.
 * This clears the whole Parent Hub, not just the visible task card. It is not an RLS policy.
 */
export const useParentHubSession = (): ParentHubSession | null => {
  const monitor = useMemo(() => {
    let identity = stamp();
    let generation = 0;
    let snapshot = `${generation}:${identity}`;
    const read = () => {
      const next = stamp();
      if (next !== identity) {
        identity = next;
        snapshot = `${++generation}:${identity}`;
      }
      return snapshot;
    };
    return {
      read,
      subscribe: (notify: () => void) => useAuthStore.subscribe(() => {
        const previous = snapshot;
        if (read() !== previous) notify();
      }),
    };
  }, []);
  const key = useSyncExternalStore(monitor.subscribe, monitor.read, monitor.read);
  return useMemo(() => allowed() ? { key, isCurrent: () => monitor.read() === key && allowed() } : null, [key, monitor]);
};
