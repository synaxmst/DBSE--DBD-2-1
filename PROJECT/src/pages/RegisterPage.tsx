import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useJudge } from '../context/JudgeContext';
import { Lock, Mail, User, ArrowRight, Loader2 } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { registerUser, currentUser } = useJudge();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    if (currentUser) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !email || !password) {
      setError('Username, email, and password are required.');
      return;
    }

    setIsLoading(true);
    try {
      await registerUser(username, email, password, name || undefined);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 py-12 page-fade">
      <div className="w-full max-w-[440px] rounded-[var(--r-xl)] bg-[var(--bg-elevated)] border border-[var(--border)] shadow-[var(--shadow-lg)] overflow-hidden space-y-6 p-7">
        
        {/* Header */}
        <div className="space-y-1.5 text-center">
          <div className="inline-flex items-center gap-1.5 text-[var(--accent)] font-semibold text-xs tracking-wider uppercase mb-1">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            AlgoFlow Platform
          </div>
          <h1 className="text-xl font-bold text-[var(--text-1)] tracking-tight">
            Create Your Account
          </h1>
          <p className="text-[13px] text-[var(--text-3)]">
            Join the distributed code assessment & competitive programming arena.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {error && (
            <div className="p-3 rounded-[var(--r-md)] bg-[var(--red-dim)] border border-[var(--red)]/20 text-[12px] text-[var(--red)] font-medium">
              {error}
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-[var(--text-2)]">
              Full Name (Optional)
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[var(--text-3)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Chen"
                className="w-full h-[38px] bg-[var(--bg-canvas)] border border-[var(--border)] focus:border-[var(--accent)] rounded-[var(--r-md)] px-3 pl-9 text-[14px] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-[var(--text-2)]">
              Username *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[var(--text-3)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. alex_dev"
                required
                className="w-full h-[38px] bg-[var(--bg-canvas)] border border-[var(--border)] focus:border-[var(--accent)] rounded-[var(--r-md)] px-3 pl-9 text-[14px] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-[var(--text-2)]">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[var(--text-3)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                className="w-full h-[38px] bg-[var(--bg-canvas)] border border-[var(--border)] focus:border-[var(--accent)] rounded-[var(--r-md)] px-3 pl-9 text-[14px] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-[var(--text-2)]">
              Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[var(--text-3)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className="w-full h-[38px] bg-[var(--bg-canvas)] border border-[var(--border)] focus:border-[var(--accent)] rounded-[var(--r-md)] px-3 pl-9 text-[14px] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full justify-center !h-[38px] !text-[13px] mt-2 flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : null}
            <span>{isLoading ? 'Creating Account...' : 'Create Account'}</span>
            {!isLoading && <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </form>

        {/* Footer Link to Login */}
        <div className="text-center border-t border-[var(--border)] pt-4 text-[12px] text-[var(--text-3)]">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--accent)] hover:underline font-medium">
            Sign In
          </Link>
        </div>

      </div>
    </div>
  );
};
