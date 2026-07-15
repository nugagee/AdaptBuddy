import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Loader2,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Volume2,
  type LucideIcon,
} from 'lucide-react';
import TeacherHubNav from 'features/teacher/components/TeacherHubNav';
import { useAuth } from 'hooks/useAuth';
import {
  TeacherDashboardService,
  type TeacherDashboardSummary,
  type TeacherMessageUrgency,
  type TeacherMeetingUrgency,
  type TeacherSupportSignal,
} from 'features/teacher/services/teacherDashboardService';

type RiskFilter = 'all' | TeacherSupportSignal['riskLevel'];
type SignalAction = 'message' | 'meeting' | 'review';

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
};

const formatRelativeTime = (isoDate: string): string => {
  const timestamp = new Date(isoDate).getTime();
  if (!Number.isFinite(timestamp)) return 'Recently';
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
};

const supportLabel = (value?: string): string =>
  value
    ? value
        .split(/[-_]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    : 'Check-in';

const getSignalLabel = (signal: TeacherSupportSignal): string =>
  signal.signalLabel || supportLabel(signal.emotion);

const getSignalCategory = (signal: TeacherSupportSignal): string =>
  supportLabel(signal.signalCategory || signal.supportLevel || 'wellbeing');

const getSignalSearchText = (signal: TeacherSupportSignal): string =>
  `${signal.signalLabel ?? ''} ${signal.signalCategory ?? ''} ${signal.supportLevel ?? ''} ${signal.emotion} ${signal.text}`.toLowerCase();

const getSuggestedResponse = (signal: TeacherSupportSignal): string => {
  const text = getSignalSearchText(signal);

  if (signal.riskLevel === 'high') {
    return 'Check in quietly, follow the school safeguarding process, and involve the approved adult support route.';
  }
  if (/too noisy|noise|loud|sound/.test(text)) {
    return 'Offer a quieter seat, headphones, or a two-minute reset before asking for more work.';
  }
  if (/too bright|light|bright/.test(text)) {
    return 'Reduce glare if possible, offer a visual break, and avoid adding extra visual instructions at once.';
  }
  if (/confused|stuck|unclear/.test(text)) {
    return 'Restate one step only, show an example, then check whether the learner wants help or time.';
  }
  if (/worried|anxious|overwhelm|panic/.test(text)) {
    return 'Lower demands briefly, validate the feeling, and move to a predictable next step.';
  }
  if (/tired|sleep|fatigue/.test(text)) {
    return 'Reduce pace, offer a short break, and avoid treating low energy as refusal.';
  }
  if (/help|support/.test(text)) {
    return 'Respond visibly and calmly so the learner knows the signal worked.';
  }

  return 'Acknowledge the signal, keep the next instruction small, and watch for repeated patterns.';
};

const getMessageUrgency = (signal: TeacherSupportSignal): TeacherMessageUrgency => {
  if (signal.riskLevel === 'high') return 'urgent';
  if (signal.riskLevel === 'medium' || signal.supportLevel === 'concern') return 'support';
  return 'normal';
};

const getMeetingUrgency = (signal: TeacherSupportSignal): TeacherMeetingUrgency =>
  signal.riskLevel === 'high' ? 'urgent' : 'soon';

const createSignalMessage = (signal: TeacherSupportSignal): string =>
  [
    `Support signal noted for ${signal.childName ?? 'learner'}: ${getSignalLabel(signal)}.`,
    `Suggested classroom response: ${getSuggestedResponse(signal)}`,
    signal.text ? `Shared note: ${signal.text}` : 'Private journal text is not visible in teacher view.',
  ].join('\n\n');

const createMeetingAgenda = (signal: TeacherSupportSignal): string[] => [
  `Review recent signal: ${getSignalLabel(signal)}`,
  `Agree classroom support: ${getSuggestedResponse(signal)}`,
  'Confirm what should be visible to school and what remains private.',
];

const riskStyles: Record<TeacherSupportSignal['riskLevel'], string> = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-100',
  high: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-100',
};

const MetricCard: React.FC<{
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  tone: string;
}> = ({ label, value, detail, icon: Icon, tone }) => (
  <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-bold text-slate-500 dark:text-gray-400">{label}</p>
        <p className="mt-3 text-3xl font-extrabold text-adapt-navy dark:text-gray-100">{value}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">{detail}</p>
      </div>
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
        <Icon className="h-6 w-6" aria-hidden />
      </span>
    </div>
  </article>
);

const Signals: React.FC = () => {
  const { isGuest } = useAuth();
  const [summary, setSummary] = useState<TeacherDashboardSummary | null>(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [reviewedSignalIds, setReviewedSignalIds] = useState<Set<string>>(() => new Set());
  const [busySignalId, setBusySignalId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<SignalAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);

  const loadSignals = useCallback(async (mode: 'initial' | 'refresh' = 'initial') => {
    if (mode === 'initial') setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const data = await TeacherDashboardService.getDashboardSummary();
      setSummary(data);
    } catch (loadError) {
      console.error('Error loading teacher support signals:', loadError);
      setError(getErrorMessage(loadError, 'Could not load support signals.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadSignals();
  }, [loadSignals]);

  const selectedClassChildIds = useMemo(() => {
    if (!selectedClassId) return null;
    return new Set(
      summary?.students
        .filter((student) => student.classId === selectedClassId)
        .map((student) => student.childId) ?? [],
    );
  }, [selectedClassId, summary?.students]);

  const classSignals = useMemo(
    () =>
      selectedClassChildIds
        ? summary?.liveSignals.filter((signal) => selectedClassChildIds.has(signal.childId)) ?? []
        : summary?.liveSignals ?? [],
    [selectedClassChildIds, summary?.liveSignals],
  );

  const categoryOptions = useMemo(
    () =>
      Array.from(new Set(classSignals.map(getSignalCategory)))
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b)),
    [classSignals],
  );

  const signals = useMemo(
    () =>
      classSignals.filter((signal) => {
        if (riskFilter !== 'all' && signal.riskLevel !== riskFilter) return false;
        if (categoryFilter !== 'all' && getSignalCategory(signal) !== categoryFilter) return false;
        return true;
      }),
    [categoryFilter, classSignals, riskFilter],
  );

  const activeSignals = signals.filter((signal) => !reviewedSignalIds.has(signal.id));
  const highPriority = activeSignals.filter((signal) => signal.riskLevel === 'high').length;
  const sensorySignals = activeSignals.filter((signal) =>
    /noise|loud|sound|bright|light|sensory/.test(getSignalSearchText(signal)),
  ).length;
  const needsHelpSignals = activeSignals.filter((signal) =>
    /help|confused|stuck|worried|overwhelm/.test(getSignalSearchText(signal)),
  ).length;

  const patternRows = useMemo(() => {
    const counts = new Map<string, number>();
    activeSignals.forEach((signal) => {
      const category = getSignalCategory(signal);
      counts.set(category, (counts.get(category) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [activeSignals]);

  const handleReviewSignal = (signal: TeacherSupportSignal) => {
    setReviewedSignalIds((current) => {
      const next = new Set(current);
      next.add(signal.id);
      return next;
    });
    setActionStatus(`${getSignalLabel(signal)} marked reviewed for this session.`);
  };

  const handleMessageFamily = async (signal: TeacherSupportSignal) => {
    if (busySignalId) return;
    setBusySignalId(signal.id);
    setBusyAction('message');
    setError(null);
    setActionStatus(null);

    try {
      if (isGuest) {
        setActionStatus('Guest demo: family messages save after signing in as a teacher.');
      } else {
        await TeacherDashboardService.sendFamilyMessage(
          signal.childId,
          createSignalMessage(signal),
          null,
          getMessageUrgency(signal),
        );
        setActionStatus('Family support message sent.');
      }
      handleReviewSignal(signal);
      await loadSignals('refresh');
    } catch (messageError) {
      console.error('Error sending signal follow-up:', messageError);
      setError(getErrorMessage(messageError, 'Could not message the family.'));
    } finally {
      setBusySignalId(null);
      setBusyAction(null);
    }
  };

  const handleRequestMeeting = async (signal: TeacherSupportSignal) => {
    if (busySignalId) return;
    setBusySignalId(signal.id);
    setBusyAction('meeting');
    setError(null);
    setActionStatus(null);

    try {
      if (isGuest) {
        setActionStatus('Guest demo: meeting requests save after signing in as a teacher.');
      } else {
        await TeacherDashboardService.requestCareMeeting({
          childId: signal.childId,
          urgency: getMeetingUrgency(signal),
          agenda: createMeetingAgenda(signal),
          notes: signal.text || getSuggestedResponse(signal),
        });
        setActionStatus('Support meeting request created.');
      }
      handleReviewSignal(signal);
      await loadSignals('refresh');
    } catch (meetingError) {
      console.error('Error requesting support meeting:', meetingError);
      setError(getErrorMessage(meetingError, 'Could not request a support meeting.'));
    } finally {
      setBusySignalId(null);
      setBusyAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-gray-950">
        <Loader2 className="h-10 w-10 animate-spin text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/40 px-4 py-6 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <TeacherHubNav />

        <header className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-card dark:border-gray-800 dark:bg-gray-900/80">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-adapt-indigo dark:text-adapt-cyan">
                Support signals
              </p>
              <h1 className="mt-2 text-3xl font-extrabold text-adapt-navy dark:text-gray-100">
                Classroom signal monitor
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-gray-400">
                Watch shared support signals, respond calmly, and escalate to families or meetings when patterns need adult coordination.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[34rem] xl:grid-cols-[1fr_0.8fr_0.8fr_auto]">
              <select
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-adapt-navy outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                aria-label="Filter signals by class"
              >
                <option value="">All classes</option>
                {summary?.classes.map((teacherClass) => (
                  <option key={teacherClass.id} value={teacherClass.id}>
                    {teacherClass.className}
                  </option>
                ))}
              </select>
              <select
                value={riskFilter}
                onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-adapt-navy outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                aria-label="Filter signals by risk"
              >
                <option value="all">All risk</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-adapt-navy outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
                aria-label="Filter signals by category"
              >
                <option value="all">All categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => loadSignals('refresh')}
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-adapt-indigo/40 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
                Refresh
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        )}

        {actionStatus && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            {actionStatus}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Signal metrics">
          <MetricCard
            label="Active"
            value={activeSignals.length}
            detail="Signals still needing review"
            icon={BellRing}
            tone="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-100"
          />
          <MetricCard
            label="High"
            value={highPriority}
            detail="Safeguarding-level attention"
            icon={ShieldAlert}
            tone="bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-100"
          />
          <MetricCard
            label="Sensory"
            value={sensorySignals}
            detail="Noise, light, or sensory load"
            icon={Volume2}
            tone="bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
          />
          <MetricCard
            label="Help"
            value={needsHelpSignals}
            detail="Confused, worried, or stuck"
            icon={MessageSquare}
            tone="bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-100"
          />
        </section>

        <section className="rounded-3xl border border-adapt-indigo/15 bg-white/85 p-5 shadow-soft dark:border-adapt-cyan/20 dark:bg-gray-900/80">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">Privacy boundary</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-gray-400">
                Signals appear only for active, parent-approved class memberships. Child names and journal text stay hidden unless family visibility settings allow them.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
              <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">Signals needing response</h2>
            </div>

            {signals.length > 0 ? (
              signals.map((signal) => {
                const reviewed = reviewedSignalIds.has(signal.id);
                return (
                  <article
                    key={signal.id}
                    className={`rounded-3xl border bg-white p-5 shadow-soft transition dark:bg-gray-900 ${
                      reviewed
                        ? 'border-emerald-200 opacity-75 dark:border-emerald-900/50'
                        : 'border-slate-200 dark:border-gray-800'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-adapt-indigo dark:text-adapt-cyan">
                          {signal.childName ?? 'Learner'} · {getSignalCategory(signal)}
                        </p>
                        <h3 className="mt-2 text-xl font-extrabold text-adapt-navy dark:text-gray-100">
                          {getSignalLabel(signal)}
                        </h3>
                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {formatRelativeTime(signal.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {reviewed && (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100">
                            Reviewed
                          </span>
                        )}
                        <span className={`rounded-full px-3 py-1 text-xs font-black capitalize ${riskStyles[signal.riskLevel]}`}>
                          {signal.riskLevel}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-gray-950">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                          Shared note
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-gray-300">
                          {signal.text || 'Summary-only visibility. Private journal text is hidden.'}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-adapt-indigo/5 p-4 dark:bg-adapt-cyan/10">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-adapt-indigo dark:text-adapt-cyan">
                          Suggested classroom response
                        </p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-gray-300">
                          {getSuggestedResponse(signal)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => handleReviewSignal(signal)}
                        disabled={reviewed || busySignalId === signal.id}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-60 dark:bg-emerald-950/40 dark:text-emerald-100"
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        Mark reviewed
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleMessageFamily(signal)}
                        disabled={busySignalId === signal.id}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-4 py-3 text-sm font-black text-white transition hover:bg-adapt-purple disabled:opacity-60 dark:bg-adapt-cyan dark:text-gray-950"
                      >
                        {busySignalId === signal.id && busyAction === 'message' ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <MessageSquare className="h-4 w-4" aria-hidden />
                        )}
                        Message family
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRequestMeeting(signal)}
                        disabled={busySignalId === signal.id}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-adapt-indigo/40 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                      >
                        {busySignalId === signal.id && busyAction === 'meeting' ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <CalendarClock className="h-4 w-4" aria-hidden />
                        )}
                        Request meeting
                      </button>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white/75 p-8 text-center text-slate-500 dark:border-gray-800 dark:bg-gray-900/70 dark:text-gray-400">
                No shared signals match these filters.
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
              <h2 className="text-xl font-extrabold text-adapt-navy dark:text-gray-100">Pattern radar</h2>
            </div>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">Most common signals</h3>
              {patternRows.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {patternRows.map(([category, count]) => (
                    <div key={category} className="rounded-2xl bg-slate-50 p-3 dark:bg-gray-950">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-black text-slate-700 dark:text-gray-200">{category}</p>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-adapt-indigo dark:bg-gray-900 dark:text-adapt-cyan">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-gray-400">
                  Review filters or wait for shared learner check-ins to build a pattern.
                </p>
              )}
            </article>

            <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
              <h3 className="text-lg font-extrabold text-adapt-navy dark:text-gray-100">Response ladder</h3>
              <div className="mt-4 space-y-3 text-sm font-semibold leading-6 text-slate-600 dark:text-gray-300">
                <p className="rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/20">
                  Low: acknowledge, keep the next step small, and watch for repetition.
                </p>
                <p className="rounded-2xl bg-amber-50 p-3 dark:bg-amber-950/20">
                  Medium: adjust sensory or task demands, then message family if the pattern repeats.
                </p>
                <p className="rounded-2xl bg-red-50 p-3 dark:bg-red-950/20">
                  High: follow safeguarding procedure and request adult coordination immediately.
                </p>
              </div>
            </article>
          </aside>
        </section>
      </div>
    </div>
  );
};

export default Signals;
