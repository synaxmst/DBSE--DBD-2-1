import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getProblems } from '../api/problems';
import { createContest } from '../api/contests';
import type { CreateContestPayload } from '../api/contests';
import type { Problem, Difficulty } from '../types/judge';
import { DifficultyBadge } from '../components/common/DifficultyBadge';
import {
  Trophy,
  Calendar,
  Clock,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Search,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Award,
  BookOpen,
  SlidersHorizontal,
  Check,
} from 'lucide-react';

type ScoringMode = 'ICPC' | 'Rated' | 'Custom';

const SCORING_PRESETS: Record<ScoringMode, { label: string; badge: string; description: string }> = {
  ICPC: {
    label: 'ICPC Scoring',
    badge: 'ICPC Scoring • 20m Penalty',
    description: 'Rankings decided by total solved problems, sorted by least penalty time (20 min per incorrect attempt).',
  },
  Rated: {
    label: 'Rated Division',
    badge: 'Rated (Div. 1 + Div. 2)',
    description: 'Official rated round. Performance impacts platform global rating points for all registered participants.',
  },
  Custom: {
    label: 'Custom / Beginner',
    badge: 'Beginner Friendly • Practice',
    description: 'Unrated practice contest tailored for training, onboarding, and collegiate workshops.',
  },
};

export const CreateContestPage: React.FC = () => {
  const navigate = useNavigate();

  // Basic Info
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState(
    'Welcome to the AlgoFlow Tournament! Solve all algorithmic challenges within the allotted time window. Good luck!'
  );

  // Schedule & Timing
  // Default start in 1 hour, duration 2 hours
  const getDefaultDates = () => {
    const start = new Date(Date.now() + 60 * 60 * 1000);
    start.setMinutes(0, 0, 0);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

    const toLocalISO = (d: Date) => {
      const tzOffset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    };

    return {
      startStr: toLocalISO(start),
      endStr: toLocalISO(end),
    };
  };

  const initialDates = getDefaultDates();
  const [startTimeLocal, setStartTimeLocal] = useState(initialDates.startStr);
  const [endTimeLocal, setEndTimeLocal] = useState(initialDates.endStr);
  const [durationMinutes, setDurationMinutes] = useState(120);

  // Scoring Mode
  const [scoringMode, setScoringMode] = useState<ScoringMode>('ICPC');
  const [customBannerBadge, setCustomBannerBadge] = useState('');

  // Problem Catalog & Selector
  const [availableProblems, setAvailableProblems] = useState<Problem[]>([]);
  const [loadingProblems, setLoadingProblems] = useState(true);
  const [problemSearch, setProblemSearch] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | Difficulty>('All');
  const [selectedProblemIds, setSelectedProblemIds] = useState<string[]>([]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch problems on mount
  useEffect(() => {
    const fetchAllProblems = async () => {
      setLoadingProblems(true);
      try {
        const res = await getProblems({ limit: 100 });
        setAvailableProblems(res.problems);
      } catch {
        // Handled silently with empty available list
      } finally {
        setLoadingProblems(false);
      }
    };
    fetchAllProblems();
  }, []);

  // Recalculate duration whenever start or end time changes
  useEffect(() => {
    if (startTimeLocal && endTimeLocal) {
      const start = new Date(startTimeLocal).getTime();
      const end = new Date(endTimeLocal).getTime();
      if (end > start) {
        const diffMins = Math.round((end - start) / (1000 * 60));
        setDurationMinutes(diffMins);
      }
    }
  }, [startTimeLocal, endTimeLocal]);

  // Adjust end time if duration changes manually
  const handleDurationChange = (newDuration: number) => {
    setDurationMinutes(newDuration);
    if (startTimeLocal && newDuration > 0) {
      const start = new Date(startTimeLocal).getTime();
      const newEnd = new Date(start + newDuration * 60 * 1000);
      const tzOffset = newEnd.getTimezoneOffset() * 60000;
      setEndTimeLocal(new Date(newEnd.getTime() - tzOffset).toISOString().slice(0, 16));
    }
  };

  // Toggle problem selection
  const handleToggleProblem = (id: string) => {
    if (selectedProblemIds.includes(id)) {
      setSelectedProblemIds(selectedProblemIds.filter((pId) => pId !== id));
    } else {
      setSelectedProblemIds([...selectedProblemIds, id]);
    }
  };

  // Reorder selected problems
  const handleMoveProblem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= selectedProblemIds.length) return;
    const updated = [...selectedProblemIds];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setSelectedProblemIds(updated);
  };

  const handleRemoveSelectedProblem = (id: string) => {
    setSelectedProblemIds(selectedProblemIds.filter((pId) => pId !== id));
  };

  // Filtered available problems
  const filteredProblems = availableProblems.filter((p) => {
    const matchesSearch =
      problemSearch.trim() === '' ||
      p.title.toLowerCase().includes(problemSearch.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(problemSearch.toLowerCase()));

    const matchesDifficulty = difficultyFilter === 'All' || p.difficulty === difficultyFilter;

    return matchesSearch && matchesDifficulty;
  });

  // Selected problem objects
  const selectedProblemsList = selectedProblemIds
    .map((id) => availableProblems.find((p) => p.id === id))
    .filter(Boolean) as Problem[];

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Contest title is required.');
      return;
    }

    if (!startTimeLocal || !endTimeLocal) {
      setError('Both start and end dates/times are required.');
      return;
    }

    const start = new Date(startTimeLocal);
    const end = new Date(endTimeLocal);

    if (end.getTime() <= start.getTime()) {
      setError('Contest end time must be after start time.');
      return;
    }

    if (durationMinutes < 10) {
      setError('Contest duration must be at least 10 minutes.');
      return;
    }

    const bannerBadge =
      scoringMode === 'Custom' && customBannerBadge.trim()
        ? customBannerBadge.trim()
        : SCORING_PRESETS[scoringMode].badge;

    const payload: CreateContestPayload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || undefined,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      durationMinutes,
      problemIds: selectedProblemIds,
      bannerBadge,
    };

    setIsSubmitting(true);

    try {
      await createContest(payload);
      navigate('/contests');
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to create contest tournament. Please check all fields.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-fade space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div className="space-y-1">
          <Link
            to="/admin"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Admin Panel
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-1)] tracking-tight">
              Create New Contest
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/30">
              Tournament Studio
            </span>
          </div>
          <p className="text-sm text-[var(--text-3)]">
            Configure round schedules, select competition problems, and choose scoring mechanisms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/contests" className="btn-secondary !text-xs !py-2">
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary !text-xs !py-2 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-[var(--bone)]/30 border-t-[var(--bone)] rounded-full animate-spin" />
                <span>Scheduling Contest...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Publish Contest</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-[var(--r-lg)] bg-[var(--red-dim)] border border-[var(--red)]/30 text-sm text-[var(--red)] flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">Creation Error</div>
            <div className="text-xs opacity-90">{error}</div>
          </div>
        </div>
      )}

      {/* Main Form Layout */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Metadata, Scheduling & Scoring (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6">
          {/* General Info Card */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
              <Trophy className="w-4 h-4 text-[var(--accent)]" /> Contest Overview
            </h2>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-2)]">
                Contest Title <span className="text-[var(--red)]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. AlgoFlow Grand Prix 2026 - Round 1"
                className="input-field w-full text-sm"
              />
            </div>

            {/* Custom Slug (Optional) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--text-2)]">
                  URL Slug <span className="text-[var(--text-3)]">(Optional)</span>
                </label>
                <span className="text-[11px] text-[var(--text-3)]">Auto-generated if empty</span>
              </div>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. grand-prix-2026-r1"
                className="input-field w-full font-mono text-xs"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--text-2)]">
                  Contest Description & Rules
                </label>
                <span className="text-[11px] text-[var(--text-3)]">Markdown supported</span>
              </div>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Specify competition rules, allowed languages, and scoring guidelines..."
                className="input-field w-full text-xs leading-relaxed"
              />
            </div>
          </div>

          {/* Schedule & Timing Card */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
              <Calendar className="w-4 h-4 text-[var(--accent)]" /> Tournament Schedule
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-2)] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[var(--text-3)]" /> Start Date & Time <span className="text-[var(--red)]">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={startTimeLocal}
                  onChange={(e) => setStartTimeLocal(e.target.value)}
                  className="input-field w-full text-xs"
                />
              </div>

              {/* End Time */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-2)] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[var(--text-3)]" /> End Date & Time <span className="text-[var(--red)]">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={endTimeLocal}
                  onChange={(e) => setEndTimeLocal(e.target.value)}
                  className="input-field w-full text-xs"
                />
              </div>
            </div>

            {/* Duration Slider / Input */}
            <div className="space-y-2 pt-2 border-t border-[var(--border)]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[var(--text-2)] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[var(--text-3)]" /> Total Duration
                </span>
                <span className="font-mono font-semibold text-[var(--accent)]">
                  {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m ({durationMinutes} mins)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[60, 90, 120, 150, 180, 300].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleDurationChange(mins)}
                    className={`flex-1 py-1 text-[11px] rounded font-mono border transition-all ${
                      durationMinutes === mins
                        ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent)]/40 font-semibold'
                        : 'bg-[var(--bg-card)] text-[var(--text-3)] border-[var(--border)] hover:text-[var(--text-2)]'
                    }`}
                  >
                    {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Scoring Mode & Banner Badge */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
              <Award className="w-4 h-4 text-[var(--accent)]" /> Scoring & Tournament Type
            </h2>

            <div className="space-y-3">
              {(Object.keys(SCORING_PRESETS) as ScoringMode[]).map((mode) => {
                const preset = SCORING_PRESETS[mode];
                const isSelected = scoringMode === mode;
                return (
                  <div
                    key={mode}
                    onClick={() => setScoringMode(mode)}
                    className={`p-3.5 rounded-[var(--r-md)] border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[var(--accent-dim)] border-[var(--accent)]/50 shadow-sm'
                        : 'bg-[var(--bg-canvas)] border-[var(--border)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-[var(--accent)]' : 'text-[var(--text-1)]'}`}>
                          {preset.label}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-3)] font-mono">
                          {preset.badge}
                        </span>
                      </div>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--text-on-accent)]' : 'border-[var(--border-strong)]'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-[var(--text-3)] leading-relaxed">
                      {preset.description}
                    </p>
                  </div>
                );
              })}

              {scoringMode === 'Custom' && (
                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-medium text-[var(--text-2)]">
                    Custom Banner Badge Text
                  </label>
                  <input
                    type="text"
                    value={customBannerBadge}
                    onChange={(e) => setCustomBannerBadge(e.target.value)}
                    placeholder="e.g. Division 3 • Novice Qualifier"
                    className="input-field w-full text-xs font-mono"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Problem Selector & Selected Problems (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Selected Problems Order Summary Card */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-[var(--text-1)]">
                  Contest Problemset
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--accent-dim)] text-[var(--accent)] font-semibold font-mono">
                  {selectedProblemIds.length} {selectedProblemIds.length === 1 ? 'problem' : 'problems'}
                </span>
              </div>

              {selectedProblemIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedProblemIds([])}
                  className="text-xs text-[var(--text-3)] hover:text-[var(--red)] transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {selectedProblemsList.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-[var(--border)] rounded-[var(--r-md)] bg-[var(--bg-canvas)] space-y-2">
                <BookOpen className="w-8 h-8 text-[var(--text-3)] mx-auto opacity-50" />
                <div className="text-xs font-medium text-[var(--text-2)]">No problems selected yet</div>
                <div className="text-[11px] text-[var(--text-3)] max-w-sm mx-auto">
                  Browse and select problems from the catalog below to add them into this contest round in your preferred order.
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedProblemsList.map((problem, idx) => {
                  const letterCode = String.fromCharCode(65 + idx); // Problem A, B, C, D...
                  return (
                    <div
                      key={problem.id}
                      className="p-3 rounded-[var(--r-md)] bg-[var(--bg-canvas)] border border-[var(--border)] flex items-center justify-between gap-3 group hover:border-[var(--border-strong)] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded bg-[var(--accent-dim)] text-[var(--accent)] font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-[var(--accent)]/30">
                          {letterCode}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-xs font-semibold text-[var(--text-1)] truncate">
                              {problem.title}
                            </span>
                            <DifficultyBadge difficulty={problem.difficulty} size="sm" />
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-[var(--text-3)]">
                            <span>{problem.timeLimitMs}ms / {problem.memoryLimitMb}MB</span>
                            {problem.tags.slice(0, 2).map((t) => (
                              <span key={t} className="text-[10px] text-[var(--text-3)] font-mono">
                                #{t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Reorder and Delete Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveProblem(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 text-[var(--text-3)] hover:text-[var(--text-1)] disabled:opacity-30 transition-colors"
                          title="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveProblem(idx, 'down')}
                          disabled={idx === selectedProblemsList.length - 1}
                          className="p-1 text-[var(--text-3)] hover:text-[var(--text-1)] disabled:opacity-30 transition-colors"
                          title="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedProblem(problem.id)}
                          className="p-1 text-[var(--text-3)] hover:text-[var(--red)] transition-colors ml-1"
                          title="Remove from contest"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Problem Catalog Picker Card */}
          <div className="card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[var(--accent)]" /> Problem Catalog Selector
                </h2>
                <p className="text-[11px] text-[var(--text-3)]">
                  Pick problems to add into this tournament round.
                </p>
              </div>

              {/* Difficulty Tabs */}
              <div className="flex items-center gap-1 bg-[var(--bg-canvas)] p-1 rounded-[var(--r-md)] border border-[var(--border)]">
                {(['All', 'Easy', 'Medium', 'Hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficultyFilter(diff)}
                    className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                      difficultyFilter === diff
                        ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold'
                        : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[var(--text-3)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={problemSearch}
                onChange={(e) => setProblemSearch(e.target.value)}
                placeholder="Search problem catalog by title or topic tag..."
                className="input-field w-full !pl-8 text-xs"
              />
            </div>

            {/* Problem List */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {loadingProblems ? (
                <div className="py-8 text-center text-xs text-[var(--text-3)]">
                  <span className="w-4 h-4 border-2 border-[var(--bone)]/30 border-t-[var(--bone)] rounded-full animate-spin inline-block mr-2 align-middle" />
                  Loading problem catalog...
                </div>
              ) : filteredProblems.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--text-3)]">
                  No matching problems found.
                </div>
              ) : (
                filteredProblems.map((problem) => {
                  const isSelected = selectedProblemIds.includes(problem.id);
                  return (
                    <div
                      key={problem.id}
                      onClick={() => handleToggleProblem(problem.id)}
                      className={`p-3 rounded-[var(--r-md)] border cursor-pointer flex items-center justify-between gap-3 transition-all ${
                        isSelected
                          ? 'bg-[var(--accent-dim)]/40 border-[var(--accent)]/50'
                          : 'bg-[var(--bg-canvas)] border-[var(--border)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 truncate">
                          <span className="text-xs font-semibold text-[var(--text-1)] truncate">
                            {problem.title}
                          </span>
                          <DifficultyBadge difficulty={problem.difficulty} size="sm" />
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[var(--text-3)]">
                          {problem.tags.slice(0, 3).map((t) => (
                            <span key={t} className="tag-pill text-[10px] py-0.5 px-2">
                              #{t}
                            </span>
                          ))}
                          <span className="text-[10px] text-[var(--text-3)] font-mono ml-1">
                            {problem.acceptanceRate}% AR
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSelected ? (
                          <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-[var(--text-on-accent)] flex items-center justify-center font-bold text-xs shadow">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full border border-[var(--border-strong)] text-[var(--text-3)] flex items-center justify-center hover:border-[var(--text-2)] hover:text-[var(--text-1)] transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Action Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link to="/admin" className="btn-secondary !text-xs !py-2.5">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary !text-xs !py-2.5 flex items-center gap-2 px-6"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-[var(--bone)]/30 border-t-[var(--bone)] rounded-full animate-spin" />
                  <span>Scheduling Contest...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Publish Contest</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
