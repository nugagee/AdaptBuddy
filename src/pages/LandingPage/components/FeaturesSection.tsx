import React from 'react';
import { Smile, Infinity, Heart, ShieldCheck, Activity, GraduationCap } from 'lucide-react';
import TiltCard from 'components/animations/TiltCard';

const features = [
  {
    icon: Smile,
    title: 'Emotional Check-ins',
    description: 'Gentle mood tracking and journaling that helps children name feelings safely.',
    color: 'bg-violet-100 text-violet-600',
  },
  {
    icon: Infinity,
    title: 'Adaptive Learning',
    description: 'Lessons that adjust pace, difficulty, and style to each neurotype.',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    icon: Heart,
    title: 'AI Buddy Companion',
    description: 'A calm, supportive guide for learning, routines, and emotional reassurance.',
    color: 'bg-pink-100 text-pink-600',
  },
  {
    icon: ShieldCheck,
    title: 'Trusted Adult Controls',
    description: 'Parents and guardians stay informed with safeguarding alerts they can trust.',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    icon: Activity,
    title: 'Wellbeing Analytics',
    description: 'Trends and insights that feel supportive — never overwhelming or clinical.',
    color: 'bg-cyan-100 text-cyan-600',
  },
  {
    icon: GraduationCap,
    title: 'Classroom Heatmaps',
    description: 'Teachers see engagement and emotional patterns across their classroom at a glance.',
    color: 'bg-indigo-100 text-indigo-600',
  },
];

const FeaturesSection: React.FC = () => (
  <section id="features" className="py-16 sm:py-24">
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-adapt-indigo">What&apos;s inside</p>
      <h2 className="mt-3 max-w-2xl text-3xl font-bold text-adapt-navy sm:text-4xl">
        Designed to reduce cognitive load - not add to it.
      </h2>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 [perspective:1200px]">
        {features.map((feature) => (
          <TiltCard
            key={feature.title}
            className="rounded-4xl border border-slate-100 bg-white p-6 shadow-soft hover:shadow-card"
          >
            <span className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl ${feature.color}`}>
              <feature.icon className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="text-lg font-bold text-adapt-navy">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
          </TiltCard>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesSection;