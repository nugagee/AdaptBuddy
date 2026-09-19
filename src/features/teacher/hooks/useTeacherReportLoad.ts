import { useCallback, useEffect, useRef, useState } from 'react';
import { TeacherDashboardService, type TeacherDashboardSummary } from '../services/teacherDashboardService';
import type { TeacherReportSession } from './useTeacherReportSession';
export const TEACHER_REPORT_TIMEOUT_MS = 20000;

export const useTeacherReportLoad = (session: TeacherReportSession) => {
  const [summary, setSummary] = useState<TeacherDashboardSummary | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState('');
  const selected = useRef(''); selected.current = selectedClassId;
  const mounted = useRef(false); const busy = useRef(false); const revision = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const loadReports = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!mounted.current || busy.current || !session.isCurrent()) return;
    const preferred = selected.current; const request = ++revision.current;
    const current = () => mounted.current && request === revision.current && session.isCurrent();
    busy.current = true; setSummary(null); setSelectedClassId(''); setLoadedAt(''); setError(null);
    setLoading(mode === 'initial'); setRefreshing(mode === 'refresh');
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const data = await Promise.race([
        TeacherDashboardService.getDashboardSummary(session.guest ? { guest: true } : { reportOwnerId: session.teacherId }),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('timeout')), TEACHER_REPORT_TIMEOUT_MS); timer.current = timeout; }),
      ]);
      if (!current()) return;
      setSummary(data); setSelectedClassId(data.classes.some(c => c.id === preferred) ? preferred : data.classes[0]?.id ?? '');
      setLoadedAt(new Date().toISOString());
    } catch {
      if (current()) setError('We could not load a complete teacher report. Earlier records and exports are hidden. Refresh to try again.');
    } finally {
      if (timeout) clearTimeout(timeout);
      if (timer.current === timeout) timer.current = undefined;
      if (current()) { busy.current = false; setLoading(false); setRefreshing(false); }
    }
  }, [session]);
  useEffect(() => {
    mounted.current = true; busy.current = false; void loadReports();
    return () => { mounted.current = false; busy.current = false; ++revision.current; if (timer.current) clearTimeout(timer.current); };
  }, [loadReports]);
  return { summary, selectedClassId, setSelectedClassId, loading, refreshing, error, setError, loadReports, loadedAt };
};
