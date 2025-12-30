import React, { useState } from 'react';
import { BookOpen, Heart, Clock, Trophy, Settings, Bell, Sun, Volume2, Type, Music } from 'lucide-react';
import FeelingsJournal from '../components/FeelingsJournal/FeelingsJournal';
// Recommendation engine service
import { RecommendationEngine } from '../services/recommendationEngine';

const Dashboard: React.FC = () => {
  const [showJournal, setShowJournal] = useState(false);

  const quickActions = [
    { icon: <BookOpen className="w-8 h-8" />, label: "Today's Lesson", desc: "Math • 15 min", color: "bg-blue-100 text-blue-800" },
    { icon: <Heart className="w-8 h-8" />, label: "My Feelings", desc: "Check in", color: "bg-green-100 text-green-800" },
    { icon: <Clock className="w-8 h-8" />, label: "Focus Timer", desc: "Pomodoro", color: "bg-yellow-100 text-yellow-800" },
    { icon: <Trophy className="w-8 h-8" />, label: "My Rewards", desc: "Stars & badges", color: "bg-purple-100 text-purple-800" },
  ];

  const accessibilityTools = [
    { icon: <Sun className="w-6 h-6" />, label: "Color Overlay", desc: "Yellow/Blue/Green" },
    { icon: <Type className="w-6 h-6" />, label: "Big Text", desc: "Easier reading" },
    { icon: <Volume2 className="w-6 h-6" />, label: "Read Aloud", desc: "Text-to-speech" },
    { icon: <Music className="w-6 h-6" />, label: "Calm Sounds", desc: "Lo-fi, nature" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">My AdaptBuddy</h1>
              <p className="text-sm text-gray-500">Welcome back, Alex! 👋</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center text-white font-bold">
              A
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {/* Progress Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Today's Progress</h2>
            <span className="text-blue-600 font-bold">70%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-gradient-to-r from-blue-500 to-green-400" style={{ width: '70%' }}></div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-700">3/5</p>
              <p className="text-sm text-gray-500">Lessons</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">2</p>
              <p className="text-sm text-gray-500">Check-ins</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-700">8</p>
              <p className="text-sm text-gray-500">Stars</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              className={`p-6 rounded-2xl border-2 border-gray-200 flex flex-col items-center justify-center hover:scale-105 transition ${action.color}`}
              onClick={() => idx === 1 && setShowJournal(true)}
            >
              {action.icon}
              <span className="font-bold mt-3">{action.label}</span>
              <span className="text-sm mt-1">{action.desc}</span>
            </button>
          ))}
        </div>

        {/* Accessibility Tools */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
          <h2 className="text-xl font-bold mb-4">Accessibility Tools</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {accessibilityTools.map((tool, idx) => (
              <button
                key={idx}
                className="p-4 rounded-xl border-2 border-gray-200 hover:border-blue-400 flex flex-col items-center"
              >
                {tool.icon}
                <span className="font-medium mt-2">{tool.label}</span>
                <span className="text-sm text-gray-500">{tool.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recommended Activities */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Recommended For You</h2>
          <div className="space-y-4">
            {/* AI-Powered Recommendations */}
            <div className="mt-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4">
              <h3 className="text-lg font-semibold mb-3">🤖 AI-Powered Picks</h3>
              <div className="space-y-3">
                {RecommendationEngine.recommend(['autism', 'adhd'], 0.7, 'calm', []).map((rec, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <h4 className="font-bold">{rec.title}</h4>
                      <p className="text-sm text-gray-600">{rec.description}</p>
                      <div className="flex gap-2 mt-2">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{rec.learningStyle}</span>
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">AI Confidence: {(rec.aiConfidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Try It</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Manual Recommendations */}
            <div className="bg-white p-4 rounded-xl flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">Pattern Matching Game</h3>
                <p className="text-sm text-gray-600">Visual thinking • 10 minutes</p>
              </div>
              <button className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold">Start</button>
            </div>

            <div className="bg-white p-4 rounded-xl flex items-center gap-4">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center">
                <Heart className="w-7 h-7 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">Breathing Exercise</h3>
                <p className="text-sm text-gray-600">Calm your mind • 5 minutes</p>
              </div>
              <button className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold">Start</button>
            </div>
          </div>
        </div>
      </main>

      {/* Feelings Journal Modal */}
      {showJournal && <FeelingsJournal onClose={() => setShowJournal(false)} />}
    </div>
  );
};

export default Dashboard;