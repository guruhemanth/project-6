import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Eye, EyeOff, ShieldCheck, Sparkles, Building2, AlertCircle } from 'lucide-react';
import api from '../services/api';
import useCollectionStore from '../store/useCollectionStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useCollectionStore();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ username: '', password: '', society_name: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.username.trim() || !form.password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    if (mode === 'register') {
      if (form.username.trim().length < 3) {
        setError('Username must be at least 3 characters.');
        return;
      }
      if (form.password.length < 4) {
        setError('Password must be at least 4 characters.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { data } = await api.post('/api/auth/login', {
          username: form.username.trim(),
          password: form.password,
        });
        login(data.token, data.username, data.role, data.adminId, data.societyName);
        navigate('/', { replace: true });
      } else {
        // Register mode: Creates a new Admin with their own collection space
        const { data } = await api.post('/api/auth/register', {
          username: form.username.trim(),
          password: form.password,
          society_name: form.society_name.trim() || `${form.username.trim()} Society`,
        });
        login(data.token, data.username, data.role, data.adminId, data.societyName);
        navigate('/', { replace: true });
      }
    } catch (err) {
      const serverMsg = err.response?.data?.error;
      if (err.response?.status === 401) {
        setError('Invalid username or password. Please check your credentials and try again.');
      } else {
        setError(serverMsg || `${mode === 'login' ? 'Login' : 'Registration'} failed. Please check your connection.`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-300 p-4">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl" />
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-orange-300/20 rounded-full blur-lg" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-7 sm:p-8 border border-white/50 space-y-6">
          {/* Festival Header */}
          <div className="text-center">
            <div className="text-5xl mb-2">🕉</div>
            <h1 className="text-2xl font-bold text-gray-800">Festival Collections</h1>
            <p className="text-orange-600 font-medium text-sm mt-0.5">Vinayaka Chavithi Chandas 2026</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="h-px w-10 bg-gradient-to-r from-transparent to-orange-300" />
              <span className="text-orange-500 text-xs font-medium">🙏 గణపతి బాప్పా మోరయా 🙏</span>
              <div className="h-px w-10 bg-gradient-to-l from-transparent to-orange-300" />
            </div>
          </div>

          {/* 2-Button Mode Switch (Login vs Register) */}
          <div className="grid grid-cols-2 p-1 bg-orange-100/70 rounded-xl border border-orange-200">
            <button
              type="button"
              onClick={() => handleModeSwitch('login')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                mode === 'login'
                  ? 'bg-white text-orange-700 shadow-sm'
                  : 'text-orange-900/70 hover:text-orange-900'
              }`}
            >
              <LogIn size={16} />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeSwitch('register')}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                mode === 'register'
                  ? 'bg-white text-orange-700 shadow-sm'
                  : 'text-orange-900/70 hover:text-orange-900'
              }`}
            >
              <UserPlus size={16} />
              <span>New Admin Space</span>
            </button>
          </div>

          {/* Error / Invalid Credentials Alert */}
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-start gap-2.5 animate-in">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="font-medium leading-snug">{error}</div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm rounded-xl text-center font-medium">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Society / Space Name (Only in Register Mode) */}
            {mode === 'register' && (
              <div className="animate-in">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Building2 size={13} className="text-orange-500" />
                  <span>Society / Pandal Name</span>
                </label>
                <input
                  type="text"
                  name="society_name"
                  value={form.society_name}
                  onChange={handleChange}
                  className="input-field !py-2.5 text-sm"
                  placeholder="e.g. SaiNagar Colony / GovindaNagar"
                  autoFocus
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                {mode === 'register' ? 'Admin Username' : 'Username'}
              </label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                className="input-field !py-2.5 text-sm"
                placeholder={mode === 'register' ? 'e.g. ShankarAdmin' : 'Enter your username'}
                autoComplete="username"
                autoFocus={mode === 'login'}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className="input-field !py-2.5 pr-10 text-sm"
                  placeholder={mode === 'register' ? 'Min 4 characters' : 'Enter your password'}
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div className="bg-orange-50 rounded-xl p-3 border border-orange-100 flex items-start gap-2 text-xs text-orange-800 animate-in">
                <ShieldCheck size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
                <span>
                  Creating an Admin account will set up a private collection space for your society. You will be able to create and manage collectors inside your dashboard.
                </span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 !py-3 !text-sm !font-bold mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <LogIn size={18} />
                  <span>Sign In</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Create Admin Space & Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Mode Switch Helper Footer */}
          <div className="text-center pt-2 border-t border-gray-100 text-xs text-gray-500">
            {mode === 'login' ? (
              <p>
                Representing a new society/colony?{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('register')}
                  className="text-orange-600 font-bold hover:underline ml-0.5"
                >
                  Create Admin Space
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('login')}
                  className="text-orange-600 font-bold hover:underline ml-0.5"
                >
                  Sign in here
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
