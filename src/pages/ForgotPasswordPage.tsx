import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, KeyRound } from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import { useAuthStore } from 'store/authStore';
import { isSupabaseConfigured } from 'services/supabase/client';
import { getRouteForUser } from 'services/supabase/authService';
import { toAuthErrorMessage } from 'services/supabase/authErrors';
import { ROUTES } from 'constants/routes';
import { OTP_LENGTH } from 'constants/auth';
import { isPasswordValid } from 'utils/passwordValidation';
import AuthBackground, { AuthLogo } from 'pages/auth/AuthBackground';
import OtpVerificationModal from 'pages/auth/OtpVerificationModal';
import PasswordRequirements from 'pages/auth/PasswordRequirements';
import {
  AuthField,
  PasswordField,
  authCardClass,
  authErrorClass,
  authPrimaryBtnClass,
} from 'pages/auth/authForm';

type ResetStep = 'email' | 'password';

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    requestPasswordReset,
    verifyPasswordReset,
    resendPasswordReset,
    completePasswordReset,
  } = useAuth();

  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');

  const passwordValid = useMemo(() => isPasswordValid(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const confirmTouched = confirmPassword.length > 0;
  const confirmMismatch = confirmTouched && !passwordsMatch;

  const canSetPassword = passwordValid && passwordsMatch && !loading;

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail) return;

    if (!isSupabaseConfigured) {
      setError('Authentication is not configured. Add Supabase environment variables to continue.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await requestPasswordReset(trimmedEmail);
      setVerifiedEmail(trimmedEmail);
      setOtpError('');
      setOtpModalOpen(true);
    } catch (err: unknown) {
      setError(toAuthErrorMessage(err, 'Failed to send verification code'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    if (!verifiedEmail) return;

    setOtpLoading(true);
    setOtpError('');
    try {
      await verifyPasswordReset(verifiedEmail, otp);
      setOtpModalOpen(false);
      setStep('password');
      setPassword('');
      setConfirmPassword('');
      setOtpLoading(false);
    } catch (err: unknown) {
      setOtpError(
        toAuthErrorMessage(err, 'Invalid or expired code. Please try again.'),
      );
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!verifiedEmail) return;

    setOtpError('');
    try {
      await resendPasswordReset(verifiedEmail);
    } catch (err: unknown) {
      setOtpError(toAuthErrorMessage(err, 'Failed to resend code'));
    }
  };

  const handleCloseOtpModal = () => {
    if (otpLoading) return;
    setOtpModalOpen(false);
    setOtpError('');
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSetPassword) return;

    setLoading(true);
    setError('');
    try {
      const authUser = await completePasswordReset(password);
      const { profile } = useAuthStore.getState();

      navigate(getRouteForUser(authUser, profile), {
        replace: true,
        state: { message: 'Your password has been updated. Welcome back!' },
      });
    } catch (err: unknown) {
      setError(toAuthErrorMessage(err, 'Failed to update password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthBackground variant="login">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8 sm:px-6">
        <AuthLogo className="mb-8" />

        <div className={`flex-1 ${authCardClass}`}>
          <Link
            to={ROUTES.LOGIN}
            className="inline-flex items-center gap-2 text-sm font-medium text-adapt-indigo transition hover:text-adapt-purple dark:text-adapt-cyan"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to sign in
          </Link>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-adapt-indigo/10 dark:bg-adapt-cyan/10">
              <KeyRound className="h-6 w-6 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-adapt-navy dark:text-gray-100 sepia:text-amber-950">
                {step === 'email' ? 'Reset your password' : 'Create a new password'}
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-gray-300 sepia:text-amber-900/80">
                {step === 'email'
                  ? "We'll email you a code to verify it's really you."
                  : 'Choose a strong password for your account.'}
              </p>
            </div>
          </div>

          {error && (
            <p className={`mt-6 ${authErrorClass}`} role="alert">
              {error}
            </p>
          )}

          {step === 'email' ? (
            <form
              onSubmit={handleRequestCode}
              className={`space-y-5 ${error ? 'mt-4' : 'mt-8'}`}
            >
              <AuthField
                id="forgot-email"
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@adaptbuddy.com"
                required
                autoComplete="email"
              />
              <button type="submit" disabled={loading} className={authPrimaryBtnClass}>
                {loading ? 'Sending code…' : 'Send verification code'}
                {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
              </button>
              <p className="text-center text-xs text-slate-500 dark:text-gray-400">
                If an account exists for this email, you&apos;ll receive a {OTP_LENGTH}-digit code.
              </p>
            </form>
          ) : (
            <form
              onSubmit={handleSetPassword}
              className={`space-y-5 ${error ? 'mt-4' : 'mt-8'}`}
            >
              <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                Email verified for{' '}
                <span className="font-semibold">{verifiedEmail}</span>. Set your new password
                below.
              </p>

              <div>
                <PasswordField
                  id="forgot-new-password"
                  label="New password"
                  value={password}
                  onChange={setPassword}
                  placeholder="Create a strong password"
                  showPassword={showPassword}
                  onToggleShow={() => setShowPassword((v) => !v)}
                  required
                  autoComplete="new-password"
                />
                <PasswordRequirements password={password} />
              </div>

              <PasswordField
                id="forgot-confirm-password"
                label="Confirm new password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Repeat your password"
                showPassword={showConfirmPassword}
                onToggleShow={() => setShowConfirmPassword((v) => !v)}
                required
                autoComplete="new-password"
                invalid={confirmMismatch}
              />
              {confirmMismatch && (
                <p className="text-xs text-red-600 dark:text-red-400" role="alert">
                  Passwords do not match.
                </p>
              )}

              <button
                type="submit"
                disabled={!canSetPassword}
                className={authPrimaryBtnClass}
              >
                {loading ? 'Updating password…' : 'Update password & sign in'}
                {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
              </button>
            </form>
          )}
        </div>
      </div>

      <OtpVerificationModal
        isOpen={otpModalOpen}
        email={verifiedEmail}
        loading={otpLoading}
        error={otpError}
        onClose={handleCloseOtpModal}
        onVerify={handleVerifyOtp}
        onResend={handleResendOtp}
        title="Verify your email"
        description={
          <>
            Enter the {OTP_LENGTH}-digit code we sent to{' '}
            <span className="font-semibold text-adapt-navy dark:text-gray-200">
              {verifiedEmail}
            </span>{' '}
            to continue resetting your password.
          </>
        }
        submitLabel="Verify & continue"
        verifyingLabel="Verifying…"
      />
    </AuthBackground>
  );
};

export default ForgotPasswordPage;
