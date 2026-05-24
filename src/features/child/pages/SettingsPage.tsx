import React, { useEffect, useMemo, useState } from 'react';
import { Camera, Check, Loader2, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ChildDashboardNavbar from 'features/child/components/layout/ChildDashboardNavbar';
import { NEURO_OPTIONS } from 'constants/neuroOptions';
import { useAuth } from 'hooks/useAuth';
import { ROUTES } from 'constants/routes';
import {
  updateUserProfile,
  uploadProfileAvatar,
} from 'services/supabase/profileService';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user, setProfile } = useAuth();

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

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.first_name);
    setLastName(profile.last_name);
    setBio(profile.bio ?? '');
    setAge(profile.age ? String(profile.age) : '');
    setSelectedNeuro(profile.neuro_types ?? []);
    setAvatarPreview(profile.avatar_url ?? null);
  }, [profile]);

  const email = profile?.email ?? user?.email ?? '';

  const toggleNeuro = (id: string) => {
    setSelectedNeuro((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const dirty = useMemo(() => {
    if (!profile) return false;
    return (
      firstName !== profile.first_name ||
      lastName !== profile.last_name ||
      bio !== (profile.bio ?? '') ||
      age !== (profile.age ? String(profile.age) : '') ||
      JSON.stringify(selectedNeuro) !== JSON.stringify(profile.neuro_types ?? []) ||
      avatarFile !== null
    );
  }, [profile, firstName, lastName, bio, age, selectedNeuro, avatarFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !profile) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let avatarUrl = profile.avatar_url ?? null;

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
      }, profile);

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

  if (!profile) {
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
            <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">Neuro selections</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
              Update how AdaptBuddy personalizes your learning space.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {NEURO_OPTIONS.map((option) => {
                const active = selectedNeuro.includes(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => toggleNeuro(option.id)}
                    className={`rounded-2xl border-2 p-4 text-left transition ${option.colorClass} ${
                      active ? 'ring-2 ring-adapt-indigo/40' : 'opacity-80 hover:opacity-100'
                    }`}
                  >
                    <p className="font-bold">{option.name}</p>
                    <p className="mt-1 text-xs">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

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
