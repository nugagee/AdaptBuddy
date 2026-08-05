import { useCallback, useEffect, useRef, useState } from 'react';
import { ClassLiveSessionService } from 'features/classroom/services/classLiveSessionService';
import type { ClassSessionSnapshot } from 'features/classroom/types/classLiveSession.types';

const DEFAULT_INTERVAL_MS = 4000;

export function useLiveSessionSnapshot(
  sessionId: string | null | undefined,
  enabled = true,
  intervalMs = DEFAULT_INTERVAL_MS,
) {
  const [snapshot, setSnapshot] = useState<ClassSessionSnapshot | null>(null);
  const [loading, setLoading] = useState(Boolean(sessionId && enabled));
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!sessionId || !enabled) return;
    try {
      const next = await ClassLiveSessionService.getSessionSnapshot(sessionId);
      if (!mountedRef.current) return;
      if (!next || next.session.status === 'ended') {
        setSnapshot(next);
        setError(next ? null : 'This classroom session has ended.');
        return;
      }
      setSnapshot(next);
      setError(null);
    } catch (refreshError) {
      if (!mountedRef.current) return;
      setError(refreshError instanceof Error ? refreshError.message : 'Could not refresh classroom.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [sessionId, enabled]);

  useEffect(() => {
    mountedRef.current = true;
    if (!sessionId || !enabled) {
      setSnapshot(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    void refresh();
    const timer = window.setInterval(() => void refresh(), intervalMs);
    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [sessionId, enabled, intervalMs, refresh]);

  return { snapshot, loading, error, refresh };
}
