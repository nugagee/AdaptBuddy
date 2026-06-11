import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Smile, Meh, Frown, Angry, Moon, Mic, Keyboard, Lock } from 'lucide-react';
import { EmotionDetector } from 'services/ai/nlpEmotionDetector';

type JournalInputMode = 'voice' | 'text';

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = Event & {
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
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

interface FeelingsJournalProps {
  onClose: () => void;
  onSave?: (mood: string) => void;
}

const FeelingsJournal: React.FC<FeelingsJournalProps> = ({ onClose, onSave }) => {
  const [selectedFeeling, setSelectedFeeling] = useState<string>('');
  const [note, setNote] = useState('');
  const [inputMode, setInputMode] = useState<JournalInputMode>('text');
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const feelings = [
    { emoji: '😊', label: 'Happy', value: 'happy', icon: <Smile className="w-8 h-8" /> },
    { emoji: '😐', label: 'Okay', value: 'okay', icon: <Meh className="w-8 h-8" /> },
    { emoji: '😔', label: 'Sad', value: 'sad', icon: <Frown className="w-8 h-8" /> },
    { emoji: '😠', label: 'Angry', value: 'angry', icon: <Angry className="w-8 h-8" /> },
    { emoji: '😴', label: 'Tired', value: 'tired', icon: <Moon className="w-8 h-8" /> },
  ];

  const getSpeechRecognition = () => {
    if (typeof window === 'undefined') return undefined;
    const speechWindow = window as SpeechWindow;
    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  };

  const stopVoiceInput = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  };

  const handleInputModeChange = (mode: JournalInputMode) => {
    setInputMode(mode);
    setVoiceStatus('');
    if (mode === 'text') stopVoiceInput();
  };

  const startVoiceInput = () => {
    const SpeechRecognition = getSpeechRecognition();
    setInputMode('voice');

    if (!SpeechRecognition) {
      setVoiceStatus('Voice is not available in this browser. You can still type your words here.');
      return;
    }

    stopVoiceInput();

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';
    recognition.onresult = (event) => {
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      setNote(transcript.trim());
      setVoiceStatus('Listening...');
    };
    recognition.onerror = () => {
      setVoiceStatus('Voice could not hear clearly. Try again, or use Text.');
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
      setVoiceStatus((current) => (current === 'Listening...' ? 'Voice note paused.' : current));
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
      setVoiceStatus('Listening...');
    } catch {
      setVoiceStatus('Voice is already starting. Try again in a moment.');
    }
  };

  const handleSave = () => {
    if (!selectedFeeling) return;
    stopVoiceInput();

    if (note && note.trim().length > 0) {
      try {
        const analysis = EmotionDetector.analyze(note);
        alert(
          `💖 Feeling saved: ${selectedFeeling.charAt(0).toUpperCase() + selectedFeeling.slice(1)}\nAI detected: ${analysis.emotion} (${(analysis.confidence * 100).toFixed(0)}% confidence)`,
        );
      } catch {
        alert(`💖 Feeling saved: ${selectedFeeling.charAt(0).toUpperCase() + selectedFeeling.slice(1)}`);
      }
    }

    onSave?.(selectedFeeling);
    onClose();
  };

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feelings-journal-title"
    >
      <div className="flex max-h-[min(92vh,720px)] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Fixed header */}
        <div className="shrink-0 border-b border-green-100 bg-gradient-to-r from-green-50 to-teal-50 p-5 dark:border-gray-800 dark:from-green-950/40 dark:to-teal-950/40 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="feelings-journal-title" className="text-xl font-bold text-gray-800 dark:text-gray-100 sm:text-2xl">
                My Feelings Journal
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">How are you feeling today?</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-800"
              aria-label="Close feelings journal"
            >
              <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
          <div className="mb-6 grid grid-cols-5 gap-2 sm:gap-3">
            {feelings.map((feeling) => (
              <button
                key={feeling.value}
                type="button"
                onClick={() => setSelectedFeeling(feeling.value)}
                className={`flex flex-col items-center rounded-2xl p-2 transition sm:p-3 ${
                  selectedFeeling === feeling.value
                    ? 'border-2 border-green-400 bg-green-100 dark:bg-green-950/50'
                    : 'border-2 border-transparent bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700'
                }`}
              >
                <span className="mb-1 text-2xl sm:mb-2 sm:text-3xl">{feeling.emoji}</span>
                <span className="text-[10px] font-medium sm:text-sm">{feeling.label}</span>
              </button>
            ))}
          </div>

          <div className="mb-6">
            <label className="mb-3 block font-medium text-gray-700 dark:text-gray-300">
              Want to share more? (Optional)
            </label>
            <div className="mb-4 flex gap-3">
              <button
                type="button"
                onClick={() => handleInputModeChange('voice')}
                aria-pressed={inputMode === 'voice'}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 font-bold transition ${
                  inputMode === 'voice'
                    ? 'border-blue-400 bg-blue-100 text-blue-700 shadow-sm dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                    : 'border-transparent bg-gray-50 text-gray-600 hover:bg-blue-50 hover:text-blue-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-950/30'
                }`}
              >
                <Mic className="h-5 w-5" aria-hidden />
                Voice
              </button>
              <button
                type="button"
                onClick={() => handleInputModeChange('text')}
                aria-pressed={inputMode === 'text'}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border-2 py-3 font-bold transition ${
                  inputMode === 'text'
                    ? 'border-green-400 bg-green-100 text-green-700 shadow-sm dark:border-green-500 dark:bg-green-950/50 dark:text-green-300'
                    : 'border-transparent bg-gray-50 text-gray-600 hover:bg-green-50 hover:text-green-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-green-950/30'
                }`}
              >
                <Keyboard className="h-5 w-5" aria-hidden />
                Text
              </button>
            </div>
            {inputMode === 'voice' && (
              <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/60 dark:bg-blue-950/30">
                <button
                  type="button"
                  onClick={isListening ? stopVoiceInput : startVoiceInput}
                  className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white shadow-sm transition hover:bg-blue-700"
                >
                  {isListening ? 'Stop listening' : 'Start voice note'}
                </button>
                <p className="mt-2 text-sm text-blue-700 dark:text-blue-200">
                  {voiceStatus || 'Tap start and speak. Your words will appear below.'}
                </p>
              </div>
            )}
            <textarea
              className="w-full rounded-2xl border-2 border-gray-200 p-4 outline-none focus:border-green-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              rows={4}
              placeholder={inputMode === 'voice' ? 'Your voice note will appear here...' : 'Type here if you want to...'}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/80">
            <div className="flex items-start gap-3">
              <Lock className="mt-1 h-5 w-5 shrink-0 text-green-600" aria-hidden />
              <div>
                <p className="text-sm font-bold dark:text-gray-100">Private & Safe</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This is just for you. Trusted adults only see alerts if you&apos;re really upset.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed footer — always visible */}
        <div className="shrink-0 border-t border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 sm:p-5">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border-2 border-gray-300 py-3.5 font-bold text-gray-700 dark:border-gray-600 dark:text-gray-300 sm:py-4"
            >
              Maybe Later
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!selectedFeeling}
              className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-teal-400 py-3.5 font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:py-4"
            >
              Save & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default FeelingsJournal;
