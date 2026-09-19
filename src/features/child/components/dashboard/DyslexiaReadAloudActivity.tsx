import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Volume2,
} from 'lucide-react';
import {
  DYSLEXIA_READING_PASSAGES,
  type DyslexiaReadingPassage,
} from 'features/child/data/dyslexiaReadingPassages';
import type { DyslexiaReadingSessionInput } from 'features/child/store/childProgressStore';

type ReaderOverlay = 'white' | 'cream' | 'blue' | 'mint';
type ReaderSpacing = 'comfortable' | 'wide';

const RATE_OPTIONS = [
  { value: 0.7, label: 'Gentle' },
  { value: 0.9, label: 'Steady' },
  { value: 1, label: 'Natural' },
];

const OVERLAY_OPTIONS: Array<{ id: ReaderOverlay; label: string; className: string }> = [
  { id: 'white', label: 'White', className: 'bg-white dark:bg-gray-950' },
  { id: 'cream', label: 'Cream', className: 'bg-amber-50' },
  { id: 'blue', label: 'Soft blue', className: 'bg-sky-50' },
  { id: 'mint', label: 'Soft mint', className: 'bg-emerald-50' },
];

const levelStyles: Record<DyslexiaReadingPassage['level'], string> = {
  gentle: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200',
  steady: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200',
  stretch: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200',
};

const countWords = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

interface DyslexiaReadAloudActivityProps {
  onComplete: (session: DyslexiaReadingSessionInput) => void;
}

const DyslexiaReadAloudActivity: React.FC<DyslexiaReadAloudActivityProps> = ({ onComplete }) => {
  const [passageId, setPassageId] = useState(DYSLEXIA_READING_PASSAGES[0].id);
  const [activeSentence, setActiveSentence] = useState(0);
  const [completedSentences, setCompletedSentences] = useState<number[]>([]);
  const [speechRate, setSpeechRate] = useState(0.9);
  const [overlay, setOverlay] = useState<ReaderOverlay>('cream');
  const [spacing, setSpacing] = useState<ReaderSpacing>('wide');
  const [fontSize, setFontSize] = useState(24);
  const [clearFont, setClearFont] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechStatus, setSpeechStatus] = useState('');
  const [usedReadAloud, setUsedReadAloud] = useState(false);
  const [usedWordRepeat, setUsedWordRepeat] = useState(false);
  const speechRunRef = useRef(0);

  const passage = useMemo(
    () => DYSLEXIA_READING_PASSAGES.find((item) => item.id === passageId)
      ?? DYSLEXIA_READING_PASSAGES[0],
    [passageId],
  );
  const overlayOption = OVERLAY_OPTIONS.find((option) => option.id === overlay) ?? OVERLAY_OPTIONS[1];
  const progress = Math.round((completedSentences.length / passage.sentences.length) * 100);
  const speechAvailable =
    typeof window !== 'undefined'
    && typeof window.speechSynthesis?.cancel === 'function'
    && typeof window.speechSynthesis?.speak === 'function'
    && typeof SpeechSynthesisUtterance !== 'undefined';

  const markSentenceComplete = useCallback((index: number) => {
    setCompletedSentences((current) => (
      current.includes(index) ? current : [...current, index].sort((left, right) => left - right)
    ));
  }, []);

  const stopSpeech = useCallback(() => {
    speechRunRef.current += 1;
    if (typeof window !== 'undefined' && typeof window.speechSynthesis?.cancel === 'function') {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeechStatus('Audio stopped. Your reading progress is still here.');
  }, []);

  useEffect(() => () => {
    speechRunRef.current += 1;
    if (typeof window !== 'undefined' && typeof window.speechSynthesis?.cancel === 'function') {
      window.speechSynthesis.cancel();
    }
  }, []);

  const startSpeechRun = () => {
    if (!speechAvailable) {
      setSpeechStatus('Read-aloud is not available in this browser. You can read yourself and mark each sentence.');
      return null;
    }

    window.speechSynthesis.cancel();
    speechRunRef.current += 1;
    setUsedReadAloud(true);
    setIsSpeaking(true);
    return speechRunRef.current;
  };

  const listenFromActiveSentence = () => {
    const runId = startSpeechRun();
    if (runId === null) return;

    passage.sentences.slice(activeSentence).forEach((sentence, offset) => {
      const sentenceIndex = activeSentence + offset;
      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = 'en-GB';
      utterance.rate = speechRate;
      utterance.pitch = 1;
      utterance.onstart = () => {
        if (speechRunRef.current !== runId) return;
        setActiveSentence(sentenceIndex);
        setSpeechStatus(`Reading sentence ${sentenceIndex + 1} of ${passage.sentences.length}.`);
      };
      utterance.onend = () => {
        if (speechRunRef.current !== runId) return;
        markSentenceComplete(sentenceIndex);
        if (sentenceIndex === passage.sentences.length - 1) {
          setIsSpeaking(false);
          setSpeechStatus('Passage complete. You can replay any word or finish the adventure.');
        }
      };
      utterance.onerror = () => {
        if (speechRunRef.current !== runId) return;
        setIsSpeaking(false);
        setSpeechStatus('The voice stopped unexpectedly. Your progress is safe, and you can try again.');
      };
      window.speechSynthesis.speak(utterance);
    });
  };

  const listenToSentence = (index: number) => {
    const runId = startSpeechRun();
    if (runId === null) return;

    const utterance = new SpeechSynthesisUtterance(passage.sentences[index]);
    utterance.lang = 'en-GB';
    utterance.rate = speechRate;
    utterance.pitch = 1;
    utterance.onstart = () => {
      if (speechRunRef.current !== runId) return;
      setActiveSentence(index);
      setSpeechStatus(`Reading sentence ${index + 1} of ${passage.sentences.length}.`);
    };
    utterance.onend = () => {
      if (speechRunRef.current !== runId) return;
      markSentenceComplete(index);
      setIsSpeaking(false);
      setSpeechStatus(`Sentence ${index + 1} complete.`);
    };
    utterance.onerror = () => {
      if (speechRunRef.current !== runId) return;
      setIsSpeaking(false);
      setSpeechStatus('The voice stopped. Try the sentence again or mark it yourself.');
    };
    window.speechSynthesis.speak(utterance);
  };

  const repeatWord = (word: string) => {
    const runId = startSpeechRun();
    if (runId === null) return;
    setUsedWordRepeat(true);

    const utterance = new SpeechSynthesisUtterance(word.replace(/[^a-zA-Z'-]/g, ''));
    utterance.lang = 'en-GB';
    utterance.rate = Math.min(speechRate, 0.8);
    utterance.onstart = () => {
      if (speechRunRef.current === runId) setSpeechStatus(`Repeating ${word}.`);
    };
    utterance.onend = () => {
      if (speechRunRef.current !== runId) return;
      setIsSpeaking(false);
      setSpeechStatus('Word repeated. Continue when you are ready.');
    };
    utterance.onerror = () => {
      if (speechRunRef.current !== runId) return;
      setIsSpeaking(false);
      setSpeechStatus('That word could not play. You can try again.');
    };
    window.speechSynthesis.speak(utterance);
  };

  const selectPassage = (nextPassageId: string) => {
    stopSpeech();
    setPassageId(nextPassageId);
    setActiveSentence(0);
    setCompletedSentences([]);
    setSpeechStatus('New passage ready.');
    setUsedReadAloud(false);
    setUsedWordRepeat(false);
  };

  const completeCurrentSentence = () => {
    markSentenceComplete(activeSentence);
    setSpeechStatus(`Sentence ${activeSentence + 1} marked complete.`);
    if (activeSentence < passage.sentences.length - 1) setActiveSentence((index) => index + 1);
  };

  const handleComplete = () => {
    const supportsUsed = [
      usedReadAloud ? 'read aloud' : null,
      usedWordRepeat ? 'word repeat' : null,
      overlay !== 'white' ? `${overlay} overlay` : null,
      spacing === 'wide' ? 'wide line spacing' : null,
      clearFont ? 'clear font' : null,
      fontSize > 24 ? 'larger text' : null,
    ].filter((support): support is string => Boolean(support));
    const wordsRead = completedSentences.reduce(
      (total, sentenceIndex) => total + countWords(passage.sentences[sentenceIndex] ?? ''),
      0,
    );

    stopSpeech();
    onComplete({
      activityId: 'dyslexia-read-aloud',
      passageId: passage.id,
      passageTitle: passage.title,
      sentencesCompleted: completedSentences.length,
      totalSentences: passage.sentences.length,
      wordsRead,
      speechRate,
      supportsUsed,
    });
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4 dark:border-violet-900/50 dark:bg-violet-950/25">
        <p className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-200">
          Choose a reading adventure
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
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">Voice speed</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {RATE_OPTIONS.map((rate) => (
                <button
                  key={rate.value}
                  type="button"
                  onClick={() => setSpeechRate(rate.value)}
                  aria-pressed={speechRate === rate.value}
                  className={`rounded-full px-3 py-2 text-xs font-black ${
                    speechRate === rate.value
                      ? 'bg-adapt-indigo text-white dark:bg-adapt-cyan dark:text-gray-950'
                      : 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {rate.label} {rate.value}x
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-gray-400">Page colour</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {OVERLAY_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setOverlay(option.id)}
                  aria-pressed={overlay === option.id}
                  className={`rounded-full border-2 px-3 py-2 text-xs font-black ${
                    overlay === option.id ? 'border-adapt-indigo text-adapt-indigo' : 'border-slate-200 text-slate-600'
                  } ${option.className}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setFontSize((size) => Math.max(20, size - 2))}
            disabled={fontSize === 20}
            aria-label="Make reading text smaller"
            className="rounded-full bg-slate-100 p-2 text-slate-600 disabled:opacity-40 dark:bg-gray-800 dark:text-gray-300"
          >
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <span className="text-xs font-black text-slate-500">Text {fontSize}px</span>
          <button
            type="button"
            onClick={() => setFontSize((size) => Math.min(30, size + 2))}
            disabled={fontSize === 30}
            aria-label="Make reading text larger"
            className="rounded-full bg-slate-100 p-2 text-slate-600 disabled:opacity-40 dark:bg-gray-800 dark:text-gray-300"
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setSpacing((value) => value === 'wide' ? 'comfortable' : 'wide')}
            aria-pressed={spacing === 'wide'}
            className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 dark:bg-gray-800 dark:text-gray-300"
          >
            Wide spacing
          </button>
          <button
            type="button"
            onClick={() => setClearFont((value) => !value)}
            aria-pressed={clearFont}
            className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 dark:bg-gray-800 dark:text-gray-300"
          >
            Clear font
          </button>
        </div>
      </section>

      <section className={`overflow-hidden rounded-2xl border-2 border-slate-200 ${overlayOption.className}`}>
        <div className="border-b border-slate-200/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-violet-700">Now reading</p>
              <h3 className="mt-1 text-xl font-black text-slate-900">{passage.title}</h3>
            </div>
            <span className="rounded-full bg-white/80 px-3 py-2 text-xs font-black text-slate-600">
              {completedSentences.length}/{passage.sentences.length} sentences
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/70">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all"
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-label="Reading progress"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        <div
          className="space-y-3 p-4 sm:p-5"
          style={{
            fontFamily: clearFont ? 'Verdana, Arial, sans-serif' : 'Georgia, serif',
            fontSize: `${fontSize}px`,
            lineHeight: spacing === 'wide' ? 2.05 : 1.65,
            letterSpacing: clearFont ? '0.035em' : 'normal',
          }}
        >
          {passage.sentences.map((sentence, sentenceIndex) => (
            <p
              key={`${passage.id}-${sentenceIndex}`}
              className={`rounded-2xl px-3 py-2 transition ${
                activeSentence === sentenceIndex
                  ? 'bg-yellow-200/80 text-slate-950 shadow-sm'
                  : completedSentences.includes(sentenceIndex)
                    ? 'bg-emerald-100/60 text-slate-800'
                    : 'text-slate-700 opacity-75'
              }`}
            >
              {sentence.split(/\s+/).map((word, wordIndex) => (
                <React.Fragment key={`${word}-${wordIndex}`}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveSentence(sentenceIndex);
                      repeatWord(word);
                    }}
                    aria-label={`Repeat word ${word.replace(/[^a-zA-Z'-]/g, '')}`}
                    className="rounded px-0.5 text-left hover:bg-white/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    {word}
                  </button>{' '}
                </React.Fragment>
              ))}
            </p>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={isSpeaking ? stopSpeech : listenFromActiveSentence}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-violet-600 px-5 py-3 text-sm font-black text-white hover:bg-violet-700"
          >
            {isSpeaking ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
            {isSpeaking ? 'Stop audio' : `Listen from sentence ${activeSentence + 1}`}
          </button>
          <button
            type="button"
            onClick={() => listenToSentence(activeSentence)}
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-violet-200 px-4 py-2 text-xs font-black text-violet-700 dark:border-violet-900 dark:text-violet-200"
          >
            <Volume2 className="h-4 w-4" aria-hidden />
            Repeat sentence
          </button>
        </div>

        <p className="mt-3 min-h-5 text-sm font-semibold text-slate-500 dark:text-gray-400" role="status" aria-live="polite">
          {speechStatus || 'Tap any word to hear it on its own, or listen from the highlighted sentence.'}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setActiveSentence((index) => Math.max(0, index - 1))}
            disabled={activeSentence === 0}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-40 dark:bg-gray-800 dark:text-gray-300"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous
          </button>
          <button
            type="button"
            onClick={completeCurrentSentence}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white"
          >
            <Check className="h-4 w-4" aria-hidden />
            Mark sentence complete
          </button>
          <button
            type="button"
            onClick={() => setActiveSentence((index) => Math.min(passage.sentences.length - 1, index + 1))}
            disabled={activeSentence === passage.sentences.length - 1}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600 disabled:opacity-40 dark:bg-gray-800 dark:text-gray-300"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-gray-800">
          <button
            type="button"
            onClick={() => {
              stopSpeech();
              setActiveSentence(0);
              setCompletedSentences([]);
              setSpeechStatus('Reading progress restarted.');
            }}
            className="inline-flex items-center gap-2 rounded-full border-2 border-slate-200 px-4 py-2 text-xs font-black text-slate-600 dark:border-gray-700 dark:text-gray-300"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Restart reading
          </button>
          <button
            type="button"
            onClick={handleComplete}
            disabled={completedSentences.length === 0}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-violet-600 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check className="h-4 w-4" aria-hidden />
            {progress === 100 ? 'Finish reading adventure' : 'Save partial reading'}
          </button>
        </div>
      </section>
    </div>
  );
};

export default DyslexiaReadAloudActivity;
