import React, { useState, useEffect } from 'react';
import type { Problem, TestCaseResult, TestCase, Submission } from '../../types/judge';
import { VerdictBadge } from '../common/VerdictBadge';
import { apiClient } from '../../api/client';
import { 
  Clock, 
  Cpu, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ShieldAlert,
  ChevronDown
} from 'lucide-react';

interface Props {
  problem: Problem;
  results: TestCaseResult[] | null;
  isRunning: boolean;
  isSubmitting?: boolean;
  lastSubmission?: Submission | null;
  customInput: string;
  onCustomInputChange: (input: string) => void;
  isOpen: boolean;
  onToggleOpen?: () => void;
}

export const ConsoleRunner: React.FC<Props> = ({
  problem,
  results,
  isRunning,
  isSubmitting = false,
  lastSubmission = null,
  customInput,
  onCustomInputChange,
  isOpen,
  onToggleOpen,
}) => {
  // activeTab: -2 = Verdict, -1 = Custom Input, 0..N = Sample Test Case index
  const [activeTab, setActiveTab] = useState<number>(0);
  const [realStats, setRealStats] = useState<{ fasterThanPercent: number | null; lessThanMemoryPercent: number | null } | null>(null);

  // Auto-switch to verdict tab when submission starts or arrives
  useEffect(() => {
    if (isSubmitting || lastSubmission) {
      setActiveTab(-2);
    }
  }, [isSubmitting, lastSubmission]);

  useEffect(() => {
    if (results && !isSubmitting) {
      if (activeTab === -2) {
        setActiveTab(0);
      }
    }
  }, [results]);

  // Fetch real performance percentiles based on actual database submissions
  useEffect(() => {
    if (!lastSubmission || lastSubmission.verdict !== 'Accepted') {
      setRealStats(null);
      return;
    }

    const fetchStats = async () => {
      try {
        const timeMs = lastSubmission.executionTimeMs || 0;
        const memKb = lastSubmission.memoryKb || 0;
        const res = await apiClient.get(`/problems/${problem.id}/stats?executionTime=${timeMs}&memoryKb=${memKb}`);
        if (res.data?.success && res.data?.data) {
          setRealStats({
            fasterThanPercent: res.data.data.fasterThanPercent,
            lessThanMemoryPercent: res.data.data.lessThanMemoryPercent,
          });
        }
      } catch {
        setRealStats(null);
      }
    };

    fetchStats();
  }, [lastSubmission, problem.id]);

  if (!isOpen) return null;

  const isVerdictTab = activeTab === -2;
  const isCustomInputTab = activeTab === -1;
  const currentTestCase: TestCase | undefined = (!isVerdictTab && !isCustomInputTab) 
    ? problem.sampleTestCases[activeTab] 
    : undefined;

  const sampleResults = results?.filter(r => r.testCaseId !== 'custom-input') || [];
  const customResult = results?.find(r => r.testCaseId === 'custom-input');

  const currentResult: TestCaseResult | undefined = (!isVerdictTab && !isCustomInputTab)
    ? (results?.find(r => currentTestCase && r.testCaseId === currentTestCase.id) || sampleResults[activeTab])
    : isCustomInputTab 
      ? customResult
      : undefined;

  return (
    <div className="h-full flex flex-col bg-[var(--carbon)] text-[var(--bone)] overflow-hidden font-sans border-t border-[var(--border)] select-none">
      
      {/* Console Header Tabs */}
      <div className="h-9 flex items-center justify-between border-b border-[var(--border)] bg-[var(--carbon)] px-3 shrink-0">
        
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar font-mono">
          
          {/* Submission Verdict Tab */}
          {(lastSubmission || isSubmitting) && (
            <button
              onClick={() => setActiveTab(-2)}
              className={`h-7 flex items-center gap-1.5 px-2.5 rounded-[var(--r-sm)] text-xs cursor-pointer transition-all ${
                isVerdictTab
                  ? lastSubmission?.verdict === 'Accepted'
                    ? 'bg-[var(--accent-dim)] text-[var(--verdigris)] border border-[var(--accent-border)] font-semibold'
                    : 'bg-[var(--red-dim)] text-[var(--red)] border border-[var(--red)]/30 font-semibold'
                  : 'text-[var(--text-3)] hover:text-[var(--bone)] hover:bg-[var(--ash)]'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--verdigris)]" />
              ) : lastSubmission?.verdict === 'Accepted' ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--verdigris)]" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-[var(--red)]" />
              )}
              <span>Verdict</span>
              {lastSubmission && !isSubmitting && (
                <span className={`text-[10px] px-1 rounded ${
                  lastSubmission.verdict === 'Accepted' 
                    ? 'text-[var(--obsidian)] bg-[var(--verdigris)] font-bold' 
                    : 'text-[var(--red)] bg-[var(--red-dim)]'
                }`}>
                  {lastSubmission.verdict === 'Accepted' ? 'AC' : 'WA'}
                </span>
              )}
            </button>
          )}

          {/* Test cases tab pills */}
          {problem.sampleTestCases.map((tc, idx) => {
            const res = results?.find(r => r.testCaseId === tc.id) || sampleResults[idx];
            const isSelected = activeTab === idx;
            return (
              <button
                key={tc.id}
                onClick={() => setActiveTab(idx)}
                className={`h-7 flex items-center gap-1.5 px-2.5 rounded-[var(--r-sm)] text-xs cursor-pointer transition-colors shrink-0 ${
                  isSelected
                    ? 'bg-[var(--ash)] text-[var(--bone)] font-semibold border border-[var(--border)]'
                    : 'text-[var(--text-3)] hover:text-[var(--bone)] hover:bg-[var(--ash)]'
                }`}
              >
                <span>Case {idx + 1}</span>
                {res && (
                  res.passed ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--verdigris)]" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)]" />
                  )
                )}
              </button>
            );
          })}

          {/* Test against Custom Input */}
          <button
            onClick={() => setActiveTab(-1)}
            className={`h-7 flex items-center gap-1.5 px-2.5 rounded-[var(--r-sm)] text-xs cursor-pointer transition-colors shrink-0 ${
              isCustomInputTab
                ? 'bg-[var(--ash)] text-[var(--bone)] font-semibold border border-[var(--border)]'
                : 'text-[var(--text-3)] hover:text-[var(--bone)] hover:bg-[var(--ash)]'
            }`}
          >
            <span>+ Custom Input</span>
            {customResult ? (
              <span className={`w-1.5 h-1.5 rounded-full ${customResult.passed ? 'bg-[var(--verdigris)]' : 'bg-[var(--red)]'}`} />
            ) : customInput.trim().length > 0 ? (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--verdigris)]" />
            ) : null}
          </button>
        </div>

        {/* Collapse toggle */}
        {onToggleOpen && (
          <button
            onClick={onToggleOpen}
            className="p-1 rounded text-[var(--text-3)] hover:text-[var(--bone)] transition-colors"
            title="Toggle Console"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Console Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 text-xs font-mono space-y-4 bg-[var(--obsidian)]">
        
        {/* State A: Running / Submitting In-Flight Loader */}
        {(isRunning || isSubmitting) && (
          <div className="flex flex-col items-center justify-center py-10 space-y-3 font-sans">
            <Loader2 className="w-6 h-6 text-[var(--verdigris)] animate-spin" />
            <div className="text-center">
              <div className="text-[var(--bone)] font-semibold text-sm">
                {isSubmitting ? 'Evaluating against hidden test suite...' : 'Executing code on sandbox worker...'}
              </div>
              <div className="text-[var(--text-3)] text-xs font-mono mt-1">
                Evaluating...
              </div>
            </div>
          </div>
        )}

        {/* State B: Transformed Verdict "Moment" View */}
        {!isRunning && !isSubmitting && isVerdictTab && lastSubmission && (
          <div className="space-y-4 page-fade">
            {lastSubmission.verdict === 'Accepted' ? (
              /* ACCEPTED MOMENT BANNER */
              <div className="p-5 rounded-[var(--r-md)] bg-[var(--carbon)] border border-[var(--accent-border)] space-y-4 shadow-[var(--shadow-sm)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[var(--accent-dim)] border border-[var(--verdigris)]/40 flex items-center justify-center text-[var(--verdigris)]">
                      <CheckCircle2 className="w-4 h-4 text-[var(--verdigris)]" />
                    </div>
                    <div>
                      <div className="text-xl font-bold text-[var(--verdigris)] tracking-tight flex items-center gap-2">
                        <span>Accepted</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--verdigris)] font-mono font-semibold">
                          100% PASS
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-2)] font-sans mt-0.5">
                        All test cases evaluated and passed deterministically.
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-xs font-mono text-[var(--text-3)]">
                    <div>{lastSubmission.testCasesPassed ?? 3} / {lastSubmission.totalTestCases ?? 3} TEST CASES</div>
                    <div className="text-[11px] text-[var(--text-3)]">{new Date(lastSubmission.submittedAt).toLocaleTimeString()}</div>
                  </div>
                </div>

                {/* Performance Comparison Percentile Grid ("Faster Than X%") */}
                {realStats && (realStats.fasterThanPercent !== null || realStats.lessThanMemoryPercent !== null) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* Runtime Card */}
                    {realStats.fasterThanPercent !== null && (
                      <div className="p-3.5 rounded-[var(--r-sm)] bg-[var(--ash)] border border-[var(--border)] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-3)] font-mono flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[var(--verdigris)]" /> Runtime
                          </span>
                          <span className="font-bold text-[var(--bone)] font-mono text-sm">
                            {lastSubmission.executionTimeMs} ms
                          </span>
                        </div>

                        <div className="text-xs text-[var(--text-2)] font-sans">
                          Faster than <strong className="text-[var(--verdigris)] font-semibold font-mono">{realStats.fasterThanPercent}%</strong> of submissions.
                        </div>

                        {/* Visual speed progress bar */}
                        <div className="w-full h-1.5 rounded-full bg-[var(--carbon)] overflow-hidden">
                          <div 
                            className="h-full bg-[var(--verdigris)] rounded-full transition-all duration-500"
                            style={{ width: `${realStats.fasterThanPercent}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Memory Card */}
                    {realStats.lessThanMemoryPercent !== null && (
                      <div className="p-3.5 rounded-[var(--r-sm)] bg-[var(--ash)] border border-[var(--border)] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--text-3)] font-mono flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-[var(--verdigris)]" /> Memory
                          </span>
                          <span className="font-bold text-[var(--bone)] font-mono text-sm">
                            {(lastSubmission.memoryKb / 1024).toFixed(1)} MB
                          </span>
                        </div>

                        <div className="text-xs text-[var(--text-2)] font-sans">
                          Beats <strong className="text-[var(--verdigris)] font-semibold font-mono">{realStats.lessThanMemoryPercent}%</strong> of memory profiles.
                        </div>

                        {/* Visual memory progress bar */}
                        <div className="w-full h-1.5 rounded-full bg-[var(--carbon)] overflow-hidden">
                          <div 
                            className="h-full bg-[var(--verdigris)] rounded-full transition-all duration-500"
                            style={{ width: `${realStats.lessThanMemoryPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Telemetry output if any */}
                {lastSubmission.stdout && (
                  <div className="space-y-1 pt-1 font-mono">
                    <span className="text-[var(--text-3)] text-[11px]">Worker Execution Telemetry:</span>
                    <pre className="p-2.5 rounded-[var(--r-sm)] bg-[var(--ash)] text-xs text-[var(--bone)] border border-[var(--border)] whitespace-pre-wrap">
                      {lastSubmission.stdout}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              /* NON-ACCEPTED VERDICT CARD (WA / TLE / RE / CE) */
              <div className="p-5 rounded-[var(--r-md)] bg-[var(--carbon)] border border-[var(--border)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                  <div className="flex items-center gap-3">
                    <VerdictBadge verdict={lastSubmission.verdict} />
                    <div>
                      <div className="text-base font-bold text-[var(--bone)]">
                        {lastSubmission.verdict}
                      </div>
                      <div className="text-xs text-[var(--text-3)] font-mono mt-0.5">
                        {lastSubmission.testCasesPassed ?? 0} / {lastSubmission.totalTestCases ?? 3} testcases passed
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono text-[var(--text-3)]">
                    <span>{lastSubmission.executionTimeMs} ms</span>
                    <span>·</span>
                    <span>{(lastSubmission.memoryKb / 1024).toFixed(1)} MB</span>
                  </div>
                </div>

                {/* Diagnostic Trace Output */}
                {lastSubmission.errorMessage && (
                  <div className="p-3.5 rounded-[var(--r-sm)] bg-[var(--red-dim)] border border-[var(--red)]/30 space-y-1.5 font-mono">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--red)]">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Diagnostics Trace:</span>
                    </div>
                    <pre className="text-xs text-[var(--red)] whitespace-pre-wrap leading-relaxed">
                      {lastSubmission.errorMessage}
                    </pre>
                  </div>
                )}

                {lastSubmission.stdout && (
                  <div className="space-y-1 font-mono">
                    <span className="text-[var(--text-3)] text-[11px]">Standard Output:</span>
                    <pre className="p-3 rounded-[var(--r-sm)] bg-[var(--ash)] text-xs text-[var(--bone)] border border-[var(--border)] whitespace-pre-wrap">
                      {lastSubmission.stdout}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* State C: Custom Input Editor */}
        {!isRunning && !isSubmitting && isCustomInputTab && (
          <div className="space-y-3 font-sans">
            <div className="flex items-center justify-between font-mono">
              <span className="text-xs font-semibold text-[var(--bone)]">Standard Input (stdin):</span>
              {customInput && (
                <button
                  onClick={() => onCustomInputChange('')}
                  className="flex items-center gap-1 text-[11px] text-[var(--text-3)] hover:text-[var(--red)] transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear Input</span>
                </button>
              )}
            </div>

            <textarea
              value={customInput}
              onChange={(e) => onCustomInputChange(e.target.value)}
              placeholder="Enter custom standard input (stdin)..."
              className="w-full h-24 p-3 rounded-[var(--r-sm)] bg-[var(--carbon)] text-[var(--bone)] font-mono text-xs border border-[var(--border)] focus:border-[var(--verdigris)] focus:outline-none transition-colors resize-none"
            />

            {currentResult ? (
              <div className="space-y-3 font-mono pt-1">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-2)]">Output:</span>
                    <div className="flex items-center gap-3 text-[11px] text-[var(--text-3)]">
                      <span>CPU: <strong className="text-[var(--bone)]">{currentResult.executionTimeMs}ms</strong></span>
                      <span>·</span>
                      <span>Memory: <strong className="text-[var(--bone)]">{(currentResult.memoryKb ? currentResult.memoryKb / 1024 : 0).toFixed(1)}MB</strong></span>
                    </div>
                  </div>
                  <pre className="p-3 rounded-[var(--r-sm)] bg-[var(--carbon)] text-xs text-[var(--verdigris)] border border-[var(--border)] whitespace-pre-wrap font-semibold">
                    {currentResult.actualOutput || '(No output generated)'}
                  </pre>
                </div>

                {currentResult.stdout && (
                  <div className="space-y-1">
                    <span className="text-[var(--text-3)] text-[11px]">Runner Telemetry:</span>
                    <pre className="p-2.5 rounded-[var(--r-sm)] bg-[var(--carbon)] text-xs text-[var(--text-2)] border border-[var(--border)] whitespace-pre-wrap">
                      {currentResult.stdout}
                    </pre>
                  </div>
                )}

                {currentResult.error && (
                  <div className="p-2.5 rounded-[var(--r-sm)] bg-[var(--red-dim)] border border-[var(--red)]/30 space-y-1">
                    <span className="text-xs font-semibold text-[var(--red)]">Execution Error:</span>
                    <pre className="text-xs text-[var(--red)] whitespace-pre-wrap">
                      {currentResult.error}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 rounded-[var(--r-sm)] bg-[var(--carbon)] border border-[var(--border)] text-xs text-[var(--text-3)] font-mono text-center">
                Click <strong className="text-[var(--bone)]">Run (Ctrl+Enter)</strong> to evaluate your solution on this input.
              </div>
            )}
          </div>
        )}

        {/* State D: Sample Test Cases View */}
        {!isRunning && !isSubmitting && !isVerdictTab && !isCustomInputTab && currentTestCase && (
          <div className="space-y-3 font-mono">
            {/* Input Box */}
            <div className="space-y-1">
              <div className="text-[var(--text-3)] text-[11px]">Input:</div>
              <pre className="p-2.5 rounded-[var(--r-sm)] bg-[var(--carbon)] text-[var(--bone)] border border-[var(--border)] whitespace-pre-wrap">
                {currentTestCase.input}
              </pre>
            </div>

            {/* Expected vs Actual Output */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-[var(--text-3)] text-[11px]">Expected Output:</div>
                <pre className="p-2.5 rounded-[var(--r-sm)] bg-[var(--carbon)] text-[var(--verdigris)] border border-[var(--border)] whitespace-pre-wrap">
                  {currentTestCase.expectedOutput}
                </pre>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-[var(--text-3)]">
                  <span>Actual Output:</span>
                  {currentResult && (
                    <span className={`text-[10px] font-semibold px-1.5 rounded ${
                      currentResult.passed 
                        ? 'text-[var(--obsidian)] bg-[var(--verdigris)]' 
                        : 'text-[var(--red)] bg-[var(--red-dim)]'
                    }`}>
                      {currentResult.passed ? 'PASSED' : 'WRONG ANSWER'}
                    </span>
                  )}
                </div>
                <pre className={`p-2.5 rounded-[var(--r-sm)] bg-[var(--carbon)] text-xs border whitespace-pre-wrap ${
                  currentResult?.passed 
                    ? 'text-[var(--verdigris)] border-[var(--verdigris)]/30' 
                    : currentResult 
                    ? 'text-[var(--red)] border-[var(--red)]/30' 
                    : 'text-[var(--text-3)] border-[var(--border)]'
                }`}>
                  {currentResult ? (currentResult.actualOutput || '(Empty output)') : 'Run code to see output.'}
                </pre>
              </div>
            </div>

            {/* Execution Telemetry if evaluated */}
            {currentResult && (
              <div className="flex items-center gap-4 text-[11px] font-mono text-[var(--text-3)] pt-1">
                <span>CPU: <strong className="text-[var(--bone)]">{currentResult.executionTimeMs}ms</strong></span>
                <span>·</span>
                <span>Memory: <strong className="text-[var(--bone)]">{(currentResult.memoryKb ? currentResult.memoryKb / 1024 : 0).toFixed(1)}MB</strong></span>
              </div>
            )}

            {currentResult?.error && (
              <pre className="p-2.5 rounded-[var(--r-sm)] bg-[var(--red-dim)] text-xs text-[var(--red)] border border-[var(--red)]/30 whitespace-pre-wrap">
                {currentResult.error}
              </pre>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
