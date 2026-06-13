import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface AdminStatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  accent?: string;
}

const AdminStatCard: React.FC<AdminStatCardProps> = ({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'from-indigo-500/20 to-violet-500/10',
}) => (
  <div className={`rounded-2xl border border-white/10 bg-gradient-to-br ${accent} p-5 shadow-lg`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="mt-2 text-3xl font-extrabold tabular-nums text-white">{value}</p>
        {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
        <Icon className="h-5 w-5 text-indigo-300" aria-hidden />
      </div>
    </div>
  </div>
);

export default AdminStatCard;
