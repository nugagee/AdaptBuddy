import React, { useEffect, useRef, useState } from 'react';
import { Check, Ear, Hand, Mic2, RotateCcw, Volume2 } from 'lucide-react';
import type { DyslexiaPhonicsSessionInput } from 'features/child/store/childProgressStore';

interface DyslexiaPhonicsTraceActivityProps {
  onComplete: (session: DyslexiaPhonicsSessionInput) => void;
}

interface PhonicsMission {
  id: string;
  letter: string;
  sound: string;
  word: string;
  wordParts: [string, string];
  audioText: string;
  mouthCue: string;
  traceGuide: string;
}

interface TracePoint {
  x: number;
  y: number;
}

const PHONICS_MISSIONS: PhonicsMission[] = [
  {
    id: 'm-moon',
    letter: 'm',
    sound: 'mmm',
    word: 'moon',
    wordParts: ['m', 'oon'],
    audioText: 'The sound is mmm. Mmm as in moon.',
    mouthCue: 'Close your lips gently and let the sound hum through your nose: mmm.',
    traceGuide: 'Down, back to the top, over one hill, then over the next hill.',
  },
  {
    id: 's-sun',
    letter: 's',
    sound: 'sss',
    word: 'sun',
    wordParts: ['s', 'un'],
    audioText: 'The sound is sss. Sss as in sun.',
    mouthCue: 'Keep your tongue behind your teeth and let the air slide out: sss.',
    traceGuide: 'Curve around the top, then curve back around the bottom.',
  },
  {
    id: 'a-apple',
    letter: 'a',
    sound: 'ah',
    word: 'apple',
    wordParts: ['a', 'pple'],
    audioText: 'The sound is ah. Ah as in apple.',
    mouthCue: 'Open your mouth a little and use a short sound: ah.',
    traceGuide: 'Make a round shape, close it, then add a short line down.',
  },
  {
    id: 't-tiger',
    letter: 't',
    sound: 't',
    word: 'tiger',
    wordParts: ['t', 'iger'],
    audioText: 'The sound is t. T as in tiger.',
    mouthCue: 'Touch your tongue just behind your top teeth, then release a small puff: t.',
    traceGuide: 'Draw one line down, then add a short line across.',
  },
];

const DyslexiaPhonicsTraceActivity: React.FC<DyslexiaPhonicsTraceActivityProps> = ({ onComplete }) => {
  const tracePadRef = useRef<HTMLDivElement>(null);
  const [activeMissionId, setActiveMissionId] = useState(PHONICS_MISSIONS[0].id);
  const [heardSound, setHeardSound] = useState(false);
  const [traceComplete, setTraceComplete] = useState(false);
  const [saidSound, setSaidSound] = useState(false);
  const [tracePoints, setTracePoints] = useState<TracePoint[]>([]);
  const [isTracing, setIsTracing] = useState(false);
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [listenCount, setListenCount] = useState(0);
  const [showMouthCue, setShowMouthCue] = useState(false);
  const [showWordChunks, setShowWordChunks] = useState(false);
  const [usedMouthCue, setUsedMouthCue] = useState(false);
  const [usedWordChunks, setUsedWordChunks] = useState(false);
  const [confidence, setConfidence] = useState<DyslexiaPhonicsSessionInput['confidence']>('practised');
  const [status, setStatus] = useState('Start by hearing the sound. There is no score and no rush.');

  const activeMission = PHONICS_MISSIONS.find((mission) => mission.id === activeMissionId) ?? PHONICS_MISSIONS[0];
  const missionReady = heardSound && traceComplete && saidSound;
  const progress = Math.round((completedMissionIds.length / PHONICS_MISSIONS.length) * 100);
  const speechAvailable =
    typeof window !== 'undefined'
    && typeof window.speechSynthesis?.cancel === 'function'
    && typeof window.speechSynthesis?.speak === 'function'
    && typeof SpeechSynthesisUtterance !== 'undefined';

  useEffect(() => () => {
    if (typeof window !== 'undefined' && typeof window.speechSynthesis?.cancel === 'function') {
      window.speechSynthesis.cancel();
    }
  }, []);

  const resetRound = () => {
    setHeardSound(false);
    setTraceComplete(false);
    setSaidSound(false);
    setTracePoints([]);
    setIsTracing(false);
    setShowMouthCue(false);
    setShowWordChunks(false);
  };

  const selectMission = (mission: PhonicsMission) => {
    resetRound();
    setActiveMissionId(mission.id);
    setStatus(`Ready for ${mission.letter}: ${mission.sound}.`);
  };

  const hearActiveSound = () => {
    setHeardSound(true);
    setListenCount((count) => count + 1);

    if (!speechAvailable) {
      setStatus(`Voice playback is unavailable. Use the written cue: ${activeMission.sound} as in ${activeMission.word}.`);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(activeMission.audioText);
    utterance.lang = 'en-GB';
    utterance.rate = 0.75;
    utterance.pitch = 1;
    utterance.onstart = () => setStatus(`Listen: ${activeMission.sound} as in ${activeMission.word}.`);
    utterance.onend = () => setStatus('Sound heard. Trace the letter when you are ready.');
    utterance.onerror = () => setStatus(`The voice stopped. Use the written cue: ${activeMission.sound}.`);
    window.speechSynthesis.speak(utterance);
  };

  const getTracePoint = (event: React.PointerEvent<HTMLDivElement>): TracePoint => {
    const bounds = tracePadRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width === 0 || bounds.height === 0) {
      return { x: event.clientX, y: event.clientY };
    }
    return {
      x: Math.max(0, Math.min(320, ((event.clientX - bounds.left) / bounds.width) * 320)),
      y: Math.max(0, Math.min(220, ((event.clientY - bounds.top) / bounds.height) * 220)),
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setIsTracing(true);
    setTraceComplete(false);
    setTracePoints([getTracePoint(event)]);
    setStatus('Keep tracing along the letter shape.');
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isTracing) return;
    event.preventDefault();
    const point = getTracePoint(event);
    setTracePoints((current) => [...current, point].slice(-160));
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isTracing) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    setIsTracing(false);
    if (tracePoints.length >= 3) {
      setTraceComplete(true);
      setStatus('Trace complete. Now say the sound in your own way.');
    } else {
      setStatus('Try a slightly longer trace, or use the accessible trace button below.');
    }
  };

  const markTraceComplete = () => {
    setTraceComplete(true);
    setStatus('Trace complete. Now say the sound in your own way.');
  };

  const markSoundSaid = () => {
    setSaidSound(true);
    setStatus(`You practised ${activeMission.sound}. Finish this sound mission when ready.`);
  };

  const completeSoundMission = () => {
    if (!missionReady) return;
    const nextCompleted = completedMissionIds.includes(activeMission.id)
      ? completedMissionIds
      : [...completedMissionIds, activeMission.id];
    setCompletedMissionIds(nextCompleted);

    const nextMission = PHONICS_MISSIONS.find((mission) => !nextCompleted.includes(mission.id));
    if (nextMission) {
      resetRound();
      setActiveMissionId(nextMission.id);
      setStatus(`${activeMission.letter} mission complete. Next sound: ${nextMission.sound}.`);
    } else {
      setStatus('All four sound missions are complete. Brilliant multisensory practice.');
    }
  };

  const handleComplete = () => {
    const completedMissions = PHONICS_MISSIONS.filter((mission) => completedMissionIds.includes(mission.id));
    const supportsUsed = [
      listenCount > 0 ? 'sound playback' : null,
      'letter tracing',
      'say-it-yourself check',
      usedMouthCue ? 'mouth cue' : null,
      usedWordChunks ? 'word chunks' : null,
      listenCount > completedMissionIds.length ? 'extra sound replay' : null,
      confidence === 'need-help' ? 'help requested' : null,
    ].filter((support): support is string => Boolean(support));

    onComplete({
      completedSoundIds: completedMissions.map((mission) => mission.id),
      completedSounds: completedMissions.map((mission) => mission.sound),
      wordsPractised: completedMissions.map((mission) => mission.word),
      totalSounds: PHONICS_MISSIONS.length,
      listenCount,
      confidence,
      supportsUsed,
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/50 dark:bg-violet-950/25">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-200">
              Choose a sound mission
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
              Hear it, trace it, and say it. Speech and handwriting are never scored.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-violet-700 dark:bg-gray-950 dark:text-violet-200">
            {completedMissionIds.length}/{PHONICS_MISSIONS.length} sounds
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-100 dark:bg-violet-950">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-label="Phonics mission progress"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PHONICS_MISSIONS.map((mission) => {
            const isComplete = completedMissionIds.includes(mission.id);
            return (
              <button
                key={mission.id}
                type="button"
                onClick={() => selectMission(mission)}
                aria-pressed={activeMission.id === mission.id}
                aria-label={`${mission.letter} sound ${mission.word}${isComplete ? ', complete' : ''}`}
                className={`rounded-2xl border-2 p-3 text-center transition ${
                  activeMission.id === mission.id
                    ? 'border-violet-500 bg-white shadow-sm dark:bg-gray-950'
                    : 'border-transparent bg-white/70 dark:bg-gray-900'
                }`}
              >
                <span className="block text-3xl font-black lowercase text-adapt-navy dark:text-gray-100">{mission.letter}</span>
                <span className="mt-1 block text-xs font-bold text-slate-500">{mission.sound} · {mission.word}</span>
                {isComplete ? <span className="mt-1 block text-xs font-black text-emerald-700">✓ complete</span> : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-900/50 dark:bg-sky-950/20">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-sky-700 dark:bg-gray-950 dark:text-sky-200">
            <Ear className="h-5 w-5" aria-hidden />
          </span>
          <div className="flex-1">
            <p className="text-xs font-black uppercase tracking-wide text-sky-700 dark:text-sky-200">1 · Hear it</p>
            <p className="mt-1 text-lg font-black text-adapt-navy dark:text-gray-100">
              {activeMission.sound} as in {activeMission.word}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={hearActiveSound}
                className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-2 text-sm font-black text-white"
              >
                <Volume2 className="h-4 w-4" aria-hidden />
                Hear {activeMission.sound}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMouthCue((current) => !current);
                  setUsedMouthCue(true);
                }}
                aria-pressed={showMouthCue}
                className="rounded-full bg-white px-4 py-2 text-xs font-black text-sky-700 dark:bg-gray-950 dark:text-sky-200"
              >
                Show mouth cue
              </button>
            </div>
            {showMouthCue ? (
              <p className="mt-3 rounded-xl bg-white/80 p-3 text-sm font-semibold leading-6 text-slate-700 dark:bg-gray-950/70 dark:text-gray-200">
                {activeMission.mouthCue}
              </p>
            ) : null}
          </div>
          {heardSound ? <Check className="h-6 w-6 text-emerald-600" aria-label="Hearing step complete" /> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-700 dark:bg-gray-950 dark:text-amber-200">
            <Hand className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-wide text-amber-700 dark:text-amber-200">2 · Trace it</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-700 dark:text-gray-200">{activeMission.traceGuide}</p>
            <div
              ref={tracePadRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={() => setIsTracing(false)}
              className="relative mt-3 h-56 w-full cursor-crosshair touch-none overflow-hidden rounded-2xl border-2 border-dashed border-amber-400 bg-white select-none dark:bg-gray-950"
              role="img"
              aria-label={`Tracing pad for lowercase ${activeMission.letter}`}
            >
              <svg viewBox="0 0 320 220" className="h-full w-full" aria-hidden>
                <text
                  x="160"
                  y="170"
                  textAnchor="middle"
                  fontSize="190"
                  fontWeight="800"
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="5"
                  strokeDasharray="10 8"
                  fontFamily="Verdana, Arial, sans-serif"
                >
                  {activeMission.letter}
                </text>
                {tracePoints.length > 1 ? (
                  <polyline
                    points={tracePoints.map((point) => `${point.x},${point.y}`).join(' ')}
                    fill="none"
                    stroke="#7c3aed"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : null}
              </svg>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={markTraceComplete}
                className="rounded-full bg-amber-500 px-4 py-2 text-xs font-black text-slate-950"
              >
                My trace is ready
              </button>
              <button
                type="button"
                onClick={() => {
                  setTracePoints([]);
                  setTraceComplete(false);
                  setStatus('Trace cleared. Try again when ready.');
                }}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-amber-800 dark:bg-gray-950 dark:text-amber-200"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                Clear trace
              </button>
            </div>
          </div>
          {traceComplete ? <Check className="h-6 w-6 text-emerald-600" aria-label="Tracing step complete" /> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 dark:bg-gray-950 dark:text-emerald-200">
            <Mic2 className="h-5 w-5" aria-hidden />
          </span>
          <div className="flex-1">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-200">3 · Say it</p>
            <p className="mt-1 text-lg font-black text-adapt-navy dark:text-gray-100">
              Say “{activeMission.sound}” and then “{activeMission.word}”.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={markSoundSaid}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-black text-white"
              >
                I said {activeMission.sound}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWordChunks((current) => !current);
                  setUsedWordChunks(true);
                }}
                aria-pressed={showWordChunks}
                className="rounded-full bg-white px-4 py-2 text-xs font-black text-emerald-800 dark:bg-gray-950 dark:text-emerald-200"
              >
                Show word chunks
              </button>
            </div>
            {showWordChunks ? (
              <p className="mt-3 text-3xl font-black tracking-wide" aria-label={`${activeMission.wordParts[0]} plus ${activeMission.wordParts[1]}`}>
                <span className="text-violet-700">{activeMission.wordParts[0]}</span>
                <span className="text-emerald-700">{activeMission.wordParts[1]}</span>
              </p>
            ) : null}
          </div>
          {saidSound ? <Check className="h-6 w-6 text-emerald-600" aria-label="Speaking step complete" /> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <p className="min-h-6 text-sm font-semibold text-slate-600 dark:text-gray-300" role="status" aria-live="polite">
          {status}
        </p>
        <button
          type="button"
          onClick={completeSoundMission}
          disabled={!missionReady}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-violet-600 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check className="h-4 w-4" aria-hidden />
          Complete {activeMission.letter} mission
        </button>

        <fieldset className="mt-4 border-t border-slate-100 pt-4 dark:border-gray-800">
          <legend className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">
            How did phonics feel today?
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {([
              ['confident', '😊 Confident'],
              ['practised', '🙂 I practised'],
              ['need-help', '🤝 I need help'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setConfidence(id)}
                aria-pressed={confidence === id}
                className={`rounded-full px-3 py-2 text-xs font-black ${
                  confidence === id
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          onClick={handleComplete}
          disabled={completedMissionIds.length === 0}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-violet-600 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check className="h-4 w-4" aria-hidden />
          Save phonics practice
        </button>
      </section>
    </div>
  );
};

export default DyslexiaPhonicsTraceActivity;
