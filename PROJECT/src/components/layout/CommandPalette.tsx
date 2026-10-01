import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJudge } from '../../context/JudgeContext';
import { Search, X, Code2, ArrowRight } from 'lucide-react';
import { DifficultyBadge } from '../common/DifficultyBadge';

export const CommandPalette: React.FC = () => {
  const { 
    isCommandPaletteOpen, 
    setIsCommandPaletteOpen, 
    problems, 
    isProblemSolved 
  } = useJudge();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      requestAnimationFrame(() => inputRef.current?.focus());
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isCommandPaletteOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsCommandPaletteOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [setIsCommandPaletteOpen]);

  const filteredProblems = problems.filter(p => {
    const q = query.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q)) ||
      p.difficulty.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredProblems.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredProblems[selectedIndex]) {
        navigate(`/problems/${filteredProblems[selectedIndex].slug || filteredProblems[selectedIndex].id}`);
        setIsCommandPaletteOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsCommandPaletteOpen(false);
    }
  };

  if (!isCommandPaletteOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-[var(--obsidian)]/80 backdrop-blur-sm"
    >
      <div 
        className="fixed inset-0" 
        onClick={() => setIsCommandPaletteOpen(false)} 
      />
      <div 
        className="relative w-full max-w-[560px] bg-[var(--bg-elevated)] border border-[var(--border-mid)] rounded-[var(--r-xl)] shadow-[var(--shadow-lg)] overflow-hidden z-10 page-fade"
      >
        
        {/* Search Input Bar */}
        <div className="flex items-center px-4 h-[44px] border-b border-[var(--border-mid)] gap-3 bg-transparent">
          <Search className="w-4 h-4 text-[var(--text-3)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search problems, topics, difficulty..."
            className="w-full bg-transparent text-[15px] text-[var(--text-1)] placeholder-[var(--text-3)] border-none outline-none focus:outline-none focus:ring-0 px-0"
          />
          <button 
            onClick={() => setIsCommandPaletteOpen(false)}
            className="text-[var(--text-3)] hover:text-[var(--text-1)] p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
          {filteredProblems.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-[var(--text-3)]">
              No matching problems found.
            </div>
          ) : (
            filteredProblems.map((problem, index) => {
              const isSelected = index === selectedIndex;
              const solved = isProblemSolved(problem.id);
              const cleanTitle = problem.title.replace(/^prob-\d+\.\s*/i, '');
              
              return (
                <div
                  key={problem.id}
                  onClick={() => {
                    navigate(`/problems/${problem.slug || problem.id}`);
                    setIsCommandPaletteOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between h-[40px] px-3 rounded-[var(--r-sm)] cursor-pointer transition-colors ${
                    isSelected 
                      ? 'bg-[var(--bg-hover)] text-[var(--text-1)]' 
                      : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Code2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'}`} />
                    <span className="text-[13px] font-medium text-[var(--text-1)] truncate">
                      {cleanTitle}
                    </span>
                    {solved && (
                      <span className="text-[11px] font-medium text-[var(--green)] shrink-0">
                        ✓
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <DifficultyBadge difficulty={problem.difficulty} />
                    <ArrowRight className={`w-3.5 h-3.5 text-[var(--accent)] transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-[var(--border-mid)] bg-[var(--bg-card)] flex items-center justify-between text-[11px] text-[var(--text-3)]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>{filteredProblems.length} results</span>
        </div>
      </div>
    </div>
  );
};

