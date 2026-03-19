import React, { useState } from 'react';
import { 
  Brain, Zap, BookOpen, Target, Calculator, MessageSquare, 
  Eye, Music, PenTool, Volume, Check, Sparkles, Waves,
  Sun, Moon, Cloud, Wind, Leaf, Heart, Star, Bell
} from 'lucide-react';
import { NeuroOption } from '../../types/neuro';
import { useTheme } from '../../context/ThemeContext';

// Intentionally reference these icons so they are reserved for future use
// (prevents @typescript-eslint/no-unused-vars warnings while keeping imports)
void MessageSquare;
void Eye;
void Music;
void Moon;
void Cloud;
void Wind;
void Leaf;
void Heart;
void Star;
void Bell;

interface NeuroSelectorProps {
  onContinue: () => void;
}

// ENHANCED: Each neurotype now has FULL personality profile
const neuroOptions: NeuroOption[] = [
  { 
    id: 'autism', 
    name: '🧩 Autism', 
    description: 'Visual schedules, routine support, sensory-friendly',
    longDescription: 'Structured learning with clear routines and visual guides',
    colorClass: 'bg-blue-50 text-blue-900 border-blue-300 hover:bg-blue-100',
    icon: Brain,
    theme: {
      primary: 'blue',
      secondary: 'indigo',
      background: 'bg-blue-50',
      cardBg: 'bg-white/90',
      accent: 'border-l-4 border-blue-500'
    },
    learningStyle: 'Visual & Structured'
  },
  { 
    id: 'adhd', 
    name: '🦋 ADHD', 
    description: 'Focus timers, movement breaks, gamified',
    longDescription: 'Energetic learning with built-in movement and rewards',
    colorClass: 'bg-yellow-50 text-yellow-900 border-yellow-300 hover:bg-yellow-100',
    icon: Zap,
    theme: {
      primary: 'yellow',
      secondary: 'orange',
      background: 'bg-yellow-50',
      cardBg: 'bg-white/90',
      accent: 'border-l-4 border-yellow-500'
    },
    learningStyle: 'Dynamic & Gamified'
  },
  { 
    id: 'dyslexia', 
    name: '📖 Dyslexia', 
    description: 'OpenDyslexic font, colored overlays, audio',
    longDescription: 'Text-to-speech, special fonts, and reading support',
    colorClass: 'bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100',
    icon: BookOpen,
    theme: {
      primary: 'purple',
      secondary: 'violet',
      background: 'bg-purple-50',
      cardBg: 'bg-white/90',
      accent: 'border-l-4 border-purple-500'
    },
    learningStyle: 'Multi-sensory Reading'
  },
  { 
    id: 'dysgraphia', 
    name: '✍️ Dysgraphia', 
    description: 'Speech-to-text, writing guides, motor support',
    longDescription: 'Express ideas through voice, drawing, or assisted writing',
    colorClass: 'bg-green-50 text-green-900 border-green-300 hover:bg-green-100',
    icon: PenTool,
    theme: {
      primary: 'green',
      secondary: 'emerald',
      background: 'bg-green-50',
      cardBg: 'bg-white/90',
      accent: 'border-l-4 border-green-500'
    },
    learningStyle: 'Voice & Motor-Friendly'
  },
  { 
    id: 'dyscalculia', 
    name: '🧮 Dyscalculia', 
    description: 'Visual math tools, number patterns',
    longDescription: 'Math made visual with patterns and real-world examples',
    colorClass: 'bg-red-50 text-red-900 border-red-300 hover:bg-red-100',
    icon: Calculator,
    theme: {
      primary: 'red',
      secondary: 'rose',
      background: 'bg-red-50',
      cardBg: 'bg-white/90',
      accent: 'border-l-4 border-red-500'
    },
    learningStyle: 'Visual Mathematics'
  },
  { 
    id: 'dyspraxia', 
    name: '🤸 Dyspraxia', 
    description: 'Coordination games, motor planning',
    longDescription: 'Movement-friendly activities and coordination support',
    colorClass: 'bg-teal-50 text-teal-900 border-teal-300 hover:bg-teal-100',
    icon: Target,
    theme: {
      primary: 'teal',
      secondary: 'cyan',
      background: 'bg-teal-50',
      cardBg: 'bg-white/90',
      accent: 'border-l-4 border-teal-500'
    },
    learningStyle: 'Movement & Coordination'
  },
  { 
    id: 'spd', 
    name: '🎵 SPD (Sensory)', 
    description: 'Calming sounds, brightness control',
    longDescription: 'Sensory regulation tools and calming environments',
    colorClass: 'bg-pink-50 text-pink-900 border-pink-300 hover:bg-pink-100',
    icon: Waves,
    theme: {
      primary: 'pink',
      secondary: 'rose',
      background: 'bg-pink-50',
      cardBg: 'bg-white/90',
      accent: 'border-l-4 border-pink-500'
    },
    learningStyle: 'Sensory-Regulated'
  },
  { 
    id: 'auditory', 
    name: '👂 Auditory Processing', 
    description: 'Clear speech, visual reinforcements',
    longDescription: 'Enhanced audio with visual cues and captions',
    colorClass: 'bg-indigo-50 text-indigo-900 border-indigo-300 hover:bg-indigo-100',
    icon: Volume,
    theme: {
      primary: 'indigo',
      secondary: 'blue',
      background: 'bg-indigo-50',
      cardBg: 'bg-white/90',
      accent: 'border-l-4 border-indigo-500'
    },
    learningStyle: 'Visual + Audio Support'
  },
  { 
    id: 'visual-stress', 
    name: '👁️ Visual Stress', 
    description: 'Low contrast, font scaling, color themes',
    longDescription: 'Comfortable viewing with adjustable visual settings',
    colorClass: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100',
    icon: Sun,
    theme: {
      primary: 'amber',
      secondary: 'yellow',
      background: 'bg-amber-50',
      cardBg: 'bg-white/90',
      accent: 'border-l-4 border-amber-500'
    },
    learningStyle: 'Visual Comfort'
  },
  { 
    id: 'tourettes', 
    name: '💫 Tourette\'s', 
    description: 'Tic-friendly, no time pressure',
    longDescription: 'Flexible timing and accepting interface',
    colorClass: 'bg-violet-50 text-violet-900 border-violet-300 hover:bg-violet-100',
    icon: Sparkles,
    theme: {
      primary: 'violet',
      secondary: 'purple',
      background: 'bg-violet-50',
      cardBg: 'bg-white/90',
      accent: 'border-l-4 border-violet-500'
    },
    learningStyle: 'Flexible & Accepting'
  }
];

const NeuroSelector: React.FC<NeuroSelectorProps> = ({ onContinue }) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { theme, setTheme } = useTheme();

  const toggleSelection = (id: string) => {
    setSelected(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-300 ${
      theme === 'light' ? 'bg-gradient-to-br from-blue-50 to-green-50' :
      theme === 'dark' ? 'bg-gradient-to-br from-gray-900 to-gray-800' :
      'bg-gradient-to-br from-sepia-100 to-amber-50'
    }`}>
      <div className="max-w-7xl mx-auto">
        {/* ENHANCED Header with animation */}
        <header className="mb-8 md:mb-12 text-center animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-neuro-blue to-neuro-green bg-clip-text text-transparent mb-4">
            🧠 AdaptBuddy
          </h1>
          <p className="text-xl text-gray-600">Your brain is unique. Your learning should be too.</p>
          <div className="mt-4 flex justify-center gap-2">
            <span className="px-4 py-2 bg-white/80 rounded-full text-sm shadow-sm">✨ 10 Neurotypes</span>
            <span className="px-4 py-2 bg-white/80 rounded-full text-sm shadow-sm">🎨 Personalized Themes</span>
          </div>

          {/* Theme quick-select buttons */}
          <div className="flex justify-center gap-2 mt-4">
            <button onClick={() => setTheme('light')} aria-label="Light theme" className="w-8 h-8 rounded-full bg-white border-2 border-gray-300 hover:scale-110 transition" />
            <button onClick={() => setTheme('dark')} aria-label="Dark theme" className="w-8 h-8 rounded-full bg-gray-800 border-2 border-gray-600 hover:scale-110 transition" />
            <button onClick={() => setTheme('sepia')} aria-label="Sepia theme" className="w-8 h-8 rounded-full bg-amber-100 border-2 border-amber-300 hover:scale-110 transition" />
          </div>
        </header>

        {/* Theme Preview Buttons - ADD THIS */}
        <div className="flex justify-center gap-3 mb-6">
          <button 
            onClick={() => setTheme('light')} 
            aria-label="Activate light theme"
            className={`w-10 h-10 rounded-full bg-white border-2 hover:scale-110 transition-all ${
              theme === 'light' ? 'border-neuro-blue ring-4 ring-neuro-blue/20' : 'border-gray-300'
            }`}
            title="Light Mode"
          />
          <button 
            onClick={() => setTheme('dark')} 
            aria-label="Activate dark theme"
            className={`w-10 h-10 rounded-full bg-gray-800 border-2 hover:scale-110 transition-all ${
              theme === 'dark' ? 'border-neuro-blue ring-4 ring-neuro-blue/20' : 'border-gray-600'
            }`}
            title="Dark Mode"
          />
          <button 
            onClick={() => setTheme('sepia')} 
            aria-label="Activate comfort (sepia) theme"
            className={`w-10 h-10 rounded-full bg-amber-100 border-2 hover:scale-110 transition-all ${
              theme === 'sepia' ? 'border-neuro-blue ring-4 ring-neuro-blue/20' : 'border-amber-300'
            }`}
            title="Comfort Mode"
          />
        </div>

        // In your NeuroSelector, make cards taller:
         className="p-6 rounded-2xl border-2 flex flex-col items-center min-h-[280px]" // Add min-height

        {/* ENHANCED Main Card */}
        <div className={`${
          theme === 'light' ? 'bg-white' :
          theme === 'dark' ? 'bg-gray-800' :
          'bg-sepia-50'
        } backdrop-blur-sm rounded-3xl shadow-2xl p-6 md:p-8 mb-8 border border-white/50`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">How do you learn best?</h2>
              <p className="text-gray-600 mt-2">Select all that feel like you. We'll adapt everything!</p>
            </div>
            <div className="mt-4 md:mt-0 px-6 py-3 bg-gradient-to-r from-neuro-blue to-neuro-green rounded-full text-white font-bold">
              {selected.length} / 10 Selected
            </div>
          </div>

          {/* ENHANCED Neuro Grid - Now with FULL personality cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-10">
            {neuroOptions.map((option) => {
              const isSelected = selected.includes(option.id);
              const isHovered = hoveredId === option.id;
              const IconComponent = option.icon as React.ComponentType<any> | undefined;
              
              return (
                <button
                  key={option.id}
                  onClick={() => toggleSelection(option.id)}
                  onMouseEnter={() => setHoveredId(option.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`group relative p-6 rounded-2xl border-2 transition-all duration-300 ${option.colorClass} ${
                    isSelected 
                      ? 'border-neuro-blue scale-[1.02] shadow-xl ring-4 ring-neuro-blue/20' 
                      : 'border-gray-200 hover:border-gray-400 hover:scale-[1.02] hover:shadow-lg'
                  }`}
                >
                  {/* Selected Badge */}
                  {isSelected && (
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-neuro-green rounded-full flex items-center justify-center text-white shadow-lg">
                      <Check className="w-5 h-5" />
                    </div>
                  )}

                  {/* Icon with animation */}
                  <div className="flex justify-center mb-4 transform group-hover:scale-110 transition-transform">
                    {IconComponent && (
                      <IconComponent className={`w-12 h-12 ${
                        option.theme?.primary === 'blue' ? 'text-blue-600' :
                        option.theme?.primary === 'yellow' ? 'text-yellow-600' :
                        option.theme?.primary === 'purple' ? 'text-purple-600' :
                        option.theme?.primary === 'green' ? 'text-green-600' :
                        option.theme?.primary === 'red' ? 'text-red-600' :
                        option.theme?.primary === 'teal' ? 'text-teal-600' :
                        option.theme?.primary === 'pink' ? 'text-pink-600' :
                        option.theme?.primary === 'indigo' ? 'text-indigo-600' :
                        option.theme?.primary === 'amber' ? 'text-amber-600' :
                        'text-violet-600'
                      }`} />
                    )}
                  </div>

                  {/* Name with emoji */}
                  <h3 className="text-xl font-bold mb-2">{option.name}</h3>
                  
                  {/* Learning style badge */}
                  <span className="inline-block px-3 py-1 bg-white/80 rounded-full text-xs font-medium mb-3 shadow-sm">
                    {option.learningStyle}
                  </span>
                  
                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-3">{option.description}</p>
                  
                  {/* Hover long description */}
                  {isHovered && (
                    <div className="absolute left-0 right-0 bottom-0 p-4 bg-white/95 backdrop-blur-sm rounded-b-2xl border-t border-gray-200 animate-slide-up">
                      <p className="text-xs text-gray-700">{option.longDescription}</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* ENHANCED Selection Summary */}
          <div className="bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 rounded-2xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-6 md:mb-0">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Your Learning Profile</h3>
                <div className="flex flex-wrap gap-2">
                  {selected.length > 0 ? (
                    neuroOptions
                      .filter(o => selected.includes(o.id))
                      .map(o => (
                        <span key={o.id} className={`px-4 py-2 rounded-full text-sm font-medium shadow-sm ${o.colorClass}`}>
                          {o.name}
                        </span>
                      ))
                  ) : (
                    <p className="text-gray-500">Select your learning preferences above ✨</p>
                  )}
                </div>
              </div>
              
              <button 
                onClick={onContinue}
                className="bg-gradient-to-r from-neuro-blue to-neuro-green text-white px-10 py-4 rounded-xl font-bold text-lg hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 group"
                disabled={selected.length === 0}
              >
                <span>Create My Personalized Space</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          </div>
        </div>

        {/* ENHANCED Footer with safeguards */}
        <footer className="text-center">
          <div className="flex justify-center gap-4 mb-4">
            <span className="px-4 py-2 bg-white/80 rounded-full text-xs text-gray-600 shadow-sm">🔐 Secure & Private</span>
            <span className="px-4 py-2 bg-white/80 rounded-full text-xs text-gray-600 shadow-sm">📱 Works on All Devices</span>
            <span className="px-4 py-2 bg-white/80 rounded-full text-xs text-gray-600 shadow-sm">♿ Fully Accessible</span>
            <span className="px-4 py-2 bg-white/80 rounded-full text-xs text-gray-600 shadow-sm">🛡️ Safeguarding Ready</span>
          </div>
          <p className="text-gray-500 text-sm">© 2025 AdaptBuddy. Built with 💙 for every unique brain</p>
        </footer>
      </div>
    </div>
  );
};

export default NeuroSelector;