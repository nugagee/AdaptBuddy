import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import {
  SupportTimelineService,
  type SupportTimelineItem,
  type SupportTimelineKind,
  type SupportTimelineSeverity,
} from 'services/supabase/supportTimelineService';

interface SupportTimelinePanelProps {
  title?: string;
  subtitle?: string;
  childIds?: string[];
  limit?: number;
  compact?: boolean;
  variant?: 'light' | 'dark';
}

const lightSeverityStyles: Record<SupportTimelineSeverity, string> = {
  urgent: 'border-red-200 bg-red-50 text-red-800',
  high: 'border-rose-200 bg-rose-50 text-rose-800',
  medium: 'border-amber-200 bg-amber-50 text-amber-800',
  low: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

const darkSeverityStyles: Record<SupportTimelineSeverity, string> = {
  urgent: 'border-red-500/30 bg-red-500/10 text-red-200',
  high: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  medium: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  low: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
};

const kindIconMap: Record<SupportTimelineKind, React.ElementType> = {
  signal: BellRing,
  alert: AlertTriangle,
  adult_response: ShieldCheck,
  assignment: BookOpenCheck,
  message: MessageSquare,
  meeting: CalendarClock,
  class_request: GraduationCap,
};

function labelize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatRelativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Recently';
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}

const SupportTimelinePanel: React.FC<SupportTimelinePanelProps> = ({
  title = 'Support timeline',
  subtitle = 'Signal, response, escalation, and reassurance evidence in one place.',
  childIds,
  limit = 18,
  compact = false,
  variant = 'light',
}) => {
  const { profile } = useAuth();
  const [items, setItems] = useState<SupportTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const requestedChildIds = useMemo(
    () => childIds?.filter(Boolean) ?? undefined,
    [childIds],
  );

  const loadTimeline = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!profile) return;
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const timeline = await SupportTimelineService.getTimeline(profile, { childIds: requestedChildIds, limit });
      setItems(timeline);
    } catch (timelineError: unknown) {
      setError(timelineError instanceof Error ? timelineError.message : 'Could not load support timeline.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [limit, profile, requestedChildIds]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline]);

  const isDark = variant === 'dark';
  const severityStyles = isDark ? darkSeverityStyles : lightSeverityStyles;
  const wrapperClass = isDark
    ? 'rounded-2xl border border-white/10 bg-slate-900/60 p-5'
    : 'rounded-3xl border border-white/70 bg-white/85 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75';
  const headingClass = isDark ? 'text-white' : 'text-adapt-navy dark:text-gray-100';
  const mutedClass = isDark ? 'text-gray-500' : 'text-slate-500 dark:text-gray-400';
  const itemClass = isDark
    ? 'border-white/10 bg-white/5'
    : 'border-slate-100 bg-slate-50/80 dark:border-gray-800 dark:bg-gray-950/40';

  return (
    <section className={wrapperClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? 'text-indigo-300' : 'text-adapt-indigo dark:text-adapt-cyan'}`}>
            Evidence trail
          </p>
          <h2 className={`mt-1 ${compact ? 'text-xl' : 'text-2xl'} font-extrabold ${headingClass}`}>
            {title}
          </h2>
          <p className={`mt-2 max-w-3xl text-sm leading-6 ${mutedClass}`}>
            {subtitle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadTimeline('refresh')}
          disabled={refreshing}
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition disabled:opacity-60 ${
            isDark
              ? 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
              : 'border-slate-200 bg-white text-slate-700 hover:border-adapt-indigo/40 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200'
          }`}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden />
          )}
          Refresh
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </p>
      )}

      <div className={compact ? 'mt-4 space-y-3' : 'mt-6 space-y-3'}>
        {loading ? (
          <div className={`flex items-center justify-center gap-2 rounded-2xl border p-6 text-sm font-bold ${itemClass} ${mutedClass}`}>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading timeline
          </div>
        ) : items.length === 0 ? (
          <div className={`rounded-2xl border p-5 text-center ${itemClass}`}>
            <CheckCircle2 className={`mx-auto h-8 w-8 ${isDark ? 'text-emerald-300' : 'text-emerald-600 dark:text-emerald-300'}`} aria-hidden />
            <p className={`mt-2 font-black ${headingClass}`}>No response trail yet</p>
            <p className={`mt-1 text-sm leading-6 ${mutedClass}`}>
              When a child signal is reviewed, messaged, escalated, or resolved, the evidence will appear here.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const Icon = kindIconMap[item.kind];
            return (
              <article key={item.id} className={`rounded-2xl border p-4 ${itemClass}`}>
                <div className="flex gap-3">
                  <span className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${severityStyles[item.severity]}`}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-xs font-black uppercase tracking-[0.14em] ${isDark ? 'text-gray-500' : 'text-slate-400 dark:text-gray-500'}`}>
                          {item.evidenceLabel} · {item.actorLabel}
                        </p>
                        <h3 className={`mt-1 font-black ${headingClass}`}>{item.title}</h3>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${severityStyles[item.severity]}`}>
                        {labelize(item.severity)}
                      </span>
                    </div>
                    <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-gray-300' : 'text-slate-600 dark:text-gray-300'}`}>
                      {item.detail}
                    </p>
                    <div className={`mt-3 flex flex-wrap items-center gap-2 text-xs font-bold ${mutedClass}`}>
                      <span>{item.childName}</span>
                      {item.buddyId && <span>{item.buddyId}</span>}
                      {item.status && (
                        <span className={`rounded-full px-2 py-1 ${isDark ? 'bg-white/5 text-gray-300' : 'bg-white text-slate-500 dark:bg-gray-900 dark:text-gray-300'}`}>
                          {item.status}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden />
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
};

export default SupportTimelinePanel;
