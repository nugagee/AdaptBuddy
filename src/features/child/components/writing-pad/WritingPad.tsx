import React, { useState, useRef, useEffect } from 'react';
import { 
  Mic, Volume2, Save, Trash2, Download,
  Grid3X3, Eye, HelpCircle
} from 'lucide-react';
import { useTheme } from 'hooks/useTheme';

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

interface WritingPadProps {
  onSave?: (content: string) => void;
  initialContent?: string;
  neurotype?: string; // For specialized features
}

const WritingPad: React.FC<WritingPadProps> = ({ 
  onSave, 
  initialContent = '',
  neurotype = 'general'
}) => {
  const [content, setContent] = useState(initialContent);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState('');
  const [lineSpacing, setLineSpacing] = useState<'wide' | 'medium' | 'narrow'>('medium');
  const [showGuides, setShowGuides] = useState(true);
  const [overlayColor, setOverlayColor] = useState<'none' | 'yellow' | 'blue' | 'green'>('none');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recordingBaseContentRef = useRef('');
  const { theme } = useTheme();

  // Speech-to-text
  const getSpeechRecognition = () => {
    if (typeof window === 'undefined') return undefined;
    const speechWindow = window as SpeechWindow;
    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
  };

  const startRecording = () => {
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
      setRecordingStatus('Listening...');
    };
    recognition.onerror = () => {
      setRecordingStatus('Voice typing could not hear clearly. Try again, or type your words.');
      setIsRecording(false);
    };
    recognition.onend = () => {
      setIsRecording(false);
      setRecordingStatus((current) => (current === 'Listening...' ? 'Voice typing paused.' : current));
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsRecording(true);
      setRecordingStatus('Listening...');
      textareaRef.current?.focus();
    } catch {
      setRecordingStatus('Voice typing is already starting. Try again in a moment.');
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => () => stopRecording(), []);

  // Text-to-speech
  const speakContent = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.rate = 0.9; // Slightly slower for comprehension
      window.speechSynthesis.speak(utterance);
    }
  };

  // Save content
  const handleSave = () => {
    if (onSave) {
      onSave(content);
    }
    // Also save to localStorage as backup
    localStorage.setItem('writingPad_lastSave', content);
  };

  // Clear content
  const clearContent = () => {
    if (window.confirm('Clear all writing? This cannot be undone.')) {
      setContent('');
    }
  };

  // Download as text file
  const downloadContent = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-writing-${new Date().toISOString().slice(0,10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get line height based on spacing
  const getLineHeight = () => {
    switch(lineSpacing) {
      case 'wide': return '3rem';
      case 'medium': return '2.5rem';
      case 'narrow': return '2rem';
      default: return '2.5rem';
    }
  };

  // Get overlay styles
  const getOverlayStyle = () => {
    switch(overlayColor) {
      case 'yellow': return 'rgba(255, 255, 0, 0.1)';
      case 'blue': return 'rgba(0, 0, 255, 0.1)';
      case 'green': return 'rgba(0, 255, 0, 0.1)';
      default: return 'transparent';
    }
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-300 ${
      theme === 'light' ? 'bg-gray-50' :
      theme === 'dark' ? 'bg-gray-900' :
      'bg-sepia-50'
    }`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-neuro-blue to-neuro-green bg-clip-text text-transparent">
              ✍️ Writing Pad
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              {neurotype === 'dysgraphia' ? 'Express yourself your way - write, speak, or draw!' : 'Write, record, and listen to your work'}
            </p>
          </div>
          
          {/* Toolbar */}
          <div className="flex gap-2">
            <button
              onClick={toggleRecording}
              className={`p-3 rounded-full transition-all ${
                isRecording 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:scale-110'
              }`}
              title={isRecording ? 'Stop recording' : 'Start voice typing'}
            >
              <Mic className="w-5 h-5" />
            </button>
            <button
              onClick={speakContent}
              className="p-3 bg-white dark:bg-gray-800 rounded-full hover:scale-110 transition"
              title="Listen to writing"
              disabled={!content}
            >
              <Volume2 className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>
            <button
              onClick={handleSave}
              className="p-3 bg-white dark:bg-gray-800 rounded-full hover:scale-110 transition"
              title="Save"
            >
              <Save className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>
            <button
              onClick={downloadContent}
              className="p-3 bg-white dark:bg-gray-800 rounded-full hover:scale-110 transition"
              title="Download as text file"
            >
              <Download className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>
            <button
              onClick={clearContent}
              className="p-3 bg-white dark:bg-gray-800 rounded-full hover:scale-110 transition"
              title="Clear all"
            >
              <Trash2 className="w-5 h-5 text-red-500" />
            </button>
          </div>
        </header>

        {recordingStatus && (
          <div
            className={`mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
              isRecording
                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200'
                : 'border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200'
            }`}
          >
            {recordingStatus}
          </div>
        )}

        {/* Settings Bar */}
        <div className="mb-6 flex flex-wrap gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-gray-500" />
            <select 
              value={lineSpacing}
              onChange={(e) => setLineSpacing(e.target.value as any)}
              className="p-2 rounded border dark:bg-gray-700 dark:text-white"
            >
              <option value="wide">Wide spacing</option>
              <option value="medium">Medium spacing</option>
              <option value="narrow">Narrow spacing</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-gray-500" />
            <select
              value={overlayColor}
              onChange={(e) => setOverlayColor(e.target.value as any)}
              className="p-2 rounded border dark:bg-gray-700 dark:text-white"
            >
              <option value="none">No overlay</option>
              <option value="yellow">Yellow overlay</option>
              <option value="blue">Blue overlay</option>
              <option value="green">Green overlay</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showGuides}
              onChange={(e) => setShowGuides(e.target.checked)}
              id="showGuides"
              className="w-4 h-4"
            />
            <label htmlFor="showGuides" className="text-gray-700 dark:text-gray-200">
              Show line guides
            </label>
          </div>
        </div>

        {/* Writing Area */}
        <div 
          className="relative rounded-xl overflow-hidden shadow-2xl"
          style={{
            background: theme === 'dark' ? '#1f2937' : theme === 'sepia' ? '#f8efe3' : 'white',
          }}
        >
          {/* Line guides background */}
          {showGuides && (
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'repeating-linear-gradient(transparent, transparent ' + getLineHeight() + ', rgba(200, 200, 200, 0.2) ' + getLineHeight() + ')',
              }}
            />
          )}

          {/* Color overlay */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundColor: getOverlayStyle(),
            }}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Start writing, speaking, or drawing your thoughts here..."
            className={`w-full min-h-[500px] p-6 text-lg font-${neurotype === 'dyslexia' ? 'opendyslexic' : 'sans'} relative z-10 bg-transparent ${
              theme === 'dark' ? 'text-white' : 'text-gray-800'
            }`}
            style={{
              lineHeight: getLineHeight(),
              background: 'transparent',
            }}
          />
        </div>

        {/* Word Count & Tips */}
        <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
          <div>
            Words: {content.trim() ? content.trim().split(/\s+/).length : 0} | 
            Characters: {content.length}
          </div>
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            <span>Try voice typing or listen to your work!</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WritingPad;
