import React, { useCallback, useEffect, useState } from 'react';
import {
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
  AlertTriangle,
  Baby,
  GraduationCap,
  Heart,
  Link2,
  Shield,
  Sparkles,
  UserCheck,
  Users,
  UsersRound,
  UserX,
} from 'lucide-react';
import { formatUkGender, formatUkSex } from 'constants/signup';
import AdminLayout from 'features/admin/components/AdminLayout';
import AdminStatCard from 'features/admin/components/AdminStatCard';
import {
  fetchAdminAnalyticsSafe,
  type AdminAnalytics,
} from 'services/supabase/adminService';

const ROLE_COLORS: Record<string, string> = {
  child: '#22d3ee',
  parent: '#a78bfa',
  teacher: '#34d399',
  admin: '#f59e0b',
};

const SEX_COLORS: Record<string, string> = {
  male: '#60a5fa',
  female: '#f472b6',
  intersex: '#34d399',
  prefer_not_to_say: '#64748b',
  unspecified: '#475569',
};

const GENDER_COLORS: Record<string, string> = {
  woman: '#f472b6',
  man: '#60a5fa',
  non_binary: '#a78bfa',
  other: '#94a3b8',
  prefer_not_to_say: '#64748b',
  unspecified: '#475569',
};

const NEURO_COLORS: Record<string, string> = {
  autism: '#22d3ee',
  adhd: '#f59e0b',
  dyslexia: '#a78bfa',
  unspecified: '#64748b',
};

const AdminDashboardPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchAdminAnalyticsSafe();
      setAnalytics(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const roleChartData = analytics
    ? Object.entries(analytics.by_role ?? {}).map(([name, value]) => ({ name, value }))
    : [];

  const sexChartData = analytics
    ? Object.entries(analytics.by_sex ?? {})
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({
          name: name === 'unspecified' ? 'Unspecified' : formatUkSex(name),
          value,
          key: name,
        }))
    : [];

  const genderChartData = analytics
    ? Object.entries(analytics.by_gender ?? {})
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({
          name: name === 'unspecified' ? 'Unspecified' : formatUkGender(name),
          value,
          key: name,
        }))
    : [];

  const neuroChartData = analytics
    ? Object.entries(analytics.by_neuro_type ?? {})
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({
          name: name === 'unspecified' ? 'Not set' : name.charAt(0).toUpperCase() + name.slice(1),
          value,
          key: name,
        }))
    : [];

  const childCount = analytics?.by_role.child ?? 0;

  return (
    <AdminLayout title="Platform overview">
      {error && (
        <p className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading analytics…</p>
      ) : analytics ? (
        <div className="space-y-8">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard label="Total users" value={analytics.total_users} icon={Users} />
            <AdminStatCard
              label="Children"
              value={analytics.by_role.child ?? 0}
              icon={Baby}
              accent="from-cyan-500/20 to-teal-500/10"
            />
            <AdminStatCard
              label="Parents"
              value={analytics.by_role.parent ?? 0}
              icon={Heart}
              accent="from-violet-500/20 to-purple-500/10"
            />
            <AdminStatCard
              label="Teachers"
              value={analytics.by_role.teacher ?? 0}
              icon={GraduationCap}
              accent="from-emerald-500/20 to-green-500/10"
            />
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard
              label="Admins"
              value={analytics.by_role.admin ?? 0}
              icon={Shield}
              accent="from-amber-500/20 to-orange-500/10"
            />
            <AdminStatCard
              label="Authorized"
              value={analytics.authorized}
              sub={`${analytics.unauthorized} unauthorized`}
              icon={UserCheck}
            />
            <AdminStatCard
              label="New (7 days)"
              value={analytics.recent_signups_7d}
              sub={`${analytics.recent_signups_30d} in 30 days`}
              icon={Activity}
            />
            <AdminStatCard
              label="Avg age"
              value={analytics.avg_age ?? '—'}
              sub={`${analytics.onboarding_complete} neuro onboarded`}
              icon={UserX}
              accent="from-slate-500/20 to-gray-500/10"
            />
          </section>

          <section>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">
              Parent hub & companion platform
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <AdminStatCard
                label="Buddy IDs"
                value={analytics.children_with_buddy_id}
                sub={`${childCount} children`}
                icon={Link2}
                accent="from-cyan-500/20 to-sky-500/10"
              />
              <AdminStatCard
                label="Parent-child links"
                value={analytics.parent_child_links}
                sub={`${analytics.parents_with_linked_children} parents linked`}
                icon={UsersRound}
                accent="from-violet-500/20 to-purple-500/10"
              />
              <AdminStatCard
                label="Companion ready"
                value={analytics.companion_onboarding_complete}
                sub="Companion onboarding complete"
                icon={Sparkles}
                accent="from-fuchsia-500/20 to-pink-500/10"
              />
              <AdminStatCard
                label="Active alerts"
                value={analytics.active_alerts}
                sub={`${analytics.shared_journal_entries} shared journal entries`}
                icon={AlertTriangle}
                accent="from-rose-500/20 to-orange-500/10"
              />
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">
                Users by role
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {roleChartData.map((entry) => (
                        <Cell key={entry.name} fill={ROLE_COLORS[entry.name] ?? '#6366f1'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">
                Sex distribution (UK standard)
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sexChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {sexChartData.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={SEX_COLORS[entry.key] ?? '#6366f1'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">
                Gender identity distribution (UK standard)
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {genderChartData.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={GENDER_COLORS[entry.key] ?? '#6366f1'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">
                Neuro profiles
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={neuroChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                    >
                      {neuroChartData.map((entry) => (
                        <Cell key={entry.key} fill={NEURO_COLORS[entry.key] ?? '#6366f1'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">
              Account status
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {Object.entries(analytics.by_status ?? {}).map(([status, count]) => (
                <div
                  key={status}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center"
                >
                  <p className="text-2xl font-bold text-white">{count}</p>
                  <p className="text-xs capitalize text-gray-400">{status}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </AdminLayout>
  );
};

export default AdminDashboardPage;
