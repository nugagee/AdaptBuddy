import React from 'react';
import { NEURO_OPTION_MAP } from 'constants/neuroOptions';
import {
  getMetricsForNeuros,
  type NeuroMetricDefinition,
} from 'features/child/data/neuroDashboardContent';
import { useChildProgressStore } from 'features/child/store/childProgressStore';

interface MetricsConstellationProps {
  neuroTypes: string[];
}

const MetricOrb: React.FC<{ metric: NeuroMetricDefinition; value: number }> = ({ metric, value }) => {
  const option = NEURO_OPTION_MAP[metric.neuroId];
  const pct = Math.min(100, Math.round((value / metric.dailyTarget) * 100));
  const Icon = metric.icon;

  return (
    <div className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="relative mb-3 flex h-16 w-16 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36" aria-hidden>
          <circle cx="18" cy="18" r="15" fill="none" className="stroke-slate-200 dark:stroke-gray-700" strokeWidth="3" />
          <circle
            cx="18"
            cy="18"
            r="15"
            fill="none"
            className="stroke-adapt-teal transition-all duration-700"
            strokeWidth="3"
            strokeDasharray={`${(pct / 100) * 94.2} 94.2`}
            strokeLinecap="round"
          />
        </svg>
        <Icon className="h-6 w-6 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
      </div>
      <p className="text-center text-xs font-semibold text-adapt-navy dark:text-gray-100">
        {option?.name.split(' ').slice(1).join(' ') ?? metric.neuroId}
      </p>
      <p className="mt-1 text-lg font-bold text-adapt-indigo dark:text-adapt-cyan">
        {value}
        <span className="text-xs font-normal text-slate-400">/{metric.dailyTarget}</span>
      </p>
      <p className="text-[10px] text-slate-500">{metric.label}</p>
    </div>
  );
};

const MetricsConstellation: React.FC<MetricsConstellationProps> = ({ neuroTypes }) => {
  const metrics = getMetricsForNeuros(neuroTypes);
  const metricValues = useChildProgressStore((s) => s.metricValues);
  const today = new Date().toISOString().slice(0, 10);

  const getValue = (neuroId: string) =>
    metricValues.find((m) => m.neuroId === neuroId && m.date === today)?.value ?? 0;

  if (metrics.length === 0) return null;

  return (
    <section className="rounded-3xl border border-slate-100 bg-gradient-to-br from-adapt-mist/50 to-white p-5 shadow-soft dark:border-gray-800 dark:from-gray-900 dark:to-gray-950 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100 sm:text-xl">
          Progress Constellation
        </h2>
        <p className="text-sm text-slate-500 dark:text-gray-400">
          Each orb tracks daily growth tied to your neuro profile
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {metrics.map((metric) => (
          <MetricOrb key={metric.neuroId} metric={metric} value={getValue(metric.neuroId)} />
        ))}
      </div>
    </section>
  );
};

export default MetricsConstellation;
