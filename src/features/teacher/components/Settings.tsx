import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  GraduationCap,
  Loader2,
  Lock,
  RefreshCw,
  School,
  ShieldCheck,
} from 'lucide-react';
import TeacherHubNav from 'features/teacher/components/TeacherHubNav';
import { useAuth } from 'hooks/useAuth';
import {
  TeacherDashboardService,
  type TeacherDashboardSummary,
} from 'features/teacher/services/teacherDashboardService';
import FeedbackPulsePanel from 'components/feedback/FeedbackPulsePanel';

const notificationOptions = [
  { id: 'learner_help', label: 'Learner asks for help' },
  { id: 'parent_approval', label: 'Parent approves access' },
  { id: 'parent_decline', label: 'Parent declines access' },
  { id: 'assignment_completed', label: 'Assignment is completed' },
  { id: 'high_support_signal', label: 'High support signal appears' },
] as const;

type NotificationOptionId = (typeof notificationOptions)[number]['id'];
type NotificationPreferences = Record<NotificationOptionId, boolean>;

const defaultNotificationPreferences = notificationOptions.reduce(
  (preferences, option) => ({
    ...preferences,
    [option.id]: true,
  }),
  {} as NotificationPreferences,
);

const getNotificationStorageKey = (teacherId: string): string =>
  `adaptbuddy-teacher-notifications:${teacherId}`;

const readNotificationPreferences = (teacherId: string): NotificationPreferences => {
  if (typeof window === 'undefined') return defaultNotificationPreferences;

  try {
    const raw = window.localStorage.getItem(getNotificationStorageKey(teacherId));
    if (!raw) return defaultNotificationPreferences;
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;

    return notificationOptions.reduce(
      (preferences, option) => ({
        ...preferences,
        [option.id]: typeof parsed[option.id] === 'boolean' ? parsed[option.id] : true,
      }),
      {} as NotificationPreferences,
    );
  } catch {
    return defaultNotificationPreferences;
  }
};

const writeNotificationPreferences = (
  teacherId: string,
  preferences: NotificationPreferences,
): void => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getNotificationStorageKey(teacherId), JSON.stringify(preferences));
};

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Could not load teacher settings.';
};

const formatDistanceToNow = (isoDate: string): string => {
  const timestamp = new Date(isoDate).getTime();
  if (!Number.isFinite(timestamp)) return 'just now';

  const diffSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (diffSeconds < 10) return 'just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;

  const diffMinutes = Math.round(diffSeconds / 60);
  return `${diffMinutes}m ago`;
};

const Settings: React.FC = () => {
  const { profile, user, isGuest } = useAuth();
  const [summary, setSummary] = useState<TeacherDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settingsSavedAt, setSettingsSavedAt] = useState<string | null>(null);

  const teacherName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
    || profile?.full_name
    || user?.email?.split('@')[0]
    || 'Teacher';
  const teacherStorageId = profile?.id || user?.id || user?.email || 'guest-teacher';
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(() =>
    readNotificationPreferences(teacherStorageId),
  );

  const loadSettings = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const data = await TeacherDashboardService.getDashboardSummary();
      setSummary(data);
    } catch (loadError) {
      console.error('Error loading teacher settings:', loadError);
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    setNotificationPreferences(readNotificationPreferences(teacherStorageId));
    setSettingsSavedAt(null);
  }, [teacherStorageId]);

  const updateNotificationPreference = (id: NotificationOptionId, enabled: boolean) => {
    setNotificationPreferences((current) => {
      const next = { ...current, [id]: enabled };
      writeNotificationPreferences(teacherStorageId, next);
      return next;
    });
    setSettingsSavedAt(new Date().toISOString());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
        <TeacherHubNav />
        <div className="flex items-center justify-center px-4 py-16">
          <Loader2 className="h-10 w-10 animate-spin text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <TeacherHubNav />
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        <header className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card dark:border-gray-800 dark:bg-gray-900/80">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-adapt-indigo dark:text-adapt-cyan">
                Settings
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-adapt-navy dark:text-gray-100">
                Teacher control centre
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-gray-400">
                Manage your teacher profile, notification preferences, class setup, and privacy boundaries.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadSettings('refresh')}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        )}

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <article className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/80">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                <GraduationCap className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">{teacherName}</h2>
                <p className="text-sm font-semibold text-slate-500 dark:text-gray-400">{user?.email ?? 'Teacher account'}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-gray-950">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">Mode</p>
                <p className="mt-1 font-black text-adapt-navy dark:text-gray-100">
                  {isGuest ? 'Demo data active' : 'Real data mode'}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-gray-950">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">Classes</p>
                <p className="mt-1 font-black text-adapt-navy dark:text-gray-100">{summary?.classes.length ?? 0}</p>
              </div>
            </div>
          </article>

          <article className="rounded-3xl border border-adapt-indigo/15 bg-white/85 p-5 shadow-soft dark:border-adapt-cyan/20 dark:bg-gray-900/80">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                <ShieldCheck className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">Privacy boundaries</h2>
                <p className="text-sm text-slate-500 dark:text-gray-400">Parent-approved visibility cannot be overridden by teachers.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                'Teachers only see what parents or guardians approve.',
                'Worry diary text is hidden unless explicitly shared.',
                'Safeguarding alerts are shown only to approved adults.',
              ].map((rule) => (
                <div key={rule} className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600 dark:bg-gray-950 dark:text-gray-300">
                  <Lock className="mb-2 h-4 w-4 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
                  {rule}
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/80">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
                <div>
                  <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">Notifications</h2>
                  <p className="text-sm text-slate-500 dark:text-gray-400">
                    Saved for this teacher account on this device.
                  </p>
                </div>
              </div>
              {settingsSavedAt && (
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100">
                  Saved {formatDistanceToNow(settingsSavedAt)}
                </span>
              )}
            </div>
            <div className="mt-4 grid gap-3">
              {notificationOptions.map((option) => (
                <label
                  key={option.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 dark:bg-gray-950 dark:text-gray-200"
                >
                  {option.label}
                  <input
                    type="checkbox"
                    checked={notificationPreferences[option.id]}
                    onChange={(event) => updateNotificationPreference(option.id, event.target.checked)}
                    className="h-5 w-5 accent-adapt-indigo"
                  />
                </label>
              ))}
            </div>
          </article>

          <article className="rounded-3xl border border-white/70 bg-white/85 p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900/80">
            <div className="flex items-center gap-3">
              <School className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
              <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">Class settings</h2>
            </div>
            <div className="mt-4 space-y-3">
              {summary?.classes.length ? (
                summary.classes.map((teacherClass) => (
                  <div key={teacherClass.id} className="rounded-2xl bg-slate-50 p-4 dark:bg-gray-950">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-adapt-navy dark:text-gray-100">{teacherClass.className}</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
                          {teacherClass.subject} {teacherClass.yearGroup ? `· ${teacherClass.yearGroup}` : ''}
                        </p>
                      </div>
                      <span className="rounded-xl bg-white px-3 py-2 font-mono text-xs font-black text-adapt-indigo shadow-sm dark:bg-gray-900 dark:text-adapt-cyan">
                        {teacherClass.classCode}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm font-semibold text-slate-500 dark:border-gray-800 dark:text-gray-400">
                  Create a class to manage class codes and learner access.
                </p>
              )}
            </div>
          </article>
        </section>

        <FeedbackPulsePanel
          title="Teacher feedback loop"
          subtitle="Tell us where the class workflow is strong, where it slows you down, and what would help SENCO or classroom support."
          sourceArea="teacher_settings"
          showSummary
          compact
        />

        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-700 dark:text-emerald-200" aria-hidden />
            <p className="text-sm font-semibold leading-6 text-emerald-900 dark:text-emerald-100">
              AdaptBuddy keeps the teacher experience useful without giving teachers a back door into private child
              spaces. That privacy posture is part of the product, not an afterthought.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
