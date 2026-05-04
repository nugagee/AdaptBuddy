import React from 'react';
import { BrowserRouter as Router, NavLink, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'; // ✅ Added useLocation
import { ThemeProvider } from './context/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import NeuroSelector from './components/NeuroSelector/NeuroSelector';
import Dashboard from './pages/Dashboard';
import ParentHub from './pages/ParentHub';
import MusicMenu from './components/MusicMenu/MusicMenu';
import WritingPad from './components/WritingPad/WritingPad';
import TeacherLogin from './components/School/TeacherLogin';
import TeacherDashboard from './components/School/TeacherDashboard';
import Classes from './components/School/Classes';
import Students from './components/School/Students';
import Reports from './components/School/Reports';
import Settings from './components/School/Settings';

const AppRoutes: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation(); // ✅ Get current location
  
  // ✅ Check if we're on a teacher page
  const isTeacherPage = location.pathname.startsWith('/teacher');

  return (
    <>
      {/* ✅ Only show main menu if NOT on teacher page */}
      {!isTeacherPage && (
        <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-2xl border-2 border-blue-200 dark:border-blue-800">
          <div className="flex flex-col gap-2">
            <NavLink
              to="/neuro-selector"
              className={({ isActive }) => `px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span>🧠</span> Neuro-Selector
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                isActive 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span>📱</span> Child Dashboard
            </NavLink>
            <NavLink
              to="/writing-pad"
              className={({ isActive }) => `px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                isActive 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span>✍️</span> Writing Pad
            </NavLink>
            <NavLink
              to="/parent-hub"
              className={({ isActive }) => `px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                isActive 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span>👨‍👩‍👧‍👦</span> Parent Hub
            </NavLink>
            <NavLink
              to="/music"
              className={({ isActive }) => `px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                isActive 
                  ? 'bg-pink-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span>🎵</span> Calming Sounds
            </NavLink>
          </div>
        </div>
      )}

      {/* ✅ Teacher Login Button - show on all non-teacher pages */}
      {!isTeacherPage && (
        <NavLink
          to="/teacher"
          className="fixed bottom-4 left-4 z-50 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-2xl hover:scale-105 transition"
        >
          <span>👨‍🏫</span> Teacher Login
        </NavLink>
      )}

      {/* Routes */}
      <Routes>
        <Route path="/" element={<Navigate to="/neuro-selector" replace />} />
        <Route path="/neuro-selector" element={<div className="pb-32"><NeuroSelector onContinue={() => navigate('/dashboard')} /></div>} />
        <Route path="/dashboard" element={<div className="pb-32"><Dashboard /></div>} />
        <Route path="/writing-pad" element={<div className="pb-32"><WritingPad /></div>} />
        <Route path="/parent-hub" element={<div className="pb-32"><ParentHub /></div>} />
        <Route path="/music" element={<div className="pb-32"><MusicMenu /></div>} />
        <Route path="/teacher" element={<div className="pb-32"><TeacherLogin /></div>} />
        <Route path="/teacher/dashboard" element={<div className="pb-32"><TeacherDashboard /></div>} />
        <Route path="/teacher/classes" element={<div className="pb-32"><Classes /></div>} />
        <Route path="/teacher/students" element={<div className="pb-32"><Students /></div>} />
        <Route path="/teacher/reports" element={<div className="pb-32"><Reports /></div>} />
        <Route path="/teacher/settings" element={<div className="pb-32"><Settings /></div>} />
      </Routes>
    </>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-white dark:bg-gray-900 sepia:bg-sepia-50 transition-colors duration-300">
          <ThemeToggle />
          <AppRoutes />
        </div>
      </Router>
    </ThemeProvider>
  );
};

export default App;