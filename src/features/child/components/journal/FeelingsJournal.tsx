import React, { useState } from 'react';
import { X, Smile, Meh, Frown, Angry, Moon, Mic, Keyboard, Lock } from 'lucide-react';
import { EmotionDetector } from 'services/ai/nlpEmotionDetector';


interface FeelingsJournalProps {
  onClose: () => void;
}

const FeelingsJournal: React.FC<FeelingsJournalProps> = ({ onClose }) => {
  const [selectedFeeling, setSelectedFeeling] = useState<string>('');
  const [note, setNote] = useState('');

  const feelings = [
    { emoji: '😊', label: 'Happy', value: 'happy', icon: <Smile className="w-8 h-8" /> },
    { emoji: '😐', label: 'Okay', value: 'okay', icon: <Meh className="w-8 h-8" /> },
    { emoji: '😔', label: 'Sad', value: 'sad', icon: <Frown className="w-8 h-8" /> },
    { emoji: '😠', label: 'Angry', value: 'angry', icon: <Angry className="w-8 h-8" /> },
    { emoji: '😴', label: 'Tired', value: 'tired', icon: <Moon className="w-8 h-8" /> },
  ];

  const handleSave = () => {
    if (selectedFeeling) {
      // If user entered extra text, run a quick emotion analysis
      if (note && note.trim().length > 0) {
        try {
          const analysis = EmotionDetector.analyze(note);
          // show a lightweight message about detected emotion
          // keep the save UX simple while providing feedback
          alert(`💖 Feeling saved: ${selectedFeeling.charAt(0).toUpperCase() + selectedFeeling.slice(1)}\nAI detected: ${analysis.emotion} (${(analysis.confidence * 100).toFixed(0)}% confidence)`);
        } catch (e) {
          // fallback to normal save if analysis fails
          alert(`💖 Feeling saved: ${selectedFeeling.charAt(0).toUpperCase() + selectedFeeling.slice(1)}`);
        }
      } else {
        alert(`💖 Feeling saved: ${selectedFeeling.charAt(0).toUpperCase() + selectedFeeling.slice(1)}`);
      }
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">My Feelings Journal</h2>
              <p className="text-gray-600">How are you feeling today?</p>
            </div>
            <button
              onClick={onClose}
              className={"w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"}
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
        {/* Feelings Selection */}
        <div className="p-6">
          <div className="grid grid-cols-5 gap-3 mb-8">
            {feelings.map((feeling) => (
              <button
                key={feeling.value}
                onClick={() => setSelectedFeeling(feeling.value)}
                className={`flex flex-col items-center p-3 rounded-2xl transition ${
                  selectedFeeling === feeling.value
                    ? 'bg-green-100 border-2 border-green-400'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <span className="text-3xl mb-2">{feeling.emoji}</span>
                <span className="text-sm font-medium">{feeling.label}</span>
              </button>
            ))}
          </div>

          {/* Input Options */}
          <div className="mb-6">
            <label className="block text-gray-700 mb-3 font-medium">Want to share more? (Optional)</label>
            <div className="flex gap-3 mb-4">
              <button className="flex-1 py-3 bg-blue-100 text-blue-700 rounded-xl font-bold flex items-center justify-center gap-2">
                <Mic className="w-5 h-5" /> Voice
              </button>
              <button className="flex-1 py-3 bg-green-100 text-green-700 rounded-xl font-bold flex items-center justify-center gap-2">
                <Keyboard className="w-5 h-5" /> Text
              </button>
            </div>
            <textarea
              className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-green-400 outline-none"
              rows={3}
              placeholder="Type here if you want to..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Privacy Note */}
          <div className="bg-gray-50 p-4 rounded-2xl mb-6">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <p className="font-bold text-sm">Private & Safe</p>
                <p className="text-sm text-gray-600">This is just for you. Trusted adults only see alerts if you're really upset.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold"
            >
              Maybe Later
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedFeeling}
              className="flex-1 py-4 bg-gradient-to-r from-green-500 to-teal-400 text-white rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeelingsJournal;