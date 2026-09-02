import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ActivityCompletion {
  activityId: string;
  neuroId: string;
  completedAt: string;
  starsEarned: number;
  durationMinutes: number;
}

export interface NeuroMetricSnapshot {
  neuroId: string;
  value: number;
  date: string;
}

export interface AdhdSupportSignalInput {
  energyId: string;
  energyLabel: string;
  firstStep: string;
  rescueReason: string;
  supportPlan: string;
  taskTitle?: string;
  breakdownSteps?: string[];
}

export interface AdhdSupportSignal extends AdhdSupportSignalInput {
  id: string;
  activityId: string;
  createdAt: string;
  needsCheckIn: boolean;
}

export interface AchievementBadgeInput {
  id: string;
  title: string;
  description: string;
  emoji: string;
}

export interface AchievementBadge extends AchievementBadgeInput {
  unlockedAt: string;
}

export interface AdhdEnergyPacingInput {
  energyId: string;
  energyLabel: string;
  emoji: string;
  taskMinutes: number;
  breakMinutes: number;
  recommendationMood: string;
  plan: string;
  firstStep: string;
}

export interface AdhdEnergyPacing extends AdhdEnergyPacingInput {
  checkedAt: string;
}

export interface DyslexiaReadingSessionInput {
  activityId?: 'dyslexia-read-aloud' | 'dyslexia-overlay-read';
  passageId: string;
  passageTitle: string;
  sentencesCompleted: number;
  totalSentences: number;
  wordsRead: number;
  speechRate?: number;
  comfortRating?: 'comfortable' | 'okay' | 'change';
  supportsUsed: string[];
}

export interface DyslexiaReadingSession extends DyslexiaReadingSessionInput {
  id: string;
  createdAt: string;
}

export interface DyslexiaReaderPreferencesInput {
  overlay: 'white' | 'cream' | 'blue' | 'mint' | 'rose';
  textSize: 'medium' | 'large' | 'extra-large';
  lineSpacing: 'comfortable' | 'wide' | 'extra-wide';
  lineWidth: 'narrow' | 'medium' | 'wide';
  readingRuler: boolean;
  dyslexiaFont: boolean;
}

export interface DyslexiaReaderPreferences extends DyslexiaReaderPreferencesInput {
  updatedAt: string;
}

interface ChildProgressState {
  completions: ActivityCompletion[];
  metricValues: NeuroMetricSnapshot[];
  adhdSupportSignals: AdhdSupportSignal[];
  achievementBadges: AchievementBadge[];
  adhdEnergyPacing: AdhdEnergyPacing | null;
  dyslexiaReadingSessions: DyslexiaReadingSession[];
  dyslexiaReaderPreferences: DyslexiaReaderPreferences | null;
  starsTotal: number;
  streakDays: number;
  lastActiveDate: string;
  todayMood: string | null;
  focusMinutesToday: number;

  completeActivity: (
    activityId: string,
    neuroId: string,
    starsEarned: number,
    durationMinutes: number,
  ) => void;
  isActivityCompletedToday: (activityId: string) => boolean;
  getTodayCompletions: () => ActivityCompletion[];
  addAdhdSupportSignal: (activityId: string, signal: AdhdSupportSignalInput) => void;
  getTodayAdhdSupportSignals: () => AdhdSupportSignal[];
  unlockAchievementBadge: (badge: AchievementBadgeInput) => void;
  setAdhdEnergyPacing: (pacing: AdhdEnergyPacingInput) => void;
  getTodayAdhdEnergyPacing: () => AdhdEnergyPacing | null;
  addDyslexiaReadingSession: (session: DyslexiaReadingSessionInput) => void;
  getTodayDyslexiaReadingSessions: () => DyslexiaReadingSession[];
  setDyslexiaReaderPreferences: (preferences: DyslexiaReaderPreferencesInput) => void;
  getNeuroMetricValue: (neuroId: string) => number;
  incrementNeuroMetric: (neuroId: string, amount?: number) => void;
  setTodayMood: (mood: string) => void;
  addFocusMinutes: (minutes: number) => void;
  getTodayProgress: (totalDailyActivities: number) => number;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

const createId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `adhd-signal-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const needsAdultCheckIn = (
  signals: AdhdSupportSignal[],
  signal: AdhdSupportSignalInput,
): boolean => {
  if (signal.energyId === 'overloaded') return true;

  const today = todayKey();
  const supportNeedCount = [...signals, { ...signal, createdAt: new Date().toISOString() }]
    .filter((item) => item.createdAt.startsWith(today))
    .filter(
      (item) =>
        item.energyId === 'scattered' ||
        item.energyId === 'overloaded' ||
        item.rescueReason === 'too many steps' ||
        item.rescueReason === 'do not know where to start',
    ).length;

  return supportNeedCount >= 2;
};

const bumpStreak = (lastActiveDate: string, streakDays: number): { streakDays: number; lastActiveDate: string } => {
  const today = todayKey();
  if (lastActiveDate === today) return { streakDays, lastActiveDate: today };

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  if (lastActiveDate === yesterdayKey) {
    return { streakDays: streakDays + 1, lastActiveDate: today };
  }
  return { streakDays: 1, lastActiveDate: today };
};

export const useChildProgressStore = create<ChildProgressState>()(
  persist(
    (set, get) => ({
      completions: [],
      metricValues: [],
      adhdSupportSignals: [],
      achievementBadges: [],
      adhdEnergyPacing: null,
      dyslexiaReadingSessions: [],
      dyslexiaReaderPreferences: null,
      starsTotal: 0,
      streakDays: 0,
      lastActiveDate: '',
      todayMood: null,
      focusMinutesToday: 0,

      completeActivity: (activityId, neuroId, starsEarned, durationMinutes) => {
        const today = todayKey();
        if (get().completions.some((c) => c.activityId === activityId && c.completedAt.startsWith(today))) {
          return;
        }

        const streakUpdate = bumpStreak(get().lastActiveDate, get().streakDays);

        set((state) => ({
          completions: [
            ...state.completions,
            {
              activityId,
              neuroId,
              completedAt: new Date().toISOString(),
              starsEarned,
              durationMinutes,
            },
          ],
          starsTotal: state.starsTotal + starsEarned,
          ...streakUpdate,
        }));

        get().incrementNeuroMetric(neuroId, 1);
      },

      isActivityCompletedToday: (activityId) => {
        const today = todayKey();
        return get().completions.some(
          (c) => c.activityId === activityId && c.completedAt.startsWith(today),
        );
      },

      getTodayCompletions: () => {
        const today = todayKey();
        return get().completions.filter((c) => c.completedAt.startsWith(today));
      },

      addAdhdSupportSignal: (activityId, signal) => {
        const now = new Date().toISOString();
        const entry: AdhdSupportSignal = {
          ...signal,
          id: createId(),
          activityId,
          createdAt: now,
          needsCheckIn: needsAdultCheckIn(get().adhdSupportSignals, signal),
        };

        set((state) => ({
          adhdSupportSignals: [entry, ...state.adhdSupportSignals].slice(0, 30),
        }));
      },

      getTodayAdhdSupportSignals: () => {
        const today = todayKey();
        return get().adhdSupportSignals.filter((signal) => signal.createdAt.startsWith(today));
      },

      unlockAchievementBadge: (badge) => {
        if (get().achievementBadges.some((savedBadge) => savedBadge.id === badge.id)) return;

        set((state) => ({
          achievementBadges: [
            { ...badge, unlockedAt: new Date().toISOString() },
            ...state.achievementBadges,
          ],
        }));
      },

      setAdhdEnergyPacing: (pacing) => {
        set({ adhdEnergyPacing: { ...pacing, checkedAt: new Date().toISOString() } });
      },

      getTodayAdhdEnergyPacing: () => {
        const pacing = get().adhdEnergyPacing;
        return pacing?.checkedAt.startsWith(todayKey()) ? pacing : null;
      },

      addDyslexiaReadingSession: (session) => {
        set((state) => ({
          dyslexiaReadingSessions: [
            {
              ...session,
              id: createId(),
              createdAt: new Date().toISOString(),
            },
            ...state.dyslexiaReadingSessions,
          ].slice(0, 30),
        }));
      },

      getTodayDyslexiaReadingSessions: () => {
        const today = todayKey();
        return get().dyslexiaReadingSessions.filter((session) => session.createdAt.startsWith(today));
      },

      setDyslexiaReaderPreferences: (preferences) => {
        set({
          dyslexiaReaderPreferences: {
            ...preferences,
            updatedAt: new Date().toISOString(),
          },
        });
      },

      getNeuroMetricValue: (neuroId) => {
        const today = todayKey();
        const entry = get().metricValues.find((m) => m.neuroId === neuroId && m.date === today);
        return entry?.value ?? 0;
      },

      incrementNeuroMetric: (neuroId, amount = 1) => {
        const today = todayKey();
        set((state) => {
          const existing = state.metricValues.find((m) => m.neuroId === neuroId && m.date === today);
          if (existing) {
            return {
              metricValues: state.metricValues.map((m) =>
                m.neuroId === neuroId && m.date === today
                  ? { ...m, value: m.value + amount }
                  : m,
              ),
            };
          }
          return {
            metricValues: [...state.metricValues, { neuroId, value: amount, date: today }],
          };
        });
      },

      setTodayMood: (mood) => set({ todayMood: mood }),

      addFocusMinutes: (minutes) => {
        const today = todayKey();
        const streakUpdate = bumpStreak(get().lastActiveDate, get().streakDays);
        set((state) => ({
          focusMinutesToday:
            state.lastActiveDate === today ? state.focusMinutesToday + minutes : minutes,
          ...streakUpdate,
        }));
        get().incrementNeuroMetric('adhd', minutes);
      },

      getTodayProgress: (totalDailyActivities) => {
        if (totalDailyActivities === 0) return 0;
        const completed = get().getTodayCompletions().length;
        return Math.min(100, Math.round((completed / totalDailyActivities) * 100));
      },
    }),
    { name: 'adaptbuddy-child-progress' },
  ),
);
