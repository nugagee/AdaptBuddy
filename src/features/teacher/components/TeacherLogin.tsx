import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, School, Eye, EyeOff } from 'lucide-react';
import { useTheme } from 'hooks/useTheme';
import { ROUTES } from 'constants/routes';

const TeacherLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [schoolCode, setSchoolCode] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate(); // ✅ Initialize navigate
  const { theme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate login (in real app, connect to backend)
    setTimeout(() => {
      // Mock successful login
      localStorage.setItem('teacherSession', JSON.stringify({
        email,
        schoolCode,
        loggedInAt: new Date().toISOString()
      }));
      setIsLoading(false);
      
      // ✅ ACTUALLY NAVIGATE TO DASHBOARD
      navigate('/teacher/dashboard'); // THIS IS THE KEY LINE!
      
    }, 1500);
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${
      theme === 'light' ? 'bg-gradient-to-br from-blue-50 to-green-50' :
      theme === 'dark' ? 'bg-gradient-to-br from-gray-900 to-gray-800' :
      'bg-gradient-to-br from-sepia-100 to-amber-50'
    }`}>
      <div className={`max-w-md w-full ${
        theme === 'light' ? 'bg-white' :
        theme === 'dark' ? 'bg-gray-800' :
        'bg-sepia-50'
      } rounded-3xl shadow-2xl p-8`}>
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gradient-to-r from-neuro-blue to-neuro-green rounded-2xl mb-4">
            <School className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-neuro-blue to-neuro-green bg-clip-text text-transparent">
            Teacher Portal
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            Access your classes, assignments, and student progress
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* School Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              School Code
            </label>
            <input
              type="text"
              value={schoolCode}
              onChange={(e) => setSchoolCode(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:border-neuro-blue focus:outline-none transition"
              placeholder="e.g., CAM-2025"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:border-neuro-blue focus:outline-none transition"
                placeholder="teacher@school.edu"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:border-neuro-blue focus:outline-none transition"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                {showPassword ? 
                  <EyeOff className="w-5 h-5 text-gray-400" /> : 
                  <Eye className="w-5 h-5 text-gray-400" />
                }
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-neuro-blue focus:ring-neuro-blue"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
            </label>
            <Link
              to={ROUTES.FORGOT_PASSWORD}
              className="text-sm text-neuro-blue hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-neuro-blue to-neuro-green text-white py-4 rounded-xl font-bold text-lg hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Logging in...</span>
              </>
            ) : (
              <>
                <School className="w-5 h-5" />
                <span>Access Teacher Portal</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">🔐 Demo Access:</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">School: CAM-2025</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Email: teacher@camhelions.org</p>
          <p className="text-sm text-gray-600 dark:text-gray-300">Password: demo123</p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-500">
          Protected by AdaptBuddy Safeguarding • COPPA Compliant • FERPA Ready
        </p>
      </div>
    </div>
  );
};

export default TeacherLogin;