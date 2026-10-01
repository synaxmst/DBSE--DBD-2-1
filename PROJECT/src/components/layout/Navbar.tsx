import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useJudge } from '../../context/JudgeContext';
import { 
  Search, 
  Sun, 
  Moon, 
  LayoutDashboard, 
  FileText, 
  LogOut,
  Shield 
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    currentUser, 
    logoutUser, 
    setIsCommandPaletteOpen,
    theme, 
    toggleTheme 
  } = useJudge();

  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const navItems: { path: string; label: string }[] = [
    { path: '/', label: 'Home' },
    { path: '/problems', label: 'Problems' },
    { path: '/contests', label: 'Contests' },
    { path: '/leaderboard', label: 'Leaderboard' },
    { path: '/submissions', label: 'Submissions' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full h-[48px] border-b border-[var(--border)] bg-[var(--carbon)] text-[var(--text-1)] select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
        
        {/* Left: Brand mark & Nav tabs */}
        <div className="flex items-center gap-8 h-full">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-[var(--text-1)] focus:outline-none cursor-pointer"
          >
            <svg 
              className="w-4 h-4 text-[var(--verdigris)]" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.4" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span className="font-bold text-[14px] tracking-tight text-[var(--text-1)] font-mono">
              AlgoFlow
            </span>
          </button>

          {/* Nav Links: 13px, clean typography, active with Verdigris accent */}
          <nav className="hidden md:flex items-center gap-6 h-full">
            {navItems.map((item) => {
              const isActive = 
                item.path === '/' 
                  ? location.pathname === '/' 
                  : item.path === '/problems'
                  ? location.pathname.startsWith('/problems')
                  : item.path === '/admin'
                  ? location.pathname.startsWith('/admin')
                  : location.pathname === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`relative h-full flex items-center text-[13px] transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[var(--verdigris)] font-medium'
                      : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--verdigris)]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right side: Search pill, Theme toggle, User */}
        <div className="flex items-center gap-3">
          
          {/* 180px search pill with dynamic OS shortcut badge */}
          {(() => {
            const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
            return (
              <button
                onClick={() => setIsCommandPaletteOpen(true)}
                className="w-[180px] h-[30px] flex items-center justify-between px-2.5 rounded-[var(--r-sm)] bg-[var(--ash)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--text-3)] hover:text-[var(--text-2)] text-xs transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-[var(--text-3)]" />
                  <span className="text-[12px] text-[var(--text-3)]">Search...</span>
                </div>
                <kbd className="inline-flex items-center font-mono text-[10px] px-1 rounded bg-[var(--carbon)] border border-[var(--border)] text-[var(--text-3)]">
                  {isMac ? '⌘K' : 'Ctrl+K'}
                </kbd>
              </button>
            );
          })()}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-1 rounded-[var(--r-sm)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-hover)] transition-colors"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </button>

          {/* User Monogram or Sign In / Sign Up */}
          {currentUser ? (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-7 h-7 rounded-full bg-[var(--ash)] border border-[var(--border)] text-[var(--text-1)] flex items-center justify-center text-[12px] font-mono font-medium hover:border-[var(--verdigris)] transition-colors"
              >
                {currentUser.username.substring(0, 2).toUpperCase()}
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsDropdownOpen(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-52 rounded-[var(--r-md)] bg-[var(--ash)] border border-[var(--border)] py-1.5 z-50 divide-y divide-[var(--border)]">
                    <div className="px-3 py-2">
                      <p className="text-xs font-medium text-[var(--text-1)]">{currentUser.name}</p>
                      <p className="text-[11px] text-[var(--text-3)] font-mono truncate">@{currentUser.username}</p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          navigate('/dashboard');
                          setIsDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-hover)] cursor-pointer"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-[var(--text-3)]" />
                        <span>Profile & Stats</span>
                      </button>
                      <button
                        onClick={() => {
                          navigate('/submissions');
                          setIsDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-hover)] cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-[var(--text-3)]" />
                        <span>Submissions</span>
                      </button>
                      {(currentUser.role === 'admin' || currentUser.role === 'setter') && (
                        <button
                          onClick={() => {
                            navigate('/admin');
                            setIsDropdownOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--verdigris)] hover:bg-[var(--bg-hover)] cursor-pointer font-medium"
                        >
                          <Shield className="w-3.5 h-3.5 text-[var(--verdigris)]" />
                          <span>Admin Panel</span>
                        </button>
                      )}
                    </div>

                    <div className="py-1">
                      <button
                        onClick={() => {
                          logoutUser();
                          setIsDropdownOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--red)] hover:bg-[var(--bg-hover)] cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="btn-secondary !py-1 !px-2.5 !text-xs"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="btn-primary !bg-[var(--verdigris)] !text-[var(--obsidian)] !font-semibold !py-1 !px-2.5 !text-xs"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
