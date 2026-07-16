import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bug,
  CheckCircle2,
  Heart,
  Lightbulb,
  Loader2,
  MessageSquareText,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import {
  ProductFeedbackService,
  type ProductFeedbackSummary,
  type ProductFeedbackType,
} from 'services/supabase/productFeedbackService';

interface FeedbackPulsePanelProps {
  title?: string;
  subtitle?: string;
  sourceArea: string;
  childId?: string | null;
  showSummary?: boolean;
  compact?: boolean;
  variant?: 'light' | 'dark';
}

const feedbackTypes: { id: ProductFeedbackType; label: string; icon: React.ElementType }[] = [
  { id: 'idea', label: 'Idea', icon: Lightbulb },
  { id: 'confusing', label: 'Confusing', icon: SlidersHorizontal },
  { id: 'bug', label: 'Bug', icon: Bug },
  { id: 'safety', label: 'Safety', icon: ShieldAlert },
  { id: 'delight', label: 'Works well', icon: Heart },
];

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

const FeedbackPulsePanel: React.FC<FeedbackPulsePanelProps> = ({
  title = 'Feedback pulse',
  subtitle = 'Tell us what is working, what is confusing, and what would make AdaptBuddy safer or more useful.',
  sourceArea,
  childId,
  showSummary = false,
  compact = false,
  variant = 'light',
}) => {
  const { profile } = useAuth();
  const [feedbackType, setFeedbackType] = useState<ProductFeedbackType>('idea');
  const [rating, setRating] = useState(4);
  const [feedbackText, setFeedbackText] = useState('');
  const [summary, setSummary] = useState<ProductFeedbackSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const shouldShowSummary = showSummary || profile?.role === 'admin';
  const isDark = variant === 'dark';
  const wrapperClass = isDark
    ? 'rounded-2xl border border-white/10 bg-slate-900/60 p-5'
    : 'rounded-3xl border border-white/70 bg-white/85 p-5 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/75';
  const headingClass = isDark ? 'text-white' : 'text-adapt-navy dark:text-gray-100';
  const mutedClass = isDark ? 'text-gray-400' : 'text-slate-500 dark:text-gray-400';
  const softClass = isDark
    ? 'border-white/10 bg-white/5 text-gray-200'
    : 'border-slate-100 bg-slate-50/80 text-slate-700 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-200';

  const loadSummary = useCallback(async () => {
    if (!profile || !shouldShowSummary) return;
    setLoadingSummary(true);
    try {
      const data = await ProductFeedbackService.getSummary(profile);
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setLoadingSummary(false);
    }
  }, [profile, shouldShowSummary]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const topThemes = useMemo(
    () => summary?.themes.slice(0, compact ? 4 : 6) ?? [],
    [compact, summary?.themes],
  );

  const handleSubmit = async () => {
    if (!profile || !feedbackText.trim() || submitting) return;
    setSubmitting(true);
    setStatus('');
    setError('');

    try {
      const result = await ProductFeedbackService.submitFeedback(profile, {
        sourceArea,
        childId,
        feedbackType,
        rating,
        feedbackText,
        metadata: {
          path: typeof window !== 'undefined' ? window.location.pathname : sourceArea,
        },
      });
      setFeedbackText('');
      setFeedbackType('idea');
      setRating(4);
      setStatus(
        result.persisted
          ? 'Feedback saved for review.'
          : 'Feedback noted locally. Run migration 030 to persist it across the platform.',
      );
      await loadSummary();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : 'Could not send feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!profile) return null;

  return (
    <section className={wrapperClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={`text-xs font-black uppercase tracking-[0.18em] ${isDark ? 'text-indigo-300' : 'text-adapt-indigo dark:text-adapt-cyan'}`}>
            Feedback
          </p>
          <h2 className={`mt-1 ${compact ? 'text-xl' : 'text-2xl'} font-extrabold ${headingClass}`}>
            {title}
          </h2>
          <p className={`mt-2 max-w-3xl text-sm leading-6 ${mutedClass}`}>
            {subtitle}
          </p>
        </div>
        {shouldShowSummary && (
          <button
            type="button"
            onClick={() => void loadSummary()}
            disabled={loadingSummary}
            className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black transition disabled:opacity-60 ${
              isDark
                ? 'border-white/10 bg-white/5 text-white hover:bg-white/10'
                : 'border-slate-200 bg-white text-slate-700 shadow-soft hover:border-adapt-indigo hover:text-adapt-indigo dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100'
            }`}
          >
            {loadingSummary ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}
            Refresh
          </button>
        )}
      </div>

      <div className={`mt-5 grid gap-4 ${shouldShowSummary ? 'xl:grid-cols-[1fr_0.85fr]' : ''}`}>
        <div className={`rounded-2xl border p-4 ${softClass}`}>
          <div className="flex flex-wrap gap-2">
            {feedbackTypes.map((option) => {
              const Icon = option.icon;
              const selected = feedbackType === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFeedbackType(option.id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition ${
                    selected
                      ? 'border-adapt-indigo bg-adapt-indigo text-white dark:border-adapt-cyan dark:bg-adapt-cyan dark:text-gray-950'
                      : isDark
                        ? 'border-white/10 bg-white/5 text-gray-200 hover:bg-white/10'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-adapt-indigo hover:text-adapt-indigo dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="mt-4">
            <label className={`text-xs font-black uppercase tracking-[0.14em] ${mutedClass}`} htmlFor={`${sourceArea}-feedback-rating`}>
              Rating
            </label>
            <div id={`${sourceArea}-feedback-rating`} className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Feedback rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`h-10 w-10 rounded-full border text-sm font-black transition ${
                    rating === value
                      ? 'border-adapt-indigo bg-adapt-indigo text-white dark:border-adapt-cyan dark:bg-adapt-cyan dark:text-gray-950'
                      : isDark
                        ? 'border-white/10 bg-white/5 text-gray-200'
                        : 'border-slate-200 bg-white text-slate-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={feedbackText}
            onChange={(event) => setFeedbackText(event.target.value)}
            rows={compact ? 3 : 4}
            className={`mt-4 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 ${
              isDark
                ? 'border-white/10 bg-slate-950/50 text-white placeholder:text-gray-500'
                : 'border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100'
            }`}
            placeholder="What should we improve, protect, simplify, or keep exactly as it is?"
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!feedbackText.trim() || submitting}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-4 py-3 text-sm font-black text-white transition hover:bg-adapt-purple disabled:opacity-60 dark:bg-adapt-cyan dark:text-gray-950"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <MessageSquareText className="h-4 w-4" aria-hidden />}
            {submitting ? 'Sending...' : 'Send feedback'}
          </button>

          {status && (
            <p className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-100">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              {status}
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-100">
              {error}
            </p>
          )}
        </div>

        {shouldShowSummary && (
          <div className={`rounded-2xl border p-4 ${softClass}`}>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <p className={`text-xs font-black uppercase tracking-[0.12em] ${mutedClass}`}>Total</p>
                <p className={`mt-1 text-2xl font-black ${headingClass}`}>{summary?.total ?? 0}</p>
              </div>
              <div>
                <p className={`text-xs font-black uppercase tracking-[0.12em] ${mutedClass}`}>Avg rating</p>
                <p className={`mt-1 text-2xl font-black ${headingClass}`}>{summary?.averageRating ?? '-'}</p>
              </div>
              <div>
                <p className={`text-xs font-black uppercase tracking-[0.12em] ${mutedClass}`}>Concerned</p>
                <p className={`mt-1 text-2xl font-black ${headingClass}`}>{summary?.bySentiment.concerned ?? 0}</p>
              </div>
            </div>

            <div className="mt-4">
              <p className={`text-xs font-black uppercase tracking-[0.12em] ${mutedClass}`}>Themes</p>
              {topThemes.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {topThemes.map((theme) => (
                    <span
                      key={theme.theme}
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        theme.sentiment === 'concerned'
                          ? 'bg-red-500/10 text-red-700 dark:text-red-200'
                          : theme.sentiment === 'positive'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
                            : 'bg-indigo-500/10 text-adapt-indigo dark:text-adapt-cyan'
                      }`}
                    >
                      {theme.theme} · {theme.count}
                    </span>
                  ))}
                </div>
              ) : (
                <p className={`mt-2 text-sm ${mutedClass}`}>No feedback themes yet.</p>
              )}
            </div>

            {summary?.latest.length ? (
              <div className="mt-4 space-y-2">
                <p className={`text-xs font-black uppercase tracking-[0.12em] ${mutedClass}`}>Latest</p>
                {summary.latest.slice(0, compact ? 3 : 5).map((item) => (
                  <div key={item.id} className={`rounded-2xl border px-3 py-2 text-sm ${isDark ? 'border-white/10 bg-slate-950/30' : 'border-slate-100 bg-white/70 dark:border-gray-800 dark:bg-gray-900/60'}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`font-black ${headingClass}`}>{labelize(item.feedbackType)}</span>
                      <span className={mutedClass}>{formatDate(item.createdAt)}</span>
                    </div>
                    <p className={`mt-1 line-clamp-2 ${mutedClass}`}>{item.feedbackText}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeedbackPulsePanel;
