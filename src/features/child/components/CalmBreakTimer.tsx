import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Heart,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Wind,
  X,
} from 'lucide-react';
import { saveJournalEntry } from 'services/supabase/autismProfileService';
import {
  SUPPORT_SIGNAL_OPTIONS,
  getSupportSignalOption,
  type SupportSignalId,
} from 'features/child/constants/supportSignals';
import type { EmotionAnalysis } from 'types/ai.types';

export type CalmBreakMood = SupportSignalId;

export interface CalmBreakTimerResult {
  mood: CalmBreakMood | null;
  signalLabel?: string;
  signalCategory?: string;
  supportLevel?: string;
  note: string;
  durationMinutes: number;
  completedAt: string;
  saved: boolean;
}

interface CalmBreakTimerProps {
  childId: string;
  activityLabel?: string;
  durationMinutes?: number;
  canSyncRemote?: boolean;
  onComplete?: (result: CalmBreakTimerResult) => void | Promise<void>;
  onClose?: () => void;
}

type TimerPhase = 'idle' | 'running' | 'paused' | 'complete';
type BreathPhase = 'inhale' | 'hold' | 'exhale';

const calmScenes = [
  { id: 'ocean', label: 'Ocean', emoji: '🌊', color: 'from-sky-400 via-cyan-300 to-teal-300' },
  { id: 'forest', label: 'Forest', emoji: '🌲', color: 'from-emerald-500 via-green-300 to-lime-200' },
  { id: 'sunset', label: 'Sunset', emoji: '🌅', color: 'from-amber-300 via-rose-300 to-violet-300' },
  { id: 'stars', label: 'Stars', emoji: '🌙', color: 'from-indigo-700 via-violet-500 to-sky-400' },
  { id: 'rain', label: 'Rain', emoji: '🌧️', color: 'from-slate-500 via-sky-400 to-blue-300' },
] as const;

const durationOptions = [3, 5, 10, 15];

const clampDuration = (minutes?: number) => {
  if (!minutes || !Number.isFinite(minutes)) return 5;
  return Math.min(20, Math.max(1, Math.round(minutes)));
};

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
};

const getBreathPhase = (elapsedSeconds: number): BreathPhase => {
  const cycleSecond = elapsedSeconds % 15;
  if (cycleSecond < 4) return 'inhale';
  if (cycleSecond < 7) return 'hold';
  return 'exhale';
};

const breathCopy: Record<BreathPhase, { label: string; detail: string; scale: string }> = {
  inhale: { label: 'Breathe in', detail: 'Fill the balloon slowly', scale: 'scale-110' },
  hold: { label: 'Hold', detail: 'Stay gentle', scale: 'scale-105' },
  exhale: { label: 'Breathe out', detail: 'Let it soften', scale: 'scale-90' },
};

const signalSelectionClass = (signalId: SupportSignalId) => {
  const signal = getSupportSignalOption(signalId);
  switch (signal.color) {
    case 'green':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'blue':
      return 'border-sky-200 bg-sky-50 text-sky-800';
    case 'purple':
      return 'border-violet-200 bg-violet-50 text-violet-800';
    case 'red':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    case 'orange':
      return 'border-orange-200 bg-orange-50 text-orange-800';
    case 'amber':
    case 'yellow':
    default:
      return 'border-amber-200 bg-amber-50 text-amber-800';
  }
};

const buildCalmBreakAnalysis = (
  mood: SupportSignalId,
  note: string,
  durationMinutes: number,
): EmotionAnalysis => {
  const signal = getSupportSignalOption(mood);
  const hasAdultContext = signal.level === 'concern' || signal.level === 'urgent' || note.trim().length > 0;

  return {
    emotion: signal.emotion,
    confidence: hasAdultContext ? 0.82 : 0.74,
    keywords: ['calm-break', `${durationMinutes}-minutes`, signal.id, signal.category],
    riskLevel: signal.riskLevel,
    sentimentScore: signal.sentimentScore,
    timestamp: new Date(),
    signalId: signal.id,
    signalLabel: signal.label,
    signalCategory: signal.category,
    supportLevel: signal.level,
    source: 'calm-break',
    activityLabel: 'Calm break',
    parentInsight: signal.parentInsight,
    suggestedAction: signal.suggestedAction,
    moodScore: signal.moodScore,
    focusScore: signal.focusScore,
    calmScore: signal.calmScore,
  };
};

const calmBreakStorageKey = (childId: string) => `adaptbuddy-calm-break-check-ins:${childId}`;

const writeLocalCalmBreakCheckIn = (childId: string, result: CalmBreakTimerResult) => {
  if (typeof window === 'undefined') return;

  try {
    const raw = window.localStorage.getItem(calmBreakStorageKey(childId));
    const existing = raw ? (JSON.parse(raw) as CalmBreakTimerResult[]) : [];
    window.localStorage.setItem(calmBreakStorageKey(childId), JSON.stringify([result, ...existing].slice(0, 80)));
  } catch {
    window.localStorage.setItem(calmBreakStorageKey(childId), JSON.stringify([result]));
  }
};

const CalmBreakTimer: React.FC<CalmBreakTimerProps> = ({
  childId,
  activityLabel = 'Calm break',
  durationMinutes,
  canSyncRemote = true,
  onComplete,
  onClose,
}) => {
  const initialDuration = clampDuration(durationMinutes);
  const [duration, setDuration] = useState(initialDuration);
  const [timeRemaining, setTimeRemaining] = useState(initialDuration * 60);
  const [phase, setPhase] = useState<TimerPhase>('idle');
  const [scene, setScene] = useState<(typeof calmScenes)[number]>(calmScenes[0]);
  const [selectedMood, setSelectedMood] = useState<CalmBreakMood | null>(null);
  const [moodNote, setMoodNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const totalSeconds = duration * 60;
  const elapsedSeconds = totalSeconds - timeRemaining;
  const progress = totalSeconds > 0 ? Math.round((elapsedSeconds / totalSeconds) * 100) : 0;
  const breathPhase = getBreathPhase(elapsedSeconds);
  const breath = breathCopy[breathPhase];

  const stars = useMemo(
    () =>
      Array.from({ length: 22 }, (_, index) => ({
        top: `${(index * 37) % 92}%`,
        left: `${(index * 53) % 96}%`,
        delay: `${(index % 7) * 0.35}s`,
      })),
    [],
  );

  const raindrops = useMemo(
    () =>
      Array.from({ length: 30 }, (_, index) => ({
        left: `${(index * 29) % 100}%`,
        delay: `${(index % 9) * 0.18}s`,
        duration: `${1 + (index % 5) * 0.18}s`,
      })),
    [],
  );

  useEffect(() => {
    if (phase !== 'idle') return;
    setTimeRemaining(duration * 60);
  }, [duration, phase]);

  useEffect(() => {
    if (phase !== 'running') return undefined;

    const intervalId = window.setInterval(() => {
      setTimeRemaining((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          setPhase('complete');
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [phase]);

  const startTimer = () => {
    if (phase === 'idle') {
      setTimeRemaining(duration * 60);
    }
    setPhase('running');
  };

  const pauseTimer = () => setPhase('paused');
  const resumeTimer = () => setPhase('running');

  const resetTimer = () => {
    setPhase('idle');
    setTimeRemaining(duration * 60);
    setSelectedMood(null);
    setMoodNote('');
    setSaveMessage('');
  };

  const finishCalmBreak = async (mood: CalmBreakMood | null, shouldSave: boolean) => {
    const cleanNote = moodNote.trim();
    const completedAt = new Date().toISOString();
    let saved = false;

    if (shouldSave && mood) {
      const signal = getSupportSignalOption(mood);
      const analysis = buildCalmBreakAnalysis(mood, cleanNote, duration);
      const text = cleanNote
        ? `After ${activityLabel.toLowerCase()}, I chose "${signal.emoji} ${signal.label}". Note: ${cleanNote}`
        : `After ${activityLabel.toLowerCase()}, I chose "${signal.emoji} ${signal.label}".`;

      setSaving(true);
      setSaveMessage('');

      try {
        if (canSyncRemote) {
          await saveJournalEntry({
            childId,
            emotion: signal.emotion,
            text,
            analysis,
            isShared: true,
          });
          saved = true;
        }
      } catch (error) {
        console.warn('Calm break mood saved locally only:', error);
        setSaveMessage('Saved on this device. Sync will catch up when available.');
      } finally {
        setSaving(false);
      }
    }

    const result: CalmBreakTimerResult = {
      mood,
      signalLabel: mood ? getSupportSignalOption(mood).label : undefined,
      signalCategory: mood ? getSupportSignalOption(mood).category : undefined,
      supportLevel: mood ? getSupportSignalOption(mood).level : undefined,
      note: cleanNote,
      durationMinutes: duration,
      completedAt,
      saved,
    };

    writeLocalCalmBreakCheckIn(childId, result);
    await onComplete?.(result);
    onClose?.();
  };

  const closeTimer = () => {
    resetTimer();
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-adapt-navy/45 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="calm-break-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl animate-slide-up dark:border-gray-800 dark:bg-gray-950">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-sky-100 bg-gradient-to-r from-sky-50 to-emerald-50 p-5 dark:border-gray-800 dark:from-gray-900 dark:to-gray-950">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-adapt-teal">Calm Break</p>
            <h2 id="calm-break-title" className="mt-1 text-2xl font-black text-adapt-navy dark:text-gray-100">
              Take a gentle pause
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-gray-400">
              Breathe with the circle until the timer finishes.
            </p>
          </div>
          <button
            type="button"
            onClick={closeTimer}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm hover:text-adapt-indigo dark:bg-gray-900 dark:text-gray-300"
            aria-label="Close calm break"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {phase !== 'complete' && (
            <>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {calmScenes.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setScene(item)}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-black transition ${
                      scene.id === item.id
                        ? `bg-gradient-to-r ${item.color} text-white shadow-sm`
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-gray-900 dark:text-gray-300'
                    }`}
                  >
                    <span aria-hidden>{item.emoji}</span> {item.label}
                  </button>
                ))}
              </div>

              <div className={`relative mt-4 h-72 overflow-hidden rounded-3xl bg-gradient-to-br ${scene.color}`}>
                {scene.id === 'ocean' && (
                  <div className="absolute inset-x-0 bottom-0 h-28 rounded-t-[45%] bg-white/20 animate-wave" />
                )}
                {scene.id === 'forest' && (
                  <div className="absolute inset-x-6 bottom-4 flex justify-between text-4xl opacity-80" aria-hidden>
                    <span>🌲</span>
                    <span>🌿</span>
                    <span>🌳</span>
                    <span>🍃</span>
                  </div>
                )}
                {scene.id === 'sunset' && (
                  <div className="absolute left-1/2 top-12 h-24 w-24 -translate-x-1/2 rounded-full bg-amber-100/80 shadow-[0_0_60px_rgba(254,243,199,0.8)] animate-float" />
                )}
                {scene.id === 'stars' && (
                  <div className="absolute inset-0" aria-hidden>
                    {stars.map((star, index) => (
                      <span
                        key={index}
                        className="absolute h-1.5 w-1.5 rounded-full bg-white/85 animate-pulse"
                        style={{ top: star.top, left: star.left, animationDelay: star.delay }}
                      />
                    ))}
                  </div>
                )}
                {scene.id === 'rain' && (
                  <div className="absolute inset-0" aria-hidden>
                    {raindrops.map((drop, index) => (
                      <span
                        key={index}
                        className="absolute -top-10 h-8 w-0.5 rounded-full bg-blue-100/70 animate-rain"
                        style={{
                          left: drop.left,
                          animationDelay: drop.delay,
                          animationDuration: drop.duration,
                        }}
                      />
                    ))}
                  </div>
                )}

                <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center text-white">
                  <div
                    className={`flex h-36 w-36 items-center justify-center rounded-full border-4 border-white/45 bg-white/15 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-sm transition-transform duration-1000 ${phase === 'running' ? breath.scale : 'scale-100'}`}
                  >
                    <div>
                      <Wind className="mx-auto h-8 w-8" aria-hidden />
                      <p className="mt-2 text-lg font-black">{phase === 'running' ? breath.label : 'Ready'}</p>
                      <p className="text-xs font-semibold text-white/85">
                        {phase === 'running' ? breath.detail : 'Start when you are ready'}
                      </p>
                    </div>
                  </div>

                  <p className="mt-5 text-6xl font-black drop-shadow-md">{formatTime(timeRemaining)}</p>
                  <div className="mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/30">
                    <div
                      className="h-full rounded-full bg-white transition-[width]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5">
                {phase === 'idle' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                      {durationOptions.map((minutes) => (
                        <button
                          key={minutes}
                          type="button"
                          onClick={() => setDuration(minutes)}
                          className={`rounded-2xl px-3 py-2 text-sm font-black transition ${
                            duration === minutes
                              ? 'bg-adapt-indigo text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-gray-900 dark:text-gray-300'
                          }`}
                        >
                          {minutes} min
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={startTimer}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-adapt-teal px-5 py-4 text-lg font-black text-white shadow-glow"
                    >
                      <Play className="h-5 w-5" aria-hidden />
                      Start calm break
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap justify-center gap-3">
                    {phase === 'paused' ? (
                      <button
                        type="button"
                        onClick={resumeTimer}
                        className="inline-flex items-center gap-2 rounded-2xl bg-adapt-indigo px-5 py-3 text-sm font-black text-white"
                      >
                        <Play className="h-4 w-4" aria-hidden />
                        Resume
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={pauseTimer}
                        className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-white"
                      >
                        <Pause className="h-4 w-4" aria-hidden />
                        Pause
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={resetTimer}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden />
                      Reset
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {phase === 'complete' && (
            <div>
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-center text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-100">
                <Sparkles className="mx-auto h-9 w-9" aria-hidden />
                <h3 className="mt-2 text-2xl font-black">Calm break complete.</h3>
                <p className="mt-1 text-sm font-semibold opacity-80">How are you feeling now?</p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {SUPPORT_SIGNAL_OPTIONS.map((mood) => (
                  <button
                    key={mood.id}
                    type="button"
                    onClick={() => setSelectedMood(mood.id)}
                    className={`rounded-2xl border-2 p-4 text-left transition hover:-translate-y-0.5 ${
                      selectedMood === mood.id
                        ? `${signalSelectionClass(mood.id)} shadow-md ring-2 ring-adapt-indigo/20`
                        : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-adapt-indigo/30 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}
                  >
                    <span className="text-3xl" aria-hidden>{mood.emoji}</span>
                    <span className="ml-2 text-base font-black">{mood.label}</span>
                    <span className="mt-1 block text-sm font-semibold opacity-75">{mood.helper}</span>
                  </button>
                ))}
              </div>

              <label className="mt-5 block text-sm font-black text-adapt-navy dark:text-gray-100" htmlFor="calm-break-note">
                Add a note
              </label>
              <textarea
                id="calm-break-note"
                value={moodNote}
                onChange={(event) => setMoodNote(event.target.value)}
                rows={3}
                placeholder="What helped, or what still feels hard?"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900"
              />

              {saveMessage && (
                <p className="mt-3 rounded-2xl bg-sky-50 px-4 py-3 text-sm font-black text-sky-800">
                  {saveMessage}
                </p>
              )}

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void finishCalmBreak(null, false)}
                  disabled={saving}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  Skip check-in
                </button>
                <button
                  type="button"
                  onClick={() => void finishCalmBreak(selectedMood, true)}
                  disabled={!selectedMood || saving}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-adapt-navy px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />}
                  Save and continue
                </button>
              </div>
            </div>
          )}

          {phase !== 'complete' && (
            <div className="mt-5 flex flex-wrap justify-center gap-2 text-sm font-black">
              <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
                <Heart className="mr-1 inline h-3.5 w-3.5" aria-hidden />
                You are safe
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                Breathe gently
              </span>
              <span className="rounded-full bg-violet-50 px-3 py-1.5 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">
                One moment at a time
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalmBreakTimer;
