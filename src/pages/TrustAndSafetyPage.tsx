import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, Eye, LockKeyhole, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { ROUTES } from 'constants/routes';

const TrustAndSafetyPage: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/30 px-4 py-8 text-adapt-navy dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 dark:text-gray-100 sm:px-6">
    <main className="mx-auto max-w-4xl">
      <Link to={ROUTES.HOME} className="text-sm font-bold text-adapt-indigo dark:text-adapt-cyan">← AdaptBuddy home</Link>
      <div className="mt-8 rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg dark:border-gray-800 dark:bg-gray-900/80 sm:p-10">
        <p className="text-sm font-bold uppercase tracking-wide text-adapt-indigo dark:text-adapt-cyan">Trust centre</p>
        <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Child safety, privacy and accessible AI</h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600 dark:text-gray-300">
          AdaptBuddy supports learning, communication and help-seeking. It does not diagnose,
          provide therapy or replace a parent, teacher, safeguarding lead or emergency service.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl bg-sky-50 p-5 dark:bg-sky-950/30">
            <Bot className="h-6 w-6 text-sky-700 dark:text-sky-300" aria-hidden />
            <h2 className="mt-3 text-xl font-bold">Buddy is clearly AI</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-gray-300">Children are told that Buddy is an AI helper, can make mistakes and can be stopped. It must not claim to be human or encourage secrecy or emotional dependence.</p>
          </section>
          <section className="rounded-2xl bg-emerald-50 p-5 dark:bg-emerald-950/30">
            <UserRoundCheck className="h-6 w-6 text-emerald-700 dark:text-emerald-300" aria-hidden />
            <h2 className="mt-3 text-xl font-bold">Adults remain accountable</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-gray-300">AI may suggest contacting a trusted adult, but safeguarding decisions and follow-up remain with authorised people.</p>
          </section>
          <section id="privacy" className="rounded-2xl bg-violet-50 p-5 dark:bg-violet-950/30">
            <LockKeyhole className="h-6 w-6 text-violet-700 dark:text-violet-300" aria-hidden />
            <h2 className="mt-3 text-xl font-bold">Private by default</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-gray-300">Journal and mood notes are private unless the child chooses to share. Support alerts contain the minimum information adults need to respond. Voice recordings are not stored by default.</p>
          </section>
          <section className="rounded-2xl bg-rose-50 p-5 dark:bg-rose-950/30">
            <ShieldCheck className="h-6 w-6 text-rose-700 dark:text-rose-300" aria-hidden />
            <h2 className="mt-3 text-xl font-bold">Help when safety may be involved</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-gray-300">Buddy directs the child to a safe adult and provides a child-controlled alert button. Immediate danger guidance points to 999 in the UK.</p>
          </section>
        </div>

        <section id="accessibility" className="mt-8 border-t border-slate-200 pt-8 dark:border-gray-700">
          <div className="flex items-center gap-3"><Eye className="h-6 w-6" aria-hidden /><h2 className="text-2xl font-bold">Accessibility approach</h2></div>
          <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-gray-300">AdaptBuddy supports keyboard use, readable text, reduced motion, high contrast, calm themes, speech and visual alternatives. Accessibility is tested continuously; the product does not claim universal suitability for every child.</p>
        </section>

        <p className="mt-8 text-sm text-slate-500 dark:text-gray-400">Pilot transparency statement · Updated September 2026</p>
      </div>
    </main>
  </div>
);

export default TrustAndSafetyPage;
