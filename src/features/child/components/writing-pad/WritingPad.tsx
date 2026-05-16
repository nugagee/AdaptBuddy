import React, { useState, useRef, useEffect } from 'react';
import { 
  PenTool, Mic, Volume2, Save, Trash2, Download,
  Type, Grid3X3, Palette, Eye, HelpCircle
} from 'lucide-react';
import { useTheme } from 'hooks/useTheme';

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
  const [lineSpacing, setLineSpacing] = useState<'wide' | 'medium' | 'narrow'>('medium');
  const [showGuides, setShowGuides] = useState(true);
  const [overlayColor, setOverlayColor] = useState<'none' | 'yellow' | 'blue' | 'green'>('none');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { theme } = useTheme();

  // Speech-to-text
  const toggleRecording = () => {
    if (!isRecording) {
      // Start recording
      const win: any = window as any;
      if (win.SpeechRecognition || win.webkitSpeechRecognition) {
        const SpeechRecognition: any = win.SpeechRecognition || win.webkitSpeechRecognition;
        const recognition: any = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event: any) => {
          const transcript = Array.from(event.results as any)
            .map((result: any) => (result[0] && result[0].transcript) || '')
            .join('');
          setContent((prev) => prev + ' ' + transcript);
        };

        recognition.start();
        setIsRecording(true);
      }
    } else {
      setIsRecording(false);
    }
  };

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