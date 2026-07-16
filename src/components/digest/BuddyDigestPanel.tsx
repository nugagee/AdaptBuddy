import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  Loader2,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import {
  BuddyDigestService,
  type BuddyDigest,
  type BuddyDigestPriority,
  type BuddyDigestScope,
} from 'services/supabase/buddyDigestService';

interface BuddyDigestPanelProps {
  title?: string;
  subtitle?: string;
  childIds?: string[];
  scope?: BuddyDigestScope;
  compact?: boolean;
  variant?: 'light' | 'dark';
}

const priorityStyles: Record<
  BuddyDigestPriority,
  {
    label: string;
    badge: string;
    panel: string;
    icon: LucideIcon;
  }
> = {
  steady: {
    label: 'Steady',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200',
    panel: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100',
    icon: CheckCircle2,
  },
  watch: {
    label: 'Watch',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-200',
    panel: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100',
    icon: ShieldCheck,
  },
  urgent: {
    label: 'Urgent',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-200',
    panel: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-100',
    icon: AlertTriangle,
  },
};

const metricLabels: Array<{
  key: keyof BuddyDigest['metrics'];
  label: string;
}> = [
  { key: 'evidence', label: 'Evidence' },
  { key: 'openActions', label: 'Open actions' },
  { key: 'urgentSignals', label: 'Urgent' },
  { key: 'resolvedResponses', label: 'Resolved' },
  { key: 'supportPlans', label: 'Plans' },
  { key: 'feedbackConcerns', label: 'Feedback' },
];

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const buildDownloadText = (digest: BuddyDigest): string => [
  digest.title,
  `Subject: ${digest.subjectName}`,
  `Window: ${digest.windowLabel}`,
  `Generated: ${formatDateTime(digest.generatedAt)}`,
  `Priority: ${priorityStyles[digest.priority].label}`,
  '',
  digest.headline,
  '',
  'Summary',
  ...digest.summary.map((item) => `- ${item}`),
  '',
  'Wins',
  ...digest.wins.map((item) => `- ${item}`),
  '',
  'Watchouts',
  ...(digest.watchouts.length ? digest.watchouts : ['No major watchouts recorded.']).map((item) => `- ${item}`),
  '',
  'Suggested Actions',
  ...digest.suggestedActions.map((item) => `- ${item.label}: ${item.detail}`),
  '',
  'Talking Points',
  ...(digest.talkingPoints.length ? digest.talkingPoints : ['Keep collecting shared support evidence.']).map(
    (item) => `- ${item}`,
  ),
  '',
  'Privacy note: This digest is a support coordination aid. It is not a diagnosis or clinical decision.',
].join('\n');

const downloadDigest = (digest: BuddyDigest): void => {
  const blob = new Blob([buildDownloadText(digest)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${digest.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const BuddyDigestPanel: React.FC<BuddyDigestPanelProps> = ({
  title,
  subtitle,
  childIds,
  scope,
  compact = false,
  variant = 'light',
}) => {
  const { profile, loading } = useAuth();
  const [digest, setDigest] = useState<BuddyDigest | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const childKey = useMemo(() => (childIds ?? []).join('|'), [childIds]);
  const stableChildIds = useMemo(() => {
    const values = childKey.split('|').filter(Boolean);
    return values.length ? values : undefined;
  }, [childKey]);

  const loadDigest = useCallback(async () => {
    if (!profile) return;
    setRefreshing(true);
    setError('');

    try {
      const nextDigest = await BuddyDigestService.getDigest(profile, { childIds: stableChildIds, scope });
      setDigest(nextDigest);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Could not build Buddy Digest yet.';
      setError(message);
    } finally {
      setRefreshing(false);
    }
  }, [profile, scope, stableChildIds]);

  useEffect(() => {
    void loadDigest();
  }, [loadDigest]);

  const dark = variant === 'dark';
  const shellClass = dark
    ? 'border border-white/10 bg-slate-900/70 text-white shadow-2xl shadow-black/20'
    : 'border border-white/70 bg-white/85 text-adapt-navy shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-100';
  const mutedClass = dark ? 'text-slate-300' : 'text-slate-500 dark:text-gray-400';
  const sectionClass = dark
    ? 'border border-white/10 bg-white/5'
    : 'border border-slate-100 bg-white/70 dark:border-gray-800 dark:bg-gray-950/40';

  if (!profile && loading) {
    return (
      <section className={`rounded-3xl p-5 ${shellClass}`} aria-busy="true">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
          <p className={`text-sm font-bold ${mutedClass}`}>Building Buddy Digest...</p>
        </div>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className={`rounded-3xl p-5 ${shellClass}`}>
        <div className="flex items-start gap-3">
          <Sparkles className="mt-1 h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
          <div>
            <h2 className="text-lg font-extrabold">Buddy Digest</h2>
            <p className={`mt-1 text-sm ${mutedClass}`}>Sign in to build a weekly support snapshot.</p>
          </div>
        </div>
      </section>
    );
  }

  const styles = priorityStyles[digest?.priority ?? 'steady'];
  const PriorityIcon = styles.icon;

  return (
    <section className={`rounded-3xl p-5 ${compact ? 'space-y-4' : 'space-y-5'} ${shellClass}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
            <Sparkles className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-adapt-indigo dark:text-adapt-cyan">
              Buddy Digest
            </p>
            <h2 className="mt-1 text-2xl font-extrabold">{title ?? digest?.title ?? 'Buddy Digest'}</h2>
            <p className={`mt-1 max-w-3xl text-sm leading-6 ${mutedClass}`}>
              {subtitle ?? 'A weekly support snapshot built from shared signals, actions, meetings, task progress, and feedback.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {digest && (
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${styles.badge}`}>
              <PriorityIcon className="h-4 w-4" aria-hidden />
              {styles.label}
            </span>
          )}
          <button
            type="button"
            onClick={loadDigest}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:border-adapt-indigo/40 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
          {digest && (
            <button
              type="button"
              onClick={() => downloadDigest(digest)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:border-adapt-indigo/40 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
            >
              <Download className="h-4 w-4" aria-hidden />
              Download
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {!digest && !error && (
        <div className={`rounded-2xl p-4 ${sectionClass}`}>
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
            <p className={`text-sm font-bold ${mutedClass}`}>Collecting this week's support evidence...</p>
          </div>
        </div>
      )}

      {digest && (
        <>
          <div className={`rounded-2xl border p-4 ${styles.panel}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-lg font-extrabold">{digest.headline}</p>
              <span className="text-xs font-black uppercase tracking-[0.16em] opacity-80">
                {digest.windowLabel}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold opacity-90">
              Generated {formatDateTime(digest.generatedAt)}. This is a support coordination aid, not a diagnosis.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {metricLabels.map((metric) => (
              <div key={metric.key} className={`rounded-2xl p-4 ${sectionClass}`}>
                <p className={`text-xs font-black uppercase tracking-[0.16em] ${mutedClass}`}>{metric.label}</p>
                <p className="mt-2 text-2xl font-black">{digest.metrics[metric.key]}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <DigestList
              title="Summary"
              icon={ClipboardList}
              items={digest.summary}
              empty="No summary evidence yet."
              className={sectionClass}
              mutedClass={mutedClass}
            />
            <DigestList
              title="Wins"
              icon={CheckCircle2}
              items={digest.wins}
              empty="No wins logged yet."
              className={sectionClass}
              mutedClass={mutedClass}
            />
            <DigestList
              title="Watchouts"
              icon={AlertTriangle}
              items={digest.watchouts}
              empty="No major watchouts recorded."
              className={sectionClass}
              mutedClass={mutedClass}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className={`rounded-2xl p-4 ${sectionClass}`}>
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
                <h3 className="text-base font-extrabold">Suggested next actions</h3>
              </div>
              <div className="space-y-3">
                {digest.suggestedActions.map((action) => (
                  <div key={`${action.label}-${action.detail}`} className="rounded-2xl border border-slate-100 bg-white/70 p-3 dark:border-gray-800 dark:bg-gray-950/50">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black">{action.label}</p>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${priorityStyles[action.tone].badge}`}>
                        {priorityStyles[action.tone].label}
                      </span>
                    </div>
                    <p className={`mt-1 text-sm leading-6 ${mutedClass}`}>{action.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <DigestList
              title="Meeting talking points"
              icon={MessageSquareText}
              items={digest.talkingPoints}
              empty="Keep collecting shared support evidence."
              className={sectionClass}
              mutedClass={mutedClass}
            />
          </div>
        </>
      )}
    </section>
  );
};

interface DigestListProps {
  title: string;
  icon: LucideIcon;
  items: string[];
  empty: string;
  className: string;
  mutedClass: string;
}

const DigestList: React.FC<DigestListProps> = ({
  title,
  icon: Icon,
  items,
  empty,
  className,
  mutedClass,
}) => (
  <div className={`rounded-2xl p-4 ${className}`}>
    <div className="mb-3 flex items-center gap-2">
      <Icon className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
      <h3 className="text-base font-extrabold">{title}</h3>
    </div>
    <ul className="space-y-2">
      {(items.length ? items : [empty]).map((item) => (
        <li key={item} className={`text-sm leading-6 ${mutedClass}`}>
          {item}
        </li>
      ))}
    </ul>
  </div>
);

export default BuddyDigestPanel;
