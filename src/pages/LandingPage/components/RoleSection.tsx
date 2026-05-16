import React from 'react';
import { Link } from 'react-router-dom';
import { Smile, Heart, GraduationCap, ArrowRight } from 'lucide-react';
import { ROUTES } from 'constants/routes';

const roles = [
  {
    icon: Smile,
    title: "I'm a Child",
    description: 'Playful learning, calm tools, and a buddy who gets you.',
    to: ROUTES.LOGIN,
    accent: 'from-violet-50 to-indigo-50 border-violet-100 hover:border-violet-200',
    iconBg: 'bg-violet-100 text-violet-600',
    iconBgHover: 'group-hover:bg-violet-200 group-hover:text-violet-700',
  },
  {
    icon: Heart,
    title: "I'm a Parent",
    description: 'Gentle insights, alerts, and support for your family journey.',
    to: ROUTES.LOGIN,
    accent: 'from-pink-50 to-rose-50 border-pink-100 hover:border-pink-200',
    iconBg: 'bg-pink-100 text-pink-600',
    iconBgHover: 'group-hover:bg-pink-200 group-hover:text-pink-700',
  },
  {
    icon: GraduationCap,
    title: "I'm a Teacher",
    description: 'Classroom heatmaps, assignments, and neuro-inclusive tools.',
    to: ROUTES.TEACHER_LOGIN,
    accent: 'from-cyan-50 to-teal-50 border-cyan-100 hover:border-cyan-200',
    iconBg: 'bg-cyan-100 text-cyan-600',
    iconBgHover: 'group-hover:bg-cyan-200 group-hover:text-cyan-700',
  },
];

const RoleSection: React.FC = () => (
  <section id="roles" className="py-16 sm:py-24">
    <>
      <span className="mx-auto block max-w-6xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-adapt-indigo">
          Choose your space
        </p>
        <h2 className="mt-3 text-3xl font-bold text-adapt-navy sm:text-4xl">
          A door for everyone in the room.
        </h2>
        <span className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {roles.map((role) => (
            <Link
              key={role.title}
              to={role.to}
              className={`group flex flex-col rounded-4xl border bg-gradient-to-br p-6 shadow-soft transition-all duration-300 ease-out hover:scale-[1.03] hover:shadow-card motion-reduce:transition-colors motion-reduce:hover:scale-100 ${role.accent}`}
            >
              <span
                className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-300 ease-out ${role.iconBg} ${role.iconBgHover}`}
              >
                <role.icon className="h-6 w-6 transition-transform duration-300 ease-out group-hover:scale-110" aria-hidden />
              </span>
              <h3 className="text-lg font-bold text-adapt-navy">{role.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{role.description}</p>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-adapt-indigo group-hover:gap-2 transition-all">
                Enter
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </Link>
          ))}
        </span>
      </span>
    </>
  </section>
);

export default RoleSection;
