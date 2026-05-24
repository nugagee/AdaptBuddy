import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

const inputClass =
  'w-full rounded-2xl border border-white/60 bg-white/70 px-4 py-3.5 text-adapt-navy shadow-sm outline-none backdrop-blur-sm transition focus:border-adapt-indigo focus:bg-white/90 focus:ring-2 focus:ring-adapt-indigo/25 dark:border-white/10 dark:bg-gray-800/60 dark:text-gray-100 dark:focus:bg-gray-800/80 sepia:border-amber-200/70 sepia:bg-amber-50/70';

const labelClass =
  'mb-2 block text-sm font-medium text-slate-600 dark:text-gray-300 sepia:text-amber-900/80';

interface AuthFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
}

export const AuthField: React.FC<AuthFieldProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
}) => (
  <div>
    <label htmlFor={id} className={labelClass}>
      {label}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      autoComplete={autoComplete}
      className={inputClass}
    />
  </div>
);

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showPassword: boolean;
  onToggleShow: () => void;
  required?: boolean;
  autoComplete?: string;
  minLength?: number;
  invalid?: boolean;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  id,
  label,
  value,
  onChange,
  placeholder,
  showPassword,
  onToggleShow,
  required,
  autoComplete,
  minLength,
  invalid = false,
}) => (
  <div>
    <label htmlFor={id} className={labelClass}>
      {label}
    </label>
    <div className="relative">
      <input
        id={id}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        aria-invalid={invalid}
        className={`${inputClass} pr-12 ${
          invalid
            ? 'border-red-300 focus:border-red-400 focus:ring-red-200 dark:border-red-800'
            : ''
        }`}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:text-adapt-navy dark:hover:text-gray-200"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  </div>
);

export const authCardClass =
  'rounded-4xl border border-white/55 bg-white/50 p-8 shadow-[0_8px_40px_-12px_rgba(99,102,241,0.2),0_0_60px_-16px_rgba(34,211,238,0.15)] backdrop-blur-2xl ring-1 ring-white/70 dark:border-white/10 dark:bg-gray-900/50 dark:ring-white/10 dark:shadow-[0_8px_40px_-12px_rgba(99,102,241,0.25)] sm:p-10 sepia:border-amber-200/55 sepia:bg-amber-50/55 sepia:ring-amber-100/60';

export const authPrimaryBtnClass =
  'inline-flex w-full items-center justify-center gap-2 rounded-full bg-adapt-navy px-6 py-3.5 text-sm font-semibold text-white shadow-soft transition hover:bg-adapt-purple disabled:opacity-50 dark:bg-adapt-indigo dark:hover:bg-adapt-purple';

export const authErrorClass =
  'rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400';
