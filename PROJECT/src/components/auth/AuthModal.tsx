import React, { useState, useEffect } from 'react';
import { useJudge } from '../../context/JudgeContext';
import { Lock, Mail, User, X, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
interface DemoUser {
  label: string;
  username: string;
  password: string;
  role: 'admin' | 'setter' | 'user';
}

const DEMO_USERS: DemoUser[] = [
  { label: 'Admin', username: 'admin', password: 'Admin@123', role: 'admin' },
  { label: 'Setter', username: 'setter', password: 'Setter@123', role: 'setter' },
  { label: 'User', username: 'bhargava', password: 'User@123', role: 'user' },
];

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    setIsAuthModalOpen, 
    authModalMode, 
    setAuthModalMode, 
    loginUser,
    registerUser 
  } = useJudge();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAuthModalOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [setIsAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (authModalMode === 'login' && (!username || !password)) {
      setError('Please enter your username and password.');
      return;
    }
    if (authModalMode === 'register' && (!username || !email || !password)) {
      setError('All fields are required.');
      return;
    }

    setIsLoading(true);
    try {
      if (authModalMode === 'login') {
        await loginUser(username, password, rememberMe);
      } else {
        await registerUser(username, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (user: DemoUser) => {
    setError('');
    setIsLoading(true);
    try {
      await loginUser(user.username, user.password, rememberMe);
    } catch (err: any) {
      setError(err.message || 'Quick login failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--obsidian)]/80 backdrop-blur-sm">
      <div 
        className="fixed inset-0" 
        onClick={() => setIsAuthModalOpen(false)} 
      />
      <div className="relative w-full max-w-[420px] rounded-[var(--r-xl)] bg-[var(--bg-elevated)] border border-[var(--border)] shadow-[var(--shadow-lg)] overflow-hidden z-10 space-y-5 p-6 page-fade">
        
        {/* Header with Tab switcher */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-1 bg-[var(--bg-card)] p-1 rounded-[var(--r-md)] border border-[var(--border)]">
            <button
              onClick={() => { setAuthModalMode('login'); setError(''); }}
              className={`px-3 py-1 rounded-[var(--r-sm)] text-[12px] font-medium transition-colors ${
                authModalMode === 'login'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-1)] font-semibold shadow-xs'
                  : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthModalMode('register'); setError(''); }}
              className={`px-3 py-1 rounded-[var(--r-sm)] text-[12px] font-medium transition-colors ${
                authModalMode === 'register'
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-1)] font-semibold shadow-xs'
                  : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
              }`}
            >
              Create Account
            </button>
          </div>

          <button
            onClick={() => setIsAuthModalOpen(false)}
            className="text-[var(--text-3)] hover:text-[var(--text-1)] p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-[var(--r-md)] bg-[var(--red-dim)] border border-[var(--red)]/20 text-[12px] text-[var(--red)] font-medium">
              {error}
            </div>
          )}

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[var(--text-2)]">
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[var(--text-3)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alex_dev"
                className="w-full h-[38px] bg-[var(--bg-canvas)] border border-[var(--border)] focus:border-[var(--accent)] rounded-[var(--r-md)] px-3 pl-9 text-[14px] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Email for register mode */}
          {authModalMode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-[var(--text-2)]">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[var(--text-3)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-[38px] bg-[var(--bg-canvas)] border border-[var(--border)] focus:border-[var(--accent)] rounded-[var(--r-md)] px-3 pl-9 text-[14px] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-[var(--text-2)]">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--text-3)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full h-[38px] bg-[var(--bg-canvas)] border border-[var(--border)] focus:border-[var(--accent)] rounded-[var(--r-md)] px-3 pl-9 text-[14px] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Remember Me Checkbox for Login */}
          {authModalMode === 'login' && (
            <div className="flex items-center justify-between text-[12px] pt-0.5 select-none">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  id="modal-remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border)] bg-[var(--bg-canvas)] text-[var(--accent)] accent-[var(--accent)] focus:ring-0 focus:outline-none cursor-pointer"
                />
                <span className="text-[var(--text-2)] group-hover:text-[var(--text-1)] transition-colors font-medium">
                  Remember Me
                </span>
              </label>
              <span className="text-[11px] text-[var(--text-3)]">
                {rememberMe ? 'Stay signed in' : 'Session only'}
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full justify-center !h-[38px] !text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{authModalMode === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
              </>
            ) : (
              <>
                <span>{authModalMode === 'login' ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Demo Login Switcher */}
        <div className="border-t border-[var(--border)] pt-4 space-y-2.5">
          <div className="flex items-center justify-between text-[12px] text-[var(--text-3)]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" /> Demo Accounts:
            </span>
            <span className="text-[11px]">Quick Switch</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {DEMO_USERS.map(user => (
              <button
                key={user.username}
                type="button"
                onClick={() => handleQuickLogin(user)}
                disabled={isLoading}
                className="p-2 rounded-[var(--r-md)] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-left transition-colors space-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="text-[12px] font-medium text-[var(--text-1)] truncate">{user.label}</div>
                <div className="text-[11px] font-mono text-[var(--text-3)] truncate">@{user.username}</div>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

