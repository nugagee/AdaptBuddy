import React, { useMemo, useState } from 'react';
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
  Save,
  Shield,
  Sparkles,
  Timer,
  Volume2,
  Wind,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from 'constants/routes';
import ChildDashboardNavbar from 'features/child/components/layout/ChildDashboardNavbar';
import NowNextLaterBoard from 'features/child/components/NowNextLaterBoard';
import { useAutismProfileStore } from 'features/child/store/autismProfileStore';
import { useTrustedAdultStore } from 'features/child/store/trustedAdultStore';
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
import { useAuth } from 'hooks/useAuth';

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

const AutismSpacePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AutismTab>('profile');
  const [profileDraft, setProfileDraft] = useState<AutismProfile>(
    useAutismProfileStore.getState().profile,
  );
  const [newScheduleLabel, setNewScheduleLabel] = useState('');
  const [timerMinutes, setTimerMinutes] = useState<WarningTime>(profileDraft.routine.warningTime);
  const [timerRunning, setTimerRunning] = useState(false);
  const [storyTitle, setStoryTitle] = useState('');
  const [storyPanels, setStoryPanels] = useState(['', '', '']);
  const [worryNote, setWorryNote] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const { profile: authProfile } = useAuth();
  const profile = useAutismProfileStore((s) => s.profile);
  const schedule = useAutismProfileStore((s) => s.schedule);
  const socialStories = useAutismProfileStore((s) => s.socialStories);
  const updateProfile = useAutismProfileStore((s) => s.updateProfile);
  const updateSchedule = useAutismProfileStore((s) => s.updateSchedule);
  const toggleScheduleDone = useAutismProfileStore((s) => s.toggleScheduleDone);
  const addSocialStory = useAutismProfileStore((s) => s.addSocialStory);
  const trustedAdults = useTrustedAdultStore((s) => s.trustedAdults);
  const selectedTrustedAdultId = useTrustedAdultStore((s) => s.selectedTrustedAdultId);
  const setReducedMotion = useUiStore((s) => s.setReducedMotion);
  const setTheme = useUiStore((s) => s.setTheme);

  const activeTrustedAdult = useMemo(
    () => trustedAdults.find((adult) => adult.id === selectedTrustedAdultId) ?? trustedAdults[0],
    [selectedTrustedAdultId, trustedAdults],
  );
  const childId = authProfile?.id ?? profile.childId ?? 'guest-child';

  const saveProfile = () => {
    const now = new Date().toISOString();
    updateProfile({
      ...profileDraft,
      completedAt: profileDraft.completedAt ?? now,
      updatedAt: now,
    });
    setReducedMotion(profileDraft.sensory.reducedAnimations);
    if (profileDraft.sensory.calmingTools.includes('darkMode')) setTheme('dark');
    setSavedMessage('Autism profile saved.');
    window.setTimeout(() => setSavedMessage(''), 3000);
  };

  const addScheduleItem = () => {
    const label = newScheduleLabel.trim();
    if (!label) return;
    updateSchedule([
      ...schedule,
      { id: `schedule-${Date.now()}`, label, icon: 'Task', done: false },
    ]);
    setNewScheduleLabel('');
  };

  const saveStory = () => {
    const title = storyTitle.trim();
    const panels = storyPanels.map((panel) => panel.trim()).filter(Boolean);
    if (!title || panels.length === 0) return;
    addSocialStory({ title, panels });
    setStoryTitle('');
    setStoryPanels(['', '', '']);
  };

  const renderProfileWizard = () => (
    <div className="space-y-5">
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
                setTimerMinutes(minutes);
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
                onClick={() => toggleScheduleDone(item.id)}
                className={`flex h-9 w-9 items-center justify-center rounded-full ${item.done ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500 dark:bg-gray-900'}`}
                aria-label={`Mark ${item.label}`}
              >
                <Check className="h-4 w-4" aria-hidden />
              </button>
              <span className="flex-1 font-semibold text-adapt-navy dark:text-gray-100">{item.label}</span>
              <button type="button" onClick={() => updateSchedule(moveItem(schedule, index, -1))} className="rounded-full bg-white p-2 text-slate-500 dark:bg-gray-900" aria-label="Move up">
                <ChevronUp className="h-4 w-4" aria-hidden />
              </button>
              <button type="button" onClick={() => updateSchedule(moveItem(schedule, index, 1))} className="rounded-full bg-white p-2 text-slate-500 dark:bg-gray-900" aria-label="Move down">
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
              onClick={() => setTimerMinutes(minutes)}
              className={`rounded-2xl border-2 p-3 text-sm font-bold ${timerMinutes === minutes ? 'border-adapt-indigo bg-adapt-indigo/10 text-adapt-indigo' : 'border-slate-100 bg-slate-50 dark:border-gray-700 dark:bg-gray-800'}`}
            >
              {minutes} min
            </button>
          ))}
        </div>
        <div className="mx-auto mt-6 flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br from-adapt-indigo to-adapt-teal text-4xl font-black text-white shadow-glow">
          {timerMinutes}
        </div>
        <button
          type="button"
          onClick={() => setTimerRunning((running) => !running)}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-adapt-navy px-6 py-3 text-sm font-bold text-white"
        >
          {timerRunning ? <Pause className="h-4 w-4" aria-hidden /> : <Timer className="h-4 w-4" aria-hidden />}
          {timerRunning ? 'Pause warning' : 'Start warning'}
        </button>
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
          <button type="button" className="rounded-2xl bg-white p-4 text-sm font-bold text-adapt-navy shadow-sm dark:bg-gray-800 dark:text-gray-100">
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
    const enabledButtons = profile.communication.quickButtons.filter((button) => button.enabled);
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
          {enabledButtons.map((button) => (
            <button
              key={button.id}
              type="button"
              className="rounded-3xl border-2 border-adapt-indigo/20 bg-adapt-indigo/5 p-5 text-center transition hover:border-adapt-indigo/50 hover:bg-adapt-indigo/10"
            >
              <Grid3X3 className="mx-auto mb-2 h-7 w-7 text-adapt-indigo" aria-hidden />
              <span className="text-lg font-black text-adapt-navy dark:text-gray-100">{button.label}</span>
            </button>
          ))}
          {profile.communication.customPhrases.map((phrase) => (
            <button key={phrase} type="button" className="rounded-3xl border-2 border-teal-200 bg-teal-50 p-5 text-lg font-black text-teal-900">
              {phrase}
            </button>
          ))}
        </div>
      </section>
    );
  };

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
          {savedMessage && (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
              <Check className="h-4 w-4" aria-hidden />
              {savedMessage}
            </p>
          )}
        </header>

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
      </main>
    </div>
  );
};

export default AutismSpacePage;
