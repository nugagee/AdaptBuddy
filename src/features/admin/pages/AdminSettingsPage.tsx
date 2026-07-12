import React, { useCallback, useEffect, useState } from 'react';
import { Link2, Settings, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import AdminLayout from 'features/admin/components/AdminLayout';
import AdminStatCard from 'features/admin/components/AdminStatCard';
import {
  fetchAdminAnalyticsSafe,
  type AdminAnalytics,
} from 'services/supabase/adminService';

const PLATFORM_FEATURES = [
  {
    title: 'Buddy ID linking',
    detail: 'Parents connect child spaces with AB-XXXX-XX codes.',
    migration: '013, 014, 015',
    enabledKey: 'children_with_buddy_id' as const,
  },
  {
    title: 'Parent hub dashboard',
    detail: 'Family overview, journals, alerts, and multi-child switching.',
    migration: '009, 015',
    enabledKey: 'parent_child_links' as const,
  },
  {
    title: 'Companion onboarding',
    detail: 'Autism-first AI companion setup after neuro selector.',
    migration: '008',
    enabledKey: 'companion_onboarding_complete' as const,
  },
  {
    title: 'Parent coordination',
    detail: 'Messages, meetings, goals, resources, and feedback.',
    migration: '010, 016',
    enabledKey: 'trusted_adult_links' as const,
  },
  {
    title: 'Child unlinking',
    detail: 'Parents can remove a child from their dashboard safely.',
    migration: '017',
    enabledKey: 'parent_child_links' as const,
  },
] as const;

const AdminSettingsPage: React.FC = () => {
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
      setError(err instanceof Error ? err.message : 'Failed to load platform settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const childCount = analytics?.by_role.child ?? 0;

  return (
    <AdminLayout title="Platform settings">
      {error && (
        <p className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading platform settings…</p>
      ) : analytics ? (
        <div className="space-y-8">
          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
                <Settings className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-bold text-white">Platform configuration</h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-400">
                  These settings reflect live database features used by the parent hub, child companion
                  flow, and Buddy ID linking. Run migrations through <code className="text-indigo-300">018</code>{' '}
                  in Supabase to keep admin analytics in sync.
                </p>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AdminStatCard
              label="Buddy IDs assigned"
              value={analytics.children_with_buddy_id}
              sub={`${childCount} children total`}
              icon={Link2}
            />
            <AdminStatCard
              label="Parent-child links"
              value={analytics.parent_child_links}
              sub={`${analytics.parents_with_linked_children} parents connected`}
              icon={UsersRound}
            />
            <AdminStatCard
              label="Companion onboarded"
              value={analytics.companion_onboarding_complete}
              sub={`${analytics.onboarding_complete} neuro profiles complete`}
              icon={Sparkles}
            />
            <AdminStatCard
              label="Trusted adult links"
              value={analytics.trusted_adult_links}
              sub={`${analytics.active_alerts} active alerts`}
              icon={ShieldCheck}
            />
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">
              Feature modules
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {PLATFORM_FEATURES.map((feature) => {
                const metric = analytics[feature.enabledKey];
                const isActive = metric > 0 || feature.enabledKey === 'parent_child_links';

                return (
                  <article
                    key={feature.title}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-white">{feature.title}</h3>
                        <p className="mt-1 text-sm text-gray-400">{feature.detail}</p>
                        <p className="mt-2 text-xs text-gray-500">Migrations: {feature.migration}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          isActive
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : 'bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {isActive ? 'Active' : 'Awaiting data'}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-gray-300">
                      Live metric: <span className="font-bold text-white">{metric}</span>
                    </p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">
              Parent hub data visibility
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-white">{analytics.shared_journal_entries}</p>
                <p className="text-xs text-gray-400">Shared journal entries</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-white">{analytics.active_alerts}</p>
                <p className="text-xs text-gray-400">Unresolved alerts</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center">
                <p className="text-2xl font-bold text-white">{analytics.recent_signups_7d}</p>
                <p className="text-xs text-gray-400">New signups (7 days)</p>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </AdminLayout>
  );
};

export default AdminSettingsPage;
