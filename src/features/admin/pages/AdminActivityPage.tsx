import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  Clock3,
  Eye,
  Footprints,
  MousePointerClick,
  Radio,
  RefreshCw,
  Timer,
  Users,
  UserRound,
} from 'lucide-react';
import AdminLayout from 'features/admin/components/AdminLayout';
import AdminStatCard from 'features/admin/components/AdminStatCard';
import {
  fetchActivityOverview,
  fetchOnlinePresence,
  fetchTopPages,
  fetchTopUsers,
  fetchTopVisitors,
  fetchUserJourney,
  formatDuration,
  rangeForGranularity,
  type ActivityGranularity,
  type ActivityOverview,
  type OnlinePresence,
  type TopPageStat,
  type TopUserStat,
  type TopVisitorStat,
  type UserJourney,
} from 'services/supabase/activityAnalyticsService';

const ONLINE_POLL_MS = 15_000;
const ONLINE_WINDOW_SECONDS = 120;

const GRANULARITIES: { id: ActivityGranularity; label: string; hint: string }[] = [
  { id: 'hour', label: 'Hourly', hint: 'Last 24 hours' },
  { id: 'day', label: 'Daily', hint: 'Last 30 days' },
  { id: 'week', label: 'Weekly', hint: 'Last 12 weeks' },
  { id: 'month', label: 'Monthly', hint: 'Last 12 months' },
  { id: 'year', label: 'Yearly', hint: 'Last 5 years' },
];

const ROLE_COLORS: Record<string, string> = {
  child: '#22d3ee',
  parent: '#a78bfa',
  teacher: '#34d399',
  admin: '#f59e0b',
  guest: '#94a3b8',
  visitor: '#64748b',
};

type JourneyTarget =
  | { kind: 'user'; id: string; label: string }
  | { kind: 'visitor'; id: string; label: string }
  | null;

const formatBucketLabel = (bucket: string, granularity: ActivityGranularity): string => {
  if (granularity === 'hour') {
    const date = new Date(bucket);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
      });
    }
  }
  return bucket;
};

const AdminActivityPage: React.FC = () => {
  const [granularity, setGranularity] = useState<ActivityGranularity>('day');
  const [overview, setOverview] = useState<ActivityOverview | null>(null);
  const [online, setOnline] = useState<OnlinePresence | null>(null);
  const [pages, setPages] = useState<TopPageStat[]>([]);
  const [users, setUsers] = useState<TopUserStat[]>([]);
  const [visitors, setVisitors] = useState<TopVisitorStat[]>([]);
  const [journeyTarget, setJourneyTarget] = useState<JourneyTarget>(null);
  const [journey, setJourney] = useState<UserJourney | null>(null);
  const [loading, setLoading] = useState(true);
  const [journeyLoading, setJourneyLoading] = useState(false);
  const [error, setError] = useState('');

  const loadOnline = useCallback(async () => {
    try {
      const presence = await fetchOnlinePresence(ONLINE_WINDOW_SECONDS);
      setOnline(presence);
    } catch (err: unknown) {
      console.warn('Online presence refresh failed:', err);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const range = rangeForGranularity(granularity);
      const [nextOverview, nextPages, nextUsers, nextVisitors, nextOnline] = await Promise.all([
        fetchActivityOverview(granularity, range.from, range.to),
        fetchTopPages(range.from, range.to, 15),
        fetchTopUsers(range.from, range.to, 15),
        fetchTopVisitors(range.from, range.to, 15),
        fetchOnlinePresence(ONLINE_WINDOW_SECONDS),
      ]);
      setOverview(nextOverview);
      setPages(nextPages);
      setUsers(nextUsers);
      setVisitors(nextVisitors);
      setOnline(nextOnline);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load activity analytics');
    } finally {
      setLoading(false);
    }
  }, [granularity]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadOnline();
    }, ONLINE_POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadOnline]);

  useEffect(() => {
    if (!journeyTarget || !overview) {
      setJourney(null);
      return;
    }

    let cancelled = false;
    setJourneyLoading(true);
    void fetchUserJourney({
      userId: journeyTarget.kind === 'user' ? journeyTarget.id : null,
      visitorId: journeyTarget.kind === 'visitor' ? journeyTarget.id : null,
      from: overview.from,
      to: overview.to,
    })
      .then((data) => {
        if (!cancelled) setJourney(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load journey');
        }
      })
      .finally(() => {
        if (!cancelled) setJourneyLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [journeyTarget, overview]);

  const timeline = useMemo(
    () =>
      (overview?.timeline ?? []).map((point) => ({
        ...point,
        label: formatBucketLabel(point.bucket, granularity),
      })),
    [overview, granularity],
  );

  const roleChartData = useMemo(
    () =>
      Object.entries(overview?.by_role ?? {}).map(([name, value]) => ({
        name,
        value,
      })),
    [overview],
  );

  const activeHint = GRANULARITIES.find((item) => item.id === granularity)?.hint ?? '';

  return (
    <AdminLayout title="Activity analytics">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-gray-400">
            Live first-party tracking of sessions, page paths, and active time on page.
          </p>
          <p className="mt-1 text-xs text-gray-500">{activeHint}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-white/10 bg-slate-900/80 p-1">
            {GRANULARITIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setGranularity(item.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  granularity === item.id
                    ? 'bg-indigo-500 text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-indigo-400/40 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <section className="mb-6 rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 via-slate-900/80 to-cyan-500/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <h2 className="text-sm font-bold text-white">Currently online</h2>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Active in the last {ONLINE_WINDOW_SECONDS / 60} minutes · auto-refreshes every 15s
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Sessions</p>
              <p className="text-2xl font-extrabold tabular-nums text-emerald-300">
                {online?.online_sessions ?? (loading ? '…' : 0)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Signed-in</p>
              <p className="text-2xl font-extrabold tabular-nums text-cyan-300">
                {online?.online_users ?? (loading ? '…' : 0)}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Anonymous</p>
              <p className="text-2xl font-extrabold tabular-nums text-violet-300">
                {online?.online_anonymous ?? (loading ? '…' : 0)}
              </p>
            </div>
          </div>
        </div>

        {Object.keys(online?.by_role ?? {}).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {Object.entries(online?.by_role ?? {}).map(([role, count]) => (
              <span
                key={role}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs capitalize text-gray-300"
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: ROLE_COLORS[role] ?? '#64748b' }}
                />
                {role}
                <span className="tabular-nums text-white">{count}</span>
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
          {!online?.sessions?.length && (
            <div className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-gray-500">
              {loading ? 'Checking live sessions…' : 'No one is online right now.'}
            </div>
          )}
          {online?.sessions?.map((session) => {
            const label =
              session.display_name ||
              session.email ||
              (session.is_guest ? 'Guest' : `Visitor ${session.visitor_key.slice(0, 8)}`);
            return (
              <button
                key={session.session_id}
                type="button"
                onClick={() => {
                  if (session.user_id) {
                    setJourneyTarget({
                      kind: 'user',
                      id: session.user_id,
                      label,
                    });
                  } else {
                    setJourneyTarget({
                      kind: 'visitor',
                      id: session.visitor_id,
                      label,
                    });
                  }
                }}
                className="flex w-full flex-col gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-left transition hover:border-emerald-400/30 hover:bg-emerald-500/5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <p className="truncate text-sm font-semibold text-white">{label}</p>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-950"
                      style={{ background: ROLE_COLORS[session.role] ?? '#94a3b8' }}
                    >
                      {session.role}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-indigo-200">
                    {session.current_path || session.entry_path || '—'}
                  </p>
                  {session.current_title && (
                    <p className="truncate text-[11px] text-gray-500">{session.current_title}</p>
                  )}
                  <p className="mt-1 text-[11px] text-gray-500">
                    {session.email ? `${session.email} · ` : ''}
                    {session.page_count} pages · session {formatDuration(session.duration_ms)}
                    {session.timezone ? ` · ${session.timezone}` : ''}
                    {session.viewport_width && session.viewport_height
                      ? ` · ${session.viewport_width}×${session.viewport_height}`
                      : ''}
                  </p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                    <Radio className="h-3.5 w-3.5" />
                    live
                  </p>
                  <p className="text-[11px] tabular-nums text-gray-400">
                    active {session.seconds_since_activity}s ago
                  </p>
                  <p className="text-[11px] tabular-nums text-cyan-200">
                    page {formatDuration(session.current_page_active_ms ?? 0)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Sessions"
          value={overview?.sessions ?? (loading ? '…' : 0)}
          sub="Started in range"
          icon={Activity}
          accent="from-cyan-500/20 to-sky-500/10"
        />
        <AdminStatCard
          label="Page views"
          value={overview?.page_views ?? (loading ? '…' : 0)}
          sub="Tracked navigations"
          icon={Eye}
          accent="from-violet-500/20 to-fuchsia-500/10"
        />
        <AdminStatCard
          label="Unique visitors"
          value={overview?.unique_visitors ?? (loading ? '…' : 0)}
          sub={`${overview?.unique_users ?? 0} signed-in users`}
          icon={Users}
          accent="from-emerald-500/20 to-teal-500/10"
        />
        <AdminStatCard
          label="Avg session"
          value={formatDuration(overview?.avg_session_ms ?? 0)}
          sub={`Avg active ${formatDuration(overview?.avg_active_ms ?? 0)} / page`}
          icon={Timer}
          accent="from-amber-500/20 to-orange-500/10"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white">Traffic over time</h2>
              <p className="text-xs text-gray-500">Sessions, page views, and unique visitors</p>
            </div>
            <MousePointerClick className="h-4 w-4 text-indigo-300" />
          </div>
          <div className="h-72">
            {timeline.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                {loading ? 'Loading chart…' : 'No activity in this range yet. Browse the app to seed data.'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="sessionsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="pagesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                    }}
                  />
                  <Area type="monotone" dataKey="sessions" name="Sessions" stroke="#818cf8" fill="url(#sessionsFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="page_views" name="Page views" stroke="#22d3ee" fill="url(#pagesFill)" strokeWidth={2} />
                  <Area type="monotone" dataKey="unique_visitors" name="Visitors" stroke="#34d399" fillOpacity={0} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-white">Sessions by role</h2>
            <p className="text-xs text-gray-500">Who is using the product</p>
          </div>
          <div className="h-56">
            {roleChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                {loading ? 'Loading…' : 'No role data yet'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={roleChartData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3}>
                    {roleChartData.map((entry) => (
                      <Cell key={entry.name} fill={ROLE_COLORS[entry.name] ?? '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <ul className="mt-2 space-y-1.5">
            {roleChartData.map((entry) => (
              <li key={entry.name} className="flex items-center justify-between text-xs text-gray-400">
                <span className="inline-flex items-center gap-2 capitalize">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: ROLE_COLORS[entry.name] ?? '#64748b' }}
                  />
                  {entry.name}
                </span>
                <span className="tabular-nums text-gray-200">{entry.value}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Top pages</h2>
              <p className="text-xs text-gray-500">Views and average active time</p>
            </div>
            <Clock3 className="h-4 w-4 text-cyan-300" />
          </div>
          <div className="h-64">
            {pages.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                {loading ? 'Loading…' : 'No page views yet'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pages.slice(0, 8)} layout="vertical" margin={{ left: 16, right: 16 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="path_group"
                    width={120}
                    tick={{ fill: '#cbd5e1', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) =>
                      name === 'avg_active_ms' ? formatDuration(value) : value
                    }
                    contentStyle={{
                      background: '#0f172a',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="views" name="Views" fill="#818cf8" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {pages.map((page) => (
              <div
                key={page.path_group}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-indigo-200">{page.path_group}</p>
                  <p className="text-[11px] text-gray-500">
                    {page.views} views · {page.visitors} visitors
                  </p>
                </div>
                <p className="shrink-0 text-xs tabular-nums text-gray-300">
                  {formatDuration(page.avg_active_ms)}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Highest engagement</h2>
              <p className="text-xs text-gray-500">Users and visitors with the most sessions</p>
            </div>
            <UserRound className="h-4 w-4 text-emerald-300" />
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Top users</p>
            {users.length === 0 && (
              <p className="text-sm text-gray-500">{loading ? 'Loading…' : 'No signed-in traffic yet'}</p>
            )}
            {users.map((user, index) => (
              <button
                key={user.user_id}
                type="button"
                onClick={() =>
                  setJourneyTarget({
                    kind: 'user',
                    id: user.user_id,
                    label: user.display_name || user.email || user.user_id,
                  })
                }
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                  journeyTarget?.kind === 'user' && journeyTarget.id === user.user_id
                    ? 'border-indigo-400/40 bg-indigo-500/10'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/15'
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    <span className="mr-2 text-xs text-gray-500">#{index + 1}</span>
                    {user.display_name || user.email || 'User'}
                  </p>
                  <p className="truncate text-[11px] text-gray-500">
                    {user.role} · {user.sessions} sessions · {user.page_views} pages
                  </p>
                </div>
                <p className="shrink-0 text-xs tabular-nums text-cyan-200">
                  {formatDuration(user.total_duration_ms)}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Top visitors</p>
            {visitors.slice(0, 8).map((visitor, index) => (
              <button
                key={visitor.visitor_id}
                type="button"
                onClick={() =>
                  setJourneyTarget({
                    kind: 'visitor',
                    id: visitor.visitor_id,
                    label: visitor.display_name || visitor.email || `Visitor ${visitor.visitor_key.slice(0, 8)}`,
                  })
                }
                className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                  journeyTarget?.kind === 'visitor' && journeyTarget.id === visitor.visitor_id
                    ? 'border-indigo-400/40 bg-indigo-500/10'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/15'
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    <span className="mr-2 text-xs text-gray-500">#{index + 1}</span>
                    {visitor.display_name || visitor.email || `Visitor ${visitor.visitor_key.slice(0, 8)}`}
                  </p>
                  <p className="truncate text-[11px] text-gray-500">
                    {visitor.role} · {visitor.sessions} sessions · {visitor.page_views} pages
                  </p>
                </div>
                <p className="shrink-0 text-xs tabular-nums text-emerald-200">
                  {formatDuration(visitor.total_duration_ms)}
                </p>
              </button>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <Footprints className="h-4 w-4 text-violet-300" />
              Navigation journey
            </h2>
            <p className="text-xs text-gray-500">
              {journeyTarget
                ? `Path and time spent for ${journeyTarget.label}`
                : 'Select a user or visitor above to inspect their page-by-page path'}
            </p>
          </div>
          {journeyTarget && (
            <button
              type="button"
              onClick={() => setJourneyTarget(null)}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {!journeyTarget && (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-gray-500">
            Choose someone from Highest engagement to open their journey timeline.
          </div>
        )}

        {journeyTarget && journeyLoading && (
          <p className="text-sm text-gray-500">Loading journey…</p>
        )}

        {journeyTarget && !journeyLoading && journey && (
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <div className="space-y-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wider text-gray-500">Subject</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {journey.profile.display_name || journeyTarget.label}
                </p>
                <p className="text-xs text-gray-500">{journey.profile.email}</p>
                <p className="mt-2 text-xs capitalize text-indigo-300">{journey.profile.role || journeyTarget.kind}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs uppercase tracking-wider text-gray-500">Sessions</p>
                <p className="mt-1 text-2xl font-bold text-white">{journey.sessions.length}</p>
                <p className="text-xs text-gray-500">{journey.page_views.length} page events</p>
              </div>
            </div>

            <div className="relative space-y-0">
              {journey.page_views.length === 0 && (
                <p className="text-sm text-gray-500">No page views in this range.</p>
              )}
              {journey.page_views
                .slice()
                .reverse()
                .map((page, index, list) => (
                  <div key={page.id} className="relative flex gap-4 pb-5">
                    <div className="flex w-4 flex-col items-center">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-indigo-400 ring-4 ring-indigo-400/20" />
                      {index < list.length - 1 && <span className="mt-1 w-px flex-1 bg-white/10" />}
                    </div>
                    <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-sm text-indigo-200">{page.path}</p>
                          {page.title && (
                            <p className="truncate text-xs text-gray-500">{page.title}</p>
                          )}
                        </div>
                        <div className="text-right text-[11px] text-gray-400">
                          <p>{new Date(page.entered_at).toLocaleString()}</p>
                          <p className="tabular-nums text-cyan-200">
                            active {formatDuration(page.active_ms)} · total {formatDuration(page.duration_ms)}
                          </p>
                        </div>
                      </div>
                      {page.referrer_path && (
                        <p className="mt-2 text-[11px] text-gray-500">
                          from <span className="font-mono text-gray-400">{page.referrer_path}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </section>
    </AdminLayout>
  );
};

export default AdminActivityPage;
