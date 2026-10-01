import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useJudge } from '../../context/JudgeContext';
import type { Difficulty } from '../../types/judge';
import { DifficultyBadge } from '../common/DifficultyBadge';
import { CreateProblemModal } from './CreateProblemModal';
import { 
  Search, 
  CheckCircle2, 
  Circle, 
  ChevronRight,
  X,
  Plus,
  Inbox,
  Filter,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

export const ProblemCatalog: React.FC = () => {
  const { 
    problems, 
    isProblemSolved 
  } = useJudge();
  const navigate = useNavigate();
  const location = useLocation();

  const [bannerError, setBannerError] = useState<string | null>(() => (location.state as { error?: string })?.error || null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<'All' | Difficulty>('All');
  const [selectedStatus, setSelectedStatus] = useState<'All' | 'Solved' | 'Unsolved'>('All');
  const [selectedTag, setSelectedTag] = useState<string>('All');

  // Extract unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    problems.forEach(p => p.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [problems]);

  // Solved counts
  const solvedCount = useMemo(() => {
    return problems.filter(p => isProblemSolved(p.id)).length;
  }, [problems, isProblemSolved]);

  const isFiltered = searchQuery !== '' || selectedDifficulty !== 'All' || selectedStatus !== 'All' || selectedTag !== 'All';

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedDifficulty('All');
    setSelectedStatus('All');
    setSelectedTag('All');
  };

  const filteredProblems = useMemo(() => {
    return problems.filter(p => {
      const q = searchQuery.toLowerCase();
      const matchesQuery = 
        p.title.toLowerCase().includes(q) ||
        p.tags.some(t => t.toLowerCase().includes(q));
      
      const matchesDiff = selectedDifficulty === 'All' || p.difficulty === selectedDifficulty;
      
      const isSolved = isProblemSolved(p.id);
      const matchesStatus = 
        selectedStatus === 'All' || 
        (selectedStatus === 'Solved' && isSolved) || 
        (selectedStatus === 'Unsolved' && !isSolved);

      const matchesTag = selectedTag === 'All' || p.tags.includes(selectedTag);

      return matchesQuery && matchesDiff && matchesStatus && matchesTag;
    });
  }, [problems, searchQuery, selectedDifficulty, selectedStatus, selectedTag, isProblemSolved]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6 page-fade text-[var(--bone)]">
      
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[var(--bone)] tracking-tight">
              Problemset Catalog
            </h1>
            <span className="text-xs font-mono text-[var(--text-3)] px-2 py-0.5 rounded bg-[var(--ash)] border border-[var(--border)]">
              {problems.length} problems
            </span>
          </div>
          <div className="text-xs font-mono text-[var(--text-2)] flex items-center gap-2 pt-0.5">
            <span>{solvedCount} of {problems.length} solved</span>
            <span className="text-[var(--text-3)]">·</span>
            <div className="w-20 h-1.5 rounded-full bg-[var(--ash)] overflow-hidden inline-flex border border-[var(--border)]">
              <div 
                className="bg-[var(--verdigris)] h-full transition-all duration-300"
                style={{ width: `${(solvedCount / (problems.length || 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn-secondary !text-xs font-mono flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 text-[var(--verdigris)]" />
          <span>Create Problem</span>
        </button>
      </div>

      {/* Dismissible Error Banner */}
      {bannerError && (
        <div className="flex items-center justify-between p-3.5 rounded-[var(--r-md)] bg-[var(--red-dim)] border border-[var(--red-dim)] text-xs text-[var(--red)] font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{bannerError}</span>
          </div>
          <button 
            onClick={() => setBannerError(null)}
            className="p-1 text-[var(--red)] hover:opacity-75 transition-opacity cursor-pointer"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sleek Search + Filters Toolbar */}
      <div className="card p-4 space-y-3.5 bg-[var(--carbon)] border-[var(--border)]">
        {/* Full-width Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[var(--text-3)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search problems by name, topics, or difficulty..."
            className="w-full h-10 bg-[var(--ash)] border border-[var(--border)] focus:border-[var(--verdigris)] rounded-[var(--r-md)] pl-10 pr-10 text-xs font-mono text-[var(--bone)] placeholder-[var(--text-3)] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-[var(--bone)] p-1 transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Primary Filter Rows (Difficulty + Status + Reset) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-0.5">
          <div className="flex flex-wrap items-center gap-4">
            
            {/* Difficulty Segment */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--text-3)] font-mono uppercase tracking-wider mr-1">
                Difficulty:
              </span>
              {(['All', 'Easy', 'Medium', 'Hard'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-2.5 py-1 rounded-[var(--r-sm)] text-xs font-mono transition-colors border ${
                    selectedDifficulty === diff 
                      ? 'bg-[var(--ash)] text-[var(--verdigris)] border-[var(--accent-border)] font-semibold' 
                      : 'bg-[var(--carbon)] text-[var(--text-2)] border-[var(--border)] hover:bg-[var(--ash)] hover:text-[var(--bone)]'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>

            <div className="hidden sm:block h-4 w-px bg-[var(--border)]" />

            {/* Status Segment */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--text-3)] font-mono uppercase tracking-wider mr-1">
                Status:
              </span>
              {(['All', 'Solved', 'Unsolved'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-2.5 py-1 rounded-[var(--r-sm)] text-xs font-mono transition-colors border ${
                    selectedStatus === status 
                      ? 'bg-[var(--ash)] text-[var(--verdigris)] border-[var(--accent-border)] font-semibold' 
                      : 'bg-[var(--carbon)] text-[var(--text-2)] border-[var(--border)] hover:bg-[var(--ash)] hover:text-[var(--bone)]'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Reset Filters CTA */}
          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs font-mono text-[var(--text-3)] hover:text-[var(--verdigris)] transition-colors ml-auto cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset filters</span>
            </button>
          )}
        </div>

        {/* Topics Horizontal Scroll Strip */}
        <div className="pt-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <span className="text-xs text-[var(--text-3)] font-mono uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-[var(--text-3)]" />
              <span>Topics:</span>
            </span>
            <button
              onClick={() => setSelectedTag('All')}
              className={`px-2.5 py-0.5 rounded-[var(--r-sm)] text-xs font-mono shrink-0 transition-colors border ${
                selectedTag === 'All' 
                  ? 'bg-[var(--accent-dim)] text-[var(--verdigris)] border-[var(--accent-border)] font-semibold' 
                  : 'bg-[var(--ash)] text-[var(--text-2)] border-[var(--border)] hover:text-[var(--bone)]'
              }`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? 'All' : tag)}
                className={`px-2.5 py-0.5 rounded-[var(--r-sm)] text-xs font-mono shrink-0 transition-colors border ${
                  selectedTag === tag 
                    ? 'bg-[var(--accent-dim)] text-[var(--verdigris)] border-[var(--accent-border)] font-semibold' 
                    : 'bg-[var(--ash)] text-[var(--text-2)] border-[var(--border)] hover:text-[var(--bone)]'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Problem Table */}
      <div className="card overflow-hidden bg-[var(--carbon)] border-[var(--border)]">
        {/* Table Header */}
        <div className="grid grid-cols-[40px_1fr_120px_100px_200px_40px] items-center px-4 h-9 border-b border-[var(--border)] bg-[var(--ash)] text-xs font-mono text-[var(--text-3)] uppercase tracking-wider">
          <div className="text-center font-medium">Status</div>
          <div className="font-medium">Title</div>
          <div className="text-right font-medium">Acceptance</div>
          <div className="text-center font-medium">Difficulty</div>
          <div className="hidden sm:block font-medium">Topics</div>
          <div className="text-right"></div>
        </div>

        {/* Table Rows */}
        {filteredProblems.length === 0 ? (
          <div className="py-16 text-center space-y-2 bg-[var(--carbon)]">
            <Inbox className="w-6 h-6 text-[var(--text-3)] mx-auto" />
            <p className="text-xs font-mono text-[var(--text-3)]">No problems match your filters</p>
            {isFiltered && (
              <button
                onClick={handleResetFilters}
                className="btn-secondary !text-xs font-mono !py-1 !px-3 mt-2"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filteredProblems.map(problem => {
              const solved = isProblemSolved(problem.id);
              const cleanTitle = problem.title.replace(/^prob-\d+\.\s*/i, '');

              return (
                <div
                  key={problem.id}
                  onClick={() => navigate(`/problems/${problem.slug || problem.id}`)}
                  className="grid grid-cols-[40px_1fr_120px_100px_200px_40px] items-center px-4 h-[52px] cursor-pointer group hover:bg-[var(--ash)] transition-colors border-b border-[var(--border)] last:border-0"
                >
                  {/* Status */}
                  <div className="flex justify-center">
                    {solved ? (
                      <CheckCircle2 className="w-4 h-4 text-[var(--green)]" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-[var(--text-4)] group-hover:text-[var(--text-3)] transition-colors" />
                    )}
                  </div>

                  {/* Title */}
                  <div className="text-sm font-semibold text-[var(--bone)] group-hover:text-[var(--verdigris)] transition-colors truncate pr-2">
                    {cleanTitle}
                  </div>

                  {/* Acceptance */}
                  <div className="text-right pr-2">
                    <span className="text-sm font-mono text-[var(--text-2)]">{problem.acceptanceRate.toFixed(1)}%</span>
                  </div>

                  {/* Difficulty */}
                  <div className="flex justify-center">
                    <DifficultyBadge difficulty={problem.difficulty} />
                  </div>

                  {/* Topics */}
                  <div className="hidden sm:flex items-center gap-1.5 overflow-hidden">
                    {problem.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded-[var(--r-sm)] bg-[var(--ash)] border border-[var(--border)] text-[11px] font-mono text-[var(--text-2)] truncate">
                        #{tag}
                      </span>
                    ))}
                    {problem.tags.length > 2 && (
                      <span className="text-[11px] text-[var(--text-3)] font-mono">
                        +{problem.tags.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Arrow icon */}
                  <div className="flex justify-end">
                    <ChevronRight className="w-4 h-4 text-[var(--text-3)] group-hover:text-[var(--verdigris)] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Problem Modal */}
      <CreateProblemModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
};
