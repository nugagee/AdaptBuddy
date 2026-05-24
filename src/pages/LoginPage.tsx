import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import { UserRole } from 'services/supabase/client';
import { ROUTES } from 'constants/routes';
import AuthBackground, { AuthLogo, authGlassPanelClass } from 'pages/auth/AuthBackground';
import {
  AuthField,
  PasswordField,
  authCardClass,
  authErrorClass,
  authPrimaryBtnClass,
} from 'pages/auth/authForm';

const demoRoles: { role: UserRole; label: string }[] = [
  { role: 'child', label: 'Child' },
  { role: 'parent', label: 'Parent' },
  { role: 'teacher', label: 'Teacher' },
];

const demoRoutes: Record<UserRole, string> = {
  child: ROUTES.NEURO_SELECTOR,
  parent: ROUTES.PARENT_HUB,
  teacher: ROUTES.TEACHER_DASHBOARD,
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const signupMessage = (location.state as { message?: string } | null)?.message;
  const { signIn, setGuestMode } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(email.trim(), password);
      navigate(ROUTES.NEURO_SELECTOR);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Invalid email or password';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoRole = (role: UserRole) => {
    setGuestMode();
    navigate(demoRoutes[role]);
  };

  return (
    <AuthBackground variant="login">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <AuthLogo />

        <div className="mt-10 flex flex-1 flex-col items-center justify-center gap-12 lg:mt-16 lg:flex-row lg:items-center lg:gap-16">
          {/* Welcome panel */}
          <div className={`w-full max-w-lg lg:flex-1`}>
          {/* <div className={`w-full max-w-lg lg:flex-1 ${authGlassPanelClass}`}> */}
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-adapt-navy sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15] dark:text-gray-100 sepia:text-amber-950">
              Welcome back to a calmer space.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-gray-300 sepia:text-amber-900/80">
              Sign in to your AdaptBuddy account. Choose a demo role to explore everything
              instantly — no setup required.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {demoRoles.map(({ role, label }) => (
                <button
                  key={role}
                  type="button"
                  // onClick={() => handleDemoRole(role)}
                  className="rounded-full border border-white/60 bg-white/60 px-5 py-2.5 text-sm font-semibold text-adapt-navy shadow-soft backdrop-blur-sm transition hover:border-adapt-indigo/50 hover:bg-white/80 hover:shadow-[0_0_20px_-4px_rgba(99,102,241,0.35)] dark:border-white/10 dark:bg-gray-800/50 dark:text-gray-100 dark:hover:bg-gray-800/70 sepia:border-amber-200/70 sepia:bg-amber-50/60"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Sign-in card */}
          <div className={`w-full max-w-md lg:max-w-lg ${authCardClass}`}>
            <p className="text-xs font-semibold uppercase tracking-widest text-adapt-indigo">
              Sign in
            </p>
            <h2 className="mt-3 text-2xl font-bold text-adapt-navy dark:text-gray-100 sepia:text-amber-950">
              Hello again 👋
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
              A gentle return to your dashboard.
            </p>

            {signupMessage && (
              <p className="mt-6 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                {signupMessage}
              </p>
            )}

            {error && (
              <p className={`mt-6 ${authErrorClass}`} role="alert">
                {error}
              </p>
            )}

            <form onSubmit={handleLogin} className={`space-y-5 ${error ? 'mt-4' : 'mt-8'}`}>
              <AuthField
                id="login-email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@adaptbuddy.com"
                required
                autoComplete="email"
              />
              <PasswordField
                id="login-password"
                label="Password"
                value={password}
                onChange={setPassword}
                showPassword={showPassword}
                onToggleShow={() => setShowPassword((v) => !v)}
                required
                autoComplete="current-password"
              />
              <button type="submit" disabled={loading} className={authPrimaryBtnClass}>
                {loading ? 'Signing in…' : 'Sign in'}
                {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-600 dark:text-gray-400">
              New to AdaptBuddy?{' '}
              <Link
                to={ROUTES.SIGNUP}
                className="font-semibold text-adapt-indigo transition-colors hover:text-adapt-purple dark:text-adapt-cyan"
              >
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthBackground>
  );
};

export default LoginPage;
