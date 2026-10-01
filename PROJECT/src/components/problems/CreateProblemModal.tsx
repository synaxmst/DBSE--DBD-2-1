import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJudge } from '../../context/JudgeContext';
import type { Difficulty, Problem, ProblemStatus } from '../../types/judge';
import { 
  X, 
  Plus, 
  Clock, 
  Cpu, 
  Code2,
  ArrowLeft,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Props {
  isOpen?: boolean;
  onClose?: () => void;
  mode?: 'modal' | 'page';
}

interface SampleCaseItem {
  input: string;
  expectedOutput: string;
  explanation: string;
}

interface HiddenCaseItem {
  input: string;
  expectedOutput: string;
}

const AVAILABLE_TAGS = [
  'Array', 
  'String', 
  'Hash Table', 
  'Dynamic Programming', 
  'Math', 
  'Sorting', 
  'Greedy', 
  'Depth-First Search', 
  'Binary Search', 
  'Breadth-First Search', 
  'Tree', 
  'Graph', 
  'Two Pointers', 
  'Stack'
];

export const CreateProblemModal: React.FC<Props> = ({ 
  isOpen = true, 
  onClose,
  mode = 'modal'
}) => {
  const { addNewProblem, currentUser } = useJudge();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [status, setStatus] = useState<ProblemStatus>('published');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Array', 'Hash Table']);
  const [timeLimitMs, setTimeLimitMs] = useState(1000);
  const [memoryLimitMb, setMemoryLimitMb] = useState(256);
  const [description, setDescription] = useState('');
  
  // Sample Test Cases List
  const [sampleTestCases, setSampleTestCases] = useState<SampleCaseItem[]>([
    { input: '', expectedOutput: '', explanation: '' }
  ]);

  // Hidden Test Cases List
  const [showHidden, setShowHidden] = useState(false);
  const [hiddenTestCases, setHiddenTestCases] = useState<HiddenCaseItem[]>([]);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (mode === 'modal' && !isOpen) return null;

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      if (selectedTags.length > 1) {
        setSelectedTags(selectedTags.filter(t => t !== tag));
      }
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddSampleCase = () => {
    setSampleTestCases(prev => [...prev, { input: '', expectedOutput: '', explanation: '' }]);
  };

  const handleRemoveSampleCase = (index: number) => {
    if (sampleTestCases.length <= 1) return;
    setSampleTestCases(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateSampleCase = (
    index: number,
    field: keyof SampleCaseItem,
    value: string
  ) => {
    setSampleTestCases(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddHiddenCase = () => {
    setHiddenTestCases(prev => [...prev, { input: '', expectedOutput: '' }]);
  };

  const handleRemoveHiddenCase = (index: number) => {
    setHiddenTestCases(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateHiddenCase = (
    index: number,
    field: keyof HiddenCaseItem,
    value: string
  ) => {
    setHiddenTestCases(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Problem Title is required.');
      return;
    }
    if (!description.trim()) {
      setError('Problem Statement / Description is required.');
      return;
    }

    // Validate at least one valid sample case
    const validSampleCases = sampleTestCases.filter(
      tc => tc.input.trim() && tc.expectedOutput.trim()
    );
    if (validSampleCases.length === 0) {
      setError('At least one complete Sample Test Case (Input and Expected Output) is required.');
      return;
    }

    const validHiddenCases = hiddenTestCases.filter(
      tc => tc.input.trim() && tc.expectedOutput.trim()
    );

    setIsSubmitting(true);

    const slug = title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const newProblem: Problem = {
      id: '',
      title: title.trim(),
      slug,
      difficulty,
      status,
      tags: selectedTags,
      acceptanceRate: 0,
      submissionsCount: 0,
      totalAccepted: 0,
      author: currentUser?.username || 'admin',
      description: description.trim(),
      constraints: [
        `1 <= input.length <= 10^5`,
        `Time Limit: ${timeLimitMs} ms`,
        `Memory Limit: ${memoryLimitMb} MB`
      ],
      timeLimitMs,
      memoryLimitMb,
      sampleTestCases: validSampleCases.map((tc, idx) => ({
        id: `tc-sample-${idx + 1}`,
        input: tc.input.trim(),
        expectedOutput: tc.expectedOutput.trim(),
        explanation: tc.explanation.trim() || undefined,
      })),
      hiddenTestCases: validHiddenCases.map((tc, idx) => ({
        id: `tc-hidden-${idx + 1}`,
        input: tc.input.trim(),
        expectedOutput: tc.expectedOutput.trim(),
      })),
      hiddenTestCasesCount: validHiddenCases.length,
      starterCode: {
        cpp: `// ${title}\n#include <iostream>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    void solve() {\n        // Enter your solution here\n    }\n};`,
        python: `# ${title}\nclass Solution:\n    def solve(self):\n        # Enter your solution here\n        pass`,
        java: `// ${title}\nimport java.util.*;\n\npublic class Solution {\n    public void solve() {\n        // Enter your solution here\n    }\n}`,
        javascript: `// ${title}\n/**\n * @return {void}\n */\nfunction solve() {\n    // Enter your solution here\n}`,
      }
    };

    try {
      await addNewProblem(newProblem);
      setIsSubmitting(false);
      if (onClose) onClose();
      navigate(`/problems/${slug || 'catalog'}`);
    } catch (err: any) {
      setError(err.message || 'Failed to publish problem to backend database.');
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <div className={`flex flex-col bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[var(--r-xl)] shadow-[var(--shadow-lg)] ${mode === 'page' ? 'w-full max-w-4xl mx-auto p-6 md:p-8' : 'w-full max-w-3xl max-h-[90vh] overflow-hidden'}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
        <div className="flex items-center gap-2.5">
          {mode === 'page' && (
            <button
              onClick={() => navigate('/admin')}
              className="p-1.5 -ml-1 text-[var(--text-3)] hover:text-[var(--text-1)] rounded-[var(--r-sm)] hover:bg-[var(--bg-hover)] transition-colors cursor-pointer mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-8 h-8 rounded-[var(--r-sm)] bg-[var(--accent-dim)] border border-[var(--border)] flex items-center justify-center text-[var(--verdigris)]">
            <Plus className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--text-1)] tracking-tight">
              Create New Problem
            </h2>
            <p className="text-[12px] text-[var(--text-3)]">
              Author: <span className="text-[var(--text-2)] font-mono">@{currentUser?.username || 'admin'}</span>
            </p>
          </div>
        </div>

        {mode === 'modal' && onClose && (
          <button 
            onClick={onClose}
            className="p-1 text-[var(--text-3)] hover:text-[var(--text-1)] rounded-[var(--r-sm)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
        {error && (
          <div className="p-3 rounded-[var(--r-md)] bg-[var(--red-dim)] border border-[var(--red)]/20 text-[var(--red)] font-medium">
            {error}
          </div>
        )}

        {/* Title & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="font-medium text-[var(--text-2)]">Problem Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Valid Anagram"
              className="w-full h-9 bg-[var(--bg-canvas)] border border-[var(--border)] focus:border-[var(--accent)] rounded-[var(--r-md)] px-3 text-[13px] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[var(--text-2)]">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProblemStatus)}
              className="w-full h-9 bg-[var(--bg-canvas)] border border-[var(--border)] focus:border-[var(--accent)] rounded-[var(--r-md)] px-3 text-[13px] text-[var(--text-1)] focus:outline-none transition-colors font-mono"
            >
              <option value="published">Published (Public)</option>
              <option value="draft">Draft (Hidden)</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Difficulty & Limits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="font-medium text-[var(--text-2)]">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
              className="w-full h-9 bg-[var(--bg-canvas)] border border-[var(--border)] focus:border-[var(--accent)] rounded-[var(--r-md)] px-3 text-[13px] text-[var(--text-1)] focus:outline-none transition-colors"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[var(--text-2)] flex items-center gap-1">
              <Clock className="w-3 h-3 text-[var(--text-3)]" /> Time Limit (ms)
            </label>
            <input
              type="number"
              value={timeLimitMs}
              onChange={(e) => setTimeLimitMs(Number(e.target.value))}
              min={100}
              max={10000}
              step={100}
              className="w-full h-9 bg-[var(--bg-canvas)] border border-[var(--border)] focus:border-[var(--accent)] rounded-[var(--r-md)] px-3 text-[13px] text-[var(--text-1)] focus:outline-none transition-colors font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-[var(--text-2)] flex items-center gap-1">
              <Cpu className="w-3 h-3 text-[var(--text-3)]" /> Memory Limit (MB)
            </label>
            <input
              type="number"
              value={memoryLimitMb}
              onChange={(e) => setMemoryLimitMb(Number(e.target.value))}
              min={16}
              max={1024}
              step={16}
              className="w-full h-9 bg-[var(--bg-canvas)] border border-[var(--border)] focus:border-[var(--accent)] rounded-[var(--r-md)] px-3 text-[13px] text-[var(--text-1)] focus:outline-none transition-colors font-mono"
            />
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-1.5">
          <label className="font-medium text-[var(--text-2)]">Topic Tags</label>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-[var(--bg-canvas)] border border-[var(--border)] rounded-[var(--r-md)]">
            {AVAILABLE_TAGS.map(tag => {
              const selected = selectedTags.includes(tag);
              return (
                <button
                  type="button"
                  key={tag}
                  onClick={() => handleToggleTag(tag)}
                  className={`px-2 py-0.5 rounded-[var(--r-sm)] text-[11px] font-medium transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/30'
                      : 'bg-[var(--bg-card)] text-[var(--text-3)] border border-[var(--border)] hover:text-[var(--text-1)]'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description / Problem Statement */}
        <div className="space-y-1.5">
          <label className="font-medium text-[var(--text-2)]">Problem Statement (Markdown supported) *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Given two strings s and t, return true if t is an anagram of s, and false otherwise..."
            rows={4}
            className="w-full bg-[var(--bg-canvas)] border border-[var(--border)] focus:border-[var(--accent)] rounded-[var(--r-md)] p-3 text-[13px] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none transition-colors resize-y font-sans"
          />
        </div>

        {/* Sample Test Cases Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-semibold text-[var(--text-1)] text-[12px] flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-[var(--accent)]" /> Sample Test Cases ({sampleTestCases.length}) *
            </label>
            <button
              type="button"
              onClick={handleAddSampleCase}
              className="btn-secondary !text-xs !py-1 !px-2.5 flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add Sample Case
            </button>
          </div>

          <div className="space-y-3">
            {sampleTestCases.map((tc, idx) => (
              <div key={idx} className="p-3.5 rounded-[var(--r-md)] bg-[var(--bg-canvas)] border border-[var(--border)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--accent)] font-mono">
                    Sample Case #{idx + 1}
                  </span>
                  {sampleTestCases.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSampleCase(idx)}
                      className="text-[var(--text-3)] hover:text-[var(--red)] transition-colors p-1"
                      title="Remove sample test case"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-[var(--text-3)]">Standard Input (stdin) *</label>
                    <textarea
                      value={tc.input}
                      onChange={(e) => handleUpdateSampleCase(idx, 'input', e.target.value)}
                      placeholder="anagram&#10;nagaram"
                      rows={2}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] focus:border-[var(--accent)] rounded-[var(--r-sm)] p-2 text-[12px] font-mono text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-[var(--text-3)]">Expected Output (stdout) *</label>
                    <textarea
                      value={tc.expectedOutput}
                      onChange={(e) => handleUpdateSampleCase(idx, 'expectedOutput', e.target.value)}
                      placeholder="true"
                      rows={2}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] focus:border-[var(--accent)] rounded-[var(--r-sm)] p-2 text-[12px] font-mono text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-[var(--text-3)]">Explanation (Optional)</label>
                  <input
                    type="text"
                    value={tc.explanation}
                    onChange={(e) => handleUpdateSampleCase(idx, 'explanation', e.target.value)}
                    placeholder="Both strings contain identical character counts."
                    className="w-full h-8 bg-[var(--bg-elevated)] border border-[var(--border)] focus:border-[var(--accent)] rounded-[var(--r-sm)] px-2.5 text-[12px] text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hidden Test Cases Section (Collapsible) */}
        <div className="p-3.5 rounded-[var(--r-md)] bg-[var(--bg-canvas)] border border-[var(--border)] space-y-3">
          <div 
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setShowHidden(!showHidden)}
          >
            <div>
              <div className="font-semibold text-[var(--text-1)] text-[12px] flex items-center gap-1.5">
                <span>Hidden Evaluation Test Cases</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-3)] font-mono">
                  {hiddenTestCases.length} defined
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-3)]">
                Used for final verdict checking in judge. Hidden from contestants.
              </p>
            </div>
            <button
              type="button"
              className="p-1 rounded text-[var(--text-3)] hover:text-[var(--text-1)]"
            >
              {showHidden ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {showHidden && (
            <div className="space-y-3 pt-3 border-t border-[var(--border)] page-fade">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-3)]">
                  Add edge cases, corner inputs, and stress cases.
                </span>
                <button
                  type="button"
                  onClick={handleAddHiddenCase}
                  className="btn-secondary !text-xs !py-1 !px-2.5 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Hidden Case
                </button>
              </div>

              {hiddenTestCases.length === 0 ? (
                <div className="text-center py-4 border border-dashed border-[var(--border)] rounded-[var(--r-md)] text-[11px] text-[var(--text-3)]">
                  No hidden test cases yet. Click "Add Hidden Case" above.
                </div>
              ) : (
                <div className="space-y-3">
                  {hiddenTestCases.map((htc, hIdx) => (
                    <div key={hIdx} className="p-3 rounded-[var(--r-md)] bg-[var(--bg-elevated)] border border-[var(--border)] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-[var(--text-2)] font-semibold">
                          Hidden Case #{hIdx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveHiddenCase(hIdx)}
                          className="text-[var(--text-3)] hover:text-[var(--red)] transition-colors p-1"
                          title="Remove hidden test case"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <textarea
                          rows={2}
                          value={htc.input}
                          onChange={(e) => handleUpdateHiddenCase(hIdx, 'input', e.target.value)}
                          placeholder="Hidden input (stdin)..."
                          className="w-full bg-[var(--bg-canvas)] border border-[var(--border)] focus:border-[var(--accent)] rounded-[var(--r-sm)] p-2 text-[12px] font-mono text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none transition-colors"
                        />
                        <textarea
                          rows={2}
                          value={htc.expectedOutput}
                          onChange={(e) => handleUpdateHiddenCase(hIdx, 'expectedOutput', e.target.value)}
                          placeholder="Hidden expected output (stdout)..."
                          className="w-full bg-[var(--bg-canvas)] border border-[var(--border)] focus:border-[var(--accent)] rounded-[var(--r-sm)] p-2 text-[12px] font-mono text-[var(--text-1)] placeholder-[var(--text-3)] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--border)]">
          {mode === 'modal' && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary !h-8 !text-[12px]"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary !h-8 !text-[12px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isSubmitting ? 'Publishing Problem...' : 'Publish Problem'}</span>
          </button>
        </div>
      </form>
    </div>
  );

  if (mode === 'page') {
    return (
      <div className="min-h-[calc(100vh-60px)] py-8 px-4 sm:px-6 page-fade">
        {formContent}
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-[var(--obsidian)]/80 backdrop-blur-sm"
    >
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />
      <div className="relative z-10 w-full max-w-3xl my-6 page-fade">
        {formContent}
      </div>
    </div>
  );
};
