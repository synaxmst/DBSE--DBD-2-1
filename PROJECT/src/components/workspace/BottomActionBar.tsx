import React from 'react';
import { Play, Send, ChevronUp, ChevronDown, CheckCircle2, XCircle, Loader2, Terminal, Cpu, Clock } from 'lucide-react';
import type { Submission, TestCaseResult } from '../../types/judge';

interface Props {
  isConsoleOpen: boolean;
  onToggleConsole: () => void;
  isRunning: boolean;
  isSubmitting: boolean;
  onRun: () => void;
  onSubmit: () => void;
  lastResults: TestCaseResult[] | null;
  lastSubmission: Submission | null;
}

export const BottomActionBar: React.FC<Props> = ({
  isConsoleOpen,
  onToggleConsole,
  isRunning,
  isSubmitting,
  onRun,
  onSubmit,
  lastResults,
  lastSubmission,
}) => {
  const allPassed = lastResults?.every(r => r.passed);
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const cmdKey = isMac ? '⌘' : 'Ctrl';

  return (
    <div className="h-11 border-t border-[var(--border)] bg-[var(--carbon)] px-4 flex items-center justify-between gap-4 shrink-0 select-none font-sans">
      
      {/* Left: Console toggle & Quick telemetry results */}
      <div className="flex items-center gap-3 font-mono">
        <button
          onClick={onToggleConsole}
          className={`flex items-center gap-2 px-3 py-1 rounded-[var(--r-sm)] text-xs font-medium transition-colors border ${
            isConsoleOpen
              ? 'bg-[var(--ash)] text-[var(--bone)] border-[var(--border-strong)]'
              : 'bg-[var(--carbon)] hover:bg-[var(--ash)] text-[var(--text-2)] border-[var(--border)]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 text-[var(--text-3)]" />
          <span>Console</span>
          {isConsoleOpen ? (
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-3)] ml-0.5" />
          ) : (
            <ChevronUp className="w-3.5 h-3.5 text-[var(--text-3)] ml-0.5" />
          )}
        </button>

        {/* Quick run summary pill */}
        {lastResults && !isRunning && !isSubmitting && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs">
            {allPassed ? (
              <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-[var(--r-sm)] bg-[var(--accent-dim)] text-[var(--verdigris)] border border-[var(--accent-border)] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>All Sample Cases Passed</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-[var(--r-sm)] bg-[var(--red-dim)] text-[var(--red)] border border-[var(--red)]/30 font-semibold">
                <XCircle className="w-3.5 h-3.5" />
                <span>Sample Tests Failed</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Center: Live Status Indicator & Runtime State */}
      <div className="hidden md:flex items-center gap-2 text-xs font-mono text-[var(--text-3)]">
        {isSubmitting ? (
          <span className="flex items-center gap-2 text-[var(--verdigris)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="font-semibold">Evaluating against hidden test suite...</span>
          </span>
        ) : isRunning ? (
          <span className="flex items-center gap-2 text-[var(--bone)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--verdigris)]" />
            <span>Executing on worker runtime...</span>
          </span>
        ) : lastSubmission ? (
          <div className="flex items-center gap-3">
            <span className="text-[var(--text-3)]">VERDICT:</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[var(--r-sm)] text-[11px] font-bold uppercase ${
              lastSubmission.verdict === 'Accepted'
                ? 'bg-[var(--accent-dim)] text-[var(--verdigris)] border border-[var(--accent-border)]'
                : 'bg-[var(--red-dim)] text-[var(--red)] border border-[var(--red)]/30'
            }`}>
              {lastSubmission.verdict === 'Accepted' ? (
                <CheckCircle2 className="w-3 h-3 text-[var(--verdigris)]" />
              ) : (
                <XCircle className="w-3 h-3 text-[var(--red)]" />
              )}
              <span>{lastSubmission.verdict}</span>
            </span>
            <span className="flex items-center gap-1 text-[11px] text-[var(--text-3)]">
              <Clock className="w-3 h-3 text-[var(--text-3)]" /> {lastSubmission.executionTimeMs}ms
            </span>
            <span className="flex items-center gap-1 text-[11px] text-[var(--text-3)]">
              <Cpu className="w-3 h-3 text-[var(--text-3)]" /> {(lastSubmission.memoryKb / 1024).toFixed(1)}MB
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[var(--text-3)] text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--verdigris)] inline-block" />
            <span>Ready</span>
          </div>
        )}
      </div>

      {/* Right: Run and Submit Action Buttons */}
      <div className="flex items-center gap-2 font-mono">
        {/* Run Button */}
        <button
          onClick={onRun}
          disabled={isRunning || isSubmitting}
          title={`Run Code (${cmdKey} + Enter)`}
          className="btn-secondary !bg-[var(--ash)] hover:!bg-[var(--bg-hover)] !py-1.5 !px-3.5 !text-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          {isRunning ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--text-3)]" />
          ) : (
            <Play className="w-3.5 h-3.5 text-[var(--text-2)] fill-[var(--text-2)]" />
          )}
          <span>Run</span>
          <kbd className="hidden lg:inline text-[10px] text-[var(--text-3)] ml-1">
            {cmdKey}+↵
          </kbd>
        </button>

        {/* Submit Button (Verdigris Accent) */}
        <button
          onClick={onSubmit}
          disabled={isRunning || isSubmitting}
          title={`Submit Solution (Shift + ${cmdKey} + Enter)`}
          className="btn-primary !bg-[var(--verdigris)] !text-[var(--obsidian)] !font-bold !py-1.5 !px-4 !text-xs disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--obsidian)]" />
          ) : (
            <Send className="w-3.5 h-3.5 text-[var(--obsidian)]" />
          )}
          <span>Submit</span>
        </button>
      </div>
    </div>
  );
};
