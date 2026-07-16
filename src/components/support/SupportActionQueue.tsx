import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Filter,
  Loader2,
  MessageSquareReply,
  RefreshCw,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import {
  NotificationService,
  type NotificationSeverity,
  type NotificationStatus,
  type SupportNotification,
} from 'services/supabase/notificationService';

type QueueFilter<T extends string> = 'all' | T;

interface SupportActionQueueProps {
  title?: string;
  subtitle?: string;
  childIds?: string[];
  limit?: number;
  compact?: boolean;
  variant?: 'light' | 'dark';
}

const severityStyles: Record<NotificationSeverity, string> = {
  urgent: 'border-red-300 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-100',
  high: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-100',
  medium: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-100',
  low: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-100',
};

const actionButtons: { status: NotificationStatus; label: string; icon: LucideIcon }[] = [
  { status: 'seen', label: 'Seen', icon: CheckCircle2 },
  { status: 'responded', label: 'Respond', icon: MessageSquareReply },
  { status: 'escalated', label: 'Escalate', icon: ShieldAlert },
  { status: 'resolved', label: 'Resolve', icon: CheckCircle2 },
];

const severityFilters: QueueFilter<NotificationSeverity>[] = ['all', 'urgent', 'high', 'medium', 'low'];
const statusFilters: QueueFilter<NotificationStatus>[] = ['all', 'unread', 'seen', 'escalated', 'responded', 'resolved'];

function labelize(value: string): string {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getAgeMinutes(value: string): number {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, Math.round((Date.now() - timestamp) / 60000));
}

function formatAge(value: string): string {
  const minutes = getAgeMinutes(value);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min open`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr open`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} open`;
}

function getAgeTone(notification: SupportNotification): string {
  const minutes = getAgeMinutes(notification.createdAt);
  if (notification.severity === 'urgent' || notification.severity === 'high' || minutes >= 120) {
    return 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100';
  }
  if (notification.severity === 'medium' || minutes >= 45) {
    return 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100';
  }
  return 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100';
}

function getAvailableActions(notification: SupportNotification) {
  return actionButtons.filter((button) => {
    if (notification.allowedStatuses) return notification.allowedStatuses.includes(button.status);
    if (notification.canResolve) return true;
    return button.status === 'seen';
  });
}

function canRequestMeeting(notification: SupportNotification, role?: string | null): boolean {
  return Boolean(
    notification.childId
    && (role === 'parent' || role === 'teacher')
    && !['adult_response', 'care_meeting', 'class_request'].includes(notification.sourceType),
  );
}

const SupportActionQueue: React.FC<SupportActionQueueProps> = ({
  title = 'Support action queue',
  subtitle = 'Open signals, alerts, messages, and task-help requests that still need a visible adult response.',
  childIds,
  limit = 8,
  compact = false,
  variant = 'light',
}) => {
  const { profile, isGuest } = useAuth();
  const [notifications, setNotifications] = useState<SupportNotification[]>([]);
  const [severityFilter, setSeverityFilter] = useState<QueueFilter<NotificationSeverity>>('all');
  const [statusFilter, setStatusFilter] = useState<QueueFilter<NotificationStatus>>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [actionStatus, setActionStatus] = useState('');

  const requestedChildIds = useMemo(
    () => new Set(childIds?.filter(Boolean) ?? []),
    [childIds],
  );

  const loadQueue = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!profile || isGuest) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const data = await NotificationService.getNotifications(profile);
      setNotifications(data);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load support action queue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isGuest, profile]);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  const scopedNotifications = useMemo(
    () =>
      requestedChildIds.size > 0
        ? notifications.filter((notification) => notification.childId && requestedChildIds.has(notification.childId))
        : notifications,
    [notifications, requestedChildIds],
  );

  const filteredNotifications = useMemo(
    () =>
      scopedNotifications
        .filter((notification) => severityFilter === 'all' || notification.severity === severityFilter)
        .filter((notification) => statusFilter === 'all' || notification.status === statusFilter)
        .slice(0, limit),
    [limit, scopedNotifications, severityFilter, statusFilter],
  );

  const counts = useMemo(
    () => ({
      urgent: scopedNotifications.filter((notification) => ['urgent', 'high'].includes(notification.severity)).length,
      escalated: scopedNotifications.filter((notification) => notification.status === 'escalated').length,
      stale: scopedNotifications.filter((notification) => getAgeMinutes(notification.createdAt) >= 120).length,
    }),
    [scopedNotifications],
  );

  const handleStatus = async (notification: SupportNotification, status: NotificationStatus) => {
    if (busyId) return;
    setBusyId(`${notification.id}:${status}`);
    setError('');

    try {
      await NotificationService.setStatus(notification, status);
      setNotifications((current) =>
        current
          .map((item) => (item.id === notification.id ? { ...item, status } : item))
          .filter((item) => {
            if (item.id !== notification.id) return true;
            return !['responded', 'resolved'].includes(status) && item.sourceType !== 'adult_response';
          }),
      );
    } catch (statusError: unknown) {
      setError(statusError instanceof Error ? statusError.message : 'Could not update support action.');
    } finally {
      setBusyId(null);
    }
  };

  const handleRequestMeeting = async (notification: SupportNotification) => {
    if (busyId) return;
    setBusyId(`${notification.id}:meeting`);
    setError('');
    setActionStatus('');

    try {
      await NotificationService.requestMeetingFromNotification(notification);
      setNotifications((current) =>
        current.map((item) => (
          item.id === notification.id ? { ...item, status: 'escalated' } : item
        )),
      );
      setActionStatus('Meeting requested with a structured support agenda.');
    } catch (meetingError: unknown) {
      setError(meetingError instanceof Error ? meetingError.message : 'Could not request meeting.');
    } finally {
      setBusyId(null);
    }
  };

  const isDark = variant === 'dark';
  const wrapperClass = isDark
    ? 'rounded-2xl border border-white/10 bg-slate-900/60 p-5'
    : 'rounded-3xl border border-white/70 bg-white/85 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75';
  const headingClass = isDark ? 'text-white' : 'text-adapt-navy dark:text-gray-100';
  const mutedClass = isDark ? 'text-gray-500' : 'text-slate-500 dark:text-gray-400';
  const controlClass = isDark
    ? 'border-white/10 bg-white/5 text-gray-200'
    : 'border-slate-200 bg-white text-slate-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200';
  const emptyClass = isDark
    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
    : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100';

  if (!profile || isGuest) return null;

  return (
    <section className={wrapperClass}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? 'text-indigo-300' : 'text-adapt-indigo dark:text-adapt-cyan'}`}>
            Action queue
          </p>
          <h2 className={`mt-1 ${compact ? 'text-xl' : 'text-2xl'} font-extrabold ${headingClass}`}>
            {title}
          </h2>
          <p className={`mt-2 max-w-3xl text-sm leading-6 ${mutedClass}`}>
            {subtitle}
          </p>
          <div className={`mt-3 flex flex-wrap gap-2 text-xs font-black ${mutedClass}`}>
            <span>{scopedNotifications.length} open</span>
            <span>{counts.urgent} priority</span>
            <span>{counts.escalated} escalated</span>
            <span>{counts.stale} older than 2 hr</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black ${controlClass}`}>
            <Filter className="h-3.5 w-3.5" aria-hidden />
            <select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value as QueueFilter<NotificationSeverity>)}
              className="bg-transparent outline-none"
              aria-label="Filter support queue by severity"
            >
              {severityFilters.map((value) => (
                <option key={value} value={value}>
                  {value === 'all' ? 'All severity' : labelize(value)}
                </option>
              ))}
            </select>
          </label>
          <label className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-black ${controlClass}`}>
            <Filter className="h-3.5 w-3.5" aria-hidden />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as QueueFilter<NotificationStatus>)}
              className="bg-transparent outline-none"
              aria-label="Filter support queue by status"
            >
              {statusFilters.map((value) => (
                <option key={value} value={value}>
                  {value === 'all' ? 'All status' : labelize(value)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void loadQueue('refresh')}
            disabled={refreshing}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-black transition disabled:opacity-60 ${controlClass}`}
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </p>
      )}

      {actionStatus && (
        <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100">
          {actionStatus}
        </p>
      )}

      <div className={compact ? 'mt-4 space-y-3' : 'mt-6 space-y-3'}>
        {loading ? (
          <div className={`flex items-center justify-center gap-2 rounded-2xl border p-6 text-sm font-bold ${controlClass}`}>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Loading action queue
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className={`rounded-2xl border p-5 text-center ${emptyClass}`}>
            <CheckCircle2 className="mx-auto h-8 w-8" aria-hidden />
            <p className="mt-2 font-black">No open actions in this view</p>
            <p className="mt-1 text-sm opacity-75">
              New signals, help requests, alerts, or escalation events will appear here.
            </p>
          </div>
        ) : (
          filteredNotifications.map((notification) => {
            const busyPrefix = `${notification.id}:`;
            const isBusy = Boolean(busyId?.startsWith(busyPrefix));
            const actions = getAvailableActions(notification);
            const showMeetingAction = canRequestMeeting(notification, profile.role);
            const PriorityIcon = notification.severity === 'urgent' || notification.severity === 'high'
              ? ShieldAlert
              : AlertTriangle;

            return (
              <article key={notification.id} className={`rounded-2xl border p-4 ${severityStyles[notification.severity]}`}>
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-current shadow-sm dark:bg-black/20">
                      <PriorityIcon className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-black">{notification.title}</h3>
                        <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-black dark:bg-black/20">
                          {labelize(notification.severity)}
                        </span>
                        <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-black dark:bg-black/20">
                          {labelize(notification.status)}
                        </span>
                      </div>
                      <p className="mt-2 max-w-4xl text-sm leading-6 opacity-85">{notification.body}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-black opacity-75">
                        {notification.childName && <span>{notification.childName}</span>}
                        {notification.buddyId && <span>{notification.buddyId}</span>}
                        <span>{labelize(notification.sourceType)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 xl:items-end">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black ${getAgeTone(notification)}`}>
                      <Clock3 className="h-3.5 w-3.5" aria-hidden />
                      {formatAge(notification.createdAt)}
                    </span>
                    <div className="flex flex-wrap gap-2 xl:justify-end">
                      <Link
                        to={notification.actionUrl}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-adapt-navy shadow-sm transition hover:bg-slate-50 dark:bg-gray-900 dark:text-gray-100"
                      >
                        {notification.actionLabel}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                      {actions.map((action) => {
                        const Icon = action.icon;
                        return (
                          <button
                            key={action.status}
                            type="button"
                            onClick={() => void handleStatus(notification, action.status)}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-white/70 px-3 py-2 text-xs font-black text-current transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-black/20 dark:hover:bg-black/30"
                          >
                            {busyId === `${notification.id}:${action.status}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                            ) : (
                              <Icon className="h-3.5 w-3.5" aria-hidden />
                            )}
                            {action.label}
                          </button>
                        );
                      })}
                      {showMeetingAction && (
                        <button
                          type="button"
                          onClick={() => void handleRequestMeeting(notification)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-white/70 px-3 py-2 text-xs font-black text-current transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-black/20 dark:hover:bg-black/30"
                        >
                          {busyId === `${notification.id}:meeting` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          ) : (
                            <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
                          )}
                          Request meeting
                        </button>
                      )}
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

export default SupportActionQueue;
