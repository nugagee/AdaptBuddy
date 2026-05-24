import { useEffect } from 'react';
import { useAuth } from 'hooks/useAuth';
import { useChildSessionStore } from 'features/child/store/childSessionStore';

/** Tracks active visit time per child — resets on logout (sessionStorage cleared). */
const ChildSessionTracker: React.FC = () => {
  const { user, profile } = useAuth();
  const initSession = useChildSessionStore((s) => s.initSession);
  const tick = useChildSessionStore((s) => s.tick);
  const flushVisitForUser = useChildSessionStore((s) => s.flushVisitForUser);

  const userId = user?.id;
  const isChild = profile?.role === 'child';

  useEffect(() => {
    if (!userId || !isChild) return undefined;

    initSession(userId);

    const intervalId = window.setInterval(tick, 1000);

    const handlePageHide = (event: PageTransitionEvent) => {
      if (event.persisted) return;
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (nav?.type === 'reload') return;

      const { elapsedSeconds } = useChildSessionStore.getState();
      flushVisitForUser(userId, elapsedSeconds);
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [userId, isChild, initSession, tick, flushVisitForUser]);

  return null;
};

export default ChildSessionTracker;
