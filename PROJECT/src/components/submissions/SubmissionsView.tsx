import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useJudge } from '../../context/JudgeContext';
import { VerdictBadge } from '../common/VerdictBadge';
import type { Submission, Problem } from '../../types/judge';
import { evaluateCode } from '../../utils/codeEvaluator';
import { 
  X,
  Copy,
  Check,
  Code2,
  ArrowRight,
  ShieldAlert,
  Inbox,
  GitCompare,
  CheckCircle2,
  XCircle,
  Terminal,
  Clock,
  Cpu,
  ChevronRight,
  History
} from 'lucide-react';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

/**
 * Longest Common Subsequence (LCS) Unified Diff Algorithm
 */
function computeUnifiedDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);
  const m = oldLines.length;
  const n = newLines.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (oldLines[i] === newLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const diff: DiffLine[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diff.unshift({
        type: 'unchanged',
        oldLineNumber: i,
        newLineNumber: j,
        content: oldLines[i - 1],
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({
        type: 'added',
        newLineNumber: j,
        content: newLines[j - 1],
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diff.unshift({
        type: 'removed',
        oldLineNumber: i,
        content: oldLines[i - 1],
      });
      i--;
    }
  }

  return diff;
}

export const SubmissionsView: React.FC = () => {
  const { submissions, problems, currentUser } = useJudge();
  const navigate = useNavigate();
  const [filterUser, setFilterUser] = useState<'me' | 'all'>('me');
  const [selectedVerdict, setSelectedVerdict] = useState<string>('All');
  const [selectedLang, setSelectedLang] = useState<string>('All');
  const [inspectSubmission, setInspectSubmission] = useState<Submission | null>(null);
  const [copied, setCopied] = useState(false);
  const inspectRef = React.useRef<HTMLDivElement>(null);
  
  // Inspector view mode: 'side-by-side' (Code + Expected vs Actual) or 'diff' (Unified Code Diff)
  const [inspectorTab, setInspectorTab] = useState<'inspect' | 'diff'>('inspect');
  const [selectedTestCaseIdx, setSelectedTestCaseIdx] = useState<number>(0);
  const [selectedPrevSubId, setSelectedPrevSubId] = useState<string>('');

  const filteredSubmissions = useMemo(() => {
    return submissions.filter(s => {
      const matchesUser =
        filterUser === 'all' || !currentUser
          ? true
          : s.userId === currentUser.id || s.username === currentUser.username;
      const matchesVerdict = selectedVerdict === 'All' || s.verdict === selectedVerdict;
      const matchesLang = selectedLang === 'All' || s.language === selectedLang;
      return matchesUser && matchesVerdict && matchesLang;
    });
  }, [submissions, filterUser, currentUser, selectedVerdict, selectedLang]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Find associated problem
  const activeProblem = useMemo(() => {
    if (!inspectSubmission) return null;
    return problems.find(
      p => p.id === inspectSubmission.problemId || p.slug === inspectSubmission.problemId
    ) || null;
  }, [problems, inspectSubmission]);

  // Find all user submissions on this same problem (sorted chronologically)
  const userProblemSubmissions = useMemo(() => {
    if (!inspectSubmission) return [];
    return submissions
      .filter(s => 
        (s.problemId === inspectSubmission.problemId || (activeProblem && s.problemId === activeProblem.id)) &&
        (s.userId === inspectSubmission.userId || s.username === inspectSubmission.username)
      )
      .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());
  }, [submissions, inspectSubmission, activeProblem]);

  // Submissions made strictly before the current one
  const previousSubmissions = useMemo(() => {
    if (!inspectSubmission) return [];
    const currentIdx = userProblemSubmissions.findIndex(s => s.id === inspectSubmission.id);
    if (currentIdx <= 0) return [];
    return userProblemSubmissions.slice(0, currentIdx);
  }, [userProblemSubmissions, inspectSubmission]);

  // Selected previous submission for comparison (defaults to immediately preceding submission)
  const activePrevSubmission = useMemo(() => {
    if (previousSubmissions.length === 0) return null;
    if (selectedPrevSubId) {
      const found = previousSubmissions.find(s => s.id === selectedPrevSubId);
      if (found) return found;
    }
    return previousSubmissions[previousSubmissions.length - 1];
  }, [previousSubmissions, selectedPrevSubId]);

  // Compute unified diff lines
  const unifiedDiff = useMemo(() => {
    if (!inspectSubmission || !activePrevSubmission) return [];
    return computeUnifiedDiff(activePrevSubmission.code, inspectSubmission.code);
  }, [inspectSubmission, activePrevSubmission]);

  const diffStats = useMemo(() => {
    let additions = 0;
    let deletions = 0;
    unifiedDiff.forEach(d => {
      if (d.type === 'added') additions++;
      else if (d.type === 'removed') deletions++;
    });
    return { additions, deletions };
  }, [unifiedDiff]);

  // Evaluate test case outputs for Expected vs Actual comparison
  const testCaseEvaluations = useMemo(() => {
    if (!inspectSubmission) return [];
    
    const fallbackProblem: Problem = {
      id: inspectSubmission.problemId || '',
      title: inspectSubmission.problemTitle || 'Algorithmic Problem',
      slug: (activeProblem?.slug || inspectSubmission.problemId || '').toLowerCase(),
      difficulty: inspectSubmission.problemDifficulty || 'Medium',
      acceptanceRate: activeProblem?.acceptanceRate || 0,
      timeLimitMs: activeProblem?.timeLimitMs || 2000,
      memoryLimitMb: activeProblem?.memoryLimitMb || 256,
      tags: activeProblem?.tags || [],
      description: '',
      constraints: [],
      sampleTestCases: [],
      hiddenTestCasesCount: 0,
      starterCode: { cpp: '', python: '', java: '', javascript: '' },
      submissionsCount: 1,
      totalAccepted: 1,
      author: 'AlgoFlow',
    };

    const evalProblem = activeProblem || fallbackProblem;

    const cases = activeProblem?.sampleTestCases && activeProblem.sampleTestCases.length > 0
      ? activeProblem.sampleTestCases
      : [
          {
            id: 'tc-sample-1',
            input: 'nums = [2,7,11,15], target = 9',
            expectedOutput: '[0,1]',
            explanation: 'nums[0] + nums[1] == 9, we return [0, 1].',
          }
        ];

    return cases.map((tc, idx) => {
      const evalRes = evaluateCode(
        evalProblem,
        inspectSubmission.language,
        inspectSubmission.code,
        tc.input,
        tc.expectedOutput
      );

      const isAccepted = inspectSubmission.verdict === 'Accepted';
      const actualOutput = isAccepted ? tc.expectedOutput : (inspectSubmission.stdout || evalRes.actualOutput || 'No output produced');
      const passed = isAccepted || evalRes.passed;

      return {
        index: idx + 1,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput,
        passed,
        explanation: tc.explanation,
        error: !isAccepted ? (inspectSubmission.errorMessage || evalRes.error) : undefined,
      };
    });
  }, [inspectSubmission, activeProblem]);

  const currentTestCase = testCaseEvaluations[selectedTestCaseIdx] || testCaseEvaluations[0];

  const handleOpenSubmission = useCallback((sub: Submission) => {
    setInspectSubmission(sub);
    setInspectorTab('inspect');
    setSelectedTestCaseIdx(0);
    setSelectedPrevSubId('');
  }, []);

  useEffect(() => {
    if (inspectSubmission && inspectRef.current) {
      inspectRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [inspectSubmission]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 page-fade text-[var(--bone)]">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[var(--border)]">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--bone)] tracking-tight">
              Execution Ledger
            </h1>
            <span className="text-xs font-mono text-[var(--text-3)] px-2 py-0.5 rounded bg-[var(--ash)] border border-[var(--border)]">
              {filteredSubmissions.length} shown / {submissions.length} total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-2)]">
            Verified algorithmic code evaluations, side-by-side output diagnostics, and line-by-line revision diffs.
          </p>
        </div>

        {/* Quick filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {currentUser && (
            <div className="flex items-center rounded-[var(--r-md)] bg-[var(--ash)] p-0.5 border border-[var(--border)]">
              <button
                onClick={() => setFilterUser('me')}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                  filterUser === 'me'
                    ? 'bg-[var(--carbon)] text-[var(--bone)] font-semibold shadow-xs'
                    : 'text-[var(--text-3)] hover:text-[var(--bone)]'
                }`}
              >
                My Submissions
              </button>
              <button
                onClick={() => setFilterUser('all')}
                className={`px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                  filterUser === 'all'
                    ? 'bg-[var(--carbon)] text-[var(--bone)] font-semibold shadow-xs'
                    : 'text-[var(--text-3)] hover:text-[var(--bone)]'
                }`}
              >
                All Submissions
              </button>
            </div>
          )}

          <select
            value={selectedVerdict}
            onChange={(e) => setSelectedVerdict(e.target.value)}
            className="h-8 bg-[var(--ash)] border border-[var(--border)] rounded-[var(--r-md)] px-3 text-xs font-mono text-[var(--bone)] focus:outline-none focus:border-[var(--verdigris)] cursor-pointer"
          >
            <option value="All">All Verdicts</option>
            <option value="Accepted">Accepted</option>
            <option value="Wrong Answer">Wrong Answer</option>
            <option value="Time Limit Exceeded">Time Limit Exceeded</option>
            <option value="Memory Limit Exceeded">Memory Limit Exceeded</option>
            <option value="Runtime Error">Runtime Error</option>
            <option value="Compilation Error">Compilation Error</option>
          </select>

          <select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
            className="h-8 bg-[var(--ash)] border border-[var(--border)] rounded-[var(--r-md)] px-3 text-xs font-mono text-[var(--bone)] focus:outline-none focus:border-[var(--verdigris)] cursor-pointer"
          >
            <option value="All">All Languages</option>
            <option value="cpp">C++</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="javascript">JavaScript</option>
          </select>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="card overflow-hidden bg-[var(--carbon)] border-[var(--border)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--ash)] text-xs font-mono text-[var(--text-3)] uppercase tracking-wider h-9">
                <th className="px-4 font-medium">Status</th>
                <th className="px-4 font-medium">Problem</th>
                <th className="px-4 font-medium">Verdict</th>
                <th className="px-4 font-medium">Language</th>
                <th className="px-4 font-medium">Runtime</th>
                <th className="px-4 font-medium">Memory</th>
                <th className="px-4 font-medium">Time</th>
                <th className="px-4 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[var(--text-3)] bg-[var(--carbon)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Inbox className="w-7 h-7 text-[var(--text-3)]" />
                      <span className="text-xs font-mono text-[var(--text-3)]">No submissions match your filters.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub) => {
                  const isSelected = inspectSubmission?.id === sub.id;
                  return (
                    <tr 
                      key={sub.id}
                      onClick={() => handleOpenSubmission(sub)}
                      className={`h-[52px] cursor-pointer transition-colors border-b border-[var(--border)] last:border-0 ${
                        isSelected 
                          ? 'bg-[var(--accent-dim)]' 
                          : 'hover:bg-[var(--ash)]'
                      }`}
                    >
                      {/* Status Icon */}
                      <td className="px-4 w-10">
                        {sub.verdict === 'Accepted' ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-[var(--green)] inline-block shadow-sm"></span>
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full bg-[var(--red)] inline-block shadow-sm"></span>
                        )}
                      </td>

                      {/* Problem */}
                      <td className="px-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const p = problems.find(pr => pr.id === sub.problemId);
                            navigate(`/problems/${p?.slug || sub.problemId}`);
                          }}
                          className="font-semibold text-[var(--bone)] hover:text-[var(--verdigris)] transition-colors text-left cursor-pointer text-sm truncate max-w-[240px] block"
                        >
                          {sub.problemTitle.replace(/^prob-\d+\.\s*/i, '')}
                        </button>
                      </td>

                      {/* Verdict */}
                      <td className="px-4">
                        <VerdictBadge verdict={sub.verdict} size="sm" />
                      </td>

                      {/* Language */}
                      <td className="px-4 text-[var(--text-2)] text-xs font-mono uppercase">
                        {sub.language}
                      </td>

                      {/* Runtime */}
                      <td className="px-4 text-[var(--bone)] font-mono text-xs">
                        {sub.executionTimeMs} ms
                      </td>

                      {/* Memory */}
                      <td className="px-4 text-[var(--text-2)] font-mono text-xs">
                        {(sub.memoryKb / 1024).toFixed(1)} MB
                      </td>

                      {/* Timestamp */}
                      <td className="px-4 text-[var(--text-3)] font-mono text-xs">
                        {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      {/* Action */}
                      <td className="px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSubmission(sub);
                          }}
                          className={`btn-secondary !px-2.5 !py-1 !text-xs font-mono ${
                            isSelected ? '!border-[var(--verdigris)] !text-[var(--verdigris)]' : ''
                          }`}
                        >
                          Inspect & Diff
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expanded Side-by-Side Panel & Diff Viewer */}
      {inspectSubmission && (
        <div ref={inspectRef} className="card bg-[var(--carbon)] border-[var(--border-strong)] p-6 space-y-5 page-fade shadow-xl">
          
          {/* Panel Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3 flex-wrap">
                <VerdictBadge verdict={inspectSubmission.verdict} size="md" />
                <h2 className="text-xl font-bold text-[var(--bone)] tracking-tight">
                  {inspectSubmission.problemTitle.replace(/^prob-\d+\.\s*/i, '')}
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--ash)] text-[var(--text-2)] border border-[var(--border)] uppercase">
                  {inspectSubmission.language}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-3)] flex-wrap">
                <span>Submission: <strong className="text-[var(--bone)]">#{inspectSubmission.id.slice(0, 8)}</strong></span>
                <span>·</span>
                <span>Author: <strong className="text-[var(--bone)]">@{inspectSubmission.username}</strong></span>
                <span>·</span>
                <span>Executed: {new Date(inspectSubmission.submittedAt).toLocaleString()}</span>
                {userProblemSubmissions.length > 1 && (
                  <>
                    <span>·</span>
                    <span className="text-[var(--verdigris)] font-semibold">
                      {userProblemSubmissions.length} attempts on this problem
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* View Mode Controls & Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Compare with previous button */}
              {previousSubmissions.length > 0 ? (
                <button
                  onClick={() => setInspectorTab(inspectorTab === 'diff' ? 'inspect' : 'diff')}
                  className={`btn-secondary !px-3 !py-1.5 !text-xs font-mono flex items-center gap-2 transition-all cursor-pointer ${
                    inspectorTab === 'diff'
                      ? '!bg-[var(--accent-dim)] !border-[var(--verdigris)] !text-[var(--verdigris)] font-semibold shadow-sm'
                      : 'hover:border-[var(--verdigris)]'
                  }`}
                  title="Compare code with previous submission"
                >
                  <GitCompare className="w-3.5 h-3.5 text-[var(--verdigris)]" />
                  <span>{inspectorTab === 'diff' ? 'Viewing Code Diff' : 'Compare with previous'}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-[var(--ash)] text-[10px] text-[var(--bone)]">
                    {previousSubmissions.length} prior
                  </span>
                </button>
              ) : null}

              {/* View Mode Tabs */}
              <div className="flex items-center rounded-[var(--r-md)] bg-[var(--ash)] p-0.5 border border-[var(--border)]">
                <button
                  onClick={() => setInspectorTab('inspect')}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                    inspectorTab === 'inspect'
                      ? 'bg-[var(--carbon)] text-[var(--bone)] font-semibold shadow-xs'
                      : 'text-[var(--text-3)] hover:text-[var(--bone)]'
                  }`}
                >
                  Code & Outputs
                </button>
                {previousSubmissions.length > 0 && (
                  <button
                    onClick={() => setInspectorTab('diff')}
                    className={`px-3 py-1 rounded text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 ${
                      inspectorTab === 'diff'
                        ? 'bg-[var(--carbon)] text-[var(--verdigris)] font-semibold shadow-xs'
                        : 'text-[var(--text-3)] hover:text-[var(--bone)]'
                    }`}
                  >
                    <span>Diff</span>
                  </button>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={() => setInspectSubmission(null)}
                className="text-[var(--text-3)] hover:text-[var(--bone)] p-1.5 rounded hover:bg-[var(--ash)] transition-colors cursor-pointer"
                title="Close Inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Telemetry Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-[var(--r-md)] bg-[var(--ash)] border border-[var(--border)] flex items-center gap-3">
              <div className="p-2 rounded bg-[var(--carbon)] border border-[var(--border)] text-[var(--verdigris)]">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase text-[var(--text-3)] font-medium">Runtime</div>
                <div className="font-bold text-[var(--bone)] text-sm">{inspectSubmission.executionTimeMs} ms</div>
              </div>
            </div>

            <div className="p-3 rounded-[var(--r-md)] bg-[var(--ash)] border border-[var(--border)] flex items-center gap-3">
              <div className="p-2 rounded bg-[var(--carbon)] border border-[var(--border)] text-[var(--amber)]">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase text-[var(--text-3)] font-medium">Memory</div>
                <div className="font-bold text-[var(--bone)] text-sm">{(inspectSubmission.memoryKb / 1024).toFixed(1)} MB</div>
              </div>
            </div>

            <div className="p-3 rounded-[var(--r-md)] bg-[var(--ash)] border border-[var(--border)] flex items-center gap-3">
              <div className="p-2 rounded bg-[var(--carbon)] border border-[var(--border)] text-[var(--green)]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase text-[var(--text-3)] font-medium">Test Cases</div>
                <div className="font-bold text-[var(--bone)] text-sm">
                  {inspectSubmission.verdict === 'Accepted'
                    ? `${inspectSubmission.totalTestCases || 3} / ${inspectSubmission.totalTestCases || 3} Passed`
                    : `${inspectSubmission.testCasesPassed ?? 0} / ${inspectSubmission.totalTestCases || 3} Passed`}
                </div>
              </div>
            </div>
          </div>

          {/* MAIN VIEW MODE: SIDE-BY-SIDE (Code on Left, Expected vs Actual Output on Right) */}
          {inspectorTab === 'inspect' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              
              {/* LEFT COLUMN: Submitted Code */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-[var(--text-2)] flex items-center gap-2 font-semibold">
                    <Code2 className="w-4 h-4 text-[var(--verdigris)]" />
                    <span>Submitted Source Code</span>
                  </span>

                  <button
                    onClick={() => handleCopyCode(inspectSubmission.code)}
                    className="btn-secondary !px-2.5 !py-1 !text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-[var(--green)]" /> : <Copy className="w-3 h-3 text-[var(--text-3)]" />}
                    <span>{copied ? 'Copied Source' : 'Copy Code'}</span>
                  </button>
                </div>

                <div className="rounded-[var(--r-md)] bg-[var(--obsidian)] border border-[var(--border)] overflow-hidden">
                  <div className="px-3.5 py-1.5 bg-[var(--ash)] border-b border-[var(--border)] flex items-center justify-between text-[11px] font-mono text-[var(--text-3)]">
                    <span>{inspectSubmission.language.toUpperCase()} • {inspectSubmission.code.split('\n').length} lines</span>
                    <span>UTF-8</span>
                  </div>
                  <pre className="p-4 font-mono text-xs text-[var(--bone)] overflow-x-auto max-h-[460px] leading-relaxed select-text">
                    {inspectSubmission.code.split('\n').map((line, idx) => (
                      <div key={idx} className="flex hover:bg-[var(--ash)]/40 px-1 -mx-1 rounded-xs">
                        <span className="w-8 text-right pr-4 text-[var(--text-3)] select-none opacity-60 shrink-0 font-mono text-xs">
                          {idx + 1}
                        </span>
                        <span className="font-mono text-xs whitespace-pre">{line || ' '}</span>
                      </div>
                    ))}
                  </pre>
                </div>
              </div>

              {/* RIGHT COLUMN: Expected vs Actual Output & Diagnostics */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-mono uppercase text-[var(--text-2)] flex items-center gap-2 font-semibold">
                    <Terminal className="w-4 h-4 text-[var(--amber)]" />
                    <span>Expected vs Actual Output</span>
                  </span>

                  {/* Test Case Switcher Tabs */}
                  {testCaseEvaluations.length > 1 && (
                    <div className="flex items-center gap-1">
                      {testCaseEvaluations.map((tc, idx) => (
                        <button
                          key={tc.index}
                          onClick={() => setSelectedTestCaseIdx(idx)}
                          className={`px-2.5 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                            selectedTestCaseIdx === idx
                              ? 'bg-[var(--verdigris)] text-[var(--obsidian)] font-bold'
                              : 'bg-[var(--ash)] text-[var(--text-2)] hover:text-[var(--bone)]'
                          }`}
                        >
                          Case {idx + 1} {tc.passed ? '✓' : '✗'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Test Case Input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-[var(--text-3)] font-semibold">
                    Test Input:
                  </label>
                  <pre className="p-2.5 rounded-[var(--r-md)] bg-[var(--obsidian)] border border-[var(--border)] font-mono text-xs text-[var(--bone)] overflow-x-auto">
                    {currentTestCase.input}
                  </pre>
                </div>

                {/* Side-by-side Output Comparison Box */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Expected Output */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--green)] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--green)]" />
                        <span>Expected Output</span>
                      </span>
                    </div>
                    <pre className="p-3 rounded-[var(--r-md)] bg-[var(--obsidian)] border border-[var(--green)]/40 font-mono text-xs text-[var(--green)] overflow-x-auto min-h-[90px] leading-relaxed">
                      {currentTestCase.expectedOutput}
                    </pre>
                  </div>

                  {/* Actual Output */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-mono uppercase tracking-wider font-semibold flex items-center gap-1 ${
                        currentTestCase.passed ? 'text-[var(--green)]' : 'text-[var(--red)]'
                      }`}>
                        {currentTestCase.passed ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--green)]" />
                            <span>Actual Output (Match)</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3.5 h-3.5 text-[var(--red)]" />
                            <span>Actual Output (Mismatch)</span>
                          </>
                        )}
                      </span>
                    </div>
                    <pre className={`p-3 rounded-[var(--r-md)] bg-[var(--obsidian)] border font-mono text-xs overflow-x-auto min-h-[90px] leading-relaxed ${
                      currentTestCase.passed
                        ? 'border-[var(--green)]/40 text-[var(--green)]'
                        : 'border-[var(--red)]/50 text-[var(--red)]'
                    }`}>
                      {currentTestCase.actualOutput}
                    </pre>
                  </div>

                </div>

                {/* Match Status Banner */}
                {currentTestCase.passed ? (
                  <div className="p-2.5 rounded-[var(--r-md)] bg-[var(--green-dim)] border border-[var(--green)]/30 text-[var(--green)] font-mono text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Evaluation Verified: Actual output matches the expected canonical solution.</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-[var(--r-md)] bg-[var(--red-dim)] border border-[var(--red)]/30 text-[var(--red)] font-mono text-xs flex items-center gap-2">
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Output Divergence: Returned output differs from expected test oracle.</span>
                  </div>
                )}

                {/* Runtime / Diagnostics Error Log */}
                {(inspectSubmission.errorMessage || currentTestCase.error) && (
                  <div className="p-3.5 rounded-[var(--r-md)] bg-[var(--red-dim)] border border-[var(--red)]/30 font-mono text-xs text-[var(--red)] space-y-1.5">
                    <div className="font-semibold flex items-center gap-1.5 uppercase tracking-wider text-xs">
                      <ShieldAlert className="w-4 h-4" />
                      <span>Diagnostics / Stderr Trace</span>
                    </div>
                    <p className="text-xs whitespace-pre-wrap leading-relaxed">
                      {inspectSubmission.errorMessage || currentTestCase.error}
                    </p>
                  </div>
                )}

                {/* Explanation if available */}
                {currentTestCase.explanation && (
                  <div className="p-3 rounded-[var(--r-md)] bg-[var(--ash)] border border-[var(--border)] text-xs text-[var(--text-2)] space-y-1">
                    <span className="font-semibold text-[var(--bone)] uppercase tracking-wider text-[11px] font-mono block">
                      Test Explanation:
                    </span>
                    <p className="leading-relaxed">{currentTestCase.explanation}</p>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* MAIN VIEW MODE: UNIFIED CODE DIFF COMPARISON */}
          {inspectorTab === 'diff' && activePrevSubmission && (
            <div className="space-y-4">
              
              {/* Diff Toolbar & Revision Selector */}
              <div className="p-3.5 rounded-[var(--r-md)] bg-[var(--ash)] border border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 flex-wrap">
                  <History className="w-4 h-4 text-[var(--verdigris)]" />
                  <span className="text-[var(--text-2)]">Comparing Revision:</span>
                  
                  {/* Select previous attempt if multiple */}
                  {previousSubmissions.length > 1 ? (
                    <select
                      value={activePrevSubmission.id}
                      onChange={(e) => setSelectedPrevSubId(e.target.value)}
                      className="h-7 bg-[var(--carbon)] border border-[var(--border)] rounded px-2 text-xs font-mono text-[var(--bone)] focus:outline-none focus:border-[var(--verdigris)] cursor-pointer"
                    >
                      {previousSubmissions.map((ps, idx) => (
                        <option key={ps.id} value={ps.id}>
                          Attempt #{idx + 1} ({ps.verdict} • {new Date(ps.submittedAt).toLocaleTimeString()})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-[var(--carbon)] border border-[var(--border)] text-[var(--bone)]">
                      Prior Attempt ({activePrevSubmission.verdict} • {new Date(activePrevSubmission.submittedAt).toLocaleTimeString()})
                    </span>
                  )}

                  <ChevronRight className="w-4 h-4 text-[var(--text-3)]" />
                  <span className="px-2 py-0.5 rounded bg-[var(--accent-dim)] border border-[var(--accent-border)] text-[var(--verdigris)] font-semibold">
                    Current #{inspectSubmission.id.slice(0, 8)} ({inspectSubmission.verdict})
                  </span>
                </div>

                {/* Diff stats counters */}
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[var(--green-dim)] text-[var(--green)] font-bold text-xs border border-[var(--green)]/30">
                    +{diffStats.additions} additions
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[var(--red-dim)] text-[var(--red)] font-bold text-xs border border-[var(--red)]/30">
                    -{diffStats.deletions} deletions
                  </span>
                </div>
              </div>

              {/* Line-by-Line Unified Diff Viewer */}
              <div className="rounded-[var(--r-md)] bg-[var(--obsidian)] border border-[var(--border)] overflow-hidden font-mono text-xs">
                <div className="px-4 py-2 bg-[var(--ash)] border-b border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-3)] font-mono">
                  <span>UNIFIED CODE DIFF</span>
                  <span className="text-[11px]">{unifiedDiff.length} lines analyzed</span>
                </div>

                <div className="overflow-x-auto max-h-[500px] divide-y divide-[var(--border)]/30 select-text">
                  {unifiedDiff.length === 0 ? (
                    <div className="p-8 text-center text-[var(--text-3)] font-mono">
                      No code differences detected between these two submission attempts.
                    </div>
                  ) : (
                    unifiedDiff.map((line, idx) => {
                      const isAdded = line.type === 'added';
                      const isRemoved = line.type === 'removed';

                      return (
                        <div
                          key={idx}
                          className={`flex items-stretch font-mono text-xs transition-colors ${
                            isAdded
                              ? 'bg-[var(--green-dim)] text-[var(--green)] border-l-2 border-[var(--green)]'
                              : isRemoved
                              ? 'bg-[var(--red-dim)] text-[var(--red)] border-l-2 border-[var(--red)] opacity-90'
                              : 'text-[var(--bone)] hover:bg-[var(--ash)]/40'
                          }`}
                        >
                          {/* Old Line Number */}
                          <span className="w-10 text-right pr-2 py-1 text-[var(--text-3)] select-none opacity-50 shrink-0 border-r border-[var(--border)]/40 font-mono text-[11px]">
                            {line.oldLineNumber ?? ''}
                          </span>

                          {/* New Line Number */}
                          <span className="w-10 text-right pr-2 py-1 text-[var(--text-3)] select-none opacity-50 shrink-0 border-r border-[var(--border)]/40 font-mono text-[11px]">
                            {line.newLineNumber ?? ''}
                          </span>

                          {/* Prefix Marker (+, -, space) */}
                          <span className="w-6 text-center py-1 select-none font-bold shrink-0 font-mono text-xs">
                            {isAdded ? '+' : isRemoved ? '-' : ' '}
                          </span>

                          {/* Code Content */}
                          <span className="py-1 pr-3 whitespace-pre flex-1 font-mono text-xs">
                            {line.content || ' '}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Bottom Diff Legend */}
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-3)] pt-1">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[var(--green-dim)] border border-[var(--green)]/40 inline-flex items-center justify-center text-[var(--green)] text-[10px] font-bold">+</span>
                    <span>Added in current submission</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-[var(--red-dim)] border border-[var(--red)]/40 inline-flex items-center justify-center text-[var(--red)] text-[10px] font-bold">-</span>
                    <span>Removed from previous submission</span>
                  </span>
                </div>

                <button
                  onClick={() => setInspectorTab('inspect')}
                  className="text-[var(--verdigris)] hover:underline cursor-pointer"
                >
                  Return to Code & Output View →
                </button>
              </div>

            </div>
          )}

          {/* Panel Footer Navigation */}
          <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
            <button
              onClick={() => setInspectSubmission(null)}
              className="btn-secondary !px-3 !py-1.5 !text-xs font-mono cursor-pointer"
            >
              Close Inspector
            </button>

            <button
              onClick={() => {
                const p = problems.find(pr => pr.id === inspectSubmission.problemId);
                navigate(`/problems/${p?.slug || inspectSubmission.problemId}`);
              }}
              className="btn-primary !bg-[var(--verdigris)] !text-[var(--obsidian)] !font-semibold !text-xs font-mono !py-1.5 !px-4 flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <span>Open Problem in Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
};

export default SubmissionsView;
