import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Shield, Accessibility } from 'lucide-react';
import { ROUTES } from 'constants/routes';
import { useAuth } from 'hooks/useAuth';
import adaptbuddyLogo from 'assets/Adaptbuddy_logo.png';
import TypingBuddyMessage from 'components/animations/TypingBuddyMessage';

const HeroSection: React.FC = () => {
  const { setGuestMode } = useAuth();
  const navigate = useNavigate();

  const handleDemo = () => {
    setGuestMode();
    navigate(ROUTES.NEURO_SELECTOR);
  };

  return (
    <section className="relative overflow-hidden pt-8 pb-16 sm:pt-12 sm:pb-24">
      <span className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <span className="block animate-slide-up">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-adapt-indigo">
            Accessibility-first · Neurodiverse-friendly
          </p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-adapt-navy sm:text-5xl lg:text-[3.25rem] lg:leading-[1.15]">
            A{' '}
            <span className="bg-gradient-to-r from-adapt-purple via-adapt-indigo to-adapt-teal bg-clip-text text-transparent">
              calm, gentle space
            </span>{' '}
            for every kind of mind.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
            AdaptBuddy is an AI-powered platform for emotional safety, sensory comfort, and
            adaptive learning — built for neurodiverse children, caring parents, and thoughtful
            educators.
          </p>

          <span className="mt-8 flex flex-wrap items-center gap-4 block">
            <Link
              to={ROUTES.SIGNUP}
              className="inline-flex items-center gap-2 rounded-full bg-adapt-navy px-6 py-3.5 text-sm font-semibold text-white shadow-card transition hover:bg-adapt-purple"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Start gently
            </Link>
            <button
              type="button"
              onClick={handleDemo}
              className="rounded-full border-2 border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-adapt-navy transition hover:border-adapt-indigo/30 hover:bg-adapt-mist"
            >
              Enter as guest
            </button>
          </span>

          <span className="mt-8 flex flex-wrap gap-6 text-sm text-slate-500 block">
            <span className="inline-flex items-center gap-2">
              <Accessibility className="h-4 w-4 text-adapt-teal" aria-hidden />
              WCAG-friendly
            </span>
            <span className="inline-flex items-center gap-2">
              <Shield className="h-4 w-4 text-adapt-indigo" aria-hidden />
              Co-designed with families
            </span>
          </span>
        </span>

        <span className="relative block animate-slide-up delay-200">
          <span className="relative block overflow-hidden rounded-5xl border border-white/60 bg-gradient-to-br from-indigo-100/80 via-white to-teal-100/60 p-6 shadow-card backdrop-blur-sm sm:p-8">
            <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-adapt-navy shadow-soft backdrop-blur block">
              Calm score: <span className="text-adapt-teal">87</span>
            </span>

            <span className="relative mx-auto flex h-56 items-center justify-center sm:h-72 block">
              <span
                className="absolute h-32 w-32 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 opacity-90 shadow-glow animate-float block"
                aria-hidden
              />
              <span
                className="absolute -left-2 top-8 h-20 w-20 rounded-full bg-gradient-to-br from-cyan-300 to-teal-400 opacity-80 animate-float block"
                style={{ animationDelay: '0.5s' }}
                aria-hidden
              />
              <span
                className="absolute right-4 bottom-6 h-24 w-16 rotate-12 rounded-3xl bg-gradient-to-b from-indigo-400 to-purple-500 opacity-85 block"
                aria-hidden
              />
              <img
                src={adaptbuddyLogo}
                alt=""
                className="relative z-10 h-28 w-auto object-contain drop-shadow-lg sm:h-36"
              />
            </span>

            <span className="relative mt-4 block rounded-3xl border border-white/80 bg-white/90 p-4 pb-5 shadow-soft backdrop-blur">
              <p className="text-[10px] font-bold uppercase tracking-wider text-adapt-indigo">
                Buddy says
              </p>
              <TypingBuddyMessage className="mt-1 min-h-[2.75rem] text-sm font-medium leading-snug text-slate-700" />
            </span>
          </span>
        </span>
      </span>
    </section>
  );
};

export default HeroSection;
