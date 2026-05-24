import React, { useState } from 'react';
import { BookOpen, Heart, Clock, Trophy, Sun, Volume2, Type, Music } from 'lucide-react';
import ChildDashboardNavbar from 'features/child/components/layout/ChildDashboardNavbar';
import FeelingsJournal from 'features/child/components/journal/FeelingsJournal';
import { RecommendationEngine } from 'services/ai/recommendationEngine';
import { useAuth } from 'hooks/useAuth';

const ChildDashboardPage: React.FC = () => {
  const [showJournal, setShowJournal] = useState(false);
  const { profile } = useAuth();

  const firstName = profile?.first_name || 'Friend';
  const neuroTypes = profile?.neuro_types?.length ? profile.neuro_types : ['autism', 'adhd'];

  const quickActions = [
    { icon: <BookOpen className="w-8 h-8" />, label: "Today's Lesson", desc: 'Math • 15 min', color: 'bg-blue-100 text-blue-800' },
    { icon: <Heart className="w-8 h-8" />, label: 'My Feelings', desc: 'Check in', color: 'bg-green-100 text-green-800' },
    { icon: <Clock className="w-8 h-8" />, label: 'Focus Timer', desc: 'Pomodoro', color: 'bg-yellow-100 text-yellow-800' },
    { icon: <Trophy className="w-8 h-8" />, label: 'My Rewards', desc: 'Stars & badges', color: 'bg-purple-100 text-purple-800' },
  ];

  const accessibilityTools = [
    { icon: <Sun className="w-6 h-6" />, label: 'Color Overlay', desc: 'Yellow/Blue/Green' },
    { icon: <Type className="w-6 h-6" />, label: 'Big Text', desc: 'Easier reading' },
    { icon: <Volume2 className="w-6 h-6" />, label: 'Read Aloud', desc: 'Text-to-speech' },
    { icon: <Music className="w-6 h-6" />, label: 'Calm Sounds', desc: 'Lo-fi, nature' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-adapt-cloud to-white dark:from-gray-950 dark:to-gray-900">
      <ChildDashboardNavbar />

      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        <div className="mb-6 rounded-3xl bg-gradient-to-r from-adapt-indigo/10 via-adapt-teal/10 to-adapt-cyan/10 p-6 dark:from-adapt-indigo/20 dark:via-gray-800 dark:to-gray-800">
          <h1 className="text-2xl font-extrabold text-adapt-navy dark:text-gray-100 sm:text-3xl">
            Welcome back, {firstName}! 🌟
          </h1>
          <p className="mt-2 text-slate-600 dark:text-gray-400">
            Your space is tuned for {neuroTypes.length} learning preference{neuroTypes.length === 1 ? '' : 's'}.
          </p>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-soft dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-adapt-navy dark:text-gray-100">Today&apos;s Progress</h2>
            <span className="font-bold text-adapt-indigo dark:text-adapt-cyan">70%</span>
          </div>
          <div className="mb-4 h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div className="h-full bg-gradient-to-r from-adapt-indigo to-adapt-teal" style={{ width: '70%' }} />
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-adapt-indigo">3/5</p>
              <p className="text-sm text-slate-500">Lessons</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">2</p>
              <p className="text-sm text-slate-500">Check-ins</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">8</p>
              <p className="text-sm text-slate-500">Stars</p>
            </div>
          </div>
        </div>

        <h2 className="mb-4 text-xl font-bold text-adapt-navy dark:text-gray-100">Quick Actions</h2>
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {quickActions.map((action, idx) => (
            <button
              key={action.label}
              type="button"
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-transparent p-6 transition hover:scale-[1.02] hover:shadow-md ${action.color}`}
              onClick={() => idx === 1 && setShowJournal(true)}
            >
              {action.icon}
              <span className="mt-3 font-bold">{action.label}</span>
              <span className="mt-1 text-sm">{action.desc}</span>
            </button>
          ))}
        </div>

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-soft dark:bg-gray-900">
          <h2 className="mb-4 text-xl font-bold text-adapt-navy dark:text-gray-100">Accessibility Tools</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {accessibilityTools.map((tool) => (
              <button
                key={tool.label}
                type="button"
                className="flex flex-col items-center rounded-xl border-2 border-slate-100 p-4 transition hover:border-adapt-indigo/40 dark:border-gray-700"
              >
                {tool.icon}
                <span className="mt-2 font-medium">{tool.label}</span>
                <span className="text-sm text-slate-500">{tool.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-r from-blue-50 to-green-50 p-6 shadow-soft dark:from-gray-800 dark:to-gray-900">
          <h2 className="mb-4 text-xl font-bold text-adapt-navy dark:text-gray-100">Recommended For You</h2>
          <div className="space-y-4">
            <div className="rounded-2xl bg-white/80 p-4 dark:bg-gray-900/80">
              <h3 className="mb-3 text-lg font-semibold">🤖 AI-Powered Picks</h3>
              <div className="space-y-3">
                {RecommendationEngine.recommend(neuroTypes, 0.7, 'calm', []).map((rec, idx) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl bg-white p-4 dark:bg-gray-800">
                    <div>
                      <h4 className="font-bold">{rec.title}</h4>
                      <p className="text-sm text-slate-600 dark:text-gray-400">{rec.description}</p>
                    </div>
                    <button type="button" className="rounded-lg bg-adapt-indigo px-4 py-2 text-sm font-bold text-white">
                      Try It
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {showJournal && <FeelingsJournal onClose={() => setShowJournal(false)} />}
    </div>
  );
};

export default ChildDashboardPage;
