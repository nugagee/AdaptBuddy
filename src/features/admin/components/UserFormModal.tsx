import React, { useEffect, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { Profile, UserGender, UserRole, UserSex, UserStatus } from 'services/supabase/client';
import type { AdminCreateUserPayload } from 'services/supabase/adminService';
import {
  UK_GENDER_FIELD_LABEL,
  UK_GENDER_OPTIONS,
  UK_SEX_FIELD_LABEL,
  UK_SEX_OPTIONS,
} from 'constants/signup';
import { NEURO_OPTIONS } from 'constants/neuroOptions';

export type UserFormMode = 'create' | 'edit';

export interface UserFormValues {
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  sex: UserSex | '';
  gender: UserGender | '';
  age: string;
  childName: string;
  isAuthorized: boolean;
  status: UserStatus;
  onboardingCompleted: boolean;
  companionOnboardingCompleted: boolean;
  neuroTypes: string[];
}

interface UserFormModalProps {
  mode: UserFormMode;
  user?: Profile | null;
  loading: boolean;
  error: string;
  onClose: () => void;
  onCreate: (payload: AdminCreateUserPayload) => void;
  onUpdate: (values: UserFormValues) => void;
  onResetPassword?: (password: string) => void;
}

const ROLES: UserRole[] = ['child', 'parent', 'teacher', 'admin'];
const STATUSES: UserStatus[] = ['active', 'suspended', 'pending'];

function emptyForm(): UserFormValues {
  return {
    email: '',
    password: '',
    role: 'child',
    firstName: '',
    lastName: '',
    sex: '',
    gender: '',
    age: '',
    childName: '',
    isAuthorized: true,
    status: 'active',
    onboardingCompleted: false,
    companionOnboardingCompleted: false,
    neuroTypes: [],
  };
}

function formFromProfile(user: Profile): UserFormValues {
  return {
    email: user.email,
    password: '',
    role: user.role,
    firstName: user.first_name,
    lastName: user.last_name,
    sex: user.sex ?? '',
    gender: user.gender ?? '',
    age: user.age != null ? String(user.age) : '',
    childName: user.child_name ?? '',
    isAuthorized: user.is_authorized !== false,
    status: user.status ?? 'active',
    onboardingCompleted: user.onboarding_completed,
    companionOnboardingCompleted: user.companion_onboarding_completed === true,
    neuroTypes: user.neuro_types ?? [],
  };
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5 text-sm text-gray-100 outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-400';

const UserFormModal: React.FC<UserFormModalProps> = ({
  mode,
  user,
  loading,
  error,
  onClose,
  onCreate,
  onUpdate,
  onResetPassword,
}) => {
  const [form, setForm] = useState<UserFormValues>(emptyForm);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    setForm(mode === 'edit' && user ? formFromProfile(user) : emptyForm());
    setNewPassword('');
  }, [mode, user]);

  const set = <K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create') {
      onCreate({
        email: form.email,
        password: form.password,
        role: form.role,
        firstName: form.firstName,
        lastName: form.lastName,
        sex: form.sex || null,
        gender: form.gender || null,
        age: form.age ? Number(form.age) : null,
        childName: form.childName || null,
      });
      return;
    }
    onUpdate(form);
  };

  const toggleNeuroType = (neuroId: string) => {
    setForm((prev) => {
      const exists = prev.neuroTypes.includes(neuroId);
      return {
        ...prev,
        neuroTypes: exists
          ? prev.neuroTypes.filter((id) => id !== neuroId)
          : [...prev.neuroTypes, neuroId],
      };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl"
        role="dialog"
        aria-modal
        aria-labelledby="user-form-title"
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-white/10 bg-slate-900 px-6 py-4">
          <h2 id="user-form-title" className="text-lg font-bold text-white">
            {mode === 'create' ? 'Create user' : 'Edit user'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {mode === 'create' && (
            <div>
              <label className={labelClass} htmlFor="user-email">
                Email
              </label>
              <input
                id="user-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          {mode === 'create' && (
            <div>
              <label className={labelClass} htmlFor="user-password">
                Password
              </label>
              <input
                id="user-password"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="user-first">
                First name
              </label>
              <input
                id="user-first"
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="user-last">
                Last name
              </label>
              <input
                id="user-last"
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="user-role">
                Role
              </label>
              <select
                id="user-role"
                value={form.role}
                onChange={(e) => set('role', e.target.value as UserRole)}
                className={inputClass}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="user-age">
                Age
              </label>
              <input
                id="user-age"
                type="number"
                min={1}
                max={120}
                value={form.age}
                onChange={(e) => set('age', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="user-sex">
                {UK_SEX_FIELD_LABEL}
              </label>
              <select
                id="user-sex"
                value={form.sex}
                onChange={(e) => set('sex', e.target.value as UserSex | '')}
                className={inputClass}
              >
                <option value="">Unspecified</option>
                {UK_SEX_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="user-gender">
                {UK_GENDER_FIELD_LABEL}
              </label>
              <select
                id="user-gender"
                value={form.gender}
                onChange={(e) => set('gender', e.target.value as UserGender | '')}
                className={inputClass}
              >
                <option value="">Unspecified</option>
                {UK_GENDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.role === 'parent' && (
            <div>
              <label className={labelClass} htmlFor="user-child">
                Child name
              </label>
              <input
                id="user-child"
                value={form.childName}
                onChange={(e) => set('childName', e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          {mode === 'edit' && user && (
            <div className="rounded-xl border border-white/10 bg-slate-800/60 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Platform profile
              </p>
              {user.role === 'child' && (
                <div className="mt-3">
                  <p className={labelClass}>Buddy ID</p>
                  <p className="font-mono text-sm font-bold text-cyan-300">
                    {user.buddy_id || 'Not assigned yet'}
                  </p>
                </div>
              )}
              <div className="mt-4 space-y-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.onboardingCompleted}
                    onChange={(e) => set('onboardingCompleted', e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm text-gray-200">Neuro selector completed</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.companionOnboardingCompleted}
                    onChange={(e) => set('companionOnboardingCompleted', e.target.checked)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="text-sm text-gray-200">Companion onboarding completed</span>
                </label>
              </div>
              {(form.role === 'child' || form.role === 'parent') && (
                <div className="mt-4">
                  <p className={labelClass}>Neuro profiles</p>
                  <div className="flex flex-wrap gap-2">
                    {NEURO_OPTIONS.map((option) => {
                      const active = form.neuroTypes.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => toggleNeuroType(option.id)}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            active
                              ? 'bg-indigo-600 text-white'
                              : 'border border-white/10 bg-slate-900 text-gray-400'
                          }`}
                        >
                          {option.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'edit' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass} htmlFor="user-status">
                    Status
                  </label>
                  <select
                    id="user-status"
                    value={form.status}
                    onChange={(e) => set('status', e.target.value as UserStatus)}
                    className={inputClass}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={form.isAuthorized}
                      onChange={(e) => set('isAuthorized', e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm text-gray-200">Authorized</span>
                  </label>
                </div>
              </div>

              {onResetPassword && (
                <div>
                  <label className={labelClass} htmlFor="user-new-pw">
                    Reset password (optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="user-new-pw"
                      type="password"
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className={inputClass}
                    />
                    <button
                      type="button"
                      disabled={newPassword.length < 8 || loading}
                      onClick={() => onResetPassword(newPassword)}
                      className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40"
                    >
                      Set
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-gray-400 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {mode === 'create' ? 'Create user' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
