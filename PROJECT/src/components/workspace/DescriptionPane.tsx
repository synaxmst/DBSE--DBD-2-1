import React, { useState } from 'react';
import type { Problem, Submission } from '../../types/judge';
import { VerdictBadge } from '../common/VerdictBadge';
import { 
  History, 
  BookOpen, 
  HelpCircle,
  Clock, 
  Cpu, 
  Code2
} from 'lucide-react';
import { renderMarkdownToHtml } from '../../utils/markdownRenderer';

interface Props {
  problem: Problem;
  submissions: Submission[];
  onSelectSubmissionCode?: (code: string, language: string) => void;
}

export const DescriptionPane: React.FC<Props> = ({ 
  problem, 
  submissions,
  onSelectSubmissionCode 
}) => {
  const [activeTab, setActiveTab] = useState<'statement' | 'submissions' | 'solution' | 'help'>('statement');
  const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(null);

  const problemSubmissions = submissions.filter(s => s.problemId === problem.id);

  return (
    <div className="h-full flex flex-col bg-[var(--carbon)] text-[var(--bone)] overflow-hidden font-sans">
      
      {/* Top Tab Bar */}
      <div className="h-9 flex items-center justify-between border-b border-[var(--border)] bg-[var(--carbon)] px-3 shrink-0 select-none font-mono">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { setActiveTab('statement'); setViewingSubmission(null); }}
            className={`h-7 px-3 flex items-center justify-center rounded-[var(--r-sm)] text-xs font-medium cursor-pointer transition-colors ${
              activeTab === 'statement'
                ? 'text-[var(--bone)] bg-[var(--ash)] border border-[var(--border)] font-semibold'
                : 'text-[var(--text-3)] hover:text-[var(--bone)] hover:bg-[var(--ash)]'
            }`}
          >
            <span>Statement</span>
          </button>

          <button
            onClick={() => setActiveTab('submissions')}
            className={`h-7 flex items-center gap-1.5 px-3 rounded-[var(--r-sm)] text-xs font-medium cursor-pointer transition-colors ${
              activeTab === 'submissions'
                ? 'text-[var(--bone)] bg-[var(--ash)] border border-[var(--border)] font-semibold'
                : 'text-[var(--text-3)] hover:text-[var(--bone)] hover:bg-[var(--ash)]'
            }`}
          >
            <span>Submissions</span>
            {problemSubmissions.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--carbon)] text-[var(--verdigris)] border border-[var(--border)]">
                {problemSubmissions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('solution'); setViewingSubmission(null); }}
            className={`h-7 px-3 flex items-center justify-center rounded-[var(--r-sm)] text-xs font-medium cursor-pointer transition-colors ${
              activeTab === 'solution'
                ? 'text-[var(--bone)] bg-[var(--ash)] border border-[var(--border)] font-semibold'
                : 'text-[var(--text-3)] hover:text-[var(--bone)] hover:bg-[var(--ash)]'
            }`}
          >
            <span>Solution</span>
          </button>

          <button
            onClick={() => { setActiveTab('help'); setViewingSubmission(null); }}
            className={`h-7 px-3 flex items-center justify-center rounded-[var(--r-sm)] text-xs font-medium cursor-pointer transition-colors ${
              activeTab === 'help'
                ? 'text-[var(--bone)] bg-[var(--ash)] border border-[var(--border)] font-semibold'
                : 'text-[var(--text-3)] hover:text-[var(--bone)] hover:bg-[var(--ash)]'
            }`}
          >
            <span>Help</span>
          </button>
        </div>

        {/* Limits info */}
        <div className="hidden sm:flex items-center gap-2.5 text-[11px] font-mono text-[var(--text-3)]">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-[var(--text-3)]" /> {problem.timeLimitMs}ms
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Cpu className="w-3 h-3 text-[var(--text-3)]" /> {problem.memoryLimitMb}MB
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-5 text-[13px] leading-relaxed space-y-6">
        
        {/* Tab 1: Statement */}
        {activeTab === 'statement' && (
          <div className="space-y-6">
            
            {/* Title & Author Meta */}
            <div className="space-y-1.5 pb-3.5 border-b border-[var(--border)]">
              <h1 className="text-xl font-bold text-[var(--bone)] tracking-tight">
                {problem.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[var(--text-3)]">
                <span>AUTHOR: <strong className="text-[var(--bone)]">{problem.author}</strong></span>
                <span>·</span>
                <span>ACCEPTANCE: <strong className="text-[var(--verdigris)]">{problem.acceptanceRate}%</strong></span>
                <span>·</span>
                <span>SUBMISSIONS: <strong className="text-[var(--bone)]">{problem.submissionsCount.toLocaleString()}</strong></span>
              </div>
            </div>

            {/* Problem Description */}
            <div className="text-[var(--bone)] text-[13px] leading-relaxed space-y-3 font-normal whitespace-pre-line">
              {problem.description}
            </div>

            {/* Constraints */}
            <div className="space-y-2 pt-2">
              <div className="section-label font-mono text-xs">
                Constraints
              </div>
              <div className="p-3.5 rounded-[var(--r-sm)] bg-[var(--ash)] border border-[var(--border)]">
                <ul className="space-y-1 text-xs font-mono text-[var(--bone)] pl-4 list-disc">
                  {problem.constraints.map((constraint, idx) => (
                    <li key={idx} className="leading-relaxed">
                      <code>{constraint}</code>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Sample Examples */}
            <div className="space-y-4 pt-2">
              <div className="section-label font-mono text-xs">
                Sample Test Cases
              </div>

              {problem.sampleTestCases.map((tc, idx) => (
                <div 
                  key={tc.id} 
                  className="rounded-[var(--r-sm)] bg-[var(--ash)] border border-[var(--border)] overflow-hidden"
                >
                  <div className="px-3.5 py-1.5 bg-[var(--carbon)] border-b border-[var(--border)] flex items-center justify-between text-xs font-mono text-[var(--text-2)]">
                    <span className="font-semibold text-[var(--bone)]">Example {idx + 1}</span>
                  </div>
                  <div className="p-3.5 font-mono space-y-2.5 text-xs">
                    <div>
                      <span className="text-[var(--text-3)] block mb-1">Input:</span>
                      <pre className="p-2.5 rounded-[var(--r-sm)] bg-[var(--obsidian)] text-[var(--bone)] whitespace-pre-wrap border border-[var(--border)] overflow-x-auto">{tc.input}</pre>
                    </div>
                    <div>
                      <span className="text-[var(--text-3)] block mb-1">Expected Output:</span>
                      <pre className="p-2.5 rounded-[var(--r-sm)] bg-[var(--obsidian)] text-[var(--verdigris)] whitespace-pre-wrap border border-[var(--border)] overflow-x-auto font-semibold">{tc.expectedOutput}</pre>
                    </div>
                    {tc.explanation && (
                      <div className="text-[var(--text-2)] text-xs font-sans pt-1">
                        <strong className="text-[var(--bone)]">Explanation: </strong>
                        {tc.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Tags */}
            <div className="pt-2 font-mono">
              <div className="section-label mb-2 text-xs">
                Topic Tags
              </div>
              <div className="flex flex-wrap gap-1.5">
                {problem.tags.map(tag => (
                  <span 
                    key={tag} 
                    className="px-2.5 py-1 rounded-[var(--r-sm)] bg-[var(--ash)] border border-[var(--border)] text-xs text-[var(--text-2)] font-mono"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Tab 2: Submissions */}
        {activeTab === 'submissions' && (
          <div className="space-y-4 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--bone)]">Submission Ledger</span>
              <span className="text-xs text-[var(--text-3)]">{problemSubmissions.length} logged</span>
            </div>

            {problemSubmissions.length === 0 ? (
              <div className="text-center py-12 rounded-[var(--r-sm)] bg-[var(--ash)] border border-[var(--border)] space-y-2">
                <History className="w-6 h-6 text-[var(--text-3)] mx-auto opacity-50" />
                <div className="text-xs text-[var(--text-2)] font-sans">No submissions recorded for this challenge yet.</div>
                <div className="text-[11px] text-[var(--text-3)]">Run or submit your solution to evaluate your code.</div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {problemSubmissions.map(sub => (
                  <div 
                    key={sub.id}
                    className="p-3.5 rounded-[var(--r-sm)] bg-[var(--ash)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors space-y-2.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <VerdictBadge verdict={sub.verdict} />
                        <span className="uppercase text-[var(--text-2)]">
                          {sub.language}
                        </span>
                      </div>
                      <span className="text-[11px] text-[var(--text-3)]">
                        {new Date(sub.submittedAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-3)] pt-1 border-t border-[var(--border)]">
                      <div>RUNTIME: <strong className="text-[var(--bone)]">{sub.executionTimeMs}ms</strong></div>
                      <div>MEMORY: <strong className="text-[var(--bone)]">{(sub.memoryKb / 1024).toFixed(1)}MB</strong></div>
                    </div>

                    <div className="pt-1 flex items-center justify-between">
                      <button
                        onClick={() => setViewingSubmission(viewingSubmission?.id === sub.id ? null : sub)}
                        className="text-xs text-[var(--verdigris)] hover:underline cursor-pointer"
                      >
                        {viewingSubmission?.id === sub.id ? 'Hide Code' : 'View Code'}
                      </button>

                      {onSelectSubmissionCode && (
                        <button
                          onClick={() => onSelectSubmissionCode(sub.code, sub.language)}
                          className="flex items-center gap-1 text-xs text-[var(--bone)] hover:text-[var(--verdigris)] transition-colors cursor-pointer"
                        >
                          <Code2 className="w-3 h-3" />
                          <span>Load in Editor</span>
                        </button>
                      )}
                    </div>

                    {/* Expandable Code Inspector */}
                    {viewingSubmission?.id === sub.id && (
                      <pre className="p-3 rounded-[var(--r-sm)] bg-[var(--obsidian)] text-xs text-[var(--bone)] overflow-x-auto border border-[var(--border)] max-h-60 leading-relaxed">
                        {sub.code}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Solution / Editorial */}
        {activeTab === 'solution' && (
          <div className="space-y-5 font-sans">
            <div className="space-y-1 pb-3 border-b border-[var(--border)]">
              <h2 className="text-sm font-bold text-[var(--bone)] font-mono uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--verdigris)]" />
                <span>Editorial & Complexity Analysis</span>
              </h2>
              <p className="text-xs text-[var(--text-2)]">
                Algorithmic approaches and asymptotic complexity bounds.
              </p>
            </div>

            {problem.editorial && problem.editorial.trim().length > 0 ? (
              <div 
                className="text-xs text-[var(--text-2)] leading-relaxed space-y-3 font-sans editorial-content"
                dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(problem.editorial) }}
              />
            ) : (
              <p className="text-sm text-[var(--text-3)]">Official editorial has not been published for this problem yet.</p>
            )}
          </div>
        )}

        {/* Tab 4: Help & Shortcuts */}
        {activeTab === 'help' && (
          <div className="space-y-5 font-sans">
            <div className="space-y-1 pb-3 border-b border-[var(--border)]">
              <h2 className="text-sm font-bold text-[var(--bone)] font-mono uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[var(--verdigris)]" />
                <span>Shortcuts & Platform Protocol</span>
              </h2>
              <p className="text-xs text-[var(--text-2)]">
                Keybindings and execution tips for competitive programming.
              </p>
            </div>

            <div className="space-y-2.5 font-mono">
              <div className="section-label text-xs">
                Keyboard Shortcuts
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-[var(--r-sm)] bg-[var(--ash)] border border-[var(--border)]">
                  <span className="text-[var(--text-2)]">Run Test Cases</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--carbon)] text-[var(--bone)] border border-[var(--border)]">Ctrl + Enter</kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-[var(--r-sm)] bg-[var(--ash)] border border-[var(--border)]">
                  <span className="text-[var(--text-2)]">Submit Solution</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--carbon)] text-[var(--verdigris)] border border-[var(--border)]">Ctrl + Shift + Enter</kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-[var(--r-sm)] bg-[var(--ash)] border border-[var(--border)]">
                  <span className="text-[var(--text-2)]">Algorithm Visualizer</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--carbon)] text-[var(--verdigris)] border border-[var(--border)]">V</kbd>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-[var(--r-sm)] bg-[var(--ash)] border border-[var(--border)]">
                  <span className="text-[var(--text-2)]">Command Palette</span>
                  <kbd className="px-2 py-0.5 rounded bg-[var(--carbon)] text-[var(--bone)] border border-[var(--border)]">Ctrl + K</kbd>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
