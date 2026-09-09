import SupportConnectionsPanel from 'components/support/SupportConnectionsPanel';
import React, { useEffect, useMemo, useState } from 'react';
import { Camera, Check, Copy, KeyRound, Loader2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FeedbackPulsePanel from 'components/feedback/FeedbackPulsePanel';
import ChildDashboardNavbar from 'features/child/components/layout/ChildDashboardNavbar';
import { ACTIVE_NEURO_IDS, NEURO_OPTION_MAP, NEURO_OPTIONS } from 'constants/neuroOptions';
import { useAuth } from 'hooks/useAuth';
import { ROUTES } from 'constants/routes';
import {
  updateUserProfile,
  uploadProfileAvatar,
} from 'services/supabase/profileService';
import type { Profile } from 'services/supabase/client';
import { toggleSupportPreference } from 'features/child/utils/supportPreferenceSelection';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user, isGuest, setProfile } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [age, setAge] = useState('');
  const [selectedNeuro, setSelectedNeuro] = useState<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const guestProfile = useMemo<Profile | null>(() => {
    if (!isGuest) return null;
    const now = new Date().toISOString();
    return {
      id: 'guest-child',
      email: 'guest@adaptbuddy.local',
      role: 'child',
      first_name: 'Friend',
      last_name: '',
      full_name: 'Friend',
      child_name: null,
      buddy_id: 'AB-GEST-01',
      avatar_url: null,
      bio: null,
      age: null,
      neuro_types: ['autism'],
      onboarding_completed: true,
      email_verified_at: null,
      created_at: now,
      updated_at: now,
    };
  }, [isGuest]);

  const activeProfile = profile ?? guestProfile;

  useEffect(() => {
    if (!activeProfile) return;
    setFirstName(activeProfile.first_name);
    setLastName(activeProfile.last_name);
    setBio(activeProfile.bio ?? '');
    setAge(activeProfile.age ? String(activeProfile.age) : '');
    setSelectedNeuro(activeProfile.neuro_types ?? []);
    setAvatarPreview(activeProfile.avatar_url ?? null);
  }, [activeProfile]);

  const email = activeProfile?.email ?? user?.email ?? '';
  const chosenNeuroOptions = selectedNeuro
    .map((id) => NEURO_OPTION_MAP[id])
    .filter(Boolean);
  const availableNeuroOptions = NEURO_OPTIONS.filter((option) => ACTIVE_NEURO_IDS.has(option.id));

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleCopyBuddyId = async () => {
    if (!activeProfile?.buddy_id) return;

    try {
      await navigator.clipboard.writeText(activeProfile.buddy_id);
      setSuccess('Buddy ID copied.');
      setError('');
    } catch {
      setError(`Your Buddy ID is ${activeProfile.buddy_id}. Copy it manually.`);
      setSuccess('');
    }
  };

  const dirty = useMemo(() => {
    if (!activeProfile) return false;
    return (
      firstName !== activeProfile.first_name ||
      lastName !== activeProfile.last_name ||
      bio !== (activeProfile.bio ?? '') ||
      age !== (activeProfile.age ? String(activeProfile.age) : '') ||
      JSON.stringify(selectedNeuro) !== JSON.stringify(activeProfile.neuro_types ?? []) ||
      avatarFile !== null
    );
  }, [activeProfile, firstName, lastName, bio, age, selectedNeuro, avatarFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProfile) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let avatarUrl = activeProfile.avatar_url ?? null;

      if (isGuest) {
        const updated: Profile = {
          ...activeProfile,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim() || 'Friend',
          bio: bio.trim() || null,
          age: age ? Number(age) : null,
          neuro_types: selectedNeuro,
          onboarding_completed: selectedNeuro.length > 0,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        };

        setProfile(updated);
        setAvatarFile(null);
        setSuccess('Your profile has been updated for this guest session.');
        return;
      }

      if (!user?.id) return;

      if (avatarFile) {
        avatarUrl = await uploadProfileAvatar(user.id, avatarFile);
      }

      const updated = await updateUserProfile(user.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        bio: bio.trim() || null,
        age: age ? Number(age) : null,
        neuro_types: selectedNeuro,
        onboarding_completed: selectedNeuro.length > 0,
        avatar_url: avatarUrl,
      }, activeProfile);

      setProfile(updated);
      setAvatarFile(null);
      setSuccess('Your profile has been updated.');
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Could not save your settings.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (!activeProfile) {
    return (
      <div className="min-h-screen bg-adapt-cloud dark:bg-gray-950">
        <ChildDashboardNavbar />
        <div className="flex min-h-[50vh] items-center justify-center text-slate-500">
          Loading your profile…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-adapt-cloud to-white dark:from-gray-950 dark:to-gray-900">
      <ChildDashboardNavbar />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-adapt-navy dark:text-gray-100">My Settings</h1>
          <p className="mt-2 text-slate-600 dark:text-gray-400">
            Update your profile, photo, and learning preferences anytime.
          </p>
        </div>

        {success && (
          <p className="mb-6 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            <Check className="h-4 w-4" aria-hidden />
            {success}
          </p>
        )}

        {error && (
          <p className="mb-6 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/70">
            <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">Profile photo</h2>
            <div className="mt-4 flex items-center gap-5">
              <div className="relative h-24 w-24 overflow-hidden rounded-full bg-gradient-to-br from-adapt-indigo to-adapt-teal text-3xl font-bold text-white">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">
                    {firstName.charAt(0).toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-adapt-indigo/30 bg-adapt-indigo/5 px-4 py-2 text-sm font-semibold text-adapt-indigo transition hover:bg-adapt-indigo/10 dark:text-adapt-cyan">
                <Camera className="h-4 w-4" />
                Change photo
                <input type="file" accept="image/*" className="sr-only" onChange={handleAvatarChange} />
              </label>
            </div>
          </section>

          <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/70">
            <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">About you</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="settings-first-name" className="mb-2 block text-sm font-medium text-slate-600 dark:text-gray-300">
                  First name
                </label>
                <input
                  id="settings-first-name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-800"
                  required
                />
              </div>
              <div>
                <label htmlFor="settings-last-name" className="mb-2 block text-sm font-medium text-slate-600 dark:text-gray-300">
                  Last name
                </label>
                <input
                  id="settings-last-name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-800"
                  required
                />
              </div>
              <div>
                <label htmlFor="settings-age" className="mb-2 block text-sm font-medium text-slate-600 dark:text-gray-300">
                  Age
                </label>
                <input
                  id="settings-age"
                  type="number"
                  min={4}
                  max={18}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
              <div>
                <label htmlFor="settings-email" className="mb-2 block text-sm font-medium text-slate-600 dark:text-gray-300">
                  Email
                </label>
                <input
                  id="settings-email"
                  value={email}
                  readOnly
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-400"
                />
              </div>
            </div>
            <div className="mt-4">
              <label htmlFor="settings-bio" className="mb-2 block text-sm font-medium text-slate-600 dark:text-gray-300">
                Bio
              </label>
              <textarea
                id="settings-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tell us a little about yourself…"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-800"
              />
            </div>
          </section>

          <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/70">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                  <KeyRound className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">Buddy ID</h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
                    Class teachers can use this code to request parent-approved access. Saved trusted-adult requests do not contact anyone and cannot be accepted in this build.
                  </p>
                </div>
              </div>

              <div className="shrink-0 rounded-2xl border border-adapt-indigo/15 bg-adapt-indigo/5 px-4 py-3 text-center dark:border-adapt-cyan/20 dark:bg-adapt-cyan/5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-adapt-indigo dark:text-adapt-cyan">
                  Private code
                </p>
                <p className="mt-1 font-mono text-2xl font-black tracking-wide text-adapt-navy dark:text-gray-100">
                  {activeProfile.buddy_id ?? 'Pending'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyBuddyId}
              disabled={!activeProfile.buddy_id}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-adapt-navy px-5 py-2.5 text-sm font-bold text-white transition hover:bg-adapt-purple disabled:opacity-60 dark:bg-adapt-indigo"
            >
              <Copy className="h-4 w-4" aria-hidden />
              Copy Buddy ID
            </button>
          </section>

          <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/70">
            <h2 id="support-preferences-heading" className="text-lg font-bold text-adapt-navy dark:text-gray-100">
              Support tools I want available
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
              Choose any spaces that feel helpful. These choices personalise activities; they are not a diagnosis.
            </p>

            <div
              className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2"
              role="group"
              aria-labelledby="support-preferences-heading"
            >
              {availableNeuroOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedNeuro.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => {
                      setSelectedNeuro((current) => toggleSupportPreference(current, option.id));
                      setSuccess('');
                      setError('');
                    }}
                    className={`min-h-14 rounded-2xl border-2 p-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-adapt-indigo/30 ${
                      isSelected
                        ? `${option.colorClass} border-adapt-indigo ring-2 ring-adapt-indigo/20`
                        : 'border-slate-200 bg-white text-slate-700 hover:border-adapt-indigo/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {Icon && <Icon className="h-5 w-5 shrink-0" aria-hidden />}
                      <span className="font-bold">{option.name}</span>
                      {isSelected && <Check className="ml-auto h-5 w-5 shrink-0" aria-hidden />}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedNeuro.length === 0 && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                Choose at least one support space before saving.
              </p>
            )}

            <h3 className="mt-6 text-sm font-black uppercase tracking-[0.14em] text-slate-500 dark:text-gray-400">
              Selected spaces
            </h3>
            <div className="mt-4 space-y-3">
              {chosenNeuroOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <div
                    key={option.id}
                    className={`rounded-2xl border-2 p-4 ${option.colorClass} ring-2 ring-adapt-indigo/20`}
                  >
                    <div className="flex items-start gap-3">
                      {Icon && (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80">
                          <Icon className="h-5 w-5" aria-hidden />
                        </span>
                      )}
                      <div>
                        <p className="font-bold">{option.name}</p>
                        {option.learningStyle && (
                          <p className="mt-1 text-xs font-semibold">{option.learningStyle}</p>
                        )}
                        <p className="mt-2 text-sm">{option.longDescription ?? option.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {chosenNeuroOptions.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  No support spaces selected yet.
                </div>
              )}
            </div>
          </section>

          <SupportConnectionsPanel />

          <FeedbackPulsePanel
            title="Tell us about your space"
            subtitle="You can tell AdaptBuddy what feels good, confusing, too much, or helpful."
            sourceArea="child_settings"
            childId={activeProfile.id}
            compact
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() => navigate(ROUTES.CHILD_DASHBOARD)}
              className="rounded-full px-6 py-3 text-sm font-semibold text-slate-600 hover:text-adapt-navy dark:text-gray-300"
            >
              Back to dashboard
            </button>
            <button
              type="submit"
              disabled={!dirty || saving || selectedNeuro.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-adapt-navy px-8 py-3 text-sm font-semibold text-white transition hover:bg-adapt-purple disabled:opacity-50 dark:bg-adapt-indigo"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save changes
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default SettingsPage;
