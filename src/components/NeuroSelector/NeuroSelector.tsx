import React, { useState } from 'react';
import { Brain, Zap, BookOpen, Target, Calculator, MessageSquare, Eye, Music, Check } from 'lucide-react';
import { NeuroOption } from '../../types/neuro';

interface NeuroSelectorProps {
  onContinue: () => void;
}

const neuroOptions: NeuroOption[] = [
  { id: 'autism', name: 'Autism', description: 'Visual schedules, sensory tools', colorClass: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'adhd', name: 'ADHD', description: 'Focus timers, task breakdown', colorClass: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { id: 'dyslexia', name: 'Dyslexia', description: 'Special fonts, color overlays', colorClass: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'dyspraxia', name: 'Dyspraxia', description: 'Motor skill games', colorClass: 'bg-green-100 text-green-800 border-green-300' },
  { id: 'dyscalculia', name: 'Dyscalculia', description: 'Visual math tools', colorClass: 'bg-red-100 text-red-800 border-red-300' },
  { id: 'tourettes', name: 'Tourette\'s', description: 'Tic-friendly activities', colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { id: 'sensory', name: 'Sensory', description: 'Calm zones, adjustments', colorClass: 'bg-pink-100 text-pink-800 border-pink-300' },
  { id: 'speech', name: 'Speech', description: 'Voice input, articulation', colorClass: 'bg-teal-100 text-teal-800 border-teal-300' },
];

const NeuroSelector: React.FC<NeuroSelectorProps> = ({ onContinue }) => {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const getIcon = (id: string) => {
    const icons: Record<string, React.ReactNode> = {
      autism: <Brain className="w-8 h-8" />,
      adhd: <Zap className="w-8 h-8" />,
      dyslexia: <BookOpen className="w-8 h-8" />,
      dyspraxia: <Target className="w-8 h-8" />,
      dyscalculia: <Calculator className="w-8 h-8" />,
      tourettes: <MessageSquare className="w-8 h-8" />,
      sensory: <Eye className="w-8 h-8" />,
      speech: <Music className="w-8 h-8" />,
    };
    return icons[id] || <Brain className="w-8 h-8" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-8 md:mb-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-neuro-blue mb-4">🧠 AdaptBuddy</h1>
          <p className="text-lg text-gray-600">Personalized learning for every neurotype</p>
        </header>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6 md:p-8 mb-8">
          <h2 className="text-3xl font-bold mb-2 text-gray-800">How do you learn best?</h2>
          <p className="text-gray-500 mb-8">Select all that apply. We'll customize your experience.</p>

          {/* Neuro Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {neuroOptions.map((option) => {
              const isSelected = selected.includes(option.id);
              return (
                <button
                  key={option.id}
                  onClick={() => toggleSelection(option.id)}
                  className={`p-6 rounded-2xl border-2 flex flex-col items-center transition-all duration-300 ${option.colorClass} ${
                    isSelected 
                      ? 'border-neuro-blue scale-105 shadow-lg' 
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {getIcon(option.id)}
                  <h3 className="text-xl font-bold mt-4 mb-2">{option.name}</h3>
                  <p className="text-sm text-center text-gray-600 mb-4">{option.description}</p>
                  {isSelected && (
                    <div className="flex items-center text-neuro-green font-bold">
                      <Check className="w-5 h-5 mr-2" /> Selected
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selection Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-6 md:mb-0">
                <h3 className="text-2xl font-bold text-neuro-blue">Selected: {selected.length} / 8</h3>
                <p className="text-gray-600 mt-2">
                  {selected.length > 0 
                    ? neuroOptions.filter(o => selected.includes(o.id)).map(o => o.name).join(', ')
                    : 'Select your learning preferences'
                  }
                </p>
              </div>
              <button 
                onClick={onContinue}
                className="bg-gradient-to-r from-neuro-blue to-neuro-green text-white px-8 py-4 rounded-xl font-bold text-lg hover:scale-105 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={selected.length === 0}
              >
                Continue to My AdaptBuddy →
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm">
          <p>🔐 Secure • 📱 Mobile-First • 🧠 Neuro-Inclusive • ♿ Accessible Design</p>
          <p className="mt-2">© 2025 AdaptBuddy. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default NeuroSelector;