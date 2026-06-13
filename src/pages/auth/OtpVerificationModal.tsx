import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Mail, X } from 'lucide-react';
import { OTP_LENGTH } from 'constants/auth';
import { authPrimaryBtnClass, authErrorClass } from 'pages/auth/authForm';

const RESEND_COOLDOWN_SEC = 60;

interface OtpVerificationModalProps {
  isOpen: boolean;
  email: string;
  loading: boolean;
  error: string;
  onClose: () => void;
  onVerify: (otp: string) => void;
  onResend: () => void;
  title?: string;
  description?: React.ReactNode;
  submitLabel?: string;
  verifyingLabel?: string;
}

const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  isOpen,
  email,
  loading,
  error,
  onClose,
  onVerify,
  onResend,
  title = 'Verify your email',
  description,
  submitLabel = 'Verify & create account',
  verifyingLabel = 'Verifying…',
}) => {
  const [digits, setDigits] = useState<string[]>(() => Array(OTP_LENGTH).fill(''));
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SEC);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const otp = digits.join('');
  const isComplete = otp.length === OTP_LENGTH && /^\d+$/.test(otp);

  const resetDigits = useCallback(() => {
    setDigits(Array(OTP_LENGTH).fill(''));
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetDigits();
      setResendCooldown(RESEND_COOLDOWN_SEC);
      return;
    }

    resetDigits();
    setResendCooldown(RESEND_COOLDOWN_SEC);
  }, [isOpen, resetDigits]);

  useEffect(() => {
    if (!isOpen || resendCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isOpen, resendCooldown]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);

    setDigits((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((char, i) => {
      next[i] = char;
    });
    setDigits(next);

    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete || loading) return;
    onVerify(otp);
  };

  const handleResend = () => {
    if (resendCooldown > 0 || loading) return;
    onResend();
    setResendCooldown(RESEND_COOLDOWN_SEC);
    resetDigits();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex min-h-screen w-full items-center justify-center bg-adapt-navy/45 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="otp-modal-title"
    >
      <div className="relative mx-4 w-full max-w-sm animate-slide-up rounded-4xl border border-white/55 bg-white/85 p-6 shadow-[0_8px_40px_-12px_rgba(99,102,241,0.35)] backdrop-blur-2xl ring-1 ring-white/70 dark:border-white/10 dark:bg-gray-900/90 dark:ring-white/10 sm:max-w-md sm:p-8">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 transition hover:bg-white/60 hover:text-adapt-navy disabled:opacity-50 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-adapt-indigo/10 dark:bg-adapt-cyan/10">
            <Mail className="h-7 w-7 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
          </div>
          <h2
            id="otp-modal-title"
            className="text-xl font-bold text-adapt-navy dark:text-gray-100"
          >
            {title}
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
            {description ?? (
              <>
                We sent a {OTP_LENGTH}-digit code to{' '}
                <span className="font-semibold text-adapt-navy dark:text-gray-200">{email}</span>
              </>
            )}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <fieldset disabled={loading}>
            <legend className="sr-only">Enter {OTP_LENGTH}-digit verification code</legend>
            <div
              className="mb-6 grid grid-cols-6 gap-1.5 sm:gap-2"
              onPaste={handlePaste}
            >
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
                  className="h-10 w-full min-w-0 rounded-lg border border-white/60 bg-white/70 px-0 text-center text-sm font-bold tabular-nums text-adapt-navy shadow-sm outline-none backdrop-blur-sm transition focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/25 dark:border-white/10 dark:bg-gray-800/60 dark:text-gray-100 sm:h-11 sm:text-base"
                />
              ))}
            </div>
          </fieldset>

          {error && (
            <p className={`mb-4 ${authErrorClass}`} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!isComplete || loading}
            className={authPrimaryBtnClass}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {verifyingLabel}
              </>
            ) : (
              submitLabel
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-gray-400">
          Didn&apos;t receive the code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || loading}
            className="font-semibold text-adapt-indigo transition hover:text-adapt-purple disabled:cursor-not-allowed disabled:opacity-50 dark:text-adapt-cyan"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
          </button>
        </p>
      </div>
    </div>,
    document.body,
  );
};

export default OtpVerificationModal;
