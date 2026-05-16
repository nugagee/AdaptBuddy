import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Heart, Shield, Mail, Lock, User, Eye, EyeOff, Apple, Chrome } from 'lucide-react';
import { useAuth } from 'hooks/useAuth';
import { UserRole } from 'services/supabase/client';
import { ROUTES } from 'constants/routes';
import adaptbuddyLogo from 'assets/Adaptbuddy_logo.png';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, signInWithApple, setGuestMode } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('parent');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(email.trim(), password);
      navigate(ROUTES.NEURO_SELECTOR);
    } catch (err: any) {
      const errorText = err.error_description || err.message || JSON.stringify(err) || 'Invalid email or password';
      setError(errorText);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signUp(email.trim(), password, name.trim(), role);
      alert('Account created! Please check your email to verify.');
      setIsLogin(true);
    } catch (err: any) {
      const errorText = err.error_description || err.message || JSON.stringify(err) || 'Failed to create account';
      setError(errorText);
      console.error('Signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    setGuestMode();
    window.location.href = ROUTES.NEURO_SELECTOR;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="max-w-6xl w-full mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src={adaptbuddyLogo}
              alt="AdaptBuddy"
              className="h-24 w-auto object-contain drop-shadow-md"
            />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            AdaptBuddy
          </h1>
          <p className="text-gray-600 mt-2">Neuro-inclusive learning with emotional safeguarding</p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl">
              <h2 className="text-3xl font-bold mb-4">Your brain is unique.</h2>
              <p className="text-gray-600 text-lg">Your learning should be too.</p>
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <Brain className="w-5 h-5 text-blue-600" />
                  <span>10+ Neurotypes supported</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                  <Heart className="w-5 h-5 text-green-600" />
                  <span>AI-powered Worry Diary</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <span>Real-time safeguarding alerts</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl mb-8">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 rounded-lg font-semibold transition ${isLogin ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600'}`}
              >
                Login
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 rounded-lg font-semibold transition ${!isLogin ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600'}`}
              >
                Sign Up
              </button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

            {isLogin ? (
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block font-medium mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-3 border rounded-xl focus:border-blue-400 outline-none" required />
                  </div>
                </div>
                <div>
                  <label className="block font-medium mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-12 py-3 border rounded-xl focus:border-blue-400 outline-none" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignup} className="space-y-6">
                <div>
                  <label className="block font-medium mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full pl-12 pr-4 py-3 border rounded-xl focus:border-blue-400 outline-none" required />
                  </div>
                </div>
                <div>
                  <label className="block font-medium mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-3 border rounded-xl focus:border-blue-400 outline-none" required />
                  </div>
                </div>
                <div>
                  <label className="block font-medium mb-2">I am a...</label>
                  <div className="grid grid-cols-3 gap-3">
                    {(['parent', 'teacher', 'child'] as UserRole[]).map(r => (
                      <button key={r} type="button" onClick={() => setRole(r)} className={`py-2 rounded-lg font-medium ${role === r ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block font-medium mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-12 py-3 border rounded-xl focus:border-blue-400 outline-none" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50">
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <button onClick={handleGuest} className="text-gray-500 hover:text-blue-600 transition">
                Continue as Guest →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
