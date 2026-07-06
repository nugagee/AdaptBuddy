import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  GripVertical,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import { getSupabaseClient, isSupabaseConfigured } from 'services/supabase/client';
import { saveJournalEntry } from 'services/supabase/autismProfileService';
import type { EmotionAnalysis, EmotionType } from 'types/ai.types';

export interface NowNextLaterActivity {
  id: string;
  label: string;
  emoji: string;
  durationMinutes?: number;
  completed: boolean;
}

export interface DailySchedule {
  id: string;
  childId: string;
  date: string;
  activities: NowNextLaterActivity[];
  createdAt: string;
  updatedAt: string;
}

interface DailyScheduleRow {
  id: string;
  child_id: string;
  date: string;
  activities: NowNextLaterActivity[];
  created_at: string;
  updated_at: string;
}

interface NowNextLaterBoardProps {
  childId: string;
  mode?: 'child' | 'adult';
  editable?: boolean;
  compact?: boolean;
  className?: string;
  onActivityComplete?: (activity: NowNextLaterActivity) => void;
  onScheduleChange?: (schedule: DailySchedule) => void;
}

type TaskMood = 'happy' | 'calm' | 'anxious';

const taskMoodOptions: Array<{
  value: TaskMood;
  label: string;
  emoji: string;
  helper: string;
}> = [
  { value: 'happy', label: 'Great', emoji: '✨', helper: 'That felt good' },
  { value: 'calm', label: 'Okay', emoji: '😌', helper: 'I feel steady' },
  { value: 'anxious', label: 'Worried', emoji: '😟', helper: 'I need support' },
];

const ACTIVITY_LIBRARY: Array<Pick<NowNextLaterActivity, 'emoji' | 'label' | 'durationMinutes'>> = [
  { emoji: '🌅', label: 'Morning routine', durationMinutes: 10 },
  { emoji: '🍽️', label: 'Breakfast', durationMinutes: 15 },
  { emoji: '📚', label: 'Reading', durationMinutes: 15 },
  { emoji: '✏️', label: 'Writing', durationMinutes: 10 },
  { emoji: '🧮', label: 'Maths', durationMinutes: 12 },
  { emoji: '🎨', label: 'Art', durationMinutes: 20 },
  { emoji: '🎵', label: 'Music', durationMinutes: 15 },
  { emoji: '🏃', label: 'Movement break', durationMinutes: 5 },
  { emoji: '🧘', label: 'Calm time', durationMinutes: 5 },
  { emoji: '📝', label: 'Homework', durationMinutes: 20 },
  { emoji: '🧹', label: 'Tidy up', durationMinutes: 8 },
  { emoji: '📖', label: 'Story time', durationMinutes: 10 },
];

const slotStyles = [
  {
    label: 'Now',
    eyebrow: 'Start here',
    wrapper: 'border-emerald-200 bg-emerald-50/90 text-emerald-950',
    badge: 'bg-emerald-600 text-white',
    icon: Clock,
  },
  {
    label: 'Next',
    eyebrow: 'Then this',
    wrapper: 'border-sky-200 bg-sky-50/90 text-sky-950',
    badge: 'bg-sky-600 text-white',
    icon: Sparkles,
  },
  {
    label: 'Later',
    eyebrow: 'After that',
    wrapper: 'border-violet-200 bg-violet-50/90 text-violet-950',
    badge: 'bg-violet-600 text-white',
    icon: CalendarDays,
  },
] as const;

const createId = (prefix = 'activity') => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const getLocalDateKey = () => {
  const now = new Date();
  const localTime = now.getTime() - now.getTimezoneOffset() * 60000;
  return new Date(localTime).toISOString().slice(0, 10);
};

const parseDateKey = (date: string) => new Date(`${date}T12:00:00`);

const toDateKey = (date: Date) => {
  const localTime = date.getTime() - date.getTimezoneOffset() * 60000;
  return new Date(localTime).toISOString().slice(0, 10);
};

const getWeekDates = (date: string) => {
  const selected = parseDateKey(date);
  const weekday = selected.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = new Date(selected);
  monday.setDate(selected.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const next = new Date(monday);
    next.setDate(monday.getDate() + index);
    return toDateKey(next);
  });
};

const shiftDateKey = (date: string, days: number) => {
  const next = parseDateKey(date);
  next.setDate(next.getDate() + days);
  return toDateKey(next);
};

const storageKey = (childId: string, date: string) =>
  `adaptbuddy-now-next-later:${childId}:${date}`;

const taskMoodStorageKey = (childId: string) =>
  `adaptbuddy-now-next-later-moods:${childId}`;

const getDefaultSchedule = (childId: string, date = getLocalDateKey()): DailySchedule => {
  const now = new Date().toISOString();
  return {
    id: createId('schedule'),
    childId,
    date,
    activities: [
      { id: createId(), emoji: '🌅', label: 'Morning routine', durationMinutes: 10, completed: false },
      { id: createId(), emoji: '📚', label: 'Learning time', durationMinutes: 15, completed: false },
      { id: createId(), emoji: '🧘', label: 'Calm break', durationMinutes: 5, completed: false },
    ],
    createdAt: now,
    updatedAt: now,
  };
};

const normalizeActivity = (
  activity: Partial<NowNextLaterActivity>,
  fallback: NowNextLaterActivity,
): NowNextLaterActivity => ({
  id: activity.id ?? fallback.id,
  emoji: activity.emoji || fallback.emoji,
  label: activity.label || fallback.label,
  durationMinutes:
    typeof activity.durationMinutes === 'number' && Number.isFinite(activity.durationMinutes)
      ? activity.durationMinutes
      : fallback.durationMinutes,
  completed: activity.completed === true,
});

const normalizeSchedule = (schedule: DailySchedule): DailySchedule => {
  const fallback = getDefaultSchedule(schedule.childId, schedule.date);
  const activities = Array.isArray(schedule.activities)
    ? schedule.activities
        .map((activity, index) => normalizeActivity(activity, fallback.activities[index] ?? fallback.activities[0]))
        .filter((activity) => activity.label.trim().length > 0)
    : fallback.activities;

  return {
    ...schedule,
    activities: activities.length > 0 ? activities : fallback.activities,
  };
};

const mapRowToSchedule = (row: DailyScheduleRow): DailySchedule =>
  normalizeSchedule({
    id: row.id,
    childId: row.child_id,
    date: row.date,
    activities: row.activities ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });

const readLocalSchedule = (childId: string, date: string): DailySchedule | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(childId, date));
    return raw ? normalizeSchedule(JSON.parse(raw) as DailySchedule) : null;
  } catch {
    window.localStorage.removeItem(storageKey(childId, date));
    return null;
  }
};

const writeLocalSchedule = (schedule: DailySchedule) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey(schedule.childId, schedule.date), JSON.stringify(schedule));
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${date}T12:00:00`));

const formatDuration = (minutes?: number) => {
  if (!minutes) return '';
  return `${minutes} min`;
};

const formatWeekday = (date: string) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(parseDateKey(date));

const formatDayNumber = (date: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric' }).format(parseDateKey(date));

const formatCountdown = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
};

interface TaskMoodLogEntry {
  id: string;
  childId: string;
  activityId: string;
  activityLabel: string;
  mood: TaskMood;
  note: string;
  createdAt: string;
}

const writeLocalTaskMoodLog = (entry: TaskMoodLogEntry) => {
  if (typeof window === 'undefined') return;

  try {
    const raw = window.localStorage.getItem(taskMoodStorageKey(entry.childId));
    const existing = raw ? (JSON.parse(raw) as TaskMoodLogEntry[]) : [];
    const next = [entry, ...existing].slice(0, 60);
    window.localStorage.setItem(taskMoodStorageKey(entry.childId), JSON.stringify(next));
  } catch {
    window.localStorage.setItem(taskMoodStorageKey(entry.childId), JSON.stringify([entry]));
  }
};

const buildTaskMoodAnalysis = (
  activity: NowNextLaterActivity,
  mood: TaskMood,
  note: string,
): EmotionAnalysis => {
  const hasWorry = mood === 'anxious' || note.trim().length > 0;

  return {
    emotion: mood as EmotionType,
    confidence: hasWorry ? 0.78 : 0.72,
    keywords: ['task-completion', activity.label, mood].filter(Boolean),
    riskLevel: hasWorry ? 'medium' : 'low',
    sentimentScore: mood === 'happy' ? 0.86 : mood === 'calm' ? 0.72 : 0.36,
    timestamp: new Date(),
  };
};

const NowNextLaterBoard: React.FC<NowNextLaterBoardProps> = ({
  childId,
  mode,
  editable,
  compact = false,
  className = '',
  onActivityComplete,
  onScheduleChange,
}) => {
  const { profile, isGuest } = useAuth();
  const resolvedMode =
    mode ??
    (profile?.role === 'parent' || profile?.role === 'teacher' || profile?.role === 'admin'
      ? 'adult'
      : 'child');
  const canEdit = editable ?? resolvedMode === 'adult';
  const canSyncRemote = isSupabaseConfigured && !isGuest && !childId.startsWith('guest-');

  const [date, setDate] = useState(getLocalDateKey);
  const [schedule, setSchedule] = useState<DailySchedule>(() => {
    const today = getLocalDateKey();
    return readLocalSchedule(childId, today) ?? getDefaultSchedule(childId, today);
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editing, setEditing] = useState(canEdit && resolvedMode === 'adult');
  const [error, setError] = useState('');
  const [syncMessage, setSyncMessage] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customEmoji, setCustomEmoji] = useState('⭐');
  const [customDuration, setCustomDuration] = useState('');
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [celebration, setCelebration] = useState('');
  const [completedActivityForMood, setCompletedActivityForMood] =
    useState<NowNextLaterActivity | null>(null);
  const [selectedTaskMood, setSelectedTaskMood] = useState<TaskMood | ''>('');
  const [worryNote, setWorryNote] = useState('');
  const [moodSaving, setMoodSaving] = useState(false);
  const [moodMessage, setMoodMessage] = useState('');
  const [timerActivityId, setTimerActivityId] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const completedCount = schedule.activities.filter((activity) => activity.completed).length;
  const progress =
    schedule.activities.length > 0
      ? Math.round((completedCount / schedule.activities.length) * 100)
      : 0;

  const visibleActivities = useMemo(() => {
    const pending = schedule.activities.filter((activity) => !activity.completed);
    return slotStyles.map((_, index) => pending[index] ?? null);
  }, [schedule.activities]);

  const weekDates = useMemo(() => getWeekDates(date), [date]);
  const todayKey = getLocalDateKey();
  const isToday = date === todayKey;

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError('');

    const localSchedule = readLocalSchedule(childId, date) ?? getDefaultSchedule(childId, date);
    setSchedule(localSchedule);

    if (!canSyncRemote) {
      setSyncMessage('Saved for this device');
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await getSupabaseClient()
        .from('daily_schedules')
        .select('id, child_id, date, activities, created_at, updated_at')
        .eq('child_id', childId)
        .eq('date', date)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        const remoteSchedule = mapRowToSchedule(data as DailyScheduleRow);
        writeLocalSchedule(remoteSchedule);
        setSchedule(remoteSchedule);
        setSyncMessage('Synced');
      } else {
        setSyncMessage('Ready');
      }
    } catch (loadError) {
      console.warn('Daily schedule sync unavailable:', loadError);
      setSyncMessage('Saved locally');
    } finally {
      setLoading(false);
    }
  }, [canSyncRemote, childId, date]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const persistRemote = useCallback(
    async (nextSchedule: DailySchedule, showSaving = false) => {
      writeLocalSchedule(nextSchedule);
      onScheduleChange?.(nextSchedule);

      if (!canSyncRemote) {
        setDirty(false);
        setSyncMessage('Saved for this device');
        return;
      }

      if (showSaving) setSaving(true);
      try {
        const { error: saveError } = await getSupabaseClient()
          .from('daily_schedules')
          .upsert(
            {
              id: nextSchedule.id,
              child_id: nextSchedule.childId,
              date: nextSchedule.date,
              activities: nextSchedule.activities,
              updated_at: nextSchedule.updatedAt,
            },
            { onConflict: 'child_id,date' },
          );

        if (saveError) throw saveError;
        setDirty(false);
        setSyncMessage('Saved');
      } catch (saveError) {
        console.warn('Daily schedule saved locally only:', saveError);
        setSyncMessage('Saved locally');
      } finally {
        if (showSaving) setSaving(false);
      }
    },
    [canSyncRemote, onScheduleChange],
  );

  useEffect(() => {
    if (!dirty || loading) return undefined;
    const timer = window.setTimeout(() => {
      void persistRemote(schedule);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [dirty, loading, persistRemote, schedule]);

  useEffect(() => {
    if (!timerActivityId || remainingSeconds <= 0) return undefined;

    const countdown = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(countdown);
  }, [remainingSeconds, timerActivityId]);

  useEffect(() => {
    if (!timerActivityId || remainingSeconds !== 0) return undefined;

    setTimerActivityId(null);
    setCelebration('Timer finished. Ready for the next step.');
    const hideMessage = window.setTimeout(() => setCelebration(''), 2600);
    return () => window.clearTimeout(hideMessage);
  }, [remainingSeconds, timerActivityId]);

  const selectScheduleDate = useCallback(
    (nextDate: string) => {
      if (nextDate === date) return;

      setDate(nextDate);
      setSchedule(readLocalSchedule(childId, nextDate) ?? getDefaultSchedule(childId, nextDate));
      setDirty(false);
      setError('');
      setSyncMessage('');
      setCompletedActivityForMood(null);
      setSelectedTaskMood('');
      setWorryNote('');
      setMoodMessage('');
      setTimerActivityId(null);
      setRemainingSeconds(0);
    },
    [childId, date],
  );

  const commitSchedule = useCallback(
    (activities: NowNextLaterActivity[]) => {
      const nextSchedule = normalizeSchedule({
        ...schedule,
        activities,
        updatedAt: new Date().toISOString(),
      });
      setSchedule(nextSchedule);
      writeLocalSchedule(nextSchedule);
      onScheduleChange?.(nextSchedule);
      setDirty(true);
    },
    [onScheduleChange, schedule],
  );

  const addActivity = (activity: Pick<NowNextLaterActivity, 'emoji' | 'label' | 'durationMinutes'>) => {
    commitSchedule([
      ...schedule.activities,
      {
        id: createId(),
        emoji: activity.emoji,
        label: activity.label,
        durationMinutes: activity.durationMinutes,
        completed: false,
      },
    ]);
  };

  const addCustomActivity = () => {
    const label = customLabel.trim();
    if (!label) return;
    const parsedDuration = Number(customDuration);
    addActivity({
      emoji: customEmoji.trim() || '⭐',
      label,
      durationMinutes:
        Number.isFinite(parsedDuration) && parsedDuration > 0
          ? Math.min(180, Math.round(parsedDuration))
          : undefined,
    });
    setCustomLabel('');
    setCustomEmoji('⭐');
    setCustomDuration('');
    setShowAddTaskForm(false);
  };

  const updateActivity = (id: string, updates: Partial<NowNextLaterActivity>) => {
    commitSchedule(
      schedule.activities.map((activity) =>
        activity.id === id ? normalizeActivity({ ...activity, ...updates }, activity) : activity,
      ),
    );
  };

  const removeActivity = (id: string) => {
    commitSchedule(schedule.activities.filter((activity) => activity.id !== id));
  };

  const moveActivity = (id: string, direction: -1 | 1) => {
    const index = schedule.activities.findIndex((activity) => activity.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= schedule.activities.length) return;
    const next = [...schedule.activities];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    commitSchedule(next);
  };

  const dropActivity = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const fromIndex = schedule.activities.findIndex((activity) => activity.id === draggedId);
    const toIndex = schedule.activities.findIndex((activity) => activity.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...schedule.activities];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    commitSchedule(next);
    setDraggedId(null);
  };

  const completeActivity = (activity: NowNextLaterActivity) => {
    if (timerActivityId === activity.id) {
      setTimerActivityId(null);
      setRemainingSeconds(0);
    }
    updateActivity(activity.id, { completed: true });
    onActivityComplete?.(activity);
    setCelebration(`Great job. ${activity.label} is done.`);
    if (resolvedMode === 'child') {
      setCompletedActivityForMood(activity);
      setSelectedTaskMood('');
      setWorryNote('');
      setMoodMessage('');
    }
    window.setTimeout(() => setCelebration(''), 2600);
  };

  const startTaskTimer = (activity: NowNextLaterActivity) => {
    const seconds = Math.max(60, (activity.durationMinutes ?? 5) * 60);
    setRemainingSeconds(seconds);
    setTimerActivityId(activity.id);
  };

  const pauseTaskTimer = () => {
    setTimerActivityId(null);
  };

  const logTaskMood = useCallback(
    async (mood: TaskMood, note = '') => {
      if (!completedActivityForMood) return;

      const cleanNote = note.trim();
      const text = cleanNote
        ? `After finishing ${completedActivityForMood.label}, I felt ${mood}. Worry note: ${cleanNote}`
        : `After finishing ${completedActivityForMood.label}, I felt ${mood}.`;
      const analysis = buildTaskMoodAnalysis(completedActivityForMood, mood, cleanNote);

      setMoodSaving(true);
      setMoodMessage('');
      writeLocalTaskMoodLog({
        id: createId('task-mood'),
        childId,
        activityId: completedActivityForMood.id,
        activityLabel: completedActivityForMood.label,
        mood,
        note: cleanNote,
        createdAt: new Date().toISOString(),
      });

      try {
        if (canSyncRemote) {
          await saveJournalEntry({
            childId,
            emotion: mood,
            text,
            analysis,
            isShared: true,
          });
        }
        setMoodMessage('Mood check-in saved.');
      } catch (saveError) {
        console.warn('Task mood check-in saved locally only:', saveError);
        setMoodMessage('Saved on this device. Sync will catch up when available.');
      } finally {
        setMoodSaving(false);
        setCompletedActivityForMood(null);
        setSelectedTaskMood('');
        setWorryNote('');
        window.setTimeout(() => setMoodMessage(''), 3500);
      }
    },
    [canSyncRemote, childId, completedActivityForMood],
  );

  const resetDay = () => {
    commitSchedule(schedule.activities.map((activity) => ({ ...activity, completed: false })));
    setCompletedActivityForMood(null);
    setSelectedTaskMood('');
    setWorryNote('');
    setTimerActivityId(null);
    setRemainingSeconds(0);
  };

  if (loading) {
    return (
      <section className={`rounded-3xl border border-white/70 bg-white/85 p-6 shadow-soft dark:border-gray-800 dark:bg-gray-900/75 ${className}`}>
        <div className="flex min-h-48 items-center justify-center text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
          Loading today's plan...
        </div>
      </section>
    );
  }

  const allDone = schedule.activities.length > 0 && completedCount === schedule.activities.length;

  return (
    <section
      className={`rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-5 shadow-card dark:border-gray-800 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 sm:p-6 ${className}`}
      aria-label="Now Next Later board"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-adapt-indigo dark:text-adapt-cyan">
            Now / Next / Later
          </p>
          <h2 className="mt-2 text-2xl font-black text-adapt-navy dark:text-gray-100">
            {isToday ? "Today's visual plan" : 'Visual plan'}
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-gray-400">
            {formatDate(date)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {syncMessage && (
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-slate-500 shadow-sm dark:bg-gray-800 dark:text-gray-300">
              {syncMessage}
            </span>
          )}
          <button
            type="button"
            onClick={loadSchedule}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/80 bg-white text-slate-600 shadow-sm hover:text-adapt-indigo dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
            aria-label="Refresh plan"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => setEditing((current) => !current)}
              className="rounded-2xl bg-adapt-navy px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-adapt-purple"
            >
              {editing ? 'View board' : 'Edit plan'}
            </button>
          )}
        </div>
      </div>

      {canEdit && resolvedMode === 'adult' && (
        <div className="mt-5 rounded-3xl border border-white/80 bg-white/80 p-4 shadow-soft dark:border-gray-800 dark:bg-gray-900/75">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-black text-adapt-navy dark:text-gray-100">Weekly planner</h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">
                Pick a day, then customise the Now / Next / Later plan.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => selectScheduleDate(shiftDateKey(date, -7))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-600 shadow-sm hover:border-adapt-indigo/30 hover:text-adapt-indigo dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                aria-label="Previous week"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              {!isToday && (
                <button
                  type="button"
                  onClick={() => selectScheduleDate(todayKey)}
                  className="rounded-full border border-adapt-indigo/20 bg-adapt-indigo/10 px-3 py-1.5 text-xs font-black text-adapt-indigo hover:bg-adapt-indigo/15 dark:text-adapt-cyan"
                >
                  Today
                </button>
              )}
              <button
                type="button"
                onClick={() => selectScheduleDate(shiftDateKey(date, 7))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-600 shadow-sm hover:border-adapt-indigo/30 hover:text-adapt-indigo dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                aria-label="Next week"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-2">
            {weekDates.map((weekDate) => {
              const active = weekDate === date;
              return (
                <button
                  key={weekDate}
                  type="button"
                  onClick={() => selectScheduleDate(weekDate)}
                  className={`min-h-16 rounded-2xl border px-2 py-2 text-center transition ${
                    active
                      ? 'border-adapt-indigo bg-adapt-indigo text-white shadow-md'
                      : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-adapt-indigo/30 hover:bg-adapt-indigo/5 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
                  }`}
                  aria-pressed={active}
                >
                  <span className="block text-[0.65rem] font-black uppercase tracking-wide">
                    {formatWeekday(weekDate)}
                  </span>
                  <span className="block text-lg font-black">{formatDayNumber(weekDate)}</span>
                  {weekDate === todayKey && (
                    <span className={`block text-[0.6rem] font-black ${active ? 'text-white/85' : 'text-adapt-teal'}`}>
                      Today
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wide text-slate-500">
          <span>{completedCount} of {schedule.activities.length} done</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-adapt-teal to-adapt-indigo transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
          <AlertCircle className="h-4 w-4" aria-hidden />
          {error}
        </p>
      )}

      {celebration && (
        <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-black text-emerald-800">
          <Sparkles className="mr-1 inline h-4 w-4" aria-hidden />
          {celebration}
        </p>
      )}

      {moodMessage && (
        <p className="mt-4 rounded-2xl bg-sky-50 px-4 py-3 text-center text-sm font-black text-sky-800">
          {moodMessage}
        </p>
      )}

      {completedActivityForMood && !editing && (
        <div className="mt-4 rounded-3xl border border-amber-100 bg-amber-50/80 p-4 text-amber-950 shadow-sm dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                Quick check-in
              </p>
              <h3 className="mt-1 text-lg font-black">How did that feel?</h3>
              <p className="text-sm font-semibold opacity-80">
                This can help your trusted adults understand your day.
              </p>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-1 text-sm font-black text-amber-800 shadow-sm dark:bg-gray-900 dark:text-amber-200">
              {completedActivityForMood.emoji} {completedActivityForMood.label}
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {taskMoodOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (option.value === 'anxious') {
                    setSelectedTaskMood(option.value);
                    return;
                  }
                  void logTaskMood(option.value);
                }}
                disabled={moodSaving}
                className={`rounded-2xl border bg-white/85 p-3 text-left shadow-sm transition hover:-translate-y-0.5 dark:bg-gray-900 ${
                  selectedTaskMood === option.value
                    ? 'border-amber-500 ring-2 ring-amber-200'
                    : 'border-white/80 dark:border-gray-700'
                }`}
              >
                <span className="text-2xl" aria-hidden>{option.emoji}</span>
                <span className="ml-2 text-sm font-black">{option.label}</span>
                <span className="mt-1 block text-xs font-semibold text-slate-500 dark:text-gray-400">
                  {option.helper}
                </span>
              </button>
            ))}
          </div>

          {selectedTaskMood === 'anxious' && (
            <div className="mt-4 rounded-2xl bg-white/80 p-3 dark:bg-gray-900/80">
              <label className="text-sm font-black text-adapt-navy dark:text-gray-100" htmlFor="task-worry-note">
                Want to write the worry?
              </label>
              <textarea
                id="task-worry-note"
                value={worryNote}
                onChange={(event) => setWorryNote(event.target.value)}
                rows={3}
                placeholder="What felt hard or worrying?"
                className="mt-2 w-full rounded-2xl border border-amber-100 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-950"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void logTaskMood('anxious', worryNote)}
                  disabled={moodSaving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-adapt-navy px-4 py-2 text-sm font-black text-white disabled:opacity-60"
                >
                  {moodSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Save worry note
                </button>
                <button
                  type="button"
                  onClick={() => void logTaskMood('anxious')}
                  disabled={moodSaving}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  Skip note
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {allDone && !editing ? (
        <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center text-emerald-900">
          <Sparkles className="mx-auto h-9 w-9" aria-hidden />
          <h3 className="mt-2 text-xl font-black">All done for now.</h3>
          <p className="mt-1 text-sm font-semibold">Your plan is complete. You can rest or choose a reward.</p>
          <button
            type="button"
            onClick={resetDay}
            className="mt-4 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
          >
            Reset today
          </button>
        </div>
      ) : (
        <div className={`mt-5 grid gap-4 ${compact ? 'lg:grid-cols-3' : 'md:grid-cols-3'}`}>
          {visibleActivities.map((activity, index) => {
            const slot = slotStyles[index];
            const Icon = slot.icon;
            const activeTimer = Boolean(activity && timerActivityId === activity.id);
            const timerTotalSeconds = Math.max(60, (activity?.durationMinutes ?? 5) * 60);
            const timerProgress = activeTimer
              ? Math.round(((timerTotalSeconds - remainingSeconds) / timerTotalSeconds) * 100)
              : 0;
            return (
              <article
                key={slot.label}
                className={`min-h-48 rounded-3xl border-2 p-4 shadow-sm ${slot.wrapper}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-black ${slot.badge}`}>
                    <Icon className="h-4 w-4" aria-hidden />
                    {slot.label}
                  </span>
                  <span className="text-xs font-black uppercase tracking-wide opacity-70">
                    {slot.eyebrow}
                  </span>
                </div>

                {activity ? (
                  <div className="mt-5">
                    <div className="text-5xl" aria-hidden>
                      {activity.emoji}
                    </div>
                    <h3 className="mt-4 text-2xl font-black leading-tight">
                      {activity.label}
                    </h3>
                    {activity.durationMinutes && (
                      <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/70 px-3 py-1 text-xs font-black text-slate-600">
                        <Clock className="h-3.5 w-3.5" aria-hidden />
                        {formatDuration(activity.durationMinutes)}
                      </p>
                    )}
                    {index === 0 && activity.durationMinutes && (
                      <div className="mt-3 rounded-2xl bg-white/70 p-3 text-slate-700 shadow-sm dark:bg-gray-900/60 dark:text-gray-200">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-black uppercase tracking-wide">
                            {activeTimer ? formatCountdown(remainingSeconds) : `${activity.durationMinutes} min timer`}
                          </span>
                          <button
                            type="button"
                            onClick={() => (activeTimer ? pauseTaskTimer() : startTaskTimer(activity))}
                            className="inline-flex items-center gap-1 rounded-full bg-adapt-indigo px-3 py-1.5 text-xs font-black text-white"
                          >
                            {activeTimer ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
                            {activeTimer ? 'Pause' : 'Start'}
                          </button>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200/80 dark:bg-gray-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-adapt-teal to-adapt-indigo transition-[width]"
                            style={{ width: `${timerProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {index === 0 && (
                      <button
                        type="button"
                        onClick={() => completeActivity(activity)}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-adapt-purple"
                      >
                        <Check className="h-4 w-4" aria-hidden />
                        Done
                      </button>
                    )}
                  </div>
                ) : (
                  canEdit ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(true);
                        setShowAddTaskForm(true);
                      }}
                      className="mt-8 flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5 text-center text-sm font-black text-slate-600 transition hover:border-adapt-indigo/40 hover:bg-white dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-200"
                    >
                      <Plus className="mb-2 h-5 w-5" aria-hidden />
                      Add task
                    </button>
                  ) : (
                    <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-5 text-center text-sm font-bold text-slate-500">
                      Nothing here yet
                    </div>
                  )
                )}
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-soft dark:border-gray-800 dark:bg-gray-900/80">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-black text-adapt-navy dark:text-gray-100">Schedule builder</h3>
              <button
                type="button"
                onClick={() => void persistRemote(schedule, true)}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-2xl bg-adapt-indigo px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
                Save
              </button>
            </div>

            <ol className="mt-4 space-y-3">
              {schedule.activities.map((activity, index) => (
                <li
                  key={activity.id}
                  draggable
                  onDragStart={() => setDraggedId(activity.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => dropActivity(activity.id)}
                  className={`rounded-2xl border p-3 transition ${
                    draggedId === activity.id
                      ? 'border-adapt-indigo bg-adapt-indigo/10'
                      : 'border-slate-200 bg-slate-50 dark:border-gray-700 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-5 w-5 text-slate-400" aria-hidden />
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm dark:bg-gray-900">
                        {activity.emoji}
                      </span>
                    </div>
                    <input
                      value={activity.emoji}
                      onChange={(event) => updateActivity(activity.id, { emoji: event.target.value.slice(0, 4) })}
                      aria-label={`Emoji for ${activity.label}`}
                      className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-lg dark:border-gray-700 dark:bg-gray-900"
                    />
                    <input
                      value={activity.label}
                      onChange={(event) => updateActivity(activity.id, { label: event.target.value })}
                      aria-label={`Activity ${index + 1} label`}
                      className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-gray-700 dark:bg-gray-900"
                    />
                    <input
                      type="number"
                      min={1}
                      max={180}
                      value={activity.durationMinutes ?? ''}
                      onChange={(event) =>
                        updateActivity(activity.id, {
                          durationMinutes: event.target.value ? Number(event.target.value) : undefined,
                        })
                      }
                      aria-label={`Minutes for ${activity.label}`}
                      className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold dark:border-gray-700 dark:bg-gray-900"
                      placeholder="min"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveActivity(activity.id, -1)}
                        disabled={index === 0}
                        className="rounded-xl bg-white p-2 text-slate-500 disabled:opacity-30 dark:bg-gray-900"
                        aria-label={`Move ${activity.label} earlier`}
                      >
                        <ChevronUp className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveActivity(activity.id, 1)}
                        disabled={index === schedule.activities.length - 1}
                        className="rounded-xl bg-white p-2 text-slate-500 disabled:opacity-30 dark:bg-gray-900"
                        aria-label={`Move ${activity.label} later`}
                      >
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeActivity(activity.id)}
                        className="rounded-xl bg-rose-50 p-2 text-rose-600 hover:bg-rose-100"
                        aria-label={`Remove ${activity.label}`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-3xl border border-white/80 bg-white/85 p-4 shadow-soft dark:border-gray-800 dark:bg-gray-900/80">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-adapt-navy dark:text-gray-100">Add activities</h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">
                  Use quick picks or create your own visual task.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTaskForm((current) => !current)}
                className="inline-flex items-center gap-2 rounded-2xl bg-adapt-navy px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-adapt-purple"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add task
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {ACTIVITY_LIBRARY.map((activity) => (
                <button
                  key={`${activity.emoji}-${activity.label}`}
                  type="button"
                  onClick={() => addActivity(activity)}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-left text-sm font-bold text-slate-700 transition hover:border-adapt-indigo/30 hover:bg-adapt-indigo/5 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  <span className="mr-2 text-xl" aria-hidden>{activity.emoji}</span>
                  {activity.label}
                </button>
              ))}
            </div>

            {showAddTaskForm && (
              <div className="mt-4 rounded-2xl bg-slate-50 p-3 dark:bg-gray-800">
                <p className="text-xs font-black uppercase tracking-wide text-slate-500">Custom task</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-[4.5rem_1fr_6rem]">
                  <label className="sr-only" htmlFor="custom-task-emoji">Task emoji</label>
                  <input
                    id="custom-task-emoji"
                    value={customEmoji}
                    onChange={(event) => setCustomEmoji(event.target.value.slice(0, 4))}
                    aria-label="Custom activity emoji"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-lg dark:border-gray-700 dark:bg-gray-900"
                  />
                  <label className="sr-only" htmlFor="custom-task-label">Task name</label>
                  <input
                    id="custom-task-label"
                    value={customLabel}
                    onChange={(event) => setCustomLabel(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') addCustomActivity();
                    }}
                    placeholder="New activity"
                    className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                  <label className="sr-only" htmlFor="custom-task-duration">Minutes</label>
                  <input
                    id="custom-task-duration"
                    type="number"
                    min={1}
                    max={180}
                    value={customDuration}
                    onChange={(event) => setCustomDuration(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') addCustomActivity();
                    }}
                    placeholder="min"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={addCustomActivity}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-adapt-indigo px-4 py-2.5 text-sm font-black text-white disabled:opacity-60"
                  disabled={!customLabel.trim()}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add to plan
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default NowNextLaterBoard;
