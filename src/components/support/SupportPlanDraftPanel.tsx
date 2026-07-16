import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Brain,
  CalendarDays,
  CheckCircle2,
  EyeOff,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import {
  SupportPlanService,
  type SupportPlanDraft,
  type SupportPlanPriority,
} from 'services/supabase/supportPlanService';

interface SupportPlanDraftPanelProps {
  title?: string;
  subtitle?: string;
  childIds?: string[];
  limit?: number;
  compact?: boolean;
  variant?: 'light' | 'dark';
}

const priorityLabels: Record<SupportPlanPriority, string> = {
  steady: 'Steady watch',
  watch: 'Pattern emerging',
  urgent: 'Needs prompt follow-up',
};

const lightPriorityStyles: Record<SupportPlanPriority, string> = {
  steady: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  watch: 'border-amber-200 bg-amber-50 text-amber-800',
  urgent: 'border-red-200 bg-red-50 text-red-800',
};

const darkPriorityStyles: Record<SupportPlanPriority, string> = {
  steady: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  watch: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  urgent: 'border-red-500/30 bg-red-500/10 text-red-200',
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Review soon';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function labelize(value: string): string {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

const SupportPlanDraftPanel: React.FC<SupportPlanDraftPanelProps> = ({
  title = 'Support plan drafts',
  subtitle = 'A one-page planning draft built from repeated shared signals, alerts, task-help requests, and meetings.',
  childIds,
  limit = 4,
  compact = false,
  variant = 'light',
}) => {
  const { profile, isGuest } = useAuth();
  const [drafts, setDrafts] = useState<SupportPlanDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const requestedChildIds = useMemo(
    () => childIds?.filter(Boolean) ?? undefined,
    [childIds],
  );

  const loadDrafts = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!profile || isGuest) {
      setDrafts([]);
      setLoading(false);
      return;
    }

    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const data = await SupportPlanService.getDrafts(profile, { childIds: requestedChildIds, limit });
      setDrafts(data);
    } catch (draftError: unknown) {
      setDrafts([]);
      setError(draftError instanceof Error ? draftError.message : 'Could not build support plan drafts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isGuest, limit, profile, requestedChildIds]);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  const isDark = variant === 'dark';
  const priorityStyles = isDark ? darkPriorityStyles : lightPriorityStyles;
  const wrapperClass = isDark
    ? 'rounded-2xl border border-white/10 bg-slate-900/60 p-5'
    : 'rounded-3xl border border-white/70 bg-white/85 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75';
  const cardClass = isDark
    ? 'border-white/10 bg-white/5'
    : 'border-slate-100 bg-slate-50/80 dark:border-gray-800 dark:bg-gray-950/40';
  const headingClass = isDark ? 'text-white' : 'text-adapt-navy dark:text-gray-100';
  const mutedClass = isDark ? 'text-gray-400' : 'text-slate-500 dark:text-gray-400';
  const softClass = isDark
    ? 'border-white/10 bg-white/5 text-gray-200'
    : 'border-slate-100 bg-white/85 text-slate-700 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-200';

  if (!profile || isGuest) return null;

  return (
    <section className={wrapperClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? 'text-indigo-300' : 'text-adapt-indigo dark:text-adapt-cyan'}`}>
            Support plan
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
          onClick={() => void loadDrafts('refresh')}
          disabled={refreshing}
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition disabled:opacity-60 ${
            isDark
              ? 'border-white/10 bg-white/5 text-white hover:bg-white/10'
              : 'border-slate-200 bg-white text-slate-700 shadow-soft hover:border-adapt-indigo hover:text-adapt-indigo dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100'
          }`}
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
          Refresh
        </button>
      </div>

      {error && (
        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-bold ${
          isDark
            ? 'border-red-500/30 bg-red-500/10 text-red-100'
            : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100'
        }`}>
          {error}
        </div>
      )}

      {loading ? (
        <div className={`mt-5 flex items-center gap-3 rounded-2xl border px-4 py-5 ${softClass}`}>
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <span className="text-sm font-bold">Building support plan evidence...</span>
        </div>
      ) : drafts.length === 0 ? (
        <div className={`mt-5 rounded-2xl border px-5 py-6 ${softClass}`}>
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/10 text-adapt-indigo dark:text-adapt-cyan">
              <FileText className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h3 className={`text-lg font-extrabold ${headingClass}`}>No plan draft yet</h3>
              <p className={`mt-1 text-sm leading-6 ${mutedClass}`}>
                Once shared signals, task reflections, meetings, or alerts appear for this learner, AdaptBuddy can draft a support plan for adult review.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className={`mt-5 grid gap-4 ${compact ? '' : 'xl:grid-cols-2'}`}>
          {drafts.map((draft) => (
            <article key={draft.childId} className={`rounded-2xl border p-4 ${cardClass}`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`text-xl font-extrabold ${headingClass}`}>{draft.childName}</h3>
                    {draft.buddyId && (
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${softClass}`}>
                        {draft.buddyId}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {draft.neurotypes.length > 0 ? (
                      draft.neurotypes.slice(0, 4).map((neurotype) => (
                        <span key={neurotype} className={`rounded-full border px-3 py-1 text-xs font-bold ${softClass}`}>
                          {labelize(neurotype)}
                        </span>
                      ))
                    ) : (
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${softClass}`}>Profile details hidden</span>
                    )}
                  </div>
                </div>
                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black ${priorityStyles[draft.priority]}`}>
                  {draft.priority === 'urgent' ? <AlertTriangle className="h-4 w-4" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
                  {priorityLabels[draft.priority]}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {[
                  { label: 'Evidence', value: draft.evidenceCount, icon: Brain },
                  { label: 'Confidence', value: labelize(draft.confidence), icon: Sparkles },
                  { label: 'Needs help', value: draft.needsHelpCount, icon: Target },
                  { label: 'Review', value: formatDate(draft.reviewDate), icon: CalendarDays },
                ].map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <div key={metric.label} className={`rounded-2xl border p-3 ${softClass}`}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
                        <span className={`text-[0.65rem] font-black uppercase tracking-[0.12em] ${mutedClass}`}>
                          {metric.label}
                        </span>
                      </div>
                      <p className={`mt-2 text-sm font-black ${headingClass}`}>{metric.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <PlanList
                  title="Likely patterns"
                  items={draft.triggers}
                  icon={<Brain className="h-4 w-4" aria-hidden />}
                  headingClass={headingClass}
                  mutedClass={mutedClass}
                  itemClass={softClass}
                />
                <PlanList
                  title="Helpful supports"
                  items={draft.helpfulSupports}
                  icon={<CheckCircle2 className="h-4 w-4" aria-hidden />}
                  headingClass={headingClass}
                  mutedClass={mutedClass}
                  itemClass={softClass}
                />
                <PlanList
                  title="Adult actions"
                  items={draft.adultActions}
                  icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
                  headingClass={headingClass}
                  mutedClass={mutedClass}
                  itemClass={softClass}
                />
                <PlanList
                  title="Try not to"
                  items={draft.avoid}
                  icon={<EyeOff className="h-4 w-4" aria-hidden />}
                  headingClass={headingClass}
                  mutedClass={mutedClass}
                  itemClass={softClass}
                />
              </div>

              <div className={`mt-4 rounded-2xl border p-4 ${softClass}`}>
                <p className={`text-xs font-black uppercase tracking-[0.14em] ${mutedClass}`}>Home-school next step</p>
                <p className={`mt-2 text-sm font-bold leading-6 ${headingClass}`}>{draft.homeSchoolNextStep}</p>
              </div>

              <p className={`mt-3 text-xs leading-5 ${mutedClass}`}>
                {draft.privacyNote}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

interface PlanListProps {
  title: string;
  items: string[];
  icon: React.ReactNode;
  headingClass: string;
  mutedClass: string;
  itemClass: string;
}

const PlanList: React.FC<PlanListProps> = ({ title, items, icon, headingClass, mutedClass, itemClass }) => (
  <div>
    <div className="mb-2 flex items-center gap-2">
      <span className="text-adapt-indigo dark:text-adapt-cyan">{icon}</span>
      <h4 className={`text-sm font-black ${headingClass}`}>{title}</h4>
    </div>
    {items.length > 0 ? (
      <ul className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <li key={item} className={`rounded-2xl border px-3 py-2 text-sm leading-5 ${itemClass}`}>
            {item}
          </li>
        ))}
      </ul>
    ) : (
      <p className={`rounded-2xl border px-3 py-2 text-sm ${itemClass} ${mutedClass}`}>
        No repeated evidence yet.
      </p>
    )}
  </div>
);

export default SupportPlanDraftPanel;
