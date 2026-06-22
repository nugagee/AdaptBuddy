import React, { useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { buildCompanionContext, isOpenAiConfigured, respondToMoodCheckIn } from 'services/ai';
import { useAutismProfileStore } from 'features/child/store/autismProfileStore';
import { useChildProgressStore } from 'features/child/store/childProgressStore';
import { useAuth } from 'hooks/useAuth';
import { saveMoodCheckIn } from 'services/supabase/autismProfileService';

const MOODS = [
  { emoji: '😊', label: 'Happy', value: 'happy' },
  { emoji: '😐', label: 'Okay', value: 'okay' },
  { emoji: '😔', label: 'Sad', value: 'sad' },
  { emoji: '😠', label: 'Frustrated', value: 'frustrated' },
  { emoji: '😰', label: 'Worried', value: 'worried' },
  { emoji: '😴', label: 'Tired', value: 'tired' },
];

const MoodCheckInPanel: React.FC = () => {
  const { profile: authProfile, user } = useAuth();
  const autismProfile = useAutismProfileStore((s) => s.profile);
  const setTodayMood = useChildProgressStore((s) => s.setTodayMood);

  const [mood, setMood] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [saved, setSaved] = useState(false);

  const ctx = buildCompanionContext(
    autismProfile,
    authProfile?.first_name || 'friend',
    authProfile?.age ?? null,
  );

  const handleSubmit = async () => {
    if (!mood) return;
    setLoading(true);
    setError('');
    setSaved(false);
    try {
      const result = await respondToMoodCheckIn(mood, note, ctx);
      setResponse(result.response);
      setSuggestion(result.suggestion ?? '');
      setTodayMood(mood);
      if (user?.id) {
        await saveMoodCheckIn(user.id, mood, note, result.response);
      }
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save your check-in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600 dark:text-gray-400">
        How are you feeling right now? AdaptBuddy listens without judging — this is your safe space.
      </p>

      {!isOpenAiConfigured && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          AI responses use a gentle fallback until OpenAI is configured.
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {MOODS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMood(m.value)}
            className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 transition ${
              mood === m.value
                ? 'border-adapt-indigo bg-adapt-indigo/10 dark:border-adapt-cyan dark:bg-adapt-cyan/10'
                : 'border-slate-200 bg-white hover:border-adapt-indigo/40 dark:border-gray-700 dark:bg-gray-900'
            }`}
          >
            <span className="text-2xl">{m.emoji}</span>
            <span className="text-xs font-semibold text-slate-600 dark:text-gray-300">{m.label}</span>
          </button>
        ))}
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-adapt-navy dark:text-gray-200">
          Want to tell me more? (optional)
        </span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder='e.g. "I am worried about school tomorrow."'
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </label>

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={loading || !mood}
        className="inline-flex items-center gap-2 rounded-2xl bg-adapt-indigo px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-adapt-cyan dark:text-gray-900"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
        Share with AdaptBuddy
      </button>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {response && (
        <div className="rounded-2xl border border-pink-200/60 bg-pink-50/80 p-5 dark:border-pink-500/20 dark:bg-pink-950/20">
          <p className="text-sm leading-relaxed text-adapt-navy dark:text-gray-200">{response}</p>
          {suggestion && (
            <p className="mt-3 text-xs text-slate-600 dark:text-gray-400">{suggestion}</p>
          )}
          {saved && (
            <p className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Check-in saved ✓
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MoodCheckInPanel;
