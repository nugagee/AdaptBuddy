import { useCallback, useEffect, useRef, useState } from 'react';
import { ParentDashboardService, type DashboardSummary } from '../services/parentDashboardService';

export const PARENT_LOAD_TIMEOUT_MS = 20000;

/** Only a complete response from the current account can replace this dashboard.
 * Reload clears earlier records. A request error is never an empty dashboard.
 */
export const useParentDashboardLoad = (
  isGuest: boolean,
  isCurrent: () => boolean,
  createGuest: () => DashboardSummary,
) => {
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(false);
  const revision = useRef(0);
  const busy = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>();
  const selected = useRef(selectedChildId);
  selected.current = selectedChildId;

  const loadDashboard = useCallback(async (mode: 'initial' | 'refresh' = 'initial', preferredChildId?: string | null) => {
    if (!mounted.current || !isCurrent() || busy.current) return;
    busy.current = true;
    const request = ++revision.current;
    const current = () => mounted.current && isCurrent() && request === revision.current;
    const preferred = preferredChildId ?? selected.current;
    setDashboardData(null);
    setSelectedChildId(null);
    setError(null);
    setLoading(mode === 'initial');
    setRefreshing(mode === 'refresh');
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const data = isGuest ? createGuest() : await Promise.race([
        ParentDashboardService.getDashboardSummary(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), PARENT_LOAD_TIMEOUT_MS); timeout.current = timer; }),
      ]);
      if (!current()) return;
      setDashboardData(data);
      setSelectedChildId(data.children.some(child => child.childId === preferred) ? preferred ?? null : data.children[0]?.childId ?? null);
    } catch {
      if (current()) setError('We could not load this Parent Hub. Earlier records are hidden. Please refresh to try again.');
    } finally {
      if (timer) clearTimeout(timer);
      if (timeout.current === timer) timeout.current = undefined;
      if (current()) { busy.current = false; setLoading(false); setRefreshing(false); }
    }
  }, [createGuest, isCurrent, isGuest]);

  useEffect(() => {
    mounted.current = true;
    busy.current = false;
    void loadDashboard();
    return () => { mounted.current = false; busy.current = false; ++revision.current; if (timeout.current) clearTimeout(timeout.current); };
  }, [loadDashboard]);

  return { dashboardData, setDashboardData, selectedChildId, setSelectedChildId, loading, refreshing, error, setError, loadDashboard };
};
