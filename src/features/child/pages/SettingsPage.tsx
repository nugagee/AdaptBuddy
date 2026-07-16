import React, { useEffect, useMemo, useState } from 'react';
import { Camera, Check, Copy, KeyRound, Loader2, Plus, Save, ShieldCheck, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FeedbackPulsePanel from 'components/feedback/FeedbackPulsePanel';
import ChildDashboardNavbar from 'features/child/components/layout/ChildDashboardNavbar';
import { NEURO_OPTION_MAP } from 'constants/neuroOptions';
import { useAuth } from 'hooks/useAuth';
import { ROUTES } from 'constants/routes';
import {
  updateUserProfile,
  uploadProfileAvatar,
} from 'services/supabase/profileService';
import {
  fetchTrustedAdultsForChild,
  saveTrustedAdultForChild,
} from 'services/supabase/autismProfileService';
import type { Profile } from 'services/supabase/client';
import { useTrustedAdultStore } from 'features/child/store/trustedAdultStore';

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
  const [adultName, setAdultName] = useState('');
  const [adultRole, setAdultRole] = useState('');
  const [adultEmail, setAdultEmail] = useState('');
  const [adultPhone, setAdultPhone] = useState('');
  const [trustedAdultsLoading, setTrustedAdultsLoading] = useState(false);
  const [savingTrustedAdult, setSavingTrustedAdult] = useState(false);

  const trustedAdults = useTrustedAdultStore((s) => s.trustedAdults);
  const selectedTrustedAdultId = useTrustedAdultStore((s) => s.selectedTrustedAdultId);
  const selectTrustedAdult = useTrustedAdultStore((s) => s.selectTrustedAdult);
  const addTrustedAdult = useTrustedAdultStore((s) => s.addTrustedAdult);
  const setTrustedAdults = useTrustedAdultStore((s) => s.setTrustedAdults);

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

  useEffect(() => {
    if (!activeProfile || isGuest || activeProfile.role !== 'child') return;

    let cancelled = false;
    setTrustedAdultsLoading(true);

    fetchTrustedAdultsForChild(activeProfile.id)
      .then((adults) => {
        if (!cancelled) setTrustedAdults(adults);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load trusted adults yet. You can still add one.');
        }
      })
      .finally(() => {
        if (!cancelled) setTrustedAdultsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeProfile, isGuest, setTrustedAdults]);

  const email = activeProfile?.email ?? user?.email ?? '';
  const chosenNeuroOptions = selectedNeuro
    .map((id) => NEURO_OPTION_MAP[id])
    .filter(Boolean);

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

  const handleAddTrustedAdult = async () => {
    const name = adultName.trim();
    const role = adultRole.trim();
    const email = adultEmail.trim();
    const phone = adultPhone.trim();

    if (!name || !role) {
      setError('Add a trusted adult name and role first.');
      setSuccess('');
      return;
    }

    if (!email || !phone) {
      setError('Add both email and phone number for the trusted adult.');
      setSuccess('');
      return;
    }

    setSavingTrustedAdult(true);

    try {
      const savedAdult =
        !isGuest && activeProfile?.id
          ? await saveTrustedAdultForChild(activeProfile.id, { name, role, email, phone })
          : addTrustedAdult({ name, role, email, phone });

      addTrustedAdult(savedAdult);

      setAdultName('');
      setAdultRole('');
      setAdultEmail('');
      setAdultPhone('');
      setError('');
      setSuccess(
        savedAdult.status === 'connected'
          ? `${savedAdult.name} is connected and can see your shared updates.`
          : `${savedAdult.name} has been added. They will connect when they create an AdaptBuddy account with that email.`,
      );
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : 'Could not add this trusted adult.';
      setError(message);
      setSuccess('');
    } finally {
      setSavingTrustedAdult(false);
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
                    Share this with a parent, teacher, or trusted adult so they can connect to your AdaptBuddy space.
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
            <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">My learning space</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
              This is the profile your space is built around.
            </p>
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
                  Your space has not been created yet.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-soft backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/70">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-adapt-indigo/10 text-adapt-indigo dark:bg-adapt-cyan/10 dark:text-adapt-cyan">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">
                  Trusted adult
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-gray-400">
                  Choose who AdaptBuddy should help you reach when you need support.
                </p>
              </div>
            </div>

            {trustedAdultsLoading ? (
              <div className="mt-5 flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading trusted adults...
              </div>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {trustedAdults.map((adult) => {
                const active = selectedTrustedAdultId === adult.id;
                return (
                  <button
                    key={adult.id}
                    type="button"
                    onClick={() => {
                      selectTrustedAdult(adult.id);
                      setSuccess(`${adult.name} is now your trusted adult.`);
                      setError('');
                    }}
                    className={`rounded-2xl border-2 p-4 text-left transition ${
                      active
                        ? 'border-adapt-indigo bg-adapt-indigo/5 ring-2 ring-adapt-indigo/20 dark:border-adapt-cyan dark:bg-adapt-cyan/10'
                        : 'border-slate-100 bg-white hover:border-adapt-indigo/30 dark:border-gray-700 dark:bg-gray-800'
                    }`}
                    aria-pressed={active}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-adapt-indigo to-adapt-teal text-sm font-bold text-white">
                        {adult.name.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-adapt-navy dark:text-gray-100">
                          {adult.name}
                        </span>
                        <span className="mt-0.5 block text-sm text-slate-500 dark:text-gray-400">
                          {adult.role}
                        </span>
                        {adult.contact && (
                          <span className="mt-1 block text-xs text-slate-400">{adult.contact}</span>
                        )}
                        {adult.email && (
                          <span className="mt-1 block text-xs text-slate-400">{adult.email}</span>
                        )}
                        {adult.phone && (
                          <span className="mt-1 block text-xs text-slate-400">{adult.phone}</span>
                        )}
                      </span>
                      {active && <Check className="h-5 w-5 text-adapt-teal" aria-hidden />}
                    </div>
                  </button>
                );
                })}
              </div>
            )}

            <div className="mt-6 rounded-2xl border border-dashed border-adapt-indigo/25 bg-adapt-indigo/5 p-4 dark:border-adapt-cyan/25 dark:bg-adapt-cyan/5">
              <div className="mb-4 flex items-center gap-2">
                <UserRound className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
                <h3 className="font-bold text-adapt-navy dark:text-gray-100">
                  Create a trusted adult
                </h3>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="trusted-adult-name" className="mb-2 block text-sm font-medium text-slate-600 dark:text-gray-300">
                    Name
                  </label>
                  <input
                    id="trusted-adult-name"
                    value={adultName}
                    onChange={(e) => setAdultName(e.target.value)}
                    placeholder="e.g. Mum, Dad, Aunty Sarah"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label htmlFor="trusted-adult-role" className="mb-2 block text-sm font-medium text-slate-600 dark:text-gray-300">
                    Role
                  </label>
                  <input
                    id="trusted-adult-role"
                    value={adultRole}
                    onChange={(e) => setAdultRole(e.target.value)}
                    placeholder="e.g. Parent, teacher, therapist"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label htmlFor="trusted-adult-email" className="mb-2 block text-sm font-medium text-slate-600 dark:text-gray-300">
                    Email
                  </label>
                  <input
                    id="trusted-adult-email"
                    type="email"
                    value={adultEmail}
                    onChange={(e) => setAdultEmail(e.target.value)}
                    placeholder="adult@example.com"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label htmlFor="trusted-adult-phone" className="mb-2 block text-sm font-medium text-slate-600 dark:text-gray-300">
                    Phone number
                  </label>
                  <input
                    id="trusted-adult-phone"
                    type="tel"
                    value={adultPhone}
                    onChange={(e) => setAdultPhone(e.target.value)}
                    placeholder="+44 7000 000000"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-adapt-indigo focus:ring-2 focus:ring-adapt-indigo/20 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddTrustedAdult}
                disabled={savingTrustedAdult}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-adapt-indigo shadow-sm transition hover:bg-adapt-mist disabled:opacity-60 dark:bg-gray-800 dark:text-adapt-cyan"
              >
                {savingTrustedAdult ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Plus className="h-4 w-4" aria-hidden />
                )}
                {savingTrustedAdult ? 'Connecting...' : 'Add trusted adult'}
              </button>
            </div>
          </section>

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
