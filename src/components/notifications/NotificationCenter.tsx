import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageSquareReply,
  RefreshCw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import {
  NotificationService,
  type NotificationSeverity,
  type NotificationStatus,
  type SupportNotification,
} from 'services/supabase/notificationService';

const severityStyles: Record<NotificationSeverity, string> = {
  urgent: 'border-red-300 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-100',
  high: 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-100',
  medium: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-100',
  low: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-100',
};

const statusButtons: { status: NotificationStatus; label: string }[] = [
  { status: 'seen', label: 'Seen' },
  { status: 'responded', label: 'Responded' },
  { status: 'escalated', label: 'Escalated' },
  { status: 'resolved', label: 'Resolved' },
];

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

function labelize(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const NotificationCenter: React.FC = () => {
  const { profile, isGuest } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<SupportNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const canLoad = Boolean(profile && !isGuest);

  const load = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!profile || isGuest) return;
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const data = await NotificationService.getNotifications(profile);
      setNotifications(data);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isGuest, profile]);

  useEffect(() => {
    if (!canLoad) return;
    void load();
  }, [canLoad, load]);

  const unresolvedCount = useMemo(
    () =>
      notifications.filter((notification) =>
        ['unread', 'seen', 'escalated'].includes(notification.status),
      ).length,
    [notifications],
  );
  const urgentCount = notifications.filter((notification) =>
    ['urgent', 'high'].includes(notification.severity),
  ).length;

  const handleStatus = async (notification: SupportNotification, status: NotificationStatus) => {
    setBusyId(`${notification.id}:${status}`);
    setError('');
    try {
      await NotificationService.setStatus(notification, status);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, status } : item,
        ),
      );
      if (status === 'responded' || status === 'resolved') {
        setNotifications((current) => current.filter((item) => item.id !== notification.id));
      }
    } catch (statusError: unknown) {
      setError(statusError instanceof Error ? statusError.message : 'Could not update notification.');
    } finally {
      setBusyId(null);
    }
  };

  if (!canLoad) return null;

  return (
    <div className="fixed bottom-24 right-4 z-[88]">
      {open && (
        <section className="mb-3 w-[min(92vw,28rem)] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
          <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-gray-800">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-adapt-indigo dark:text-adapt-cyan">
                Support response
              </p>
              <h2 className="mt-1 text-lg font-black text-adapt-navy dark:text-gray-100">
                Notification centre
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                {unresolvedCount} open item{unresolvedCount === 1 ? '' : 's'} · {urgentCount} priority
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void load('refresh')}
                disabled={refreshing}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:border-adapt-indigo/40 hover:text-adapt-indigo disabled:opacity-50 dark:border-gray-800 dark:text-gray-300"
                aria-label="Refresh notifications"
              >
                {refreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden />
                )}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-600 transition hover:border-adapt-indigo/40 hover:text-adapt-indigo dark:border-gray-800 dark:text-gray-300"
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </header>

          {error && (
            <p className="mx-5 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100">
              {error}
            </p>
          )}

          <div className="max-h-[65vh] space-y-3 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 p-6 text-sm font-bold text-slate-500 dark:border-gray-800 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading notifications
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-300" aria-hidden />
                <p className="mt-2 font-black text-emerald-900 dark:text-emerald-100">All clear</p>
                <p className="mt-1 text-sm text-emerald-700/80 dark:text-emerald-100/70">
                  No support items need attention right now.
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const busyPrefix = `${notification.id}:`;
                const isBusy = Boolean(busyId?.startsWith(busyPrefix));

                return (
                  <article
                    key={notification.id}
                    className={`rounded-2xl border p-4 ${severityStyles[notification.severity]}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-current shadow-sm dark:bg-black/20">
                        {notification.severity === 'urgent' || notification.severity === 'high' ? (
                          <ShieldAlert className="h-5 w-5" aria-hidden />
                        ) : (
                          <AlertTriangle className="h-5 w-5" aria-hidden />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <h3 className="font-black">{notification.title}</h3>
                          <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-black dark:bg-black/20">
                            {labelize(notification.severity)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 opacity-85">{notification.body}</p>
                        <p className="mt-2 text-xs font-bold opacity-70">
                          {notification.childName ? `${notification.childName} · ` : ''}
                          {notification.buddyId ? `${notification.buddyId} · ` : ''}
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        to={notification.actionUrl}
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-black text-adapt-navy shadow-sm transition hover:bg-slate-50 dark:bg-gray-900 dark:text-gray-100"
                      >
                        {notification.actionLabel}
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                      {statusButtons.map((button) => (
                        <button
                          key={button.status}
                          type="button"
                          onClick={() => void handleStatus(notification, button.status)}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-white/70 px-3 py-2 text-xs font-black text-current transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-black/20 dark:hover:bg-black/30"
                        >
                          {busyId === `${notification.id}:${button.status}` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          ) : button.status === 'responded' ? (
                            <MessageSquareReply className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                          )}
                          {button.label}
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/60 bg-white text-adapt-navy shadow-card transition hover:-translate-y-0.5 hover:text-adapt-indigo focus:outline-none focus-visible:ring-2 focus-visible:ring-adapt-indigo focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:text-adapt-cyan"
        aria-label="Open notification centre"
        aria-expanded={open}
      >
        <Bell className="h-6 w-6" aria-hidden />
        {unresolvedCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-black text-white shadow-lg">
            {unresolvedCount > 9 ? '9+' : unresolvedCount}
          </span>
        )}
      </button>
    </div>
  );
};

export default NotificationCenter;
