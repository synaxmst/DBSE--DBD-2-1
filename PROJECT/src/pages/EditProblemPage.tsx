import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import apiClient from '../api/client';
import { updateProblem } from '../api/problems';
import type { CreateProblemPayload } from '../api/problems';
import type { Difficulty, SupportedLanguage, ProblemStatus } from '../types/judge';
import {
  Clock,
  Cpu,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  AlertCircle,
  FileCode,
  FileCode2,
  CheckCircle2,
  Loader2,
  Save,
} from 'lucide-react';

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
  'Stack',
];

const DEFAULT_STARTER_CODE: Record<SupportedLanguage, string> = {
  cpp: `#include <iostream>
#include <vector>
#include <string>

using namespace std;

class Solution {
public:
    void solve() {
        // Enter your solution here
    }
};`,
  python: `class Solution:
    def solve(self):
        # Enter your solution here
        pass`,
  java: `import java.util.*;

public class Solution {
    public void solve() {
        // Enter your solution here
    }
}`,
  javascript: `/**
 * @return {void}
 */
function solve() {
    // Enter your solution here
}`,
};

export const EditProblemPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Page loading & error state
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Metadata
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('Medium');
  const [status, setStatus] = useState<ProblemStatus>('draft');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Array', 'Hash Table']);
  const [timeLimitMs, setTimeLimitMs] = useState(1000);
  const [memoryLimitMb, setMemoryLimitMb] = useState(256);
  const [constraintsText, setConstraintsText] = useState('');

  // Description
  const [description, setDescription] = useState('');

  // Sample Test Cases
  const [sampleTestCases, setSampleTestCases] = useState<
    Array<{ input: string; expectedOutput: string; explanation: string }>
  >([{ input: '', expectedOutput: '', explanation: '' }]);

  // Hidden Test Cases
  const [showHidden, setShowHidden] = useState(false);
  const [hiddenTestCases, setHiddenTestCases] = useState<
    Array<{ input: string; expectedOutput: string }>
  >([]);

  // Starter Code
  const [starterCode, setStarterCode] = useState<Record<SupportedLanguage, string>>(DEFAULT_STARTER_CODE);
  const [activeLang, setActiveLang] = useState<SupportedLanguage>('python');

  // Submission status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Fetch problem on load
  useEffect(() => {
    if (!id) {
      setLoadError('Problem ID is missing from URL.');
      setIsLoading(false);
      return;
    }

    const fetchProblemData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await apiClient.get(`/problems/${id}`);
        const data = response.data?.data;

        if (!data) {
          throw new Error('No problem data returned.');
        }

        setTitle(data.title || '');
        setDifficulty(data.difficulty || 'Medium');
        setStatus((data.status as ProblemStatus) || (data.isPublished === false ? 'draft' : 'published'));
        setSelectedTags(Array.isArray(data.tags) && data.tags.length > 0 ? data.tags : ['Array']);
        setTimeLimitMs(data.timeLimitMs || 1000);
        setMemoryLimitMb(data.memoryLimitMb || 256);

        if (Array.isArray(data.constraints)) {
          setConstraintsText(data.constraints.join('\n'));
        } else if (typeof data.constraints === 'string') {
          setConstraintsText(data.constraints);
        } else {
          setConstraintsText('1 <= nums.length <= 10^5\n-10^9 <= nums[i] <= 10^9');
        }

        setDescription(data.description || '');

        if (Array.isArray(data.sampleTestCases) && data.sampleTestCases.length > 0) {
          setSampleTestCases(
            data.sampleTestCases.map((tc: any) => ({
              input: tc.input || '',
              expectedOutput: tc.expectedOutput || '',
              explanation: tc.explanation || '',
            }))
          );
        }

        if (Array.isArray(data.hiddenTestCases) && data.hiddenTestCases.length > 0) {
          setHiddenTestCases(
            data.hiddenTestCases.map((tc: any) => ({
              input: tc.input || '',
              expectedOutput: tc.expectedOutput || '',
            }))
          );
        }

        if (data.starterCode && typeof data.starterCode === 'object') {
          setStarterCode({
            cpp: data.starterCode.cpp || DEFAULT_STARTER_CODE.cpp,
            python: data.starterCode.python || DEFAULT_STARTER_CODE.python,
            java: data.starterCode.java || DEFAULT_STARTER_CODE.java,
            javascript: data.starterCode.javascript || DEFAULT_STARTER_CODE.javascript,
          });
        }
      } catch (err: any) {
        setLoadError(
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'Failed to load problem for editing.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchProblemData();
  }, [id]);

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      if (selectedTags.length > 1) {
        setSelectedTags(selectedTags.filter((t) => t !== tag));
      }
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddSampleCase = () => {
    setSampleTestCases([...sampleTestCases, { input: '', expectedOutput: '', explanation: '' }]);
  };

  const handleRemoveSampleCase = (index: number) => {
    if (sampleTestCases.length <= 1) return;
    setSampleTestCases(sampleTestCases.filter((_, i) => i !== index));
  };

  const handleUpdateSampleCase = (
    index: number,
    field: 'input' | 'expectedOutput' | 'explanation',
    val: string
  ) => {
    const updated = [...sampleTestCases];
    updated[index] = { ...updated[index], [field]: val };
    setSampleTestCases(updated);
  };

  const handleAddHiddenCase = () => {
    setHiddenTestCases([...hiddenTestCases, { input: '', expectedOutput: '' }]);
  };

  const handleRemoveHiddenCase = (index: number) => {
    setHiddenTestCases(hiddenTestCases.filter((_, i) => i !== index));
  };

  const handleUpdateHiddenCase = (
    index: number,
    field: 'input' | 'expectedOutput',
    val: string
  ) => {
    const updated = [...hiddenTestCases];
    updated[index] = { ...updated[index], [field]: val };
    setHiddenTestCases(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError(null);
    setSavedSuccess(false);

    if (!title.trim()) {
      setError('Problem title is required.');
      return;
    }

    if (!description.trim()) {
      setError('Problem statement description is required.');
      return;
    }

    const validSampleTestCases = sampleTestCases.filter(
      (tc) => tc.input.trim() !== '' && tc.expectedOutput.trim() !== ''
    );

    if (validSampleTestCases.length === 0) {
      setError('At least one sample test case with input and expected output is required.');
      return;
    }

    const validHiddenTestCases = hiddenTestCases.filter(
      (tc) => tc.input.trim() !== '' && tc.expectedOutput.trim() !== ''
    );

    const constraints = constraintsText
      .split('\n')
      .map((c) => c.trim())
      .filter(Boolean);

    const payload: Partial<CreateProblemPayload> = {
      title: title.trim(),
      description: description.trim(),
      difficulty,
      status,
      timeLimitMs,
      memoryLimitMb,
      tags: selectedTags,
      constraints,
      sampleTestCases: validSampleTestCases.map((stc) => ({
        input: stc.input.trim(),
        expectedOutput: stc.expectedOutput.trim(),
        explanation: stc.explanation.trim() || undefined,
      })),
      hiddenTestCases: validHiddenTestCases.map((htc) => ({
        input: htc.input.trim(),
        expectedOutput: htc.expectedOutput.trim(),
      })),
      starterCode,
    };

    setIsSubmitting(true);

    try {
      const updated = await updateProblem(id, payload);
      setSavedSuccess(true);
      setTimeout(() => {
        navigate(`/problems/${updated.slug || updated.id || id}`);
      }, 750);
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to update problem. Please check your inputs and try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm(`Are you sure you want to permanently delete "${title || 'this problem'}"? This cannot be undone.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await apiClient.delete(`/problems/${id}`);
      navigate('/admin');
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to delete problem.');
      setIsDeleting(false);
    }
  };

  const languageTabs: { lang: SupportedLanguage; label: string }[] = [
    { lang: 'python', label: 'Python 3' },
    { lang: 'cpp', label: 'C++ 20' },
    { lang: 'java', label: 'Java 21' },
    { lang: 'javascript', label: 'JavaScript' },
  ];

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center space-y-4 font-mono text-xs">
        <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
        <p className="text-[var(--text-3)]">Fetching problem details for editing...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-4">
        <div className="p-6 rounded-[var(--r-lg)] bg-[var(--red-dim)] border border-[var(--red)]/30 text-[var(--red)] space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertCircle className="w-5 h-5" /> Problem Load Error
          </div>
          <p className="text-xs font-mono">{loadError}</p>
          <div className="pt-2">
            <Link to="/admin" className="btn-secondary !text-xs !py-1.5">
              ← Return to Admin Panel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 page-fade space-y-6">
      {/* Top Bar Navigation & Header */}
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
              Edit Problem: {title || id}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent)]/30">
              Edit Mode
            </span>
          </div>
          <p className="text-sm text-[var(--text-3)]">
            Modify problem statements, memory/time limits, algorithmic testcases, and starter templates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Top Status Dropdown */}
          <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--r-md)] px-2.5 py-1">
            <span className="text-[11px] font-mono text-[var(--text-3)] font-medium">Status:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProblemStatus)}
              className={`text-xs font-mono font-semibold bg-transparent focus:outline-none cursor-pointer ${
                status === 'published'
                  ? 'text-[var(--green)]'
                  : status === 'draft'
                  ? 'text-[var(--amber)]'
                  : 'text-[var(--text-3)]'
              }`}
            >
              <option value="draft" className="bg-[var(--bg-elevated)] text-[var(--amber)]">Draft</option>
              <option value="published" className="bg-[var(--bg-elevated)] text-[var(--green)]">Published</option>
              <option value="archived" className="bg-[var(--bg-elevated)] text-[var(--text-3)]">Archived</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || isSubmitting}
            className="btn-secondary !text-xs !py-2 flex items-center gap-1.5 text-[var(--red)] hover:border-[var(--red)] hover:bg-[var(--red-dim)] disabled:opacity-50"
            title="Permanently Delete Problem"
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>Delete</span>
          </button>

          <Link to="/admin" className="btn-secondary !text-xs !py-2">
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || isDeleting}
            className="btn-primary !text-xs !py-2 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-[var(--bone)]/30 border-t-[var(--bone)] rounded-full animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[var(--green)]" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save & Update Problem</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-[var(--r-lg)] bg-[var(--red-dim)] border border-[var(--red)]/30 text-sm text-[var(--red)] flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">Update Error</div>
            <div className="text-xs opacity-90">{error}</div>
          </div>
        </div>
      )}

      {savedSuccess && (
        <div className="p-4 rounded-[var(--r-lg)] bg-[var(--green-dim)] border border-[var(--green)]/30 text-sm text-[var(--green)] flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div className="font-medium">Problem updated successfully! Redirecting...</div>
        </div>
      )}

      {/* Main 2-Column Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Metadata & Limits (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-6">
          {/* General Metadata Card */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
              <FileCode2 className="w-4 h-4 text-[var(--accent)]" /> Problem Metadata
            </h2>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-2)]">
                Problem Title <span className="text-[var(--red)]">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Merge K Sorted Lists"
                className="input-field w-full text-sm"
              />
            </div>

            {/* Status Toggle Dropdown in Metadata */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--text-2)]">
                  Publication Status <span className="text-[var(--red)]">*</span>
                </label>
                <span className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded capitalize ${
                  status === 'published'
                    ? 'bg-[var(--green-dim)] text-[var(--green)]'
                    : status === 'draft'
                    ? 'bg-[var(--amber-dim)] text-[var(--amber)]'
                    : 'bg-[var(--bg-canvas)] text-[var(--text-3)] border border-[var(--border)]'
                }`}>
                  {status}
                </span>
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProblemStatus)}
                className="input-field w-full text-xs font-mono cursor-pointer"
              >
                <option value="draft">Draft — Hidden from public catalogue</option>
                <option value="published">Published — Live in public problem catalogue</option>
                <option value="archived">Archived — Inactive and hidden from catalogue</option>
              </select>
            </div>

            {/* Difficulty */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--text-2)]">
                Difficulty Level <span className="text-[var(--red)]">*</span>
              </label>
              <div className="flex items-center gap-2">
                {(['Easy', 'Medium', 'Hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`flex-1 py-2 text-xs font-medium rounded-[var(--r-md)] border transition-all ${
                      difficulty === diff
                        ? diff === 'Easy'
                          ? 'bg-[var(--green-dim)] text-[var(--green)] border-[var(--green)]/40 font-semibold'
                          : diff === 'Medium'
                          ? 'bg-[var(--amber-dim)] text-[var(--amber)] border-[var(--amber)]/40 font-semibold'
                          : 'bg-[var(--red-dim)] text-[var(--red)] border-[var(--red)]/40 font-semibold'
                        : 'bg-[var(--bg-card)] text-[var(--text-3)] border-[var(--border)] hover:text-[var(--text-2)]'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Tags */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--text-2)]">
                  Topic Tags <span className="text-[var(--red)]">*</span>
                </label>
                <span className="text-[11px] text-[var(--text-3)]">
                  {selectedTags.length} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-1.5 border border-[var(--border)] rounded-[var(--r-md)] bg-[var(--bg-canvas)]">
                {AVAILABLE_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      className={`tag-pill text-xs py-1 px-2.5 transition-colors ${
                        isSelected
                          ? '!bg-[var(--accent-dim)] !text-[var(--accent)] !border-[var(--accent)]/50 font-medium'
                          : ''
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Execution Limits Card */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2 border-b border-[var(--border)] pb-2.5">
              <Clock className="w-4 h-4 text-[var(--accent)]" /> Sandbox Resource Limits
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-2)] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[var(--text-3)]" /> Time Limit (ms)
                </label>
                <input
                  type="number"
                  value={timeLimitMs}
                  onChange={(e) => setTimeLimitMs(Number(e.target.value))}
                  min={100}
                  max={10000}
                  step={100}
                  className="input-field w-full font-mono text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--text-2)] flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-[var(--text-3)]" /> RAM Limit (MB)
                </label>
                <input
                  type="number"
                  value={memoryLimitMb}
                  onChange={(e) => setMemoryLimitMb(Number(e.target.value))}
                  min={64}
                  max={2048}
                  step={64}
                  className="input-field w-full font-mono text-sm"
                />
              </div>
            </div>

            {/* Constraints */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--text-2)]">
                  Constraints (One per line)
                </label>
                <span className="text-[11px] text-[var(--text-3)]">Markdown math allowed</span>
              </div>
              <textarea
                rows={4}
                value={constraintsText}
                onChange={(e) => setConstraintsText(e.target.value)}
                placeholder="1 <= nums.length <= 10^5&#10;-10^9 <= nums[i] <= 10^9"
                className="input-field w-full font-mono text-xs leading-relaxed"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Description, Testcases, Starter Code (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Description Section */}
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <h2 className="text-sm font-semibold text-[var(--text-1)]">
                Problem Description (Markdown) <span className="text-[var(--red)]">*</span>
              </h2>
              <span className="text-[11px] text-[var(--text-3)]">GitHub Flavored Markdown</span>
            </div>
            <textarea
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target..."
              className="input-field w-full text-sm font-mono leading-relaxed"
            />
          </div>

          {/* Sample Test Cases Section */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-1)]">
                  Sample Test Cases <span className="text-[var(--red)]">*</span>
                </h2>
                <p className="text-[11px] text-[var(--text-3)]">
                  Visible to contestants in the problem description and sample runs
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddSampleCase}
                className="btn-secondary !text-xs !py-1.5 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Test Case
              </button>
            </div>

            <div className="space-y-4">
              {sampleTestCases.map((tc, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-[var(--r-md)] bg-[var(--bg-canvas)] border border-[var(--border)] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--accent)] font-mono">
                      Sample Case #{idx + 1}
                    </span>
                    {sampleTestCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSampleCase(idx)}
                        className="text-[var(--text-3)] hover:text-[var(--red)] transition-colors p-1"
                        title="Remove test case"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[var(--text-3)]">
                        Standard Input (stdin)
                      </label>
                      <textarea
                        rows={3}
                        value={tc.input}
                        onChange={(e) => handleUpdateSampleCase(idx, 'input', e.target.value)}
                        placeholder={`2 7 11 15\n9`}
                        className="input-field w-full font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-[var(--text-3)]">
                        Expected Output (stdout)
                      </label>
                      <textarea
                        rows={3}
                        value={tc.expectedOutput}
                        onChange={(e) => handleUpdateSampleCase(idx, 'expectedOutput', e.target.value)}
                        placeholder="0 1"
                        className="input-field w-full font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-[var(--text-3)]">
                      Explanation (Optional)
                    </label>
                    <input
                      type="text"
                      value={tc.explanation}
                      onChange={(e) => handleUpdateSampleCase(idx, 'explanation', e.target.value)}
                      placeholder="Because nums[0] + nums[1] == 9, we return [0, 1]."
                      className="input-field w-full text-xs"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hidden Test Cases Section (Collapsible) */}
          <div className="card p-5 space-y-4">
            <div
              className="flex items-center justify-between cursor-pointer select-none"
              onClick={() => setShowHidden(!showHidden)}
            >
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2">
                  Hidden Evaluation Test Cases
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-3)] font-mono">
                    {hiddenTestCases.length} defined
                  </span>
                </h2>
                <p className="text-[11px] text-[var(--text-3)]">
                  Used for final verdict checking. Hidden from contestants.
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
              <div className="space-y-4 pt-3 border-t border-[var(--border)] page-fade">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-3)]">
                    Define rigorous edge cases, maximum constraints, and edge values.
                  </span>
                  <button
                    type="button"
                    onClick={handleAddHiddenCase}
                    className="btn-secondary !text-xs !py-1.5 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Hidden Case
                  </button>
                </div>

                {hiddenTestCases.length === 0 ? (
                  <div className="text-center py-6 border border-dashed border-[var(--border)] rounded-[var(--r-md)] text-xs text-[var(--text-3)]">
                    No hidden test cases yet. Click "Add Hidden Case" above to add test cases.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {hiddenTestCases.map((htc, hIdx) => (
                      <div
                        key={hIdx}
                        className="p-3.5 rounded-[var(--r-md)] bg-[var(--bg-canvas)] border border-[var(--border)] space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-[var(--text-2)]">
                            Hidden Case #{hIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveHiddenCase(hIdx)}
                            className="text-[var(--text-3)] hover:text-[var(--red)] transition-colors p-1"
                            title="Remove hidden case"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <textarea
                            rows={2}
                            value={htc.input}
                            onChange={(e) => handleUpdateHiddenCase(hIdx, 'input', e.target.value)}
                            placeholder="Hidden input..."
                            className="input-field w-full font-mono text-xs"
                          />
                          <textarea
                            rows={2}
                            value={htc.expectedOutput}
                            onChange={(e) => handleUpdateHiddenCase(hIdx, 'expectedOutput', e.target.value)}
                            placeholder="Hidden expected output..."
                            className="input-field w-full font-mono text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Starter Code Section (Tabbed) */}
          <div className="card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
              <div>
                <h2 className="text-sm font-semibold text-[var(--text-1)] flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-[var(--accent)]" /> Starter Code Templates
                </h2>
                <p className="text-[11px] text-[var(--text-3)]">
                  Provide boilerplates for contestants in all 4 supported languages
                </p>
              </div>

              {/* Language Selector Tabs */}
              <div className="flex items-center gap-1 bg-[var(--bg-canvas)] p-1 rounded-[var(--r-md)] border border-[var(--border)]">
                {languageTabs.map((tab) => (
                  <button
                    key={tab.lang}
                    type="button"
                    onClick={() => setActiveLang(tab.lang)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      activeLang === tab.lang
                        ? 'bg-[var(--accent-dim)] text-[var(--accent)] font-semibold'
                        : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-3)]">
                <span>Editing template for <strong className="text-[var(--text-1)]">{activeLang}</strong></span>
                <button
                  type="button"
                  onClick={() =>
                    setStarterCode({
                      ...starterCode,
                      [activeLang]: DEFAULT_STARTER_CODE[activeLang],
                    })
                  }
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  Reset to default template
                </button>
              </div>
              <textarea
                rows={10}
                value={starterCode[activeLang]}
                onChange={(e) =>
                  setStarterCode({
                    ...starterCode,
                    [activeLang]: e.target.value,
                  })
                }
                className="input-field w-full font-mono text-xs leading-relaxed"
                spellCheck={false}
              />
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
                  <span>Saving Problem...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[var(--green)]" />
                  <span>Problem Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EditProblemPage;
