import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from 'constants/routes';
import AnimatedProgressBar from 'components/animations/AnimatedProgressBar';

const metrics = [
  { label: 'Happiness', value: '82', change: '+6 this week', pct: 82, color: 'bg-adapt-teal' },
  { label: 'Focus', value: '74', change: '+2 this week', pct: 74, color: 'bg-adapt-indigo' },
  { label: 'Calm', value: '88', change: '+1 this week', pct: 88, color: 'bg-adapt-teal' },
  { label: 'Anxious', value: '12', change: '-4 this week', pct: 12, color: 'bg-violet-300' },
];

const AnalyticsSection: React.FC = () => (
  <section id="analytics" className="py-16 sm:py-24">
    <>
      <span className="mx-auto block max-w-6xl px-4 sm:px-6 lg:px-8">
        <span className="block overflow-hidden rounded-5xl border border-slate-100 bg-white p-8 shadow-card sm:p-10 lg:p-12">
          <span className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <span className="block">
              <p className="text-xs font-semibold uppercase tracking-widest text-adapt-indigo">
                Wellbeing analytics
              </p>
              <h2 className="mt-3 text-3xl font-bold text-adapt-navy sm:text-4xl">
                Insights that feel like a hug, not a report card.
              </h2>
              <p className="mt-4 leading-relaxed text-slate-600">
                See gentle trends in mood, focus, and calm — with safeguarding signals when your
                child might need extra support. No jargon, no judgement.
              </p>
              <Link
                to={ROUTES.LOGIN}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-adapt-navy px-6 py-3 text-sm font-semibold text-white transition hover:bg-adapt-purple"
              >
                Explore a sample dashboard
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </span>
            <span className="grid grid-cols-2 gap-4">
              {metrics.map((m, index) => (
                <article
                  key={m.label}
                  className="rounded-3xl border border-slate-100 bg-adapt-cloud p-4 sm:p-5"
                >
                  <p className="text-sm font-medium text-slate-500">{m.label}</p>
                  <p className="mt-1 text-2xl font-bold text-adapt-navy">
                    {m.value}{' '}
                    <span className="text-xs font-medium text-adapt-teal">{m.change}</span>
                  </p>
                  <AnimatedProgressBar
                    percent={m.pct}
                    colorClass={m.color}
                    delay={index * 0.4}
                  />
                </article>
              ))}
            </span>
          </span>
        </span>
      </span>
    </>
  </section>
);

export default AnalyticsSection;
