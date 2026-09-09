import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createChildScopedPersistScope,
  type ChildHydrationResult,
  type ChildScopeToken,
} from 'features/child/store/childScopedPersist';

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

export interface DyslexiaPhonicsSessionInput {
  completedSoundIds: string[];
  completedSounds: string[];
  wordsPractised: string[];
  totalSounds: number;
  listenCount: number;
  confidence: 'confident' | 'practised' | 'need-help';
  supportsUsed: string[];
}

export interface DyslexiaPhonicsSession extends DyslexiaPhonicsSessionInput {
  id: string;
  createdAt: string;
}

export type ChildProgressHydrationStatus = 'idle' | 'loading' | 'ready' | 'error';

interface ChildProgressState {
  ownerId: string | null;
  hydrationStatus: ChildProgressHydrationStatus;
  completions: ActivityCompletion[];
  metricValues: NeuroMetricSnapshot[];
  adhdSupportSignals: AdhdSupportSignal[];
  achievementBadges: AchievementBadge[];
  adhdEnergyPacing: AdhdEnergyPacing | null;
  dyslexiaReadingSessions: DyslexiaReadingSession[];
  dyslexiaReaderPreferences: DyslexiaReaderPreferences | null;
  dyslexiaPhonicsSessions: DyslexiaPhonicsSession[];
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
  addDyslexiaPhonicsSession: (session: DyslexiaPhonicsSessionInput) => void;
  getTodayDyslexiaPhonicsSessions: () => DyslexiaPhonicsSession[];
  getNeuroMetricValue: (neuroId: string) => number;
  incrementNeuroMetric: (neuroId: string, amount?: number) => void;
  setTodayMood: (mood: string) => void;
  addFocusMinutes: (minutes: number) => void;
  getTodayProgress: (totalDailyActivities: number) => number;
  resetForChild: (childId: string | null) => void;
  markReady: (childId: string) => void;
  markHydrationError: (childId: string) => void;
}

type ChildProgressData = Pick<
  ChildProgressState,
  | 'completions'
  | 'metricValues'
  | 'adhdSupportSignals'
  | 'achievementBadges'
  | 'adhdEnergyPacing'
  | 'dyslexiaReadingSessions'
  | 'dyslexiaReaderPreferences'
  | 'dyslexiaPhonicsSessions'
  | 'starsTotal'
  | 'streakDays'
  | 'lastActiveDate'
  | 'todayMood'
  | 'focusMinutesToday'
>;

type PersistedChildProgressState = Pick<ChildProgressState, 'ownerId'> & ChildProgressData;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isPersistedChildProgressState = (
  value: unknown,
): value is PersistedChildProgressState => {
  if (!isRecord(value)) return false;

  const completionsValid = Array.isArray(value.completions)
    && value.completions.every((item) =>
      isRecord(item)
      && typeof item.activityId === 'string'
      && typeof item.neuroId === 'string'
      && typeof item.completedAt === 'string'
      && isFiniteNumber(item.starsEarned)
      && isFiniteNumber(item.durationMinutes));

  const metricsValid = Array.isArray(value.metricValues)
    && value.metricValues.every((item) =>
      isRecord(item)
      && typeof item.neuroId === 'string'
      && isFiniteNumber(item.value)
      && typeof item.date === 'string');

  const supportSignalsValid = Array.isArray(value.adhdSupportSignals)
    && value.adhdSupportSignals.every((item) =>
      isRecord(item)
      && typeof item.id === 'string'
      && typeof item.activityId === 'string'
      && typeof item.energyId === 'string'
      && typeof item.energyLabel === 'string'
      && typeof item.firstStep === 'string'
      && typeof item.rescueReason === 'string'
      && typeof item.supportPlan === 'string'
      && typeof item.createdAt === 'string'
      && typeof item.needsCheckIn === 'boolean'
      && (item.taskTitle === undefined || typeof item.taskTitle === 'string')
      && (item.breakdownSteps === undefined || isStringArray(item.breakdownSteps)));

  const badgesValid = Array.isArray(value.achievementBadges)
    && value.achievementBadges.every((item) =>
      isRecord(item)
      && typeof item.id === 'string'
      && typeof item.title === 'string'
      && typeof item.description === 'string'
      && typeof item.emoji === 'string'
      && typeof item.unlockedAt === 'string');

  const pacing = value.adhdEnergyPacing;
  const pacingValid = pacing === null || (
    isRecord(pacing)
    && typeof pacing.energyId === 'string'
    && typeof pacing.energyLabel === 'string'
    && typeof pacing.emoji === 'string'
    && isFiniteNumber(pacing.taskMinutes)
    && isFiniteNumber(pacing.breakMinutes)
    && typeof pacing.recommendationMood === 'string'
    && typeof pacing.plan === 'string'
    && typeof pacing.firstStep === 'string'
    && typeof pacing.checkedAt === 'string'
  );

  const readingSessionsValid = Array.isArray(value.dyslexiaReadingSessions)
    && value.dyslexiaReadingSessions.every((item) =>
      isRecord(item)
      && typeof item.id === 'string'
      && typeof item.passageId === 'string'
      && typeof item.passageTitle === 'string'
      && isFiniteNumber(item.sentencesCompleted)
      && isFiniteNumber(item.totalSentences)
      && isFiniteNumber(item.wordsRead)
      && typeof item.createdAt === 'string'
      && (item.activityId === undefined || typeof item.activityId === 'string')
      && (item.speechRate === undefined || isFiniteNumber(item.speechRate))
      && (item.comfortRating === undefined || typeof item.comfortRating === 'string')
      && isStringArray(item.supportsUsed));

  const preferences = value.dyslexiaReaderPreferences;
  const preferencesValid = preferences === null || (
    isRecord(preferences)
    && typeof preferences.overlay === 'string'
    && typeof preferences.textSize === 'string'
    && typeof preferences.lineSpacing === 'string'
    && typeof preferences.lineWidth === 'string'
    && typeof preferences.readingRuler === 'boolean'
    && typeof preferences.dyslexiaFont === 'boolean'
    && typeof preferences.updatedAt === 'string'
  );

  const phonicsSessionsValid = Array.isArray(value.dyslexiaPhonicsSessions)
    && value.dyslexiaPhonicsSessions.every((item) =>
      isRecord(item)
      && typeof item.id === 'string'
      && isStringArray(item.completedSoundIds)
      && isStringArray(item.completedSounds)
      && isStringArray(item.wordsPractised)
      && isFiniteNumber(item.totalSounds)
      && isFiniteNumber(item.listenCount)
      && typeof item.confidence === 'string'
      && isStringArray(item.supportsUsed)
      && typeof item.createdAt === 'string');

  return (
    typeof value.ownerId === 'string'
    && completionsValid
    && metricsValid
    && supportSignalsValid
    && badgesValid
    && pacingValid
    && readingSessionsValid
    && preferencesValid
    && phonicsSessionsValid
    && isFiniteNumber(value.starsTotal)
    && isFiniteNumber(value.streakDays)
    && typeof value.lastActiveDate === 'string'
    && (value.todayMood === null || typeof value.todayMood === 'string')
    && isFiniteNumber(value.focusMinutesToday)
  );
};

const createInitialChildProgressData = (): ChildProgressData => ({
  completions: [],
  metricValues: [],
  adhdSupportSignals: [],
  achievementBadges: [],
  adhdEnergyPacing: null,
  dyslexiaReadingSessions: [],
  dyslexiaReaderPreferences: null,
  dyslexiaPhonicsSessions: [],
  starsTotal: 0,
  streakDays: 0,
  lastActiveDate: '',
  todayMood: null,
  focusMinutesToday: 0,
});

const childProgressPersistScope = createChildScopedPersistScope<PersistedChildProgressState>(
  'adaptbuddy-child-progress',
);

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
      ownerId: null,
      hydrationStatus: 'idle',
      ...createInitialChildProgressData(),

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

      addDyslexiaPhonicsSession: (session) => {
        set((state) => ({
          dyslexiaPhonicsSessions: [
            {
              ...session,
              id: createId(),
              createdAt: new Date().toISOString(),
            },
            ...state.dyslexiaPhonicsSessions,
          ].slice(0, 30),
        }));
      },

      getTodayDyslexiaPhonicsSessions: () => {
        const today = todayKey();
        return get().dyslexiaPhonicsSessions.filter((session) => session.createdAt.startsWith(today));
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

      resetForChild: (childId) =>
        set({
          ownerId: childId,
          hydrationStatus: childId ? 'loading' : 'idle',
          ...createInitialChildProgressData(),
        }),

      markReady: (childId) =>
        set((state) => state.ownerId === childId ? { hydrationStatus: 'ready' } : {}),

      markHydrationError: (childId) =>
        set((state) => state.ownerId === childId ? { hydrationStatus: 'error' } : {}),
    }),
    {
      name: 'adaptbuddy-child-progress-v2',
      storage: childProgressPersistScope.storage,
      skipHydration: true,
      version: 2,
      partialize: (state): PersistedChildProgressState => ({
        ownerId: state.ownerId,
        completions: state.completions,
        metricValues: state.metricValues,
        adhdSupportSignals: state.adhdSupportSignals,
        achievementBadges: state.achievementBadges,
        adhdEnergyPacing: state.adhdEnergyPacing,
        dyslexiaReadingSessions: state.dyslexiaReadingSessions,
        dyslexiaReaderPreferences: state.dyslexiaReaderPreferences,
        dyslexiaPhonicsSessions: state.dyslexiaPhonicsSessions,
        starsTotal: state.starsTotal,
        streakDays: state.streakDays,
        lastActiveDate: state.lastActiveDate,
        todayMood: state.todayMood,
        focusMinutesToday: state.focusMinutesToday,
      }),
      merge: (persistedState, currentState) => {
        if (persistedState === undefined) return currentState;
        if (!isPersistedChildProgressState(persistedState)) {
          throw new Error('Invalid child progress state.');
        }
        const persisted = persistedState;
        if (persisted.ownerId !== currentState.ownerId) {
          throw new Error('Mismatched child progress owner.');
        }
        return {
          ...currentState,
          ...persisted,
          ownerId: currentState.ownerId,
          hydrationStatus: currentState.hydrationStatus,
        };
      },
    },
  ),
);

export const beginChildProgressScope = (childId: string): ChildScopeToken => {
  const token = childProgressPersistScope.begin(childId);
  useChildProgressStore.getState().resetForChild(token.childId);
  return token;
};

export const hydrateChildProgressScope = async (
  token: ChildScopeToken,
): Promise<ChildHydrationResult> => {
  if (!childProgressPersistScope.isCurrent(token)) return 'stale';
  await useChildProgressStore.persist.rehydrate();
  if (!childProgressPersistScope.isCurrent(token)) return 'stale';
  if (!useChildProgressStore.persist.hasHydrated()) {
    useChildProgressStore.getState().markHydrationError(token.childId);
    return 'error';
  }
  useChildProgressStore.getState().markReady(token.childId);
  if (!childProgressPersistScope.enable(token)) return 'stale';
  return 'ready';
};

export const unbindChildProgressScope = (): void => {
  childProgressPersistScope.unbind();
  useChildProgressStore.getState().resetForChild(null);
};

export const getChildProgressStorageKey = (childId: string): string =>
  childProgressPersistScope.storageKey(childId);
