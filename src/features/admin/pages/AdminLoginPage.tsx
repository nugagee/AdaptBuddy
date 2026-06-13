import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Shield } from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import { useAuthStore } from 'store/authStore';
import { getRouteForUser, isAdminProfile } from 'services/supabase/authService';
import { toAuthErrorMessage } from 'services/supabase/authErrors';
import { ROUTES } from 'constants/routes';
import AuthBackground, { AuthLogo } from 'pages/auth/AuthBackground';
import {
  AuthField,
  PasswordField,
  authCardClass,
  authErrorClass,
  authPrimaryBtnClass,
} from 'pages/auth/authForm';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('superadmin@adaptbuddy.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (authLoading || !user) return;
    const { profile } = useAuthStore.getState();
    if (isAdminProfile(profile)) {
      navigate(ROUTES.ADMIN_DASHBOARD, { replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const authUser = await signIn(email.trim(), password);
      const { profile } = useAuthStore.getState();

      if (!isAdminProfile(profile)) {
        await useAuthStore.getState().signOut();
        setError('This account does not have administrator access.');
        return;
      }

      navigate(getRouteForUser(authUser, profile), { replace: true });
    } catch (err: unknown) {
      setError(toAuthErrorMessage(err, 'Invalid email or password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground variant="login">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 py-10">
        <AuthLogo className="mb-8" />

        <div className={authCardClass}>
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/15">
              <Shield className="h-6 w-6 text-indigo-500" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
                Admin access
              </p>
              <h1 className="text-2xl font-extrabold text-adapt-navy dark:text-gray-100">
                Sign in to console
              </h1>
            </div>
          </div>

          <p className="mb-6 text-sm text-slate-600 dark:text-gray-400">
            Oversee users, analytics, and platform activity. Admin accounts only.
          </p>

          {error && (
            <p className={`mb-4 ${authErrorClass}`} role="alert">
              {error}
            </p>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <AuthField
              id="admin-email"
              label="Admin email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="superadmin@adaptbuddy.com"
              required
              autoComplete="email"
            />
            <PasswordField
              id="admin-password"
              label="Password"
              value={password}
              onChange={setPassword}
              showPassword={showPassword}
              onToggleShow={() => setShowPassword((v) => !v)}
              required
              autoComplete="current-password"
            />
            <button type="submit" disabled={loading} className={authPrimaryBtnClass}>
              {loading ? 'Signing in…' : 'Enter admin console'}
              {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 dark:text-gray-400">
            <Link to={ROUTES.LOGIN} className="font-semibold text-adapt-indigo hover:underline dark:text-adapt-cyan">
              ← Back to user login
            </Link>
          </p>
        </div>
      </div>
    </AuthBackground>
  );
};

export default AdminLoginPage;
