import React from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from 'constants/routes';
import adaptbuddyLogo from 'assets/Adaptbuddy_logo.png';

type AuthBackgroundVariant = 'login' | 'signup';

interface AuthBackgroundProps {
  variant: AuthBackgroundVariant;
  children: React.ReactNode;
}

/** Neon glassmorphism backdrop — aligned with landing page ambient blobs */
const AuthBackground: React.FC<AuthBackgroundProps> = ({ variant, children }) => (
  <div className="relative min-h-screen overflow-x-hidden bg-adapt-cloud font-sans text-adapt-navy dark:bg-gray-950 dark:text-gray-100 sepia:bg-sepia-50">
    <span className="pointer-events-none fixed inset-0 -z-10 block overflow-hidden" aria-hidden>
      {/* Soft mesh base */}
      <span className="absolute inset-0 bg-gradient-to-br from-violet-50/90 via-white to-cyan-50/80 dark:from-gray-950 dark:via-indigo-950/40 dark:to-gray-900 sepia:from-amber-50/90 sepia:via-amber-50/50 sepia:to-orange-50/40" />

      {/* Neon blobs — landing-style + stronger glow */}
      <span
        className={`absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-violet-400/35 blur-3xl dark:bg-violet-600/25 sepia:bg-violet-300/25 ${
          variant === 'login' ? 'animate-auth-neon-drift' : 'animate-auth-neon-drift-slow'
        }`}
      />
      <span
        className={`absolute right-0 top-1/4 h-[32rem] w-[32rem] rounded-full bg-cyan-400/30 blur-3xl dark:bg-cyan-500/20 sepia:bg-cyan-300/20 ${
          variant === 'signup' ? 'animate-auth-neon-drift' : 'animate-auth-neon-drift-slow'
        }`}
      />
      <span className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-indigo-400/25 blur-3xl dark:bg-indigo-600/20 sepia:bg-indigo-300/20 animate-auth-neon-pulse" />

      {/* Extra neon accents per layout */}
      {variant === 'login' ? (
        <>
          <span className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-fuchsia-400/20 blur-3xl animate-auth-neon-drift-slow" />
          <span className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-adapt-indigo/15 blur-3xl" />
        </>
      ) : (
        <>
          <span className="absolute left-1/2 top-1/3 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-adapt-purple/20 blur-3xl animate-auth-neon-pulse" />
          <span className="absolute bottom-8 right-8 h-56 w-56 rounded-full bg-teal-400/20 blur-3xl animate-auth-neon-drift" />
        </>
      )}

      {/* Subtle grid for glass depth */}
      <span
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.12]"
        style={{
          backgroundImage: `
            radial-gradient(circle at 1px 1px, rgb(99 102 241 / 0.12) 1px, transparent 0)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Top shine */}
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-indigo-400/30" />
    </span>

    <div className="relative z-0">{children}</div>
  </div>
);

interface AuthLogoProps {
  className?: string;
}

export const AuthLogo: React.FC<AuthLogoProps> = ({ className = '' }) => (
  <Link
    to={ROUTES.HOME}
    className={`inline-flex items-center gap-2.5 ${className}`}
  >
    <img src={adaptbuddyLogo} alt="" className="h-9 w-9 object-contain" aria-hidden />
    <span className="text-lg font-bold text-adapt-navy dark:text-gray-100 sepia:text-amber-950">
      AdaptBuddy
    </span>
  </Link>
);

/** Glass panel for side content on login */
export const authGlassPanelClass =
  'rounded-4xl border border-white/50 bg-white/45 p-6 shadow-[0_8px_40px_-12px_rgba(99,102,241,0.18)] backdrop-blur-2xl ring-1 ring-white/60 dark:border-white/10 dark:bg-gray-900/45 dark:ring-white/10 sm:p-8 sepia:border-amber-200/50 sepia:bg-amber-50/50';

export default AuthBackground;
