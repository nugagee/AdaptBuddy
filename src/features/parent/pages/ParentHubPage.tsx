import React from 'react';
import { Bell, TrendingUp, Users, Shield, MessageSquare, Download, Settings } from 'lucide-react';
import EmotionAnalysisCard from 'features/ai/components/EmotionAnalysisCard';
import SentimentTrendChart from 'features/analytics/components/SentimentTrendChart';

const ParentHubPage: React.FC = () => {
  const alerts = [
    { type: 'success', title: 'Daily Check-In Complete', time: '2 hours ago', desc: 'Alex completed feelings journal. Emotion: 😊 Happy' },
    { type: 'warning', title: 'Focus Difficulty', time: '5 hours ago', desc: 'Math lesson took 25% longer. Suggested break taken.' },
    { type: 'info', title: 'New Badge Earned!', time: 'Yesterday', desc: '"Pattern Master" badge in visual thinking game.' },
  ];

  const trustedAdults = [
    { name: 'You (Parent)', role: 'Primary contact', status: 'active' },
    { name: 'Ms. Johnson', role: 'Class Teacher', status: 'connected' },
    { name: 'Dr. Ahmed', role: 'Therapist', status: 'pending' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm p-5">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Parent Hub</h1>
            <p className="text-sm text-gray-500">Connected to <span className="text-blue-600 font-bold">Alex's AdaptBuddy</span></p>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
              P
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-5">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-8 h-8 text-blue-500" />
              <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">+12%</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Learning Progress</h3>
            <p className="text-3xl font-bold text-blue-700">70%</p>
            <p className="text-sm text-gray-500">15 lessons this week</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-green-500" />
              <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">Stable</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Wellbeing</h3>
            <p className="text-3xl font-bold text-green-700">8.2/10</p>
            <p className="text-sm text-gray-500">Positive trend</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <Shield className="w-8 h-8 text-purple-500" />
              <span className="bg-purple-100 text-purple-800 text-xs font-bold px-3 py-1 rounded-full">Secure</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Alerts</h3>
            <p className="text-3xl font-bold text-purple-700">2</p>
            <p className="text-sm text-gray-500">New this week</p>
          </div>
        </div>

        // Add this section in ParentHub:
<div className="mt-8">
  <h2 className="text-xl font-bold mb-4">🧠 AI Emotional Insights</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <EmotionAnalysisCard 
      analysis={{
        emotion: 'calm',
        confidence: 0.82,
        keywords: ['happy', 'good'],
        riskLevel: 'low',
        sentimentScore: 0.6,
        timestamp: new Date()
      }}
    />
    <SentimentTrendChart 
      data={[
        { date: '2024-12-25', moodScore: 7, engagement: 80, focusDuration: 45, activitiesCompleted: 3 },
        { date: '2024-12-26', moodScore: 8, engagement: 85, focusDuration: 50, activitiesCompleted: 4 },
        { date: '2024-12-27', moodScore: 6, engagement: 70, focusDuration: 30, activitiesCompleted: 2 },
        { date: '2024-12-28', moodScore: 9, engagement: 90, focusDuration: 60, activitiesCompleted: 5 },
      ]}
    />
  </div>
</div>

        {/* Alerts */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Recent Alerts</h2>
            <span className="text-blue-600 font-bold">2 New</span>
          </div>
          <div className="space-y-4">
            {alerts.map((alert, idx) => (
              <div
                key={idx}
                className={`p-5 rounded-xl border-l-4 ${
                  alert.type === 'success'
                    ? 'border-green-500 bg-green-50'
                    : alert.type === 'warning'
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    alert.type === 'success' ? 'bg-green-100' :
                    alert.type === 'warning' ? 'bg-yellow-100' : 'bg-blue-100'
                  }`}>
                    <Bell className={`w-5 h-5 ${
                      alert.type === 'success' ? 'text-green-600' :
                      alert.type === 'warning' ? 'text-yellow-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold mb-1">{alert.title}</h3>
                    <p className="text-gray-600 text-sm">{alert.desc}</p>
                    <p className="text-xs text-gray-400 mt-2">{alert.time}</p>
                  </div>
                  <button className="text-gray-400 hover:text-gray-700">
                    <MessageSquare className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trusted Adults */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Trusted Adults</h2>
            <button className="flex items-center gap-2 text-blue-600 font-bold">
              + Add New
            </button>
          </div>
          <div className="space-y-4">
            {trustedAdults.map((adult, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-bold">
                    {adult.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold">{adult.name}</h3>
                    <p className="text-sm text-gray-500">{adult.role}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  adult.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : adult.status === 'connected'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {adult.status.charAt(0).toUpperCase() + adult.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="bg-gradient-to-r from-blue-50 to-blue-100 p-5 rounded-2xl flex flex-col items-center justify-center border-2 border-blue-200">
            <Download className="w-8 h-8 text-blue-600 mb-3" />
            <span className="font-bold text-center">Full Report</span>
          </button>
          <button className="bg-gradient-to-r from-green-50 to-green-100 p-5 rounded-2xl flex flex-col items-center justify-center border-2 border-green-200">
            <MessageSquare className="w-8 h-8 text-green-600 mb-3" />
            <span className="font-bold text-center">Message Teacher</span>
          </button>
          <button className="bg-gradient-to-r from-purple-50 to-purple-100 p-5 rounded-2xl flex flex-col items-center justify-center border-2 border-purple-200">
            <Settings className="w-8 h-8 text-purple-600 mb-3" />
            <span className="font-bold text-center">Privacy Settings</span>
          </button>
          <button className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-5 rounded-2xl flex flex-col items-center justify-center border-2 border-yellow-200">
            <TrendingUp className="w-8 h-8 text-yellow-600 mb-3" />
            <span className="font-bold text-center">Trends</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t pt-6 pb-8">
        <div className="max-w-6xl mx-auto px-6 text-center text-gray-500 text-sm">
          <p>🔐 End-to-End Encryption • 📱 Real-Time Sync • 🧠 AI-Powered Insights • ♿ Accessibility First</p>
          <p className="mt-2">© 2025 AdaptBuddy Parent Hub • v2.1.0</p>
        </div>
      </footer>
    </div>
  );
};

export default ParentHubPage;