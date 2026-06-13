import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, GraduationCap, Heart, Smile, X } from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import { UserRole, isSupabaseConfigured } from 'services/supabase/client';
import { getPostSignupRoute, getRouteForUser, type SignupDetails } from 'services/supabase/authService';
import { useAuthStore } from 'store/authStore';
import { ROUTES } from 'constants/routes';
import { toAuthErrorMessage } from 'services/supabase/authErrors';
import { isPasswordValid } from 'utils/passwordValidation';
import AuthBackground, { AuthLogo } from 'pages/auth/AuthBackground';
import PasswordRequirements from 'pages/auth/PasswordRequirements';
import OtpVerificationModal from 'pages/auth/OtpVerificationModal';
import {
  AuthField,
  PasswordField,
  authCardClass,
  authErrorClass,
  authPrimaryBtnClass,
} from 'pages/auth/authForm';

const roles: {
  value: UserRole;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: 'child', label: 'Child', icon: <Smile className="h-6 w-6" aria-hidden /> },
  { value: 'parent', label: 'Parent', icon: <Heart className="h-6 w-6" aria-hidden /> },
  {
    value: 'teacher',
    label: 'Teacher',
    icon: <GraduationCap className="h-6 w-6" aria-hidden />,
  },
];

interface RoleSignupForm {
  firstName: string;
  lastName: string;
  childName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const emptyRoleForm = (): RoleSignupForm => ({
  firstName: '',
  lastName: '',
  childName: '',
  email: '',
  password: '',
  confirmPassword: '',
});

const initialFormsByRole = (): Record<UserRole, RoleSignupForm> => ({
  child: emptyRoleForm(),
  parent: emptyRoleForm(),
  teacher: emptyRoleForm(),
});

const namePlaceholders: Record<UserRole, { first: string; last: string }> = {
  child: { first: 'e.g. Alex', last: 'e.g. Morgan' },
  parent: { first: 'e.g. Sarah', last: 'e.g. Johnson' },
  teacher: { first: 'e.g. James', last: 'e.g. Okonkwo' },
};

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { requestSignupVerification, verifySignupAndCreateProfile, resendSignupVerification, saveSignupProfile } =
    useAuth();
  const [role, setRole] = useState<UserRole>('parent');
  const [formsByRole, setFormsByRole] = useState(initialFormsByRole);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [pendingSignup, setPendingSignup] = useState<SignupDetails | null>(null);

  const form = formsByRole[role];
  const { firstName, lastName, childName, email, password, confirmPassword } = form;

  const updateForm = <K extends keyof RoleSignupForm>(field: K, value: RoleSignupForm[K]) => {
    setFormsByRole((prev) => ({
      ...prev,
      [role]: { ...prev[role], [field]: value },
    }));
  };

  const handleRoleChange = (nextRole: UserRole) => {
    if (nextRole === role) return;
    setRole(nextRole);
    setError('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const passwordValid = useMemo(() => isPasswordValid(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const confirmTouched = confirmPassword.length > 0;
  const confirmMismatch = confirmTouched && !passwordsMatch;

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    passwordValid &&
    passwordsMatch &&
    !loading;

  const buildSignupDetails = (): SignupDetails => ({
    email: email.trim(),
    password,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    childName: childName.trim() || undefined,
    role,
  });

  const finishSignup = (signupRole: UserRole) => {
    const { user, profile } = useAuthStore.getState();
    const destination =
      user && profile ? getRouteForUser(user, profile) : getPostSignupRoute(signupRole);

    navigate(destination, {
      replace: true,
      state: { message: 'Welcome! Your account is ready.' },
    });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (!isSupabaseConfigured) {
      setError('Authentication is not configured. Add Supabase environment variables to continue.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const details = buildSignupDetails();
      const { needsOtpVerification, userId } = await requestSignupVerification(details);

      if (needsOtpVerification) {
        setPendingSignup(details);
        setOtpError('');
        setOtpModalOpen(true);
        return;
      }

      if (userId) {
        await saveSignupProfile(details, userId);
      }
      finishSignup(details.role);
    } catch (err: unknown) {
      setError(toAuthErrorMessage(err, 'Failed to create account'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    if (!pendingSignup) return;

    const signupRole = pendingSignup.role;
    const signupDetails = pendingSignup;

    setOtpLoading(true);
    setOtpError('');
    try {
      await verifySignupAndCreateProfile(signupDetails, otp);
      setOtpModalOpen(false);
      setPendingSignup(null);
      setOtpLoading(false);
      finishSignup(signupRole);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Invalid or expired code. Please try again.';
      setOtpError(message);
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingSignup) return;

    setOtpError('');
    try {
      await resendSignupVerification(pendingSignup.email);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Failed to resend code';
      setOtpError(message);
    }
  };

  const handleCloseOtpModal = () => {
    if (otpLoading) return;
    setOtpModalOpen(false);
    setOtpError('');
    setPendingSignup(null);
  };

  const placeholders = namePlaceholders[role];

  return (
    <AuthBackground variant="signup">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8 sm:px-6">
        <AuthLogo className="mb-8" />

        <div className={`flex-1 ${authCardClass}`}>
          <h1 className="text-2xl font-extrabold tracking-tight text-adapt-navy sm:text-3xl dark:text-gray-100 sepia:text-amber-950">
            Create your gentle space.
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-gray-300 sepia:text-amber-900/80">
            Built for kids, parents, and teachers — choose your role to begin.
          </p>

          <fieldset className="mt-8">
            <legend className="sr-only">Choose your role</legend>
            <div className="grid grid-cols-3 gap-3">
              {roles.map(({ value, label, icon }) => {
                const selected = role === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleRoleChange(value)}
                    aria-pressed={selected}
                    className={`flex flex-col items-center gap-2 rounded-2xl border-2 px-3 py-4 text-sm font-semibold backdrop-blur-sm transition ${
                      selected
                        ? 'border-adapt-indigo/80 bg-white/60 text-adapt-navy shadow-[0_0_24px_-6px_rgba(99,102,241,0.4)] dark:border-adapt-cyan/60 dark:bg-gray-800/60 dark:text-gray-100'
                        : 'border-white/50 bg-white/40 text-slate-600 hover:border-adapt-indigo/40 hover:bg-white/55 dark:border-white/10 dark:bg-gray-800/35 dark:text-gray-300 sepia:border-amber-200/60 sepia:bg-amber-50/40'
                    }`}
                  >
                    <span
                      className={
                        selected ? 'text-adapt-indigo dark:text-adapt-cyan' : 'text-slate-400'
                      }
                    >
                      {icon}
                    </span>
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <p className={`mt-6 ${authErrorClass}`} role="alert">
              {error}
            </p>
          )}

          <form
            key={role}
            onSubmit={handleSignup}
            className={`space-y-5 ${error ? 'mt-4' : 'mt-8'}`}
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <AuthField
                id={`signup-first-name-${role}`}
                label="First name"
                value={firstName}
                onChange={(v) => updateForm('firstName', v)}
                placeholder={placeholders.first}
                required
                autoComplete="given-name"
              />
              <AuthField
                id={`signup-last-name-${role}`}
                label="Last name"
                value={lastName}
                onChange={(v) => updateForm('lastName', v)}
                placeholder={placeholders.last}
                required
                autoComplete="family-name"
              />
            </div>

            {role === 'parent' && (
              <AuthField
                id={`signup-child-name-${role}`}
                label="Child's name"
                value={childName}
                onChange={(v) => updateForm('childName', v)}
                placeholder="e.g. Lily"
                autoComplete="off"
              />
            )}

            <AuthField
              id={`signup-email-${role}`}
              label="Email"
              type="email"
              value={email}
              onChange={(v) => updateForm('email', v)}
              placeholder="you@adaptbuddy.com"
              required
              autoComplete="email"
            />

            <div>
              <PasswordField
                id={`signup-password-${role}`}
                label="Password"
                value={password}
                onChange={(v) => updateForm('password', v)}
                placeholder="Create a strong password"
                showPassword={showPassword}
                onToggleShow={() => setShowPassword((v) => !v)}
                required
                autoComplete="new-password"
              />
              <PasswordRequirements password={password} />
            </div>

            <div>
              <PasswordField
                id={`signup-confirm-password-${role}`}
                label="Confirm password"
                value={confirmPassword}
                onChange={(v) => updateForm('confirmPassword', v)}
                placeholder="Re-enter your password"
                showPassword={showConfirmPassword}
                onToggleShow={() => setShowConfirmPassword((v) => !v)}
                required
                autoComplete="new-password"
                invalid={confirmMismatch}
              />
              {confirmTouched && (
                <p
                  className={`mt-2 flex items-center gap-2 text-xs transition-colors duration-200 ${
                    passwordsMatch
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-gray-400'
                  }`}
                  aria-live="polite"
                >
                  {passwordsMatch ? (
                    <>
                      <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
                      Passwords match
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2.5} aria-hidden />
                      Passwords do not match
                    </>
                  )}
                </p>
              )}
            </div>

            <button type="submit" disabled={!canSubmit} className={authPrimaryBtnClass}>
              {loading ? 'Sending verification code…' : 'Create account'}
              {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
            </button>
          </form>

          <OtpVerificationModal
            isOpen={otpModalOpen}
            email={pendingSignup?.email ?? ''}
            loading={otpLoading}
            error={otpError}
            onClose={handleCloseOtpModal}
            onVerify={handleVerifyOtp}
            onResend={handleResendOtp}
          />

          <p className="mt-8 text-center text-sm text-slate-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link
              to={ROUTES.LOGIN}
              className="font-semibold text-adapt-indigo transition-colors hover:text-adapt-purple dark:text-adapt-cyan"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </AuthBackground>
  );
};

export default SignupPage;
