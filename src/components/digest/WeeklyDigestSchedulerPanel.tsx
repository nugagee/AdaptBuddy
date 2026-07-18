import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckCircle2,
  Download,
  Loader2,
  Mail,
  RefreshCw,
  Save,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import { formatEvidenceTimelineItem } from 'services/supabase/evidencePackService';
import { type BuddyDigestScope } from 'services/supabase/buddyDigestService';
import {
  WeeklyDigestService,
  type WeeklyDigestDeliveryMethod,
  type WeeklyDigestFrequency,
  type WeeklyDigestSnapshot,
  type WeeklyDigestSubscription,
} from 'services/supabase/weeklyDigestService';

interface WeeklyDigestSchedulerPanelProps {
  title?: string;
  subtitle?: string;
  childIds?: string[];
  classId?: string | null;
  scope?: BuddyDigestScope;
  compact?: boolean;
  variant?: 'light' | 'dark';
}

interface SchedulerForm {
  enabled: boolean;
  deliveryMethod: WeeklyDigestDeliveryMethod;
  frequency: WeeklyDigestFrequency;
  emailTo: string;
  dayOfWeek: number;
  preferredHour: number;
}

const dayOptions = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const hourOptions = Array.from({ length: 24 }, (_, hour) => ({
  value: hour,
  label: `${String(hour).padStart(2, '0')}:00`,
}));

const frequencyLabels: Record<WeeklyDigestFrequency, string> = {
  weekly: 'Weekly',
  fortnightly: 'Fortnightly',
  monthly: 'Monthly',
};

const deliveryLabels: Record<WeeklyDigestDeliveryMethod, string> = {
  in_app: 'In-app only',
  email: 'Email-ready',
  both: 'In-app + email-ready',
};

const statusStyles: Record<WeeklyDigestSnapshot['status'], string> = {
  draft: 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-200',
  generated: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-100',
  email_ready: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-100',
  sent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100',
  failed: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-100',
  archived: 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-200',
};

const defaultForm = (email?: string): SchedulerForm => ({
  enabled: true,
  deliveryMethod: 'both',
  frequency: 'weekly',
  emailTo: email ?? '',
  dayOfWeek: 0,
  preferredHour: 9,
});

const formatDateTime = (value?: string | null): string => {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const labelize = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 56) || 'weekly-digest';

const getScope = (role?: string, requested?: BuddyDigestScope): BuddyDigestScope => {
  if (requested) return requested;
  if (role === 'teacher') return 'class';
  if (role === 'admin') return 'platform';
  return 'child';
};

const getTargetChildIds = (snapshot: WeeklyDigestSnapshot): string[] => {
  const values = snapshot.metadata.target_child_ids;
  return Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string') : [];
};

const sameStringArray = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const matchesSnapshotTarget = (
  snapshot: WeeklyDigestSnapshot,
  scope: BuddyDigestScope,
  childIds?: string[],
  classId?: string | null,
): boolean => {
  if (snapshot.scope !== scope) return false;
  if (scope === 'platform') return true;

  const requestedChildren = childIds ?? [];
  if (scope === 'child') {
    if (!requestedChildren.length) return !snapshot.childId;
    return snapshot.childId === requestedChildren[0] || getTargetChildIds(snapshot).includes(requestedChildren[0]);
  }

  if (classId) return snapshot.classId === classId;
  return sameStringArray(getTargetChildIds(snapshot), requestedChildren);
};

const buildSnapshotText = (snapshot: WeeklyDigestSnapshot): string => {
  const digest = snapshot.digest;
  const pack = snapshot.evidencePack;

  return [
    snapshot.title,
    `Subject: ${snapshot.subjectName}`,
    `Window: ${snapshot.windowLabel}`,
    `Generated: ${formatDateTime(snapshot.generatedAt)}`,
    `Priority: ${labelize(snapshot.priority)}`,
    `Status: ${labelize(snapshot.status)}`,
    snapshot.emailTo ? `Email target: ${snapshot.emailTo}` : null,
    '',
    'Buddy Digest',
    digest.headline,
    '',
    ...digest.summary.map((item) => `- ${item}`),
    '',
    'Wins',
    ...(digest.wins.length ? digest.wins : ['No specific wins recorded yet.']).map((item) => `- ${item}`),
    '',
    'Watchouts',
    ...(digest.watchouts.length ? digest.watchouts : ['No major watchouts recorded.']).map((item) => `- ${item}`),
    '',
    'Suggested Actions',
    ...digest.suggestedActions.map((action) => `- ${action.label}: ${action.detail}`),
    '',
    'Evidence Pack Metrics',
    ...pack.metrics.map((metric) => `- ${metric.label}: ${metric.value} (${metric.detail})`),
    '',
    ...pack.supportSections.flatMap((section) => [
      section.title,
      ...(section.items.length ? section.items : ['No evidence recorded yet.']).map((item) => `- ${item}`),
      '',
    ]),
    'Latest Evidence Timeline',
    ...(pack.timeline.length ? pack.timeline.map(formatEvidenceTimelineItem) : ['No timeline evidence yet.']).map(
      (item) => `- ${item}`,
    ),
    '',
    'Privacy Boundary',
    pack.privacyNote,
  ].filter((line): line is string => line !== null).join('\n');
};

const downloadSnapshot = (snapshot: WeeklyDigestSnapshot): void => {
  const blob = new Blob([buildSnapshotText(snapshot)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${slugify(snapshot.title)}-${new Date(snapshot.generatedAt).toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const WeeklyDigestSchedulerPanel: React.FC<WeeklyDigestSchedulerPanelProps> = ({
  title,
  subtitle,
  childIds,
  classId,
  scope,
  compact = false,
  variant = 'light',
}) => {
  const { profile, isGuest } = useAuth();
  const [subscription, setSubscription] = useState<WeeklyDigestSubscription | null>(null);
  const [snapshots, setSnapshots] = useState<WeeklyDigestSnapshot[]>([]);
  const [form, setForm] = useState<SchedulerForm>(() => defaultForm());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [markingId, setMarkingId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const childKey = useMemo(() => (childIds ?? []).join('|'), [childIds]);
  const stableChildIds = useMemo(() => {
    const values = childKey.split('|').filter(Boolean);
    return values.length ? values : undefined;
  }, [childKey]);

  const resolvedScope = useMemo(() => getScope(profile?.role, scope), [profile?.role, scope]);

  const loadScheduler = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!profile || isGuest) {
      setLoading(false);
      return;
    }

    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const [nextSubscription, nextSnapshots] = await Promise.all([
        WeeklyDigestService.getSubscription(profile, {
          childIds: stableChildIds,
          classId,
          scope: resolvedScope,
        }),
        WeeklyDigestService.getSnapshots(profile, 10),
      ]);

      setSubscription(nextSubscription);
      setForm({
        enabled: nextSubscription?.enabled ?? true,
        deliveryMethod: nextSubscription?.deliveryMethod ?? 'both',
        frequency: nextSubscription?.frequency ?? 'weekly',
        emailTo: nextSubscription?.emailTo ?? profile.email ?? '',
        dayOfWeek: nextSubscription?.dayOfWeek ?? 0,
        preferredHour: nextSubscription?.preferredHour ?? 9,
      });
      setSnapshots(
        nextSnapshots.filter((snapshot) =>
          matchesSnapshotTarget(snapshot, resolvedScope, stableChildIds, classId),
        ),
      );
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load weekly digest schedule.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [classId, isGuest, profile, resolvedScope, stableChildIds]);

  useEffect(() => {
    void loadScheduler();
  }, [loadScheduler]);

  if (!profile || isGuest) return null;

  const setField = <K extends keyof SchedulerForm>(key: K, value: SchedulerForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSuccess('');
    setError('');
  };

  const handleSave = async () => {
    if (form.deliveryMethod !== 'in_app' && !form.emailTo.trim()) {
      setError('Add an email address before saving email-ready delivery.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const nextSubscription = await WeeklyDigestService.saveSubscription(profile, {
        childIds: stableChildIds,
        classId,
        scope: resolvedScope,
        enabled: form.enabled,
        frequency: form.frequency,
        deliveryMethod: form.deliveryMethod,
        emailTo: form.emailTo,
        dayOfWeek: form.dayOfWeek,
        preferredHour: form.preferredHour,
      });
      setSubscription(nextSubscription);
      setSuccess('Weekly digest schedule saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save weekly digest schedule.');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      const snapshot = await WeeklyDigestService.generateSnapshot(profile, {
        childIds: stableChildIds,
        classId,
        scope: resolvedScope,
        markEmailReady: form.deliveryMethod !== 'in_app',
      });
      setSnapshots((current) => [snapshot, ...current].slice(0, 10));
      setSuccess(
        snapshot.status === 'email_ready'
          ? 'Digest snapshot generated and marked email-ready.'
          : 'Digest snapshot generated.',
      );
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Could not generate a digest snapshot.');
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkEmailReady = async (snapshot: WeeklyDigestSnapshot) => {
    setMarkingId(snapshot.id);
    setError('');
    setSuccess('');

    try {
      await WeeklyDigestService.markSnapshotEmailReady(snapshot.id);
      setSnapshots((current) =>
        current.map((item) =>
          item.id === snapshot.id
            ? { ...item, status: 'email_ready', emailReadyAt: new Date().toISOString() }
            : item,
        ),
      );
      setSuccess('Snapshot marked email-ready.');
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : 'Could not mark snapshot email-ready.');
    } finally {
      setMarkingId('');
    }
  };

  const dark = variant === 'dark';
  const wrapperClass = dark
    ? 'rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-white shadow-2xl shadow-black/20'
    : 'rounded-3xl border border-white/70 bg-white/85 p-5 text-adapt-navy shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-100';
  const mutedClass = dark ? 'text-slate-300' : 'text-slate-500 dark:text-gray-400';
  const fieldClass = dark
    ? 'border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-adapt-cyan focus:ring-adapt-cyan/20'
    : 'border-slate-200 bg-white text-adapt-navy placeholder:text-slate-400 focus:border-adapt-indigo focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100';
  const panelClass = dark
    ? 'border border-white/10 bg-white/5'
    : 'border border-slate-100 bg-white/75 dark:border-gray-800 dark:bg-gray-950/40';

  return (
    <section className={`${wrapperClass} ${compact ? 'space-y-4' : 'space-y-5'}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
            <CalendarClock className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-adapt-indigo dark:text-adapt-cyan">
              Weekly Digest
            </p>
            <h2 className={`${compact ? 'text-xl' : 'text-2xl'} mt-1 font-extrabold`}>
              {title ?? 'Schedule Buddy Digest'}
            </h2>
            <p className={`mt-2 max-w-3xl text-sm leading-6 ${mutedClass}`}>
              {subtitle ?? 'Create recurring, email-ready snapshots for parent updates, school meetings, and support review.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${
            form.enabled
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100'
              : 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-200'
          }`}>
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            {form.enabled ? 'Enabled' : 'Paused'}
          </span>
          <button
            type="button"
            onClick={() => void loadScheduler('refresh')}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:border-adapt-indigo/40 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className={`rounded-2xl p-4 ${panelClass}`}>
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
            <p className={`text-sm font-bold ${mutedClass}`}>Loading weekly digest schedule...</p>
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
              {success}
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className={`rounded-2xl p-4 ${panelClass}`}>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm font-black text-adapt-navy dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-100">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(event) => setField('enabled', event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300 text-adapt-indigo focus:ring-adapt-indigo"
                  />
                  Send recurring digest
                </label>

                <label className="text-sm font-black text-adapt-navy dark:text-gray-100" htmlFor="weekly-digest-delivery">
                  Delivery
                  <select
                    id="weekly-digest-delivery"
                    value={form.deliveryMethod}
                    onChange={(event) => setField('deliveryMethod', event.target.value as WeeklyDigestDeliveryMethod)}
                    className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none focus:ring-2 ${fieldClass}`}
                  >
                    {Object.entries(deliveryLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-black text-adapt-navy dark:text-gray-100" htmlFor="weekly-digest-frequency">
                  Frequency
                  <select
                    id="weekly-digest-frequency"
                    value={form.frequency}
                    onChange={(event) => setField('frequency', event.target.value as WeeklyDigestFrequency)}
                    className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none focus:ring-2 ${fieldClass}`}
                  >
                    {Object.entries(frequencyLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-black text-adapt-navy dark:text-gray-100" htmlFor="weekly-digest-email">
                  Email target
                  <input
                    id="weekly-digest-email"
                    type="email"
                    value={form.emailTo}
                    onChange={(event) => setField('emailTo', event.target.value)}
                    placeholder="parent@example.com"
                    className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none focus:ring-2 ${fieldClass}`}
                  />
                </label>

                <label className="text-sm font-black text-adapt-navy dark:text-gray-100" htmlFor="weekly-digest-day">
                  Day
                  <select
                    id="weekly-digest-day"
                    value={form.dayOfWeek}
                    onChange={(event) => setField('dayOfWeek', Number(event.target.value))}
                    className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none focus:ring-2 ${fieldClass}`}
                  >
                    {dayOptions.map((day) => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-black text-adapt-navy dark:text-gray-100" htmlFor="weekly-digest-hour">
                  Time
                  <select
                    id="weekly-digest-hour"
                    value={form.preferredHour}
                    onChange={(event) => setField('preferredHour', Number(event.target.value))}
                    className={`mt-2 w-full rounded-2xl border px-4 py-3 text-sm font-bold outline-none focus:ring-2 ${fieldClass}`}
                  >
                    {hourOptions.map((hour) => (
                      <option key={hour.value} value={hour.value}>{hour.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-adapt-indigo px-4 py-3 text-sm font-black text-white shadow-soft transition hover:bg-adapt-indigo/90 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
                  Save schedule
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-adapt-indigo/40 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                  Generate now
                </button>
              </div>
            </div>

            <aside className={`rounded-2xl p-4 ${panelClass}`}>
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-100 text-adapt-indigo dark:bg-indigo-950/40 dark:text-indigo-100">
                  <ShieldCheck className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-black text-adapt-navy dark:text-gray-100">Pipeline status</p>
                  <p className={`mt-1 text-sm leading-6 ${mutedClass}`}>
                    Snapshots marked email-ready are stored for the server email worker. This keeps the browser safe:
                    no OpenAI key, SMTP key, or private delivery secret is exposed client-side.
                  </p>
                </div>
              </div>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className={`font-bold ${mutedClass}`}>Next run</dt>
                  <dd className="mt-1 font-black text-adapt-navy dark:text-gray-100">
                    {formatDateTime(subscription?.nextRunAt)}
                  </dd>
                </div>
                <div>
                  <dt className={`font-bold ${mutedClass}`}>Last generated</dt>
                  <dd className="mt-1 font-black text-adapt-navy dark:text-gray-100">
                    {formatDateTime(subscription?.lastGeneratedAt ?? snapshots[0]?.generatedAt)}
                  </dd>
                </div>
              </dl>
            </aside>
          </div>

          <section className={`rounded-2xl p-4 ${panelClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-black text-adapt-navy dark:text-gray-100">Generated snapshots</p>
                <p className={`mt-1 text-xs font-bold ${mutedClass}`}>
                  Keep these as a meeting-ready record, or mark them email-ready for the delivery worker.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-adapt-indigo/10 px-3 py-2 text-xs font-black text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                <Mail className="h-4 w-4" aria-hidden />
                {deliveryLabels[form.deliveryMethod]}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {snapshots.length > 0 ? (
                snapshots.slice(0, 5).map((snapshot) => (
                  <article
                    key={snapshot.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white/80 p-4 dark:border-gray-800 dark:bg-gray-950/40 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-adapt-navy dark:text-gray-100">{snapshot.subjectName}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${statusStyles[snapshot.status]}`}>
                          {labelize(snapshot.status)}
                        </span>
                      </div>
                      <p className={`mt-1 text-sm ${mutedClass}`}>
                        {snapshot.windowLabel} · generated {formatDateTime(snapshot.generatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => downloadSnapshot(snapshot)}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:border-adapt-indigo/40 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                      >
                        <Download className="h-4 w-4" aria-hidden />
                        Download
                      </button>
                      {snapshot.status !== 'email_ready' && snapshot.status !== 'sent' && (
                        <button
                          type="button"
                          onClick={() => void handleMarkEmailReady(snapshot)}
                          disabled={markingId === snapshot.id || snapshot.id.startsWith('local-')}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-adapt-indigo px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-adapt-indigo/90 disabled:opacity-60"
                        >
                          {markingId === snapshot.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            <Mail className="h-4 w-4" aria-hidden />
                          )}
                          Email-ready
                        </button>
                      )}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-5 text-center dark:border-gray-700 dark:bg-gray-950/30">
                  <p className="font-black text-adapt-navy dark:text-gray-100">No digest snapshots yet</p>
                  <p className={`mt-1 text-sm ${mutedClass}`}>Generate one now after saving the schedule.</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
};

export default WeeklyDigestSchedulerPanel;
