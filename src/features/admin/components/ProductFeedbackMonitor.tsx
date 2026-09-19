import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Filter,
  Inbox,
  Lightbulb,
  Loader2,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import {
  ProductFeedbackService,
  type ProductFeedbackItem,
  type ProductFeedbackSentiment,
  type ProductFeedbackStatus,
  type ProductFeedbackType,
} from 'services/supabase/productFeedbackService';
import { EXPERIENCE_SURVEY_SOURCE } from 'features/feedback/experienceSurvey';

type FeedbackFilter<T extends string> = 'all' | T;

const typeFilters: FeedbackFilter<ProductFeedbackType>[] = ['all', 'idea', 'confusing', 'bug', 'safety', 'delight'];
const sentimentFilters: FeedbackFilter<ProductFeedbackSentiment>[] = ['all', 'positive', 'neutral', 'concerned'];
const statusFilters: FeedbackFilter<ProductFeedbackStatus>[] = ['all', 'new', 'reviewing', 'planned', 'shipped', 'closed'];
const statusOptions: ProductFeedbackStatus[] = ['new', 'reviewing', 'planned', 'shipped', 'closed'];
const roleFilters = ['all', 'child', 'parent', 'teacher', 'admin'] as const;
const sourceFilters = ['all', EXPERIENCE_SURVEY_SOURCE, 'child_settings', 'parent_review', 'teacher_settings', 'admin_settings'] as const;

function labelize(value: string): string {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadFeedbackCsv(items: ProductFeedbackItem[]): void {
  const header = [
    'created_at',
    'submitter_name',
    'submitter_email',
    'buddy_id',
    'visitor_key',
    'account_type',
    'role',
    'source_area',
    'type',
    'rating',
    'sentiment',
    'status',
    'path',
    'themes',
    'feedback',
    'admin_response',
  ];
  const rows = items.map((item) => [
    item.createdAt,
    item.submitterName || '',
    item.submitterEmail || '',
    item.buddyId || '',
    item.visitorKey || '',
    item.isGuest ? 'guest' : 'authenticated',
    item.userRole,
    item.sourceArea,
    item.feedbackType,
    item.rating,
    item.sentiment,
    item.status,
    item.path || '',
    item.themes.join('; '),
    item.feedbackText,
    item.adminResponse ?? '',
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `adaptbuddy-feedback-monitor-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

const sentimentStyles: Record<ProductFeedbackSentiment, string> = {
  positive: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/20',
  neutral: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/20',
  concerned: 'bg-red-500/15 text-red-300 ring-red-500/20',
};

const statusStyles: Record<ProductFeedbackStatus, string> = {
  new: 'bg-sky-500/15 text-sky-300 ring-sky-500/20',
  reviewing: 'bg-amber-500/15 text-amber-300 ring-amber-500/20',
  planned: 'bg-violet-500/15 text-violet-300 ring-violet-500/20',
  shipped: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/20',
  closed: 'bg-slate-500/15 text-slate-300 ring-slate-500/20',
};

const ProductFeedbackMonitor: React.FC = () => {
  const { profile } = useAuth();
  const [items, setItems] = useState<ProductFeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [typeFilter, setTypeFilter] = useState<FeedbackFilter<ProductFeedbackType>>('all');
  const [sentimentFilter, setSentimentFilter] = useState<FeedbackFilter<ProductFeedbackSentiment>>('all');
  const [statusFilter, setStatusFilter] = useState<FeedbackFilter<ProductFeedbackStatus>>('all');
  const [roleFilter, setRoleFilter] = useState<(typeof roleFilters)[number]>('all');
  const [sourceFilter, setSourceFilter] = useState<(typeof sourceFilters)[number]>('all');
  const [search, setSearch] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const loadItems = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (!profile) return;
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      const data = await ProductFeedbackService.getFeedbackItems(profile, 300);
      setItems(data);
    } catch (loadError: unknown) {
      setItems([]);
      setError(loadError instanceof Error ? loadError.message : 'Could not load feedback monitor.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter((item) => typeFilter === 'all' || item.feedbackType === typeFilter)
      .filter((item) => sentimentFilter === 'all' || item.sentiment === sentimentFilter)
      .filter((item) => statusFilter === 'all' || item.status === statusFilter)
      .filter((item) => roleFilter === 'all' || item.userRole === roleFilter)
      .filter((item) => sourceFilter === 'all' || item.sourceArea === sourceFilter)
      .filter((item) => {
        if (!term) return true;
        return [
          item.feedbackText,
          item.sourceArea,
          item.feedbackType,
          item.sentiment,
          item.status,
          item.userRole,
          item.submitterName || '',
          item.submitterEmail || '',
          item.buddyId || '',
          item.visitorKey || '',
          item.isGuest ? 'guest' : 'authenticated',
          item.path || '',
          item.themes.join(' '),
          item.adminResponse ?? '',
          String(item.metadata.path ?? ''),
          String(item.metadata.improvements ?? ''),
          String(item.metadata.wishedFeatures ?? ''),
        ].join(' ').toLowerCase().includes(term);
      });
  }, [items, roleFilter, search, sentimentFilter, sourceFilter, statusFilter, typeFilter]);

  const metrics = useMemo(() => {
    const openItems = items.filter((item) => !['shipped', 'closed'].includes(item.status));
    const concernItems = items.filter((item) => item.sentiment === 'concerned' || item.feedbackType === 'safety' || item.feedbackType === 'bug');
    const surveyItems = items.filter((item) => item.sourceArea === EXPERIENCE_SURVEY_SOURCE);
    const unrepliedSurveys = surveyItems.filter((item) => !item.adminResponse).length;
    const plannedItems = items.filter((item) => item.status === 'planned').length;
    const shippedItems = items.filter((item) => item.status === 'shipped').length;
    const averageRating = items.length
      ? Number((items.reduce((total, item) => total + item.rating, 0) / items.length).toFixed(1))
      : null;

    const themeCounts = new Map<string, number>();
    items.forEach((item) => item.themes.forEach((theme) => themeCounts.set(theme, (themeCounts.get(theme) ?? 0) + 1)));

    return {
      open: openItems.length,
      concerns: concernItems.length,
      surveys: surveyItems.length,
      unrepliedSurveys,
      planned: plannedItems,
      shipped: shippedItems,
      averageRating,
      themes: Array.from(themeCounts.entries())
        .map(([theme, count]) => ({ theme, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    };
  }, [items]);

  const handleStatusChange = async (item: ProductFeedbackItem, status: ProductFeedbackStatus) => {
    if (!profile || busyId || item.status === status) return;
    setBusyId(item.id);
    setError('');
    setStatusMessage('');

    try {
      await ProductFeedbackService.updateFeedbackStatus(profile, item.id, status);
      setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, status } : entry)));
      setStatusMessage(`Feedback marked ${labelize(status)}.`);
    } catch (statusError: unknown) {
      setError(statusError instanceof Error ? statusError.message : 'Could not update feedback status.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReply = async (item: ProductFeedbackItem) => {
    if (!profile || busyId) return;
    const draft = (replyDrafts[item.id] ?? item.adminResponse ?? '').trim();
    if (!draft) {
      setError('Write a reply before sending.');
      return;
    }

    setBusyId(item.id);
    setError('');
    setStatusMessage('');
    try {
      await ProductFeedbackService.respondToFeedback(profile, item.id, draft, item.status === 'new' ? 'reviewing' : item.status);
      const respondedAt = new Date().toISOString();
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                adminResponse: draft,
                adminRespondedAt: respondedAt,
                adminRespondedBy: profile.id,
                status: entry.status === 'new' ? 'reviewing' : entry.status,
              }
            : entry,
        ),
      );
      setReplyDrafts((current) => {
        const next = { ...current };
        delete next[item.id];
        return next;
      });
      setStatusMessage('Reply sent and saved on this feedback.');
    } catch (replyError: unknown) {
      setError(replyError instanceof Error ? replyError.message : 'Could not send reply.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-300">
            Product intelligence
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-white">Feedback monitoring dashboard</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
            Track what users are asking for, where the product feels confusing, and which issues are planned, shipped, or closed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadItems('refresh')}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:bg-white/10 disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
            Refresh
          </button>
          <button
            type="button"
            onClick={() => downloadFeedbackCsv(filteredItems)}
            disabled={filteredItems.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-black text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
          {error}
        </p>
      )}
      {statusMessage && (
        <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
          {statusMessage}
        </p>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Open feedback', value: metrics.open, detail: `${items.length} total`, icon: Inbox },
          { label: 'Surveys', value: metrics.surveys, detail: `${metrics.unrepliedSurveys} awaiting reply`, icon: Lightbulb },
          { label: 'Concerns', value: metrics.concerns, detail: 'Safety, bugs, confusion', icon: ShieldAlert },
          { label: 'Planned', value: metrics.planned, detail: `${metrics.shipped} shipped`, icon: CheckCircle2 },
          { label: 'Avg rating', value: metrics.averageRating ?? '-', detail: 'Across captured feedback', icon: CheckCircle2 },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-gray-400">
                <Icon className="h-4 w-4" aria-hidden />
                <p className="text-xs font-black uppercase tracking-[0.12em]">{metric.label}</p>
              </div>
              <p className="mt-2 text-3xl font-black text-white">{metric.value}</p>
              <p className="mt-1 text-xs text-gray-500">{metric.detail}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-indigo-300" aria-hidden />
            <h3 className="font-bold text-white">Filters</h3>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <FilterSelect label="Type" value={typeFilter} options={typeFilters} onChange={(value) => setTypeFilter(value as FeedbackFilter<ProductFeedbackType>)} />
            <FilterSelect label="Sentiment" value={sentimentFilter} options={sentimentFilters} onChange={(value) => setSentimentFilter(value as FeedbackFilter<ProductFeedbackSentiment>)} />
            <FilterSelect label="Status" value={statusFilter} options={statusFilters} onChange={(value) => setStatusFilter(value as FeedbackFilter<ProductFeedbackStatus>)} />
            <FilterSelect label="Role" value={roleFilter} options={[...roleFilters]} onChange={(value) => setRoleFilter(value as (typeof roleFilters)[number])} />
            <FilterSelect label="Source" value={sourceFilter} options={[...sourceFilters]} onChange={(value) => setSourceFilter(value as (typeof sourceFilters)[number])} />
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="text-xs font-black uppercase tracking-[0.12em] text-gray-500" htmlFor="feedback-monitor-search">
                Search
              </label>
              <input
                id="feedback-monitor-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
                placeholder="Search comments, themes, source..."
              />
            </div>
          </div>

          <div className="mt-5">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">Top themes</p>
            {metrics.themes.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {metrics.themes.map((theme) => (
                  <span key={theme.theme} className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-black text-indigo-200">
                    {theme.theme} · {theme.count}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">No themes yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-white">Feedback queue</h3>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-gray-300">
              {filteredItems.length} shown
            </span>
          </div>

          {loading ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-4 text-sm font-bold text-gray-300">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading feedback...
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="mt-4 space-y-3">
              {filteredItems.slice(0, 80).map((item) => (
                <article key={item.id} className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-black text-gray-200">
                          {labelize(item.userRole)}
                        </span>
                        {item.isGuest && (
                          <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-black text-amber-200 ring-1 ring-amber-500/20">
                            Guest
                          </span>
                        )}
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-black text-gray-200">
                          {labelize(item.feedbackType)}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${sentimentStyles[item.sentiment]}`}>
                          {labelize(item.sentiment)}
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusStyles[item.status]}`}>
                          {labelize(item.status)}
                        </span>
                      </div>
                      <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/50 px-3 py-2 text-xs text-gray-300">
                        <p className="font-black text-white">
                          {item.submitterName || (item.isGuest ? 'Anonymous guest' : 'Unknown user')}
                        </p>
                        {item.submitterEmail ? (
                          <a href={`mailto:${item.submitterEmail}`} className="mt-0.5 block text-indigo-300 hover:text-indigo-200">
                            {item.submitterEmail}
                          </a>
                        ) : (
                          <p className="mt-0.5 text-gray-500">No email provided</p>
                        )}
                        <p className="mt-1 text-[11px] text-gray-500">
                          {item.isGuest ? 'Guest session' : 'Signed-in account'}
                          {item.buddyId ? ` · Buddy ID ${item.buddyId}` : ''}
                          {item.userId ? ` · User ${item.userId.slice(0, 8)}…` : ''}
                          {item.visitorKey ? ` · Visitor ${item.visitorKey.slice(0, 12)}…` : ''}
                          {item.path ? ` · ${item.path}` : ''}
                        </p>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-gray-200 whitespace-pre-wrap">{item.feedbackText}</p>
                      {item.sourceArea === EXPERIENCE_SURVEY_SOURCE && (
                        <div className="mt-3 grid gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-3 text-xs text-cyan-100 sm:grid-cols-2">
                          <p>
                            <span className="font-black uppercase tracking-wide text-cyan-300">Avg comfort</span>
                            <br />
                            {String(item.metadata.averageComfort ?? '—')}/5
                          </p>
                          <p>
                            <span className="font-black uppercase tracking-wide text-cyan-300">Overall</span>
                            <br />
                            {String(item.metadata.experienceRating ?? item.rating)}/5
                          </p>
                          {typeof item.metadata.improvements === 'string' && item.metadata.improvements && (
                            <p className="sm:col-span-2">
                              <span className="font-black uppercase tracking-wide text-cyan-300">Improvements</span>
                              <br />
                              {item.metadata.improvements}
                            </p>
                          )}
                          {typeof item.metadata.wishedFeatures === 'string' && item.metadata.wishedFeatures && (
                            <p className="sm:col-span-2">
                              <span className="font-black uppercase tracking-wide text-cyan-300">Requested features</span>
                              <br />
                              {item.metadata.wishedFeatures}
                            </p>
                          )}
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.themes.map((theme) => (
                          <span key={theme} className="rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-bold text-indigo-200">
                            {theme}
                          </span>
                        ))}
                      </div>
                      <p className="mt-3 text-xs text-gray-500">
                        {formatDate(item.createdAt)} · Rating {item.rating}/5 · {labelize(item.sourceArea)}
                        {typeof item.metadata.path === 'string' ? ` · ${item.metadata.path}` : ''}
                      </p>

                      {item.adminResponse && (
                        <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
                          <p className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Admin reply</p>
                          <p className="mt-1 whitespace-pre-wrap">{item.adminResponse}</p>
                          {item.adminRespondedAt && (
                            <p className="mt-1 text-[11px] text-emerald-200/70">{formatDate(item.adminRespondedAt)}</p>
                          )}
                        </div>
                      )}

                      <div className="mt-3 space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-wider text-gray-500" htmlFor={`reply-${item.id}`}>
                          Respond to user
                        </label>
                        <textarea
                          id={`reply-${item.id}`}
                          rows={3}
                          value={replyDrafts[item.id] ?? item.adminResponse ?? ''}
                          onChange={(event) =>
                            setReplyDrafts((current) => ({ ...current, [item.id]: event.target.value }))
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-indigo-400"
                          placeholder="Share thanks, next steps, or how their idea will be used…"
                        />
                        <button
                          type="button"
                          onClick={() => void handleReply(item)}
                          disabled={busyId === item.id}
                          className="rounded-xl bg-indigo-500 px-3 py-2 text-xs font-black text-white transition hover:bg-indigo-400 disabled:opacity-60"
                        >
                          {busyId === item.id ? 'Saving…' : item.adminResponse ? 'Update reply' : 'Send reply'}
                        </button>
                      </div>
                    </div>
                    <label className="shrink-0 text-xs font-black uppercase tracking-[0.12em] text-gray-500">
                      Status
                      <select
                        value={item.status}
                        onChange={(event) => void handleStatusChange(item, event.target.value as ProductFeedbackStatus)}
                        disabled={busyId === item.id}
                        className="mt-2 block w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none disabled:opacity-60"
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {labelize(status)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-slate-950/35 p-6 text-center">
              <AlertTriangle className="mx-auto h-8 w-8 text-gray-500" aria-hidden />
              <p className="mt-3 font-bold text-gray-300">No matching feedback yet</p>
              <p className="mt-1 text-sm text-gray-500">Adjust filters or collect more feedback from live users.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

interface FilterSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

const FilterSelect: React.FC<FilterSelectProps> = ({ label, value, options, onChange }) => (
  <label className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">
    {label}
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 block w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-indigo-400"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {labelize(option)}
        </option>
      ))}
    </select>
  </label>
);

export default ProductFeedbackMonitor;
