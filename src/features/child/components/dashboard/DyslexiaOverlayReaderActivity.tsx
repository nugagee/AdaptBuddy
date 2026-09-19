import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Eye, RotateCcw, Type } from 'lucide-react';
import {
  DYSLEXIA_READING_PASSAGES,
  type DyslexiaReadingPassage,
} from 'features/child/data/dyslexiaReadingPassages';
import {
  type DyslexiaReaderPreferencesInput,
  type DyslexiaReadingSessionInput,
  useChildProgressStore,
} from 'features/child/store/childProgressStore';
import { useChildProgressReadAccess } from 'features/child/store/childProgressReadAccess';

interface DyslexiaOverlayReaderActivityProps {
  onComplete: (
    session: DyslexiaReadingSessionInput,
    preferences: DyslexiaReaderPreferencesInput,
  ) => void;
}

const DEFAULT_PREFERENCES: DyslexiaReaderPreferencesInput = {
  overlay: 'cream',
  textSize: 'large',
  lineSpacing: 'wide',
  lineWidth: 'medium',
  readingRuler: true,
  dyslexiaFont: false,
};

const OVERLAY_OPTIONS = [
  { id: 'white', label: 'White', className: 'bg-white' },
  { id: 'cream', label: 'Cream', className: 'bg-amber-50' },
  { id: 'blue', label: 'Blue', className: 'bg-sky-100' },
  { id: 'mint', label: 'Mint', className: 'bg-emerald-100' },
  { id: 'rose', label: 'Rose', className: 'bg-rose-100' },
] as const;

const TEXT_SIZE_OPTIONS = [
  { id: 'medium', label: 'Medium', pixels: 18 },
  { id: 'large', label: 'Large', pixels: 22 },
  { id: 'extra-large', label: 'Extra large', pixels: 26 },
] as const;

const SPACING_OPTIONS = [
  { id: 'comfortable', label: 'Comfortable', lineHeight: 1.7 },
  { id: 'wide', label: 'Wide', lineHeight: 2.05 },
  { id: 'extra-wide', label: 'Extra wide', lineHeight: 2.4 },
] as const;

const WIDTH_OPTIONS = [
  { id: 'narrow', label: 'Narrow', className: 'max-w-lg' },
  { id: 'medium', label: 'Medium', className: 'max-w-2xl' },
  { id: 'wide', label: 'Wide', className: 'max-w-none' },
] as const;

const COMFORT_OPTIONS = [
  { id: 'comfortable', label: 'Comfortable', emoji: '😊' },
  { id: 'okay', label: 'Okay', emoji: '🙂' },
  { id: 'change', label: 'Change it', emoji: '🔧' },
] as const;

const levelStyles: Record<DyslexiaReadingPassage['level'], string> = {
  gentle: 'bg-emerald-100 text-emerald-800',
  steady: 'bg-sky-100 text-sky-800',
  stretch: 'bg-violet-100 text-violet-800',
};

const countWords = (sentence: string) => sentence.trim().split(/\s+/).filter(Boolean).length;

const DyslexiaOverlayReaderActivity: React.FC<DyslexiaOverlayReaderActivityProps> = ({ onComplete }) => {
  const savedPreferences = useChildProgressStore((state) => state.dyslexiaReaderPreferences);
  const { childId, isReady } = useChildProgressReadAccess();
  const [sessionOwnerId, setSessionOwnerId] = useState<string | null>(
    isReady ? childId : null,
  );
  const startingPreferences = isReady ? savedPreferences ?? DEFAULT_PREFERENCES : DEFAULT_PREFERENCES;
  const [passageId, setPassageId] = useState(DYSLEXIA_READING_PASSAGES[0].id);
  const [overlay, setOverlay] = useState<DyslexiaReaderPreferencesInput['overlay']>(startingPreferences.overlay);
  const [textSize, setTextSize] = useState<DyslexiaReaderPreferencesInput['textSize']>(startingPreferences.textSize);
  const [lineSpacing, setLineSpacing] = useState<DyslexiaReaderPreferencesInput['lineSpacing']>(startingPreferences.lineSpacing);
  const [lineWidth, setLineWidth] = useState<DyslexiaReaderPreferencesInput['lineWidth']>(startingPreferences.lineWidth);
  const [readingRuler, setReadingRuler] = useState(startingPreferences.readingRuler);
  const [dyslexiaFont, setDyslexiaFont] = useState(startingPreferences.dyslexiaFont);
  const [activeSentence, setActiveSentence] = useState(0);
  const [completedSentences, setCompletedSentences] = useState<number[]>([]);
  const [comfortRating, setComfortRating] = useState<DyslexiaReadingSessionInput['comfortRating']>('okay');

  useEffect(() => {
    if (sessionOwnerId || !isReady || !childId) return;

    setSessionOwnerId(childId);
  }, [childId, isReady, sessionOwnerId]);

  const passage = useMemo(
    () => DYSLEXIA_READING_PASSAGES.find((option) => option.id === passageId) ?? DYSLEXIA_READING_PASSAGES[0],
    [passageId],
  );
  const overlayOption = OVERLAY_OPTIONS.find((option) => option.id === overlay) ?? OVERLAY_OPTIONS[1];
  const textOption = TEXT_SIZE_OPTIONS.find((option) => option.id === textSize) ?? TEXT_SIZE_OPTIONS[1];
  const spacingOption = SPACING_OPTIONS.find((option) => option.id === lineSpacing) ?? SPACING_OPTIONS[1];
  const widthOption = WIDTH_OPTIONS.find((option) => option.id === lineWidth) ?? WIDTH_OPTIONS[1];
  const progress = Math.round((completedSentences.length / passage.sentences.length) * 100);

  const canRenderSession = Boolean(
    isReady
    && childId
    && sessionOwnerId === childId,
  );

  if (!canRenderSession) {
    return (
      <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm font-semibold text-violet-800 dark:border-violet-900/50 dark:bg-violet-950/25 dark:text-violet-200">
        Loading your reading setup...
      </div>
    );
  }

  const getPreferences = (): DyslexiaReaderPreferencesInput => ({
    overlay,
    textSize,
    lineSpacing,
    lineWidth,
    readingRuler,
    dyslexiaFont,
  });

  const resetReadingProgress = () => {
    setActiveSentence(0);
    setCompletedSentences([]);
  };

  const selectPassage = (nextPassageId: string) => {
    setPassageId(nextPassageId);
    resetReadingProgress();
  };

  const markCurrentSentenceRead = () => {
    setCompletedSentences((current) => (
      current.includes(activeSentence)
        ? current
        : [...current, activeSentence].sort((left, right) => left - right)
    ));
    if (activeSentence < passage.sentences.length - 1) {
      setActiveSentence((current) => current + 1);
    }
  };

  const restoreDefaults = () => {
    setOverlay(DEFAULT_PREFERENCES.overlay);
    setTextSize(DEFAULT_PREFERENCES.textSize);
    setLineSpacing(DEFAULT_PREFERENCES.lineSpacing);
    setLineWidth(DEFAULT_PREFERENCES.lineWidth);
    setReadingRuler(DEFAULT_PREFERENCES.readingRuler);
    setDyslexiaFont(DEFAULT_PREFERENCES.dyslexiaFont);
  };

  const handleComplete = () => {
    const preferences = getPreferences();
    const supportsUsed = [
      `${overlay} overlay`,
      `${textSize.replace('-', ' ')} text`,
      `${lineSpacing.replace('-', ' ')} line spacing`,
      `${lineWidth} reading column`,
      readingRuler ? 'reading ruler' : null,
      dyslexiaFont ? 'dyslexia-friendly font' : 'clear sans font',
    ].filter((support): support is string => Boolean(support));
    const wordsRead = completedSentences.reduce(
      (total, sentenceIndex) => total + countWords(passage.sentences[sentenceIndex] ?? ''),
      0,
    );

    onComplete(
      {
        activityId: 'dyslexia-overlay-read',
        passageId: passage.id,
        passageTitle: passage.title,
        sentencesCompleted: completedSentences.length,
        totalSentences: passage.sentences.length,
        wordsRead,
        comfortRating,
        supportsUsed,
      },
      preferences,
    );
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/50 dark:bg-violet-950/25">
        <p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-200">
          Choose a short passage
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {DYSLEXIA_READING_PASSAGES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => selectPassage(option.id)}
              aria-pressed={passage.id === option.id}
              className={`rounded-2xl border-2 p-3 text-left transition ${
                passage.id === option.id
                  ? 'border-violet-400 bg-white shadow-sm dark:bg-gray-950'
                  : 'border-transparent bg-white/70 dark:bg-gray-900'
              }`}
            >
              <span className="font-black text-adapt-navy dark:text-gray-100">{option.title}</span>
              <span className={`mt-2 block w-fit rounded-full px-2 py-1 text-[10px] font-black uppercase ${levelStyles[option.level]}`}>
                {option.level}
              </span>
              <span className="mt-2 block text-xs leading-5 text-slate-500 dark:text-gray-400">
                {option.summary}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">Build your page</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">
              Try what feels comfortable. Page colour is a personal preference, not a test or treatment.
            </p>
          </div>
          <button
            type="button"
            onClick={restoreDefaults}
            className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 dark:bg-gray-800 dark:text-gray-300"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Reset setup
          </button>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <fieldset>
            <legend className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">Page colour</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {OVERLAY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setOverlay(option.id)}
                  aria-pressed={overlay === option.id}
                  className={`rounded-full border-2 px-3 py-2 text-xs font-black text-slate-700 ${option.className} ${
                    overlay === option.id ? 'border-violet-600 ring-2 ring-violet-200' : 'border-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">Text size</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {TEXT_SIZE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTextSize(option.id)}
                  aria-pressed={textSize === option.id}
                  className={`rounded-full px-3 py-2 text-xs font-black ${
                    textSize === option.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">Line spacing</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {SPACING_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setLineSpacing(option.id)}
                  aria-pressed={lineSpacing === option.id}
                  className={`rounded-full px-3 py-2 text-xs font-black ${
                    lineSpacing === option.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">Reading column</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {WIDTH_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setLineWidth(option.id)}
                  aria-pressed={lineWidth === option.id}
                  className={`rounded-full px-3 py-2 text-xs font-black ${
                    lineWidth === option.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setReadingRuler((current) => !current)}
            aria-pressed={readingRuler}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${
              readingRuler ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            <Eye className="h-4 w-4" aria-hidden />
            Reading ruler
          </button>
          <button
            type="button"
            onClick={() => setDyslexiaFont((current) => !current)}
            aria-pressed={dyslexiaFont}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black ${
              dyslexiaFont ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            <Type className="h-4 w-4" aria-hidden />
            Dyslexia-friendly font
          </button>
        </div>
      </section>

      <section className={`overflow-hidden rounded-2xl border-2 border-slate-200 ${overlayOption.className}`}>
        <div className="border-b border-slate-300/60 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-violet-700">Comfort reader</p>
              <h3 className="mt-1 text-xl font-black text-slate-900">{passage.title}</h3>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-2 text-xs font-black text-slate-600">
              {completedSentences.length}/{passage.sentences.length} lines
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-300/60">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-label="Overlay reading progress"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div
            className={`mx-auto space-y-3 ${widthOption.className} ${dyslexiaFont ? 'font-dyslexic' : 'font-sans'}`}
            style={{
              fontSize: `${textOption.pixels}px`,
              lineHeight: spacingOption.lineHeight,
              letterSpacing: '0.025em',
            }}
          >
            {passage.sentences.map((sentence, sentenceIndex) => {
              const isActive = sentenceIndex === activeSentence;
              const isComplete = completedSentences.includes(sentenceIndex);
              return (
                <button
                  key={`${passage.id}-${sentenceIndex}`}
                  type="button"
                  onClick={() => setActiveSentence(sentenceIndex)}
                  aria-label={`Focus line ${sentenceIndex + 1}`}
                  className={`block w-full rounded-xl px-3 py-2 text-left text-slate-900 transition ${
                    isComplete ? 'bg-emerald-200/60' : ''
                  } ${
                    isActive && readingRuler
                      ? 'border-y-4 border-violet-500 bg-yellow-100 shadow-sm'
                      : isActive
                        ? 'ring-2 ring-violet-400'
                        : readingRuler ? 'opacity-45' : ''
                  }`}
                >
                  {sentence}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setActiveSentence((current) => Math.max(0, current - 1))}
            disabled={activeSentence === 0}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-40 dark:bg-gray-800 dark:text-gray-300"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous line
          </button>
          <button
            type="button"
            onClick={markCurrentSentenceRead}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-sm font-black text-white"
          >
            <Check className="h-4 w-4" aria-hidden />
            I read this line
          </button>
          <button
            type="button"
            onClick={() => setActiveSentence((current) => Math.min(passage.sentences.length - 1, current + 1))}
            disabled={activeSentence === passage.sentences.length - 1}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-40 dark:bg-gray-800 dark:text-gray-300"
          >
            Next line
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <fieldset className="mt-4 border-t border-slate-100 pt-4 dark:border-gray-800">
          <legend className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">
            How did this page feel?
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {COMFORT_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setComfortRating(option.id)}
                aria-pressed={comfortRating === option.id}
                className={`rounded-full px-3 py-2 text-xs font-black ${
                  comfortRating === option.id
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-300'
                }`}
              >
                {option.emoji} {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-gray-800">
          <button
            type="button"
            onClick={resetReadingProgress}
            className="inline-flex items-center gap-2 rounded-full border-2 border-slate-200 px-4 py-2 text-xs font-black text-slate-600 dark:border-gray-700 dark:text-gray-300"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Restart passage
          </button>
          <button
            type="button"
            onClick={handleComplete}
            disabled={completedSentences.length === 0}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-violet-600 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check className="h-4 w-4" aria-hidden />
            {progress === 100 ? 'Save setup and finish' : 'Save partial overlay reading'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default DyslexiaOverlayReaderActivity;
