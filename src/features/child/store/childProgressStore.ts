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

interface ChildProgressState {
  completions: ActivityCompletion[];
  metricValues: NeuroMetricSnapshot[];
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
  getNeuroMetricValue: (neuroId: string) => number;
  incrementNeuroMetric: (neuroId: string, amount?: number) => void;
  setTodayMood: (mood: string) => void;
  addFocusMinutes: (minutes: number) => void;
  getTodayProgress: (totalDailyActivities: number) => number;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

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
