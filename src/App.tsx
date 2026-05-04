import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
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

const AppContent: React.FC = () => {
  const { user, isGuest } = useAuth();
  const isAuthenticated = user !== null || isGuest;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 sepia:bg-sepia-50 transition-colors duration-300">
      <ThemeToggle />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route 
          path="/neuro-selector" 
          element={isAuthenticated ? <div className="pb-32"><NeuroSelector onContinue={() => {}} /></div> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <div className="pb-32"><Dashboard /></div> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/writing-pad" 
          element={isAuthenticated ? <div className="pb-32"><WritingPad /></div> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/parent-hub" 
          element={isAuthenticated ? <div className="pb-32"><ParentHub /></div> : <Navigate to="/" replace />} 
        />
        <Route 
          path="/music" 
          element={isAuthenticated ? <div className="pb-32"><MusicMenu /></div> : <Navigate to="/" replace />} 
        />
        <Route path="/teacher" element={<div className="pb-32"><TeacherLogin /></div>} />
        <Route path="/teacher/dashboard" element={<div className="pb-32"><TeacherDashboard /></div>} />
        <Route path="/teacher/classes" element={<div className="pb-32"><Classes /></div>} />
        <Route path="/teacher/students" element={<div className="pb-32"><Students /></div>} />
        <Route path="/teacher/reports" element={<div className="pb-32"><Reports /></div>} />
        <Route path="/teacher/settings" element={<div className="pb-32"><Settings /></div>} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;