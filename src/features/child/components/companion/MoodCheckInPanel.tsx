import SupportRequestAction from 'components/support/SupportRequestAction';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { buildCompanionContext, isOpenAiConfigured, respondToMoodCheckIn } from 'services/ai';
import {
  getCurrentReadyChildSupportProfile,
  useActiveChildSupportProfile,
} from 'features/child/hooks/useActiveChildSupportProfile';
import { getReadyChildProgressForOwner } from 'features/child/store/childProgressReadAccess';
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
  const {
    age,
    childId,
    isReady,
    preferredName,
    supportProfile,
  } = useActiveChildSupportProfile();

  const [mood, setMood] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [savedLocation, setSavedLocation] = useState<'guest' | 'account' | null>(null);
  const [adultActionRequired, setAdultActionRequired] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [checkInAttempt, setCheckInAttempt] = useState(0);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    requestVersionRef.current += 1;
    setMood('');
    setNote('');
    setLoading(false);
    setError('');
    setResponse('');
    setSuggestion('');
    setSavedLocation(null);
    setAdultActionRequired(false);
    setUrgent(false);
    setCheckInAttempt(0);
  }, [childId, isReady]);

  const context = useMemo(
    () => buildCompanionContext(supportProfile, preferredName, age),
    [age, preferredName, supportProfile],
  );

  const handleSubmit = async () => {
    if (!mood || loading) return;
    const requestOwnerId = childId;
    if (
      !requestOwnerId
      || !supportProfile
      || !getCurrentReadyChildSupportProfile(requestOwnerId)
      || !getReadyChildProgressForOwner(requestOwnerId)
    ) {
      setError('Your support profile is still getting ready. Please try again in a moment.');
      return;
    }

    const requestVersion = ++requestVersionRef.current;
    const requestIsGuest = requestOwnerId === 'guest-child';
    const requestMood = mood;
    const requestNote = note;
    const requestContext = context;
    setCheckInAttempt(attempt => attempt + 1);
    setAdultActionRequired(false);
    setResponse('');
    setSuggestion('');
    setUrgent(false);
    setLoading(true);
    setError('');
    setSavedLocation(null);
    try {
      const result = await respondToMoodCheckIn(requestMood, requestNote, requestContext);
      if (
        requestVersionRef.current !== requestVersion
        || !getCurrentReadyChildSupportProfile(requestOwnerId)
      ) {
        return;
      }

      const progressState = getReadyChildProgressForOwner(requestOwnerId);
      if (!progressState) {
        setError('Your check-in was not saved because your support profile changed. Please try again.');
        return;
      }

      setResponse(result.response);
      setSuggestion(result.suggestion ?? '');
      setAdultActionRequired(result.adultActionRequired === true);
      setUrgent(result.riskLevel === 'urgent');

      progressState.setTodayMood(requestMood);
      if (requestIsGuest) {
        setSavedLocation('guest');
        return;
      }

      await saveMoodCheckIn(
        requestOwnerId,
        requestMood,
        requestNote,
        result.response,
      );
      if (
        requestVersionRef.current !== requestVersion
        || !getCurrentReadyChildSupportProfile(requestOwnerId)
        || !getReadyChildProgressForOwner(requestOwnerId)
      ) {
        return;
      }
      setSavedLocation('account');
    } catch (err: unknown) {
      if (
        requestVersionRef.current === requestVersion
        && getCurrentReadyChildSupportProfile(requestOwnerId)
      ) {
        setError(err instanceof Error ? err.message : 'Could not save your check-in.');
      }
    } finally {
      if (requestVersionRef.current === requestVersion) setLoading(false);
    }
  };


  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600 dark:text-gray-400">
        How are you feeling right now? You choose what to share. Buddy is an AI helper and may
        suggest asking a trusted adult when you need human support.
      </p>

      {!isOpenAiConfigured && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          AI Buddy is not connected right now. A gentle fallback will help instead.
        </p>
      )}

      {!isReady && (
        <p className="text-sm text-slate-500 dark:text-gray-400" role="status">
          Your support profile is getting ready…
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {MOODS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMood(m.value)}
            disabled={loading || !isReady}
            aria-pressed={mood === m.value}
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
          maxLength={1200}
          disabled={!isReady}
          placeholder='e.g. "I am worried about school tomorrow."'
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        />
      </label>

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={loading || !mood || !isReady}
        className="inline-flex items-center gap-2 rounded-2xl bg-adapt-indigo px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-adapt-cyan dark:text-gray-900"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
        Share with AdaptBuddy
      </button>

      {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}

      {response && (
        <div className="rounded-2xl border border-pink-200/60 bg-pink-50/80 p-5 dark:border-pink-500/20 dark:bg-pink-950/20">
          <p className="text-sm leading-relaxed text-adapt-navy dark:text-gray-200">{response}</p>
          {suggestion && (
            <p className="mt-3 text-xs text-slate-600 dark:text-gray-400">{suggestion}</p>
          )}
          {adultActionRequired && <SupportRequestAction source="mood-check-in" urgent={urgent} contextKey={String(checkInAttempt)} />}
          {savedLocation && (
            <p className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              {savedLocation === 'guest'
                ? 'Saved for this guest session only ✓'
                : 'Check-in saved ✓'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MoodCheckInPanel;
