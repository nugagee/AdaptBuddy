import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Grid3X3,
  Heart,
  ListChecks,
  MessageSquare,
  Mic2,
  Moon,
  Music,
  Pause,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Shield,
  Sparkles,
  Timer,
  Volume2,
  Wind,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from 'constants/routes';
import ChildDashboardNavbar from 'features/child/components/layout/ChildDashboardNavbar';
import NowNextLaterBoard from 'features/child/components/NowNextLaterBoard';
import { useAutismProfileStore } from 'features/child/store/autismProfileStore';
import {
  isConnectedTrustedAdult,
  useTrustedAdultStore,
} from 'features/child/store/trustedAdultStore';
import type {
  AutismProfile,
  CalmingTool,
  CommunicationStyle,
  LearningFormat,
  ScheduleItem,
  SensorySensitivity,
  WarningTime,
} from 'features/child/types/autismProfile';
import { useUiStore } from 'store/uiStore';
import { useAuthStore } from 'store/authStore';
import { useAuth } from 'hooks/useAuth';
import { resolveChildScopeId } from 'features/child/store/childProgressReadAccess';
import { saveAutismProfile } from 'services/supabase/autismProfileService';

type AutismTab = 'profile' | 'schedule' | 'transition' | 'calm' | 'story' | 'communication';

const tabs: { id: AutismTab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile Wizard', icon: Sparkles },
  { id: 'schedule', label: 'Visual Schedule', icon: ListChecks },
  { id: 'transition', label: 'Now / Next / Later', icon: Timer },
  { id: 'calm', label: 'Calm Corner', icon: Heart },
  { id: 'story', label: 'Social Story', icon: BookOpen },
  { id: 'communication', label: 'AAC & Speech', icon: MessageSquare },
];

const communicationOptions: { id: CommunicationStyle; label: string }[] = [
  { id: 'speaks', label: 'Speaks' },
  { id: 'gestures', label: 'Gestures / points' },
  { id: 'pictures', label: 'Pictures / PECS' },
  { id: 'aac', label: 'AAC device or app' },
  { id: 'typing', label: 'Typing' },
  { id: 'mixed', label: 'Mixed' },
];

const sensoryOptions: { id: SensorySensitivity; label: string }[] = [
  { id: 'sound', label: 'Sound' },
  { id: 'light', label: 'Light' },
  { id: 'touch', label: 'Touch' },
  { id: 'smell', label: 'Smell' },
  { id: 'crowds', label: 'Crowds' },
  { id: 'movement', label: 'Movement' },
];

const calmingOptions: { id: CalmingTool; label: string; icon: React.ElementType }[] = [
  { id: 'music', label: 'Calming music', icon: Music },
  { id: 'quiet', label: 'Quiet space', icon: Moon },
  { id: 'breathing', label: 'Breathing', icon: Wind },
  { id: 'darkMode', label: 'Low light', icon: Moon },
  { id: 'timer', label: 'Timer', icon: Timer },
  { id: 'trustedAdult', label: 'Trusted adult', icon: Shield },
];

const learningOptions: { id: LearningFormat; label: string }[] = [
  { id: 'pictures', label: 'Pictures' },
  { id: 'video', label: 'Video' },
  { id: 'voice', label: 'Voice' },
  { id: 'text', label: 'Text' },
  { id: 'game', label: 'Game' },
  { id: 'checklist', label: 'Checklist' },
];

const toggleValue = <T extends string,>(values: T[], value: T): T[] =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

const moveItem = (items: ScheduleItem[], index: number, direction: -1 | 1) => {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const mergeDraftValue = (base: unknown, draft: unknown, latest: unknown): unknown => {
  if (Object.is(base, draft)) return latest;

  if (Array.isArray(base) && Array.isArray(draft)) {
    return JSON.stringify(base) === JSON.stringify(draft) ? latest : draft;
  }

  if (isPlainRecord(base) && isPlainRecord(draft) && isPlainRecord(latest)) {
    const keys = new Set([...Object.keys(base), ...Object.keys(draft), ...Object.keys(latest)]);
    return Object.fromEntries(
      Array.from(keys).map((key) => [key, mergeDraftValue(base[key], draft[key], latest[key])]),
    );
  }

  return draft;
};

const mergeProfileDraftOntoLatest = (
  base: AutismProfile,
  draft: AutismProfile,
  latest: AutismProfile,
): AutismProfile => mergeDraftValue(base, draft, latest) as AutismProfile;

const canMutateAutismState = (
  initiatingOwnerId: string | null,
  initiatingGeneration: number,
  currentGeneration: number,
): initiatingOwnerId is string => {
  if (!initiatingOwnerId || initiatingGeneration !== currentGeneration) return false;

  const auth = useAuthStore.getState();
  const activeChildScopeId = resolveChildScopeId({
    userId: auth.user?.id ?? null,
    profileId: auth.profile?.id ?? null,
    profileRole: auth.profile?.role ?? null,
    isGuest: auth.isGuest,
  });
  const autismState = useAutismProfileStore.getState();

  return (
    activeChildScopeId === initiatingOwnerId
    && autismState.ownerId === initiatingOwnerId
    && autismState.hydrationStatus === 'ready'
    && autismState.profile.childId === initiatingOwnerId
  );
};

const AutismSpacePage: React.FC = () => {
  const initialAutismState = useAutismProfileStore.getState();
  const initialAuth = useAuthStore.getState();
  const initialChildScopeId = resolveChildScopeId({
    userId: initialAuth.user?.id ?? null,
    profileId: initialAuth.profile?.id ?? null,
    profileRole: initialAuth.profile?.role ?? null,
    isGuest: initialAuth.isGuest,
  });
  const initialDraftOwnerId = (
    initialChildScopeId
    && initialAutismState.ownerId === initialChildScopeId
    && initialAutismState.hydrationStatus === 'ready'
    && initialAutismState.profile.childId === initialChildScopeId
  ) ? initialChildScopeId : null;

  const [activeTab, setActiveTab] = useState<AutismTab>('profile');
  const [profileDraft, setProfileDraft] = useState<AutismProfile>(
    initialAutismState.profile,
  );
  const [newScheduleLabel, setNewScheduleLabel] = useState('');
  const [timerMinutes, setTimerMinutes] = useState<WarningTime>(profileDraft.routine.warningTime);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(profileDraft.routine.warningTime * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [storyTitle, setStoryTitle] = useState('');
  const [storyPanels, setStoryPanels] = useState(['', '', '']);
  const [worryNote, setWorryNote] = useState('');
  const [newPhrase, setNewPhrase] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [draftOwnerId, setDraftOwnerId] = useState<string | null>(initialDraftOwnerId);
  const [draftGeneration, setDraftGeneration] = useState(0);
  const [profileDraftRevision, setProfileDraftRevision] = useState(
    initialAutismState.profile.updatedAt,
  );
  const profileDraftBaseRef = useRef(initialAutismState.profile);
  const timerDirtyRef = useRef(false);
  const draftGenerationRef = useRef(0);
  const savedMessageTimeoutRef = useRef<number | null>(null);
  const printTimeoutRef = useRef<number | null>(null);

  const navigate = useNavigate();
  const { user: authUser, profile: authProfile, isGuest } = useAuth();
  const activeChildScopeId = resolveChildScopeId({
    userId: authUser?.id ?? null,
    profileId: authProfile?.id ?? null,
    profileRole: authProfile?.role ?? null,
    isGuest,
  });
  const autismOwnerId = useAutismProfileStore((s) => s.ownerId);
  const autismHydrationStatus = useAutismProfileStore((s) => s.hydrationStatus);
  const profile = useAutismProfileStore((s) => s.profile);
  const schedule = useAutismProfileStore((s) => s.schedule);
  const socialStories = useAutismProfileStore((s) => s.socialStories);
  const updateProfile = useAutismProfileStore((s) => s.updateProfile);
  const updateSchedule = useAutismProfileStore((s) => s.updateSchedule);
  const toggleScheduleDone = useAutismProfileStore((s) => s.toggleScheduleDone);
  const addSocialStory = useAutismProfileStore((s) => s.addSocialStory);
  const trustedAdultOwnerChildId = useTrustedAdultStore((s) => s.ownerChildId);
  const trustedAdults = useTrustedAdultStore((s) => s.trustedAdults);
  const selectedTrustedAdultId = useTrustedAdultStore((s) => s.selectedTrustedAdultId);
  const setReducedMotion = useUiStore((s) => s.setReducedMotion);
  const setTheme = useUiStore((s) => s.setTheme);

  const activeTrustedAdult = useMemo(
    () => {
      if (trustedAdultOwnerChildId !== draftOwnerId || !draftOwnerId) return undefined;
      const connectedAdults = trustedAdults.filter(isConnectedTrustedAdult);
      return connectedAdults.find((adult) => adult.id === selectedTrustedAdultId)
        ?? connectedAdults[0];
    },
    [draftOwnerId, selectedTrustedAdultId, trustedAdultOwnerChildId, trustedAdults],
  );
  const autismSpaceReady = Boolean(
    activeChildScopeId
    && autismOwnerId === activeChildScopeId
    && autismHydrationStatus === 'ready'
    && profile.childId === activeChildScopeId
    && draftOwnerId === activeChildScopeId
    && draftGeneration === draftGenerationRef.current
  );
  const childId = autismSpaceReady && draftOwnerId ? draftOwnerId : 'guest-child';
  const timerDisplay = `${Math.floor(timerSecondsLeft / 60)}:${String(timerSecondsLeft % 60).padStart(2, '0')}`;
  const childName = authProfile?.first_name ?? profileDraft.aboutMe?.preferredName ?? 'Learner';
  const selectedQuickButtons = profileDraft.communication.quickButtons.filter((button) => button.enabled);
  const formatList = (items: string[], fallback = 'Not specified') =>
    items.length ? items.join(', ') : fallback;

  useEffect(() => {
    const nextGeneration = draftGenerationRef.current + 1;
    draftGenerationRef.current = nextGeneration;
    const scopedProfile = useAutismProfileStore.getState().profile;
    const readyOwnerId = (
      activeChildScopeId
      && autismOwnerId === activeChildScopeId
      && autismHydrationStatus === 'ready'
      && scopedProfile.childId === activeChildScopeId
    ) ? activeChildScopeId : null;

    // Every local draft belongs to exactly one hydrated child. Clear and
    // reseed them together so an account switch cannot carry Child A's
    // unfinished state into Child B's ready store.
    setDraftOwnerId(readyOwnerId);
    setDraftGeneration(nextGeneration);
    setProfileDraft(scopedProfile);
    setProfileDraftRevision(scopedProfile.updatedAt);
    profileDraftBaseRef.current = scopedProfile;
    timerDirtyRef.current = false;
    setNewScheduleLabel('');
    setTimerMinutes(scopedProfile.routine.warningTime);
    setTimerSecondsLeft(scopedProfile.routine.warningTime * 60);
    setTimerRunning(false);
    setStoryTitle('');
    setStoryPanels(['', '', '']);
    setWorryNote('');
    setNewPhrase('');
    setSavedMessage('');

    if (savedMessageTimeoutRef.current !== null) {
      window.clearTimeout(savedMessageTimeoutRef.current);
      savedMessageTimeoutRef.current = null;
    }
    if (printTimeoutRef.current !== null) {
      window.clearTimeout(printTimeoutRef.current);
      printTimeoutRef.current = null;
    }

    return () => {
      // Invalidate callbacks that are already queued even if the account later
      // switches back to the same child id (A -> B -> A).
      draftGenerationRef.current += 1;
      if (savedMessageTimeoutRef.current !== null) {
        window.clearTimeout(savedMessageTimeoutRef.current);
        savedMessageTimeoutRef.current = null;
      }
      if (printTimeoutRef.current !== null) {
        window.clearTimeout(printTimeoutRef.current);
        printTimeoutRef.current = null;
      }
    };
  }, [activeChildScopeId, autismHydrationStatus, autismOwnerId]);

  useEffect(() => {
    if (
      !activeChildScopeId
      || activeChildScopeId !== draftOwnerId
      || autismOwnerId !== draftOwnerId
      || autismHydrationStatus !== 'ready'
      || profile.childId !== draftOwnerId
      || draftGeneration !== draftGenerationRef.current
      || profileDraftBaseRef.current === profile
    ) return;

    // StoreInitializer may merge the server profile after local hydration is
    // already marked ready. Apply only the child's unsaved field changes over
    // that latest base, instead of either dropping the draft or overwriting the
    // server profile with a stale pre-fetch copy.
    const previousBase = profileDraftBaseRef.current;
    const mergedProfileDraft = mergeProfileDraftOntoLatest(
      previousBase,
      profileDraft,
      profile,
    );
    profileDraftBaseRef.current = profile;
    setProfileDraft(mergedProfileDraft);
    setProfileDraftRevision(profile.updatedAt);

    if (!timerDirtyRef.current) {
      setTimerMinutes(mergedProfileDraft.routine.warningTime);
      setTimerSecondsLeft(mergedProfileDraft.routine.warningTime * 60);
      setTimerRunning(false);
    }
  }, [
    activeChildScopeId,
    autismHydrationStatus,
    autismOwnerId,
    draftGeneration,
    draftOwnerId,
    profile,
    profileDraft,
  ]);

  useEffect(() => {
    if (!timerRunning) return undefined;
    const initiatingOwnerId = draftOwnerId;
    const initiatingGeneration = draftGeneration;
    if (!canMutateAutismState(
      initiatingOwnerId,
      initiatingGeneration,
      draftGenerationRef.current,
    )) {
      setTimerRunning(false);
      return undefined;
    }

    const timer = window.setInterval(() => {
      if (!canMutateAutismState(
        initiatingOwnerId,
        initiatingGeneration,
        draftGenerationRef.current,
      )) {
        window.clearInterval(timer);
        return;
      }

      setTimerSecondsLeft((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer);
          setTimerRunning(false);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [draftGeneration, draftOwnerId, timerRunning]);

  const setWarningMinutes = (minutes: WarningTime) => {
    if (!canMutateAutismState(
      draftOwnerId,
      draftGeneration,
      draftGenerationRef.current,
    )) return;
    timerDirtyRef.current = true;
    setTimerMinutes(minutes);
    setTimerSecondsLeft(minutes * 60);
    setTimerRunning(false);
  };

  const setTimerRunningForDraftOwner = () => {
    if (!canMutateAutismState(
      draftOwnerId,
      draftGeneration,
      draftGenerationRef.current,
    )) return;
    timerDirtyRef.current = true;
    setTimerRunning((running) => !running);
  };

  const toggleScheduleItemForDraftOwner = (itemId: string) => {
    const initiatingOwnerId = draftOwnerId;
    const initiatingGeneration = draftGeneration;
    if (!canMutateAutismState(
      initiatingOwnerId,
      initiatingGeneration,
      draftGenerationRef.current,
    )) return;
    toggleScheduleDone(itemId);
  };

  const moveScheduleItemForDraftOwner = (index: number, direction: -1 | 1) => {
    const initiatingOwnerId = draftOwnerId;
    const initiatingGeneration = draftGeneration;
    if (!canMutateAutismState(
      initiatingOwnerId,
      initiatingGeneration,
      draftGenerationRef.current,
    )) return;
    updateSchedule(moveItem(schedule, index, direction));
  };

  const showSavedMessage = (
    message: string,
    initiatingOwnerId: string,
    initiatingGeneration: number,
  ) => {
    setSavedMessage(message);
    if (savedMessageTimeoutRef.current !== null) {
      window.clearTimeout(savedMessageTimeoutRef.current);
    }
    const savedMessageTimeout = window.setTimeout(() => {
      if (canMutateAutismState(
        initiatingOwnerId,
        initiatingGeneration,
        draftGenerationRef.current,
      )) setSavedMessage('');
      if (savedMessageTimeoutRef.current === savedMessageTimeout) {
        savedMessageTimeoutRef.current = null;
      }
    }, 3000);
    savedMessageTimeoutRef.current = savedMessageTimeout;
  };

  const commitProfileLocally = (): {
    childId: string;
    generation: number;
    profile: AutismProfile;
  } | null => {
    const initiatingOwnerId = draftOwnerId;
    const initiatingGeneration = draftGeneration;
    if (!canMutateAutismState(
      initiatingOwnerId,
      initiatingGeneration,
      draftGenerationRef.current,
    )) return null;
    const latestStoreProfile = useAutismProfileStore.getState().profile;
    if (
      latestStoreProfile !== profileDraftBaseRef.current
      || latestStoreProfile.updatedAt !== profileDraftRevision
    ) return null;

    const now = new Date().toISOString();
    const nextProfile: AutismProfile = {
      ...profileDraft,
      childId: initiatingOwnerId,
      completedAt: profileDraft.completedAt ?? now,
      updatedAt: now,
    };
    updateProfile(nextProfile);
    const committedProfile = useAutismProfileStore.getState().profile;
    setReducedMotion(profileDraft.sensory.reducedAnimations);
    if (profileDraft.sensory.calmingTools.includes('darkMode')) setTheme('dark');
    return {
      childId: initiatingOwnerId,
      generation: initiatingGeneration,
      profile: committedProfile,
    };
  };

  const syncCommittedProfile = async (commit: {
    childId: string;
    generation: number;
    profile: AutismProfile;
  }) => {
    const currentAuth = useAuthStore.getState();
    if (currentAuth.isGuest) {
      showSavedMessage('Saved for this guest session.', commit.childId, commit.generation);
      return;
    }

    try {
      await saveAutismProfile(commit.childId, commit.profile);
      if (
        canMutateAutismState(
          commit.childId,
          commit.generation,
          draftGenerationRef.current,
        )
        && useAutismProfileStore.getState().profile.updatedAt === commit.profile.updatedAt
      ) {
        showSavedMessage('Autism profile saved.', commit.childId, commit.generation);
      }
    } catch (error) {
      if (canMutateAutismState(
        commit.childId,
        commit.generation,
        draftGenerationRef.current,
      )) {
        console.warn('Autism profile saved locally but could not sync:', error);
        showSavedMessage(
          'Saved on this device. Online sync did not finish—please try again.',
          commit.childId,
          commit.generation,
        );
      }
    }
  };

  const saveProfile = (): boolean => {
    const commit = commitProfileLocally();
    if (!commit) return false;
    void syncCommittedProfile(commit);
    return true;
  };

  const printPassport = () => {
    const initiatingOwnerId = draftOwnerId;
    const initiatingGeneration = draftGeneration;
    if (
      !saveProfile()
      || !canMutateAutismState(
        initiatingOwnerId,
        initiatingGeneration,
        draftGenerationRef.current,
      )
    ) return;

    if (printTimeoutRef.current !== null) window.clearTimeout(printTimeoutRef.current);
    const printTimeout = window.setTimeout(() => {
      if (canMutateAutismState(
        initiatingOwnerId,
        initiatingGeneration,
        draftGenerationRef.current,
      )) window.print();
      if (printTimeoutRef.current === printTimeout) printTimeoutRef.current = null;
    }, 80);
    printTimeoutRef.current = printTimeout;
  };

  const addScheduleItem = () => {
    const initiatingOwnerId = draftOwnerId;
    const initiatingGeneration = draftGeneration;
    const label = newScheduleLabel.trim();
    if (
      !label
      || !canMutateAutismState(
        initiatingOwnerId,
        initiatingGeneration,
        draftGenerationRef.current,
      )
    ) return;
    updateSchedule([
      ...schedule,
      { id: `schedule-${Date.now()}`, label, icon: 'Task', done: false },
    ]);
    setNewScheduleLabel('');
  };

  const addCustomPhrase = () => {
    const phrase = newPhrase.trim();
    if (!phrase || profileDraft.communication.customPhrases.includes(phrase)) return;
    setProfileDraft((draft) => ({
      ...draft,
      communication: {
        ...draft.communication,
        customPhrases: [...draft.communication.customPhrases, phrase],
      },
    }));
    setNewPhrase('');
  };

  const saveStory = () => {
    const initiatingOwnerId = draftOwnerId;
    const initiatingGeneration = draftGeneration;
    const title = storyTitle.trim();
    const panels = storyPanels.map((panel) => panel.trim()).filter(Boolean);
    if (
      !title
      || panels.length === 0
      || !canMutateAutismState(
        initiatingOwnerId,
        initiatingGeneration,
        draftGenerationRef.current,
      )
    ) return;
    addSocialStory({ title, panels });
    setStoryTitle('');
    setStoryPanels(['', '', '']);
  };

  const renderProfileWizard = () => (
    <div className="space-y-5">
      <section className="rounded-3xl border border-adapt-indigo/15 bg-gradient-to-br from-adapt-indigo/10 via-white to-adapt-teal/10 p-5 shadow-soft dark:border-adapt-cyan/20 dark:from-adapt-cyan/10 dark:via-gray-900 dark:to-adapt-indigo/15">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-adapt-indigo dark:text-adapt-cyan">
              Support passport
            </p>
            <h2 className="mt-2 text-xl font-black text-adapt-navy dark:text-gray-100">
              What helps me learn calmly
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-gray-400">
              Save this profile before a meeting so adults can see communication preferences, sensory needs, routines, and preferred support in one place.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={saveProfile}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-5 py-3 text-sm font-black text-white transition hover:bg-adapt-purple dark:bg-adapt-cyan dark:text-gray-950"
            >
              <Save className="h-4 w-4" aria-hidden />
              Save passport
            </button>
            <button
              type="button"
              onClick={printPassport}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-adapt-indigo/20 bg-white px-5 py-3 text-sm font-black text-adapt-indigo shadow-sm transition hover:border-adapt-indigo/40 dark:border-adapt-cyan/20 dark:bg-gray-950 dark:text-adapt-cyan"
            >
              <Printer className="h-4 w-4" aria-hidden />
              Print / save PDF
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-white/80 p-4 dark:bg-gray-950/60">
            <p className="text-xs font-black uppercase text-slate-400">Communication</p>
            <p className="mt-2 text-sm font-bold text-adapt-navy dark:text-gray-100">
              {formatList(profileDraft.communication.style, 'Choose styles')}
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 p-4 dark:bg-gray-950/60">
            <p className="text-xs font-black uppercase text-slate-400">Sensory</p>
            <p className="mt-2 text-sm font-bold text-adapt-navy dark:text-gray-100">
              {formatList(profileDraft.sensory.sensitivities, 'No sensitivities selected')}
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 p-4 dark:bg-gray-950/60">
            <p className="text-xs font-black uppercase text-slate-400">Routine</p>
            <p className="mt-2 text-sm font-bold text-adapt-navy dark:text-gray-100">
              {profileDraft.routine.preference} routine, {profileDraft.routine.warningTime}m warning
            </p>
          </div>
          <div className="rounded-2xl bg-white/80 p-4 dark:bg-gray-950/60">
            <p className="text-xs font-black uppercase text-slate-400">Calm tools</p>
            <p className="mt-2 text-sm font-bold text-adapt-navy dark:text-gray-100">
              {formatList(profileDraft.sensory.calmingTools)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">Communication profile</h2>
        <p className="mt-1 text-sm text-slate-500">Choose the ways communication should be supported.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {communicationOptions.map((option) => {
            const active = profileDraft.communication.style.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  setProfileDraft((draft) => ({
                    ...draft,
                    communication: {
                      ...draft.communication,
                      style: toggleValue(draft.communication.style, option.id),
                    },
                  }))
                }
                className={`rounded-2xl border-2 p-3 text-left text-sm font-semibold transition ${
                  active ? 'border-adapt-indigo bg-adapt-indigo/10 text-adapt-indigo' : 'border-slate-100 bg-slate-50 text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-gray-800 dark:bg-gray-950">
          <h3 className="text-sm font-black text-adapt-navy dark:text-gray-100">AAC quick buttons</h3>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-gray-400">
            Choose which need-cards should appear on the communication board.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {profileDraft.communication.quickButtons.map((button) => (
              <label
                key={button.id}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 text-sm font-bold text-slate-700 shadow-sm dark:bg-gray-900 dark:text-gray-200"
              >
                <input
                  type="checkbox"
                  checked={button.enabled}
                  onChange={(event) =>
                    setProfileDraft((draft) => ({
                      ...draft,
                      communication: {
                        ...draft.communication,
                        quickButtons: draft.communication.quickButtons.map((item) =>
                          item.id === button.id ? { ...item, enabled: event.target.checked } : item,
                        ),
                      },
                    }))
                  }
                  className="h-5 w-5"
                />
                {button.label}
              </label>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              value={newPhrase}
              onChange={(event) => setNewPhrase(event.target.value)}
              placeholder="Add a custom phrase, e.g. I need quiet"
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900"
            />
            <button
              type="button"
              onClick={addCustomPhrase}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-adapt-indigo px-4 py-3 text-sm font-black text-white"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add phrase
            </button>
          </div>
          {profileDraft.communication.customPhrases.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {profileDraft.communication.customPhrases.map((phrase) => (
                <button
                  key={phrase}
                  type="button"
                  onClick={() =>
                    setProfileDraft((draft) => ({
                      ...draft,
                      communication: {
                        ...draft.communication,
                        customPhrases: draft.communication.customPhrases.filter((item) => item !== phrase),
                      },
                    }))
                  }
                  className="rounded-full bg-teal-100 px-3 py-1.5 text-xs font-black text-teal-800 dark:bg-teal-950/40 dark:text-teal-100"
                >
                  {phrase}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">Sensory comfort</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sensoryOptions.map((option) => {
            const active = profileDraft.sensory.sensitivities.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  setProfileDraft((draft) => ({
                    ...draft,
                    sensory: {
                      ...draft.sensory,
                      sensitivities: toggleValue(draft.sensory.sensitivities, option.id),
                    },
                  }))
                }
                className={`rounded-2xl border-2 p-3 text-sm font-semibold transition ${
                  active ? 'border-teal-400 bg-teal-50 text-teal-800' : 'border-slate-100 bg-slate-50 text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {calmingOptions.map((option) => {
            const Icon = option.icon;
            const active = profileDraft.sensory.calmingTools.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  setProfileDraft((draft) => ({
                    ...draft,
                    sensory: {
                      ...draft.sensory,
                      calmingTools: toggleValue(draft.sensory.calmingTools, option.id),
                    },
                  }))
                }
                className={`flex items-center gap-2 rounded-2xl border-2 p-3 text-sm font-semibold transition ${
                  active ? 'border-adapt-indigo bg-adapt-indigo/10 text-adapt-indigo' : 'border-slate-100 bg-slate-50 text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {option.label}
              </button>
            );
          })}
        </div>

        <label className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600 dark:bg-gray-800 dark:text-gray-300">
          <input
            type="checkbox"
            checked={profileDraft.sensory.reducedAnimations}
            onChange={(e) =>
              setProfileDraft((draft) => ({
                ...draft,
                sensory: { ...draft.sensory, reducedAnimations: e.target.checked },
              }))
            }
            className="h-5 w-5"
          />
          Reduce animations and motion
        </label>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">Routine and learning</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(['strict', 'flexible'] as const).map((preference) => (
            <button
              key={preference}
              type="button"
              onClick={() =>
                setProfileDraft((draft) => ({
                  ...draft,
                  routine: { ...draft.routine, preference },
                }))
              }
              className={`rounded-2xl border-2 p-4 text-sm font-bold capitalize ${
                profileDraft.routine.preference === preference ? 'border-purple-400 bg-purple-50 text-purple-800' : 'border-slate-100 bg-slate-50 text-slate-600 dark:border-gray-700 dark:bg-gray-800'
              }`}
            >
              {preference} routine
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {([2, 5, 10, 15] as WarningTime[]).map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => {
                setWarningMinutes(minutes);
                setProfileDraft((draft) => ({
                  ...draft,
                  routine: { ...draft.routine, warningTime: minutes },
                }));
              }}
              className={`rounded-2xl border-2 p-3 text-sm font-bold ${
                profileDraft.routine.warningTime === minutes ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-slate-100 bg-slate-50 text-slate-600 dark:border-gray-700 dark:bg-gray-800'
              }`}
            >
              {minutes}m
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {learningOptions.map((option) => {
            const active = profileDraft.learning.bestFormats.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  setProfileDraft((draft) => ({
                    ...draft,
                    learning: {
                      ...draft.learning,
                      bestFormats: toggleValue(draft.learning.bestFormats, option.id),
                    },
                  }))
                }
                className={`rounded-2xl border-2 p-3 text-sm font-semibold ${
                  active ? 'border-orange-400 bg-orange-50 text-orange-800' : 'border-slate-100 bg-slate-50 text-slate-600 dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">Safety and support</h2>
        <p className="mt-1 text-sm text-slate-500">
          Current trusted adult: {activeTrustedAdult?.name ?? 'Not selected'}
        </p>
        <textarea
          value={profileDraft.safety.overwhelmSigns}
          onChange={(e) =>
            setProfileDraft((draft) => ({
              ...draft,
              safety: { ...draft.safety, overwhelmSigns: e.target.value },
            }))
          }
          rows={3}
          placeholder="What does overwhelm look like?"
          className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-adapt-indigo dark:border-gray-700 dark:bg-gray-800"
        />
        <textarea
          value={profileDraft.safety.preferredSupport}
          onChange={(e) =>
            setProfileDraft((draft) => ({
              ...draft,
              safety: { ...draft.safety, preferredSupport: e.target.value },
            }))
          }
          rows={3}
          placeholder="What support helps best?"
          className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-adapt-indigo dark:border-gray-700 dark:bg-gray-800"
        />
      </section>

      <button
        type="button"
        onClick={saveProfile}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-adapt-navy px-6 py-3.5 text-sm font-bold text-white transition hover:bg-adapt-purple"
      >
        <Save className="h-4 w-4" aria-hidden />
        Save Autism Profile
      </button>
    </div>
  );

  const renderSchedule = () => (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">Visual Daily Schedule</h2>
        <p className="mt-1 text-sm text-slate-500">Keep the day visible and predictable.</p>
        <ol className="mt-5 space-y-3">
          {schedule.map((item, index) => (
            <li key={item.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <button
                type="button"
                onClick={() => toggleScheduleItemForDraftOwner(item.id)}
                className={`flex h-9 w-9 items-center justify-center rounded-full ${item.done ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 dark:bg-gray-900'}`}
                aria-label={`Mark ${item.label}`}
              >
                <Check className="h-4 w-4" aria-hidden />
              </button>
              <span className="flex-1 font-semibold text-adapt-navy dark:text-gray-100">{item.label}</span>
              <button type="button" onClick={() => moveScheduleItemForDraftOwner(index, -1)} className="rounded-full bg-white p-2 text-slate-500 dark:bg-gray-900" aria-label="Move up">
                <ChevronUp className="h-4 w-4" aria-hidden />
              </button>
              <button type="button" onClick={() => moveScheduleItemForDraftOwner(index, 1)} className="rounded-full bg-white p-2 text-slate-500 dark:bg-gray-900" aria-label="Move down">
                <ChevronDown className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex gap-2">
          <input
            value={newScheduleLabel}
            onChange={(e) => setNewScheduleLabel(e.target.value)}
            placeholder="Add a schedule card"
            className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
          />
          <button type="button" onClick={addScheduleItem} className="rounded-2xl bg-adapt-indigo px-4 text-white">
            <Plus className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">Why visual schedules help</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-gray-400">
          A visible order lowers guesswork. Move cards up or down, mark them done, and keep the day predictable.
        </p>
        <div className="mt-5 rounded-2xl bg-sky-50 p-4 text-sm font-semibold text-sky-900 dark:bg-sky-950/30 dark:text-sky-200">
          For transitions, open the Now / Next / Later tab to show only the current step, the next step, and what comes after.
        </div>
      </section>
    </div>
  );

  const renderTransition = () => (
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <NowNextLaterBoard childId={childId} mode="child" editable />

      <section className="rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <Clock className="mx-auto h-10 w-10 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
        <h2 className="mt-3 text-xl font-bold text-adapt-navy dark:text-gray-100">Transition Timer</h2>
        <p className="mt-1 text-sm text-slate-500">Give warning before a change happens.</p>
        <div className="mt-6 grid grid-cols-4 gap-2">
          {([2, 5, 10, 15] as WarningTime[]).map((minutes) => (
            <button
              key={minutes}
              type="button"
              onClick={() => setWarningMinutes(minutes)}
              className={`rounded-2xl border-2 p-3 text-sm font-bold ${timerMinutes === minutes ? 'border-adapt-indigo bg-adapt-indigo/10 text-adapt-indigo' : 'border-slate-100 bg-slate-50 dark:border-gray-700 dark:bg-gray-800'}`}
            >
              {minutes} min
            </button>
          ))}
        </div>
        <div
          className="mx-auto mt-6 flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br from-adapt-indigo to-adapt-teal text-4xl font-black text-white shadow-glow"
          aria-live="polite"
        >
          {timerDisplay}
        </div>
        <p className="mx-auto mt-3 max-w-xs rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 dark:bg-gray-800 dark:text-gray-300">
          {timerSecondsLeft === 0
            ? 'Time to change activity. Look at Now / Next / Later.'
            : timerRunning
              ? 'The change is coming soon. Watch the timer and breathe.'
              : 'Start the warning when a transition is about to happen.'}
        </p>
        <button
          type="button"
          onClick={setTimerRunningForDraftOwner}
          disabled={timerSecondsLeft === 0}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-adapt-navy px-6 py-3 text-sm font-bold text-white"
        >
          {timerRunning ? <Pause className="h-4 w-4" aria-hidden /> : <Timer className="h-4 w-4" aria-hidden />}
          {timerRunning ? 'Pause warning' : 'Start warning'}
        </button>
        {timerSecondsLeft === 0 && (
          <button
            type="button"
            onClick={() => setWarningMinutes(timerMinutes)}
            className="ml-2 mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Reset
          </button>
        )}
      </section>
    </div>
  );

  const renderCalmCorner = () => (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-3xl border border-slate-100 bg-gradient-to-br from-sky-50 to-white p-6 shadow-soft dark:border-gray-800 dark:from-gray-900 dark:to-gray-950">
        <Wind className="h-9 w-9 text-adapt-teal" aria-hidden />
        <h2 className="mt-3 text-xl font-bold text-adapt-navy dark:text-gray-100">Calm Corner</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">Breathe in for 4, hold for 2, breathe out for 6.</p>
        <div className="mx-auto mt-6 flex h-32 w-32 items-center justify-center rounded-full bg-adapt-teal/15 text-sm font-bold text-adapt-teal">
          Breathe
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setTheme('dark')} className="rounded-2xl bg-white p-4 text-sm font-bold text-adapt-navy shadow-sm dark:bg-gray-800 dark:text-gray-100">
            <Moon className="mx-auto mb-2 h-5 w-5" aria-hidden />
            Low light
          </button>
          <button
            type="button"
            onClick={() => navigate(ROUTES.MUSIC)}
            className="rounded-2xl bg-white p-4 text-sm font-bold text-adapt-navy shadow-sm dark:bg-gray-800 dark:text-gray-100"
          >
            <Volume2 className="mx-auto mb-2 h-5 w-5" aria-hidden />
            Soft sound
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-rose-500" aria-hidden />
          <h2 className="text-xl font-bold text-adapt-navy dark:text-gray-100">Worry Diary Alert</h2>
        </div>
        <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
          Write a worry. If it feels big, AdaptBuddy reminds you who your trusted adult is.
        </p>
        <textarea
          value={worryNote}
          onChange={(e) => setWorryNote(e.target.value)}
          rows={5}
          placeholder="What is worrying you?"
          className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
        />
        {worryNote.trim().length > 24 && (
          <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
            This sounds important. You can ask {activeTrustedAdult?.name ?? 'your trusted adult'} for help.
          </p>
        )}
      </section>
    </div>
  );

  const renderStory = () => (
    <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">Social Story Builder</h2>
        <input
          value={storyTitle}
          onChange={(e) => setStoryTitle(e.target.value)}
          placeholder="Story title"
          className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
        />
        <div className="mt-3 space-y-2">
          {storyPanels.map((panel, index) => (
            <textarea
              key={index}
              value={panel}
              onChange={(e) => setStoryPanels((panels) => panels.map((item, i) => (i === index ? e.target.value : item)))}
              rows={2}
              placeholder={`Panel ${index + 1}`}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
            />
          ))}
        </div>
        <button type="button" onClick={saveStory} className="mt-4 rounded-full bg-adapt-indigo px-5 py-2.5 text-sm font-bold text-white">
          Save story
        </button>
      </section>
      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">Saved stories</h2>
        <div className="mt-4 space-y-3">
          {socialStories.map((story) => (
            <article key={story.id} className="rounded-2xl bg-indigo-50 p-4 dark:bg-indigo-950/30">
              <h3 className="font-bold text-adapt-navy dark:text-gray-100">{story.title}</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {story.panels.map((panel, index) => (
                  <p key={`${story.id}-${index}`} className="rounded-xl bg-white p-3 text-sm text-slate-600 dark:bg-gray-900 dark:text-gray-300">
                    {panel}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );

  const renderCommunicationBoard = () => {
    return (
      <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-soft dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-bold text-adapt-navy dark:text-gray-100">Communication Help Board</h2>
        <p className="mt-1 text-sm text-slate-500">Tap a card, practise a word, or use your own phrase.</p>
        <div className="mt-5 grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
          <Link
            to={ROUTES.PRONUNCIATION_BUDDY}
            className="group rounded-3xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 transition hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-card dark:border-sky-900/70 dark:from-sky-950/30 dark:to-gray-900"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-soft">
              <Mic2 className="h-6 w-6" aria-hidden />
            </span>
            <h3 className="mt-4 text-xl font-black text-adapt-navy dark:text-gray-100">Pronunciation Buddy</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-gray-400">
              Practise names, helpful words, and short sentences with listen-and-repeat support.
            </p>
            <span className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-sky-700 shadow-sm group-hover:bg-sky-600 group-hover:text-white dark:bg-gray-950 dark:text-sky-200">
              Open practice
            </span>
          </Link>

          <div className="rounded-3xl border border-teal-100 bg-teal-50/70 p-5 dark:border-teal-900/60 dark:bg-teal-950/20">
            <Volume2 className="h-8 w-8 text-teal-600 dark:text-teal-300" aria-hidden />
            <h3 className="mt-3 text-lg font-black text-adapt-navy dark:text-gray-100">Listen first, then say it</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-gray-400">
              This sits beside AAC because some children use spoken words, repeated words, typing, pictures, or a mix.
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {selectedQuickButtons.map((button) => (
            <button
              key={button.id}
              type="button"
              className="rounded-3xl border-2 border-adapt-indigo/20 bg-adapt-indigo/5 p-5 text-center transition hover:border-adapt-indigo/50 hover:bg-adapt-indigo/10"
            >
              <Grid3X3 className="mx-auto mb-2 h-7 w-7 text-adapt-indigo" aria-hidden />
              <span className="text-lg font-black text-adapt-navy dark:text-gray-100">{button.label}</span>
            </button>
          ))}
          {profileDraft.communication.customPhrases.map((phrase) => (
            <button key={phrase} type="button" className="rounded-3xl border-2 border-teal-200 bg-teal-50 p-5 text-lg font-black text-teal-900">
              {phrase}
            </button>
          ))}
        </div>
      </section>
    );
  };

  const renderPrintablePassport = () => (
    <section className="autism-print-passport hidden">
      <div className="print-passport-header">
        <div>
          <p className="print-eyebrow">AdaptBuddy Autism Support Passport</p>
          <h1>{childName}</h1>
          <p>Prepared on {new Intl.DateTimeFormat('en-GB').format(new Date())}</p>
        </div>
        <div className="print-badge">Support preferences</div>
      </div>

      <p className="print-note">
        This passport is not a diagnosis and does not replace professional advice. It helps trusted adults understand support preferences, communication needs, sensory comfort, and routines.
      </p>

      <div className="print-grid">
        <article>
          <h2>Communication</h2>
          <p><strong>Style:</strong> {formatList(profileDraft.communication.style)}</p>
          <p><strong>Support format:</strong> {formatList(profileDraft.communication.supportFormat)}</p>
          <p><strong>AAC cards:</strong> {formatList(selectedQuickButtons.map((button) => button.label))}</p>
          <p><strong>Custom phrases:</strong> {formatList(profileDraft.communication.customPhrases)}</p>
        </article>

        <article>
          <h2>Sensory Comfort</h2>
          <p><strong>Sensitivities:</strong> {formatList(profileDraft.sensory.sensitivities)}</p>
          <p><strong>Calming tools:</strong> {formatList(profileDraft.sensory.calmingTools)}</p>
          <p><strong>Reduced motion:</strong> {profileDraft.sensory.reducedAnimations ? 'Yes' : 'No'}</p>
          <p><strong>Notes:</strong> {profileDraft.sensory.customNotes || 'None added'}</p>
        </article>

        <article>
          <h2>Routine and Learning</h2>
          <p><strong>Routine:</strong> {profileDraft.routine.preference}</p>
          <p><strong>Transition warning:</strong> {profileDraft.routine.warningTime} minutes</p>
          <p><strong>Best formats:</strong> {formatList(profileDraft.learning.bestFormats)}</p>
          <p><strong>One instruction at a time:</strong> {profileDraft.learning.oneInstructionAtATime ? 'Yes' : 'No'}</p>
        </article>

        <article>
          <h2>Safety and Adult Support</h2>
          <p><strong>Trusted adult:</strong> {activeTrustedAdult?.name ?? 'Not selected'}</p>
          <p><strong>Overwhelm signs:</strong> {profileDraft.safety.overwhelmSigns || 'Not specified'}</p>
          <p><strong>Preferred support:</strong> {profileDraft.safety.preferredSupport || 'Not specified'}</p>
        </article>
      </div>

      <section className="print-full">
        <h2>Current Visual Schedule</h2>
        <ol>
          {schedule.map((item) => (
            <li key={item.id}>{item.done ? 'Done: ' : 'To do: '}{item.label}</li>
          ))}
        </ol>
      </section>
    </section>
  );

  const content = {
    profile: renderProfileWizard,
    schedule: renderSchedule,
    transition: renderTransition,
    calm: renderCalmCorner,
    story: renderStory,
    communication: renderCommunicationBoard,
  }[activeTab];

  return (
    <div className="min-h-screen bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900">
      <style>
        {`
          @media print {
            @page {
              margin: 14mm;
            }

            body * {
              visibility: hidden !important;
            }

            .autism-print-passport,
            .autism-print-passport * {
              visibility: visible !important;
            }

            .autism-print-passport {
              display: block !important;
              position: absolute;
              inset: 0;
              min-height: 100vh;
              background: #ffffff;
              color: #111827;
              padding: 0;
              font-family: Arial, sans-serif;
            }

            .print-passport-header {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 24px;
              border-bottom: 2px solid #1f3a5f;
              padding-bottom: 18px;
              margin-bottom: 18px;
            }

            .print-eyebrow {
              margin: 0 0 6px;
              color: #2454a6;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 0.12em;
              text-transform: uppercase;
            }

            .autism-print-passport h1 {
              margin: 0;
              color: #12233f;
              font-size: 30px;
            }

            .autism-print-passport h2 {
              margin: 0 0 10px;
              color: #12233f;
              font-size: 15px;
            }

            .autism-print-passport p,
            .autism-print-passport li {
              color: #374151;
              font-size: 12px;
              line-height: 1.5;
            }

            .print-badge {
              border: 1px solid #94a3b8;
              border-radius: 999px;
              padding: 8px 12px;
              color: #12233f;
              font-size: 11px;
              font-weight: 800;
              text-transform: uppercase;
            }

            .print-note {
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              background: #f8fafc;
              padding: 12px;
            }

            .print-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-top: 14px;
            }

            .print-grid article,
            .print-full {
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 14px;
              break-inside: avoid;
            }

            .print-full {
              margin-top: 12px;
            }
          }
        `}
      </style>
      {autismSpaceReady && renderPrintablePassport()}
      <ChildDashboardNavbar />
      <main className="mx-auto max-w-6xl space-y-6 p-4 pb-16 sm:p-6">
        <header className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-card backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80">
          <p className="text-xs font-bold uppercase tracking-widest text-adapt-indigo dark:text-adapt-cyan">
            Autism Space
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-adapt-navy dark:text-gray-100">
            Predictable tools for a calmer day.
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-gray-400">
            Build a profile, plan routines, prepare transitions, communicate needs, and open a calm corner when things feel too much.
          </p>
          {autismSpaceReady && savedMessage && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
              <Check className="h-4 w-4" aria-hidden />
              {savedMessage}
            </p>
          )}
        </header>

        {autismSpaceReady ? (
          <>
            <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" aria-label="Autism tools">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-2xl border-2 p-3 text-sm font-bold transition ${
                      active
                        ? 'border-adapt-indigo bg-adapt-indigo text-white shadow-md'
                        : 'border-slate-100 bg-white text-slate-600 hover:border-adapt-indigo/30 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300'
                    }`}
                  >
                    <Icon className="mx-auto mb-1 h-5 w-5" aria-hidden />
                    {tab.label}
                  </button>
                );
              })}
            </nav>

            {content()}
          </>
        ) : (
          <section
            className="rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-soft dark:border-gray-800 dark:bg-gray-900"
            role="status"
            aria-live="polite"
          >
            <p className="font-bold text-adapt-navy dark:text-gray-100">
              {autismHydrationStatus === 'error'
                ? 'Your Autism Space could not be loaded safely. Please refresh and try again.'
                : 'Preparing your Autism Space…'}
            </p>
          </section>
        )}
      </main>
    </div>
  );
};

export default AutismSpacePage;
