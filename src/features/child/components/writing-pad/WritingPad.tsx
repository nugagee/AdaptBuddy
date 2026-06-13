import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Download,
  Eraser,
  Grid3X3,
  Mic,
  MicOff,
  PenLine,
  Save,
  Sparkles,
  Volume2,
} from 'lucide-react';
import ChildDashboardNavbar from 'features/child/components/layout/ChildDashboardNavbar';
import { useAuth } from 'hooks/useAuth';
import {
  countWords,
  getLineHeight,
  getOverlayRgba,
  LINE_SPACING_OPTIONS,
  loadSavedWriting,
  OVERLAY_OPTIONS,
  persistWriting,
  type LineSpacing,
  type OverlayColor,
} from './writingPadHelpers';
import './writing-pad.css';

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionEventLike = Event & {
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

interface WritingPadProps {
  onSave?: (content: string) => void;
  initialContent?: string;
}

const WritingPad: React.FC<WritingPadProps> = ({ onSave, initialContent = '' }) => {
  const { profile } = useAuth();
  const [content, setContent] = useState(initialContent);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('');
  const [lineSpacing, setLineSpacing] = useState<LineSpacing>('medium');
  const [showGuides, setShowGuides] = useState(true);
  const [overlayColor, setOverlayColor] = useState<OverlayColor>('none');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recordingBaseContentRef = useRef('');

  const firstName = profile?.first_name || 'Friend';
  const neuroTypes = profile?.neuro_types ?? [];
  const useDyslexicFont = neuroTypes.includes('dyslexia');
  const hasDysgraphia = neuroTypes.includes('dysgraphia');

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  useEffect(() => {
    if (initialContent) return;
    const saved = loadSavedWriting();
    if (saved) setContent(saved);
  }, [initialContent]);

  const getSpeechRecognition = () => {
    if (typeof window === 'undefined') return undefined;
    const speechWindow = window as SpeechWindow;
    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  };

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(() => {
    const SpeechRecognition = getSpeechRecognition();

    if (!SpeechRecognition) {
      setRecordingStatus('Voice typing is not available in this browser. You can still type normally.');
      return;
    }

    stopRecording();

    const recognition = new SpeechRecognition();
    recordingBaseContentRef.current = content.trimEnd();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      const baseContent = recordingBaseContentRef.current;
      const nextContent = [baseContent, transcript.trim()].filter(Boolean).join(' ');
      setContent(nextContent);
      setRecordingStatus('Listening… speak at your own pace.');
    };
    recognition.onerror = () => {
      setRecordingStatus('Voice typing could not hear clearly. Try again, or type your words.');
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
      setRecordingStatus((current) =>
        current.startsWith('Listening') ? 'Voice typing paused.' : current,
      );
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsRecording(true);
      setRecordingStatus('Listening… speak at your own pace.');
      textareaRef.current?.focus();
    } catch {
      setRecordingStatus('Voice typing is already starting. Try again in a moment.');
    }
  }, [content, stopRecording]);

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  useEffect(() => () => stopRecording(), [stopRecording]);

  const speakContent = () => {
    if (!content.trim() || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const handleSave = () => {
    onSave?.(content);
    persistWriting(content);
    setLastSaved(new Date());
    setSaveFlash(true);
    window.setTimeout(() => setSaveFlash(false), 800);
  };

  const clearContent = () => {
    setContent('');
    persistWriting('');
    setShowClearConfirm(false);
    setRecordingStatus('');
    textareaRef.current?.focus();
  };

  const downloadContent = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `my-writing-${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const lineHeight = getLineHeight(lineSpacing);
  const wordCount = countWords(content);

  const toolbarBtn =
    'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-adapt-indigo/50 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-adapt-cloud via-white to-adapt-mist/40 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 sepia:from-amber-50 sepia:via-amber-50/90 sepia:to-amber-100/60">
      <div
        className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-adapt-purple/10 blur-3xl animate-auth-neon-drift"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 top-72 h-64 w-64 rounded-full bg-adapt-teal/12 blur-3xl animate-auth-neon-drift-slow"
        aria-hidden
      />

      <ChildDashboardNavbar />

      <main className="relative mx-auto max-w-5xl space-y-6 px-4 pb-20 pt-6 sm:px-6 sm:pt-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-gradient-to-br from-adapt-indigo/10 via-white/85 to-adapt-purple/10 p-6 shadow-card backdrop-blur-sm dark:border-white/10 dark:from-adapt-indigo/20 dark:via-gray-900/90 dark:to-adapt-purple/10 sm:p-8">
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-adapt-indigo/15 blur-2xl" aria-hidden />

          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-adapt-indigo/80 dark:text-adapt-cyan">
                {greeting}, {firstName}
              </p>
              <h1 className="mt-2 text-3xl font-extrabold leading-tight text-adapt-navy dark:text-gray-50 sm:text-4xl">
                Your quiet{' '}
                <span className="bg-gradient-to-r from-adapt-indigo to-adapt-teal bg-clip-text text-transparent">
                  writing space
                </span>
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-gray-400 sm:text-base">
                {hasDysgraphia
                  ? 'Express yourself your way — type, speak, or take your time. There is no rush here.'
                  : 'A calm place to gather your thoughts. Type freely, use your voice, or listen back.'}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3 rounded-2xl border border-white/70 bg-white/60 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/60">
              <PenLine className="h-5 w-5 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
              <div>
                <p className="text-lg font-bold tabular-nums text-adapt-navy dark:text-gray-100">
                  {wordCount}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Words</p>
              </div>
            </div>
          </div>
        </section>

        {hasDysgraphia && (
          <div
            className="flex items-start gap-3 rounded-2xl border border-violet-200/80 bg-violet-50/90 p-4 dark:border-violet-900/50 dark:bg-violet-950/30"
            role="note"
          >
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" aria-hidden />
            <p className="text-sm text-violet-900 dark:text-violet-100">
              Try <span className="font-semibold">voice typing</span> or wider line spacing — tools
              are here to support how <em>you</em> write best.
            </p>
          </div>
        )}

        {/* Toolbar */}
        <section
          className="flex flex-wrap items-center gap-2 rounded-[1.75rem] border border-white/60 bg-white/65 p-3 backdrop-blur-sm dark:border-white/10 dark:bg-gray-900/55 sm:gap-3 sm:p-4"
          aria-label="Writing tools"
        >
          <button
            type="button"
            onClick={toggleRecording}
            className={`${toolbarBtn} ${
              isRecording
                ? 'bg-red-500 text-white shadow-md writing-mic-pulse'
                : 'border border-white/80 bg-white/90 text-adapt-navy hover:border-adapt-indigo/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100'
            }`}
          >
            {isRecording ? (
              <MicOff className="h-4 w-4" aria-hidden />
            ) : (
              <Mic className="h-4 w-4" aria-hidden />
            )}
            {isRecording ? 'Stop voice' : 'Voice type'}
          </button>

          <button
            type="button"
            onClick={speakContent}
            disabled={!content.trim()}
            className={`${toolbarBtn} border border-white/80 bg-white/90 text-adapt-navy hover:border-adapt-indigo/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100`}
          >
            <Volume2 className="h-4 w-4" aria-hidden />
            Listen
          </button>

          <button
            type="button"
            onClick={handleSave}
            className={`${toolbarBtn} bg-adapt-navy text-white shadow-soft hover:bg-adapt-purple dark:bg-adapt-indigo dark:hover:bg-adapt-purple ${
              saveFlash ? 'writing-save-flash' : ''
            }`}
          >
            <Save className="h-4 w-4" aria-hidden />
            Save
          </button>

          <button
            type="button"
            onClick={downloadContent}
            disabled={!content.trim()}
            className={`${toolbarBtn} border border-white/80 bg-white/90 text-adapt-navy hover:border-adapt-indigo/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100`}
          >
            <Download className="h-4 w-4" aria-hidden />
            Download
          </button>

          {!showClearConfirm ? (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              disabled={!content.trim()}
              className={`${toolbarBtn} border border-red-200/80 bg-red-50/80 text-red-600 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300`}
            >
              <Eraser className="h-4 w-4" aria-hidden />
              Clear
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-full border border-red-200/80 bg-red-50/90 px-3 py-1.5 dark:border-red-900/50 dark:bg-red-950/30">
              <span className="text-xs font-medium text-red-700 dark:text-red-200">Clear all?</span>
              <button
                type="button"
                onClick={clearContent}
                className="rounded-full bg-red-500 px-3 py-1 text-xs font-semibold text-white"
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="rounded-full px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-200"
              >
                Cancel
              </button>
            </div>
          )}

          {lastSaved && (
            <span className="ml-auto hidden text-xs text-slate-500 sm:inline dark:text-gray-400">
              Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </section>

        {recordingStatus && (
          <p
            className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
              isRecording
                ? 'border-red-200/80 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200'
                : 'border-sky-200/80 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200'
            }`}
            role="status"
          >
            {recordingStatus}
          </p>
        )}

        {/* Accessibility settings */}
        <section
          className="rounded-[1.75rem] border border-white/60 bg-white/55 p-5 backdrop-blur-sm dark:border-white/10 dark:bg-gray-900/50"
          aria-label="Writing preferences"
        >
          <div className="mb-4 flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-adapt-indigo dark:text-adapt-cyan" aria-hidden />
            <h2 className="text-sm font-bold text-adapt-navy dark:text-gray-100">
              Make it comfortable
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Line spacing
              </p>
              <div className="flex flex-wrap gap-2">
                {LINE_SPACING_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setLineSpacing(value)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      lineSpacing === value
                        ? 'bg-adapt-navy text-white shadow-soft dark:bg-adapt-indigo'
                        : 'border border-white/80 bg-white/80 text-slate-600 hover:text-adapt-navy dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Reading overlay
              </p>
              <div className="flex flex-wrap gap-2">
                {OVERLAY_OPTIONS.map(({ value, label, swatch }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOverlayColor(value)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      overlayColor === value
                        ? 'bg-adapt-indigo/15 text-adapt-indigo ring-2 ring-adapt-indigo/30 dark:bg-adapt-cyan/15 dark:text-adapt-cyan dark:ring-adapt-cyan/30'
                        : 'border border-white/80 bg-white/80 text-slate-600 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300'
                    }`}
                  >
                    <span className={`h-3.5 w-3.5 rounded-full border border-black/10 ${swatch}`} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <label className="inline-flex cursor-pointer items-center gap-3 rounded-2xl border border-white/70 bg-white/70 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/70">
              <input
                type="checkbox"
                checked={showGuides}
                onChange={(e) => setShowGuides(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-adapt-indigo focus:ring-adapt-indigo/30"
              />
              <span className="text-sm font-medium text-adapt-navy dark:text-gray-200">
                Show gentle line guides
              </span>
            </label>
          </div>
        </section>

        {/* Canvas */}
        <section
          className={`relative overflow-hidden rounded-[2rem] border border-white/70 shadow-card transition-shadow dark:border-white/10 ${
            saveFlash ? 'writing-save-flash' : ''
          }`}
        >
          {showGuides && (
            <div
              className="pointer-events-none absolute inset-0 z-0"
              style={{
                backgroundImage: `repeating-linear-gradient(transparent, transparent calc(${lineHeight} - 1px), rgba(148, 163, 184, 0.22) calc(${lineHeight} - 1px), rgba(148, 163, 184, 0.22) ${lineHeight})`,
              }}
              aria-hidden
            />
          )}

          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{ backgroundColor: getOverlayRgba(overlayColor) }}
            aria-hidden
          />

          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing here… take your time, one word at a time."
            className={`relative z-10 min-h-[min(70vh,560px)] w-full resize-y bg-transparent p-6 text-lg text-adapt-navy outline-none placeholder:text-slate-400 dark:text-gray-100 dark:placeholder:text-gray-500 sm:p-8 ${
              useDyslexicFont ? 'font-dyslexic' : 'font-sans'
            }`}
            style={{ lineHeight }}
            spellCheck
            aria-label="Writing area"
          />
        </section>

        <footer className="flex flex-col gap-2 rounded-2xl border border-dashed border-adapt-indigo/20 bg-adapt-indigo/5 px-5 py-4 text-center text-sm text-slate-600 dark:border-adapt-cyan/20 dark:bg-adapt-cyan/5 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p>
            {content.length} characters · auto-saves when you press Save
          </p>
          <p className="text-xs">
            Tip: voice typing works best in a quiet room with the mic button
          </p>
        </footer>
      </main>
    </div>
  );
};

export default WritingPad;
