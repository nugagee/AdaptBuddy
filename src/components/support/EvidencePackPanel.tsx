import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import {
  EvidencePackService,
  formatEvidenceTimelineItem,
  type EvidencePack,
  type EvidencePackAction,
  type EvidencePackMetric,
  type EvidencePackSection,
} from 'services/supabase/evidencePackService';
import { type BuddyDigestPriority, type BuddyDigestScope } from 'services/supabase/buddyDigestService';

interface EvidencePackPanelProps {
  title?: string;
  subtitle?: string;
  childIds?: string[];
  scope?: BuddyDigestScope;
  limit?: number;
  compact?: boolean;
  variant?: 'light' | 'dark';
}

const priorityStyles: Record<BuddyDigestPriority, { label: string; badge: string; panel: string; icon: LucideIcon }> = {
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

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Just now';
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 52) || 'evidence-pack';

const formatList = (title: string, items: string[]): string[] => [
  title,
  ...(items.length ? items.map((item) => `- ${item}`) : ['- No evidence recorded yet.']),
];

const buildPackText = (pack: EvidencePack): string => [
  pack.title,
  `Subject: ${pack.subjectName}`,
  `Window: ${pack.windowLabel}`,
  `Generated: ${formatDateTime(pack.generatedAt)}`,
  `Priority: ${priorityStyles[pack.priority].label}`,
  '',
  ...formatList('Executive Summary', pack.executiveSummary),
  '',
  'Metrics',
  ...pack.metrics.map((metric) => `- ${metric.label}: ${metric.value} (${metric.detail})`),
  '',
  ...pack.supportSections.flatMap((section) => [...formatList(section.title, section.items), '']),
  ...formatList('Suggested Next Actions', pack.nextActions.map((action) => `${action.label}: ${action.detail}`)),
  '',
  ...formatList('Meeting Talking Points', pack.talkingPoints),
  '',
  ...formatList('Open Adult Actions', pack.openActions.map((action) => `${action.title}: ${action.body}`)),
  '',
  ...formatList('Latest Evidence Timeline', pack.timeline.map(formatEvidenceTimelineItem)),
  '',
  'Privacy Boundary',
  pack.privacyNote,
].join('\n');

const downloadPack = (pack: EvidencePack): void => {
  const blob = new Blob([buildPackText(pack)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${slugify(pack.title)}-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const EvidencePackPanel: React.FC<EvidencePackPanelProps> = ({
  title,
  subtitle,
  childIds,
  scope,
  limit,
  compact = false,
  variant = 'light',
}) => {
  const { profile, isGuest } = useAuth();
  const [pack, setPack] = useState<EvidencePack | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [printMode, setPrintMode] = useState(false);

  const childKey = useMemo(() => (childIds ?? []).join('|'), [childIds]);
  const stableChildIds = useMemo(() => {
    const values = childKey.split('|').filter(Boolean);
    return values.length ? values : undefined;
  }, [childKey]);

  const loadPack = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!profile || isGuest) {
      setPack(null);
      setLoading(false);
      return;
    }

    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const nextPack = await EvidencePackService.getPack(profile, {
        childIds: stableChildIds,
        scope,
        limit,
      });
      setPack(nextPack);
    } catch (packError) {
      setPack(null);
      setError(packError instanceof Error ? packError.message : 'Could not build the evidence pack yet.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isGuest, limit, profile, scope, stableChildIds]);

  useEffect(() => {
    void loadPack();
  }, [loadPack]);

  const handlePrint = () => {
    setPrintMode(true);
    window.setTimeout(() => {
      const resetPrintMode = () => setPrintMode(false);
      window.addEventListener('afterprint', resetPrintMode, { once: true });
      window.print();
      window.setTimeout(resetPrintMode, 1000);
    }, 80);
  };

  if (!profile || isGuest) return null;

  const dark = variant === 'dark';
  const wrapperClass = dark
    ? 'rounded-2xl border border-white/10 bg-slate-900/70 p-5 text-white shadow-2xl shadow-black/20'
    : 'rounded-3xl border border-white/70 bg-white/85 p-5 text-adapt-navy shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80 dark:text-gray-100';
  const sectionClass = dark
    ? 'border border-white/10 bg-white/5'
    : 'border border-slate-100 bg-white/75 dark:border-gray-800 dark:bg-gray-950/40';
  const mutedClass = dark ? 'text-slate-300' : 'text-slate-500 dark:text-gray-400';
  const styles = priorityStyles[pack?.priority ?? 'steady'];
  const PriorityIcon = styles.icon;

  return (
    <section className={`${printMode ? 'adaptbuddy-evidence-pack-print' : ''} ${wrapperClass}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
            <FileText className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-adapt-indigo dark:text-adapt-cyan">
              Evidence Pack
            </p>
            <h2 className={`${compact ? 'text-xl' : 'text-2xl'} mt-1 font-extrabold`}>
              {title ?? pack?.title ?? 'Evidence Pack'}
            </h2>
            <p className={`mt-2 max-w-3xl text-sm leading-6 ${mutedClass}`}>
              {subtitle ?? 'A print-ready support summary built from digests, action response, support plans, and evidence timeline.'}
            </p>
          </div>
        </div>

        <div className="adaptbuddy-no-print flex flex-wrap gap-2">
          {pack && (
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${styles.badge}`}>
              <PriorityIcon className="h-4 w-4" aria-hidden />
              {styles.label}
            </span>
          )}
          <button
            type="button"
            onClick={() => void loadPack('refresh')}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:border-adapt-indigo/40 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!pack}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:border-adapt-indigo/40 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
          >
            <Printer className="h-4 w-4" aria-hidden />
            Print
          </button>
          <button
            type="button"
            onClick={() => pack && downloadPack(pack)}
            disabled={!pack}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-adapt-navy px-3 py-2 text-xs font-black text-white shadow-sm transition hover:bg-adapt-purple disabled:opacity-50 dark:bg-adapt-cyan dark:text-gray-950"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {loading && !error && (
        <div className={`mt-4 rounded-2xl p-4 ${sectionClass}`}>
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
            <p className={`text-sm font-bold ${mutedClass}`}>Building evidence pack...</p>
          </div>
        </div>
      )}

      {pack && (
        <div className="mt-5 space-y-5">
          <div className={`rounded-2xl border p-4 ${styles.panel}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-lg font-extrabold">{pack.executiveSummary[0]}</p>
              <span className="text-xs font-black uppercase tracking-[0.16em] opacity-80">
                {pack.windowLabel}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold opacity-90">
              Generated {formatDateTime(pack.generatedAt)}. Export uses shared and support-visible evidence.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {pack.metrics.map((metric) => (
              <MetricCard key={metric.label} metric={metric} className={sectionClass} mutedClass={mutedClass} />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
            <div className={`rounded-2xl p-4 ${sectionClass}`}>
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
                <h3 className="text-base font-extrabold">Executive summary</h3>
              </div>
              <ul className="space-y-2">
                {pack.executiveSummary.map((item) => (
                  <li key={item} className={`text-sm leading-6 ${mutedClass}`}>{item}</li>
                ))}
              </ul>
            </div>

            <div className={`rounded-2xl p-4 ${sectionClass}`}>
              <div className="mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
                <h3 className="text-base font-extrabold">Suggested next actions</h3>
              </div>
              <div className="space-y-3">
                {pack.nextActions.map((action) => (
                  <ActionRow key={`${action.label}-${action.detail}`} action={action} mutedClass={mutedClass} />
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {pack.supportSections.slice(1, 4).map((section) => (
              <EvidenceSectionCard
                key={section.title}
                section={section}
                className={sectionClass}
                mutedClass={mutedClass}
              />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <EvidenceSectionCard
              section={{ title: 'Meeting talking points', items: pack.talkingPoints }}
              className={sectionClass}
              mutedClass={mutedClass}
              empty="No meeting talking points yet."
            />

            <div className={`rounded-2xl p-4 ${sectionClass}`}>
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
                <h3 className="text-base font-extrabold">Open adult actions</h3>
              </div>
              <div className="space-y-2">
                {pack.openActions.length ? (
                  pack.openActions.slice(0, 6).map((action) => (
                    <div key={action.id} className="rounded-2xl border border-slate-100 bg-white/70 p-3 dark:border-gray-800 dark:bg-gray-950/50">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black">{action.title}</p>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${priorityStyles[action.severity === 'urgent' || action.severity === 'high' ? 'urgent' : action.severity === 'medium' ? 'watch' : 'steady'].badge}`}>
                          {action.status}
                        </span>
                      </div>
                      <p className={`mt-1 text-sm leading-6 ${mutedClass}`}>{action.body}</p>
                    </div>
                  ))
                ) : (
                  <p className={`text-sm leading-6 ${mutedClass}`}>No open adult actions in this pack.</p>
                )}
              </div>
            </div>
          </div>

          <div className={`rounded-2xl p-4 ${sectionClass}`}>
            <div className="mb-3 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
              <h3 className="text-base font-extrabold">Latest evidence timeline</h3>
            </div>
            <div className="space-y-2">
              {pack.timeline.length ? (
                pack.timeline.slice(0, 8).map((item) => (
                  <article key={item.id} className="rounded-2xl border border-slate-100 bg-white/70 p-3 dark:border-gray-800 dark:bg-gray-950/50">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-black">{item.title}</p>
                        <p className={`mt-1 text-sm leading-6 ${mutedClass}`}>{item.detail}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-gray-800 dark:text-gray-200">
                        {item.evidenceLabel}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <p className={`text-sm leading-6 ${mutedClass}`}>No timeline evidence yet.</p>
              )}
            </div>
          </div>

          <p className={`rounded-2xl border p-4 text-xs font-semibold leading-5 ${sectionClass} ${mutedClass}`}>
            Privacy boundary: {pack.privacyNote}
          </p>
        </div>
      )}
    </section>
  );
};

const MetricCard: React.FC<{ metric: EvidencePackMetric; className: string; mutedClass: string }> = ({
  metric,
  className,
  mutedClass,
}) => (
  <article className={`rounded-2xl p-4 ${className}`}>
    <p className={`text-xs font-black uppercase tracking-[0.16em] ${mutedClass}`}>{metric.label}</p>
    <p className="mt-2 text-2xl font-black">{metric.value}</p>
    <p className={`mt-1 text-xs leading-5 ${mutedClass}`}>{metric.detail}</p>
  </article>
);

const ActionRow: React.FC<{ action: EvidencePackAction; mutedClass: string }> = ({ action, mutedClass }) => (
  <article className="rounded-2xl border border-slate-100 bg-white/70 p-3 dark:border-gray-800 dark:bg-gray-950/50">
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-black">{action.label}</p>
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${priorityStyles[action.tone].badge}`}>
        {priorityStyles[action.tone].label}
      </span>
    </div>
    <p className={`mt-1 text-sm leading-6 ${mutedClass}`}>{action.detail}</p>
  </article>
);

const EvidenceSectionCard: React.FC<{
  section: EvidencePackSection;
  className: string;
  mutedClass: string;
  empty?: string;
}> = ({ section, className, mutedClass, empty = 'No evidence recorded yet.' }) => (
  <article className={`rounded-2xl p-4 ${className}`}>
    <h3 className="text-base font-extrabold">{section.title}</h3>
    <ul className="mt-3 space-y-2">
      {(section.items.length ? section.items : [empty]).slice(0, 6).map((item) => (
        <li key={item} className={`text-sm leading-6 ${mutedClass}`}>{item}</li>
      ))}
    </ul>
  </article>
);

export default EvidencePackPanel;
