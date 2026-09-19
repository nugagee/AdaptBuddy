import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, FlaskConical, ShieldCheck } from 'lucide-react';
import { ROUTES } from 'constants/routes';

const liveCapabilities = [
  'Child neuro-profile and communication-preference onboarding',
  'Simplified child dashboard with Now / Next / Later planning',
  'Server-mediated AI Buddy for communication and task support',
  'Child-controlled trusted-adult support requests',
  'Parent-approved teacher connection and classroom workflow',
  'Assignments, support signals, adult responses and evidence exports',
];

const pilotMeasures = [
  'Can a child reach the right tool without adult prompting?',
  'Can the child communicate confusion, sensory overload or a need for help?',
  'Does a trusted adult receive and acknowledge the correct minimum-information signal?',
  'Do families understand what is private, shared and escalated?',
  'Can school staff act without seeing private journal content?',
];

const EvidencePage: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/30 px-4 py-8 text-adapt-navy dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 dark:text-gray-100 sm:px-6">
    <main className="mx-auto max-w-5xl">
      <Link to={ROUTES.HOME} className="text-sm font-bold text-adapt-indigo dark:text-adapt-cyan">← AdaptBuddy home</Link>
      <header className="mt-8 max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-wide text-adapt-indigo dark:text-adapt-cyan">Product evidence</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-5xl">From working prototype to evaluated child-first pilot</h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-gray-300">This page separates what AdaptBuddy can demonstrate today from outcomes that must be established through consented pilot testing. It does not present invented impact claims.</p>
      </header>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-emerald-200 bg-white/85 p-6 shadow-sm dark:border-emerald-900 dark:bg-gray-900/80 sm:p-8">
          <div className="flex items-center gap-3"><CheckCircle2 className="h-7 w-7 text-emerald-600" aria-hidden /><h2 className="text-2xl font-bold">Working now</h2></div>
          <ul className="mt-5 space-y-3">
            {liveCapabilities.map((item) => <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-700 dark:text-gray-300"><span aria-hidden>✓</span><span>{item}</span></li>)}
          </ul>
        </section>
        <section className="rounded-3xl border border-sky-200 bg-white/85 p-6 shadow-sm dark:border-sky-900 dark:bg-gray-900/80 sm:p-8">
          <div className="flex items-center gap-3"><FlaskConical className="h-7 w-7 text-sky-600" aria-hidden /><h2 className="text-2xl font-bold">To measure in the pilot</h2></div>
          <ul className="mt-5 space-y-3">
            {pilotMeasures.map((item) => <li key={item} className="flex gap-3 text-sm leading-relaxed text-slate-700 dark:text-gray-300"><span aria-hidden>○</span><span>{item}</span></li>)}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <section className="rounded-3xl bg-violet-50 p-6 dark:bg-violet-950/30"><ClipboardCheck className="h-7 w-7 text-violet-700 dark:text-violet-300" aria-hidden /><h2 className="mt-3 text-xl font-bold">Evidence to retain</h2><p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-gray-300">Dated releases, pilot protocol, consent materials, anonymised usability findings, safeguarding review, accessibility results, change log and verified stakeholder feedback.</p></section>
        <section className="rounded-3xl bg-rose-50 p-6 dark:bg-rose-950/30"><ShieldCheck className="h-7 w-7 text-rose-700 dark:text-rose-300" aria-hidden /><h2 className="mt-3 text-xl font-bold">Pilot boundary</h2><p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-gray-300">No diagnosis, therapy or autonomous safeguarding decisions. Real child testing requires consent, a responsible organisation, named safeguarding ownership and an incident-response process.</p></section>
      </div>

      <p className="mt-8 text-sm text-slate-500 dark:text-gray-400">Launch-candidate evidence statement · September 2026</p>
    </main>
  </div>
);

export default EvidencePage;
