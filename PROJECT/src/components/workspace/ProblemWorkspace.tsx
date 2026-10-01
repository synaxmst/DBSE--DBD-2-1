import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useJudge, 
  saveCodeDraft, 
  loadCodeDraft, 
  saveLanguagePref, 
  loadLanguagePref 
} from '../../context/JudgeContext';
import type { SupportedLanguage } from '../../types/judge';
import { DescriptionPane } from './DescriptionPane';
import { MonacoCodeEditor } from './MonacoCodeEditor';
import { ConsoleRunner } from './ConsoleRunner';
import { BottomActionBar } from './BottomActionBar';
import { AlgorithmVisualizer } from './AlgorithmVisualizer';
import { StressTester } from './StressTester';
import { DifficultyBadge } from '../common/DifficultyBadge';
import { 
  ArrowLeft,
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Code2, 
  Bookmark, 
  BookmarkCheck,
  Maximize2,
  Minimize2,
  Columns,
  Keyboard,
  PlaySquare,
  Activity,
  X
} from 'lucide-react';

export const ProblemWorkspace: React.FC = () => {
  const { 
    currentUser,
    activeProblem: contextActiveProblem, 
    setActiveProblemId,
    problems, 
    submissions, 
    runCode, 
    submitSolution,
    isRunningCode,
    isSubmitting,
    lastRunResults,
    setLastRunResults,
    lastSubmissionResult,
    setLastSubmissionResult,
  } = useJudge();

  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  // Resolve problem matching URL slug or id
  const activeProblem = useMemo(() => {
    if (slug && problems.length > 0) {
      const found = problems.find(p => p.slug === slug || p.id === slug);
      if (found) return found;
    }
    return contextActiveProblem || problems[0];
  }, [slug, problems, contextActiveProblem]);

  // Handle invalid slug lookup
  useEffect(() => {
    if (slug && problems.length > 0) {
      const found = problems.find(p => p.slug === slug || p.id === slug);
      if (!found) {
        navigate('/problems', { state: { error: `Problem "${slug}" not found.` }, replace: true });
      }
    }
  }, [slug, problems, navigate]);

  const username = currentUser?.username ?? 'guest';
  const problemKey = activeProblem?.slug || activeProblem?.id || slug || '';

  // Keep context in sync
  useEffect(() => {
    if (activeProblem && activeProblem.id !== contextActiveProblem?.id) {
      setActiveProblemId(activeProblem.id);
    }
  }, [activeProblem, contextActiveProblem, setActiveProblemId]);

  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    const saved = loadLanguagePref(username, problemKey);
    return (saved && ['cpp', 'python', 'java', 'javascript'].includes(saved))
      ? (saved as SupportedLanguage)
      : 'cpp';
  });

  const [codeMap, setCodeMap] = useState<Record<SupportedLanguage, string>>(() => ({
    cpp: loadCodeDraft(username, problemKey, 'cpp') ?? activeProblem?.starterCode?.cpp ?? '',
    python: loadCodeDraft(username, problemKey, 'python') ?? activeProblem?.starterCode?.python ?? '',
    java: loadCodeDraft(username, problemKey, 'java') ?? activeProblem?.starterCode?.java ?? '',
    javascript: loadCodeDraft(username, problemKey, 'javascript') ?? activeProblem?.starterCode?.javascript ?? '',
  }));

  const [customInput, setCustomInput] = useState<string>('');
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(true);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState<boolean>(false);
  const [isVisualizerOpen, setIsVisualizerOpen] = useState<boolean>(false);
  const [isStressTesterOpen, setIsStressTesterOpen] = useState<boolean>(false);

  // Responsive mobile tab ('desc' | 'editor')
  const [mobileTab, setMobileTab] = useState<'desc' | 'editor'>('desc');

  // Dual-axis Resizable Splitters
  const [horizontalSplit, setHorizontalSplit] = useState<number>(46);
  const [isDraggingH, setIsDraggingH] = useState<boolean>(false);
  
  const [verticalSplit, setVerticalSplit] = useState<number>(62);
  const [isDraggingV, setIsDraggingV] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore saved language and code drafts when problem or user changes
  useEffect(() => {
    if (!problemKey || !activeProblem) return;

    const savedLang = loadLanguagePref(username, problemKey);
    const resolvedLang: SupportedLanguage = (savedLang && ['cpp', 'python', 'java', 'javascript'].includes(savedLang))
      ? (savedLang as SupportedLanguage)
      : 'cpp';
    setLanguage(resolvedLang);

    setCodeMap({
      cpp: loadCodeDraft(username, problemKey, 'cpp') ?? activeProblem.starterCode?.cpp ?? '',
      python: loadCodeDraft(username, problemKey, 'python') ?? activeProblem.starterCode?.python ?? '',
      java: loadCodeDraft(username, problemKey, 'java') ?? activeProblem.starterCode?.java ?? '',
      javascript: loadCodeDraft(username, problemKey, 'javascript') ?? activeProblem.starterCode?.javascript ?? '',
    });
    setCustomInput('');
  }, [activeProblem?.id, problemKey, username]);

  // Reset previous verdict and execution results when problem or user changes, or on unmount
  useEffect(() => {
    setLastRunResults(null);
    setLastSubmissionResult(null);
    return () => {
      setLastRunResults(null);
      setLastSubmissionResult(null);
    };
  }, [problemKey, username, setLastRunResults, setLastSubmissionResult]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const activeSubmission = useMemo(() => {
    if (!lastSubmissionResult) return null;
    const isMatchProblem = (
      lastSubmissionResult.problemId === activeProblem?.id || 
      lastSubmissionResult.problemTitle === activeProblem?.title ||
      lastSubmissionResult.problemId === slug
    );
    const isMatchUser = (
      !currentUser || 
      !lastSubmissionResult.userId ||
      lastSubmissionResult.userId === currentUser.id ||
      lastSubmissionResult.username === currentUser.username
    );
    return (isMatchProblem && isMatchUser) ? lastSubmissionResult : null;
  }, [lastSubmissionResult, activeProblem, slug, currentUser]);

  const currentCode = codeMap[language] ?? '';

  const handleCodeChange = (newCode: string) => {
    setCodeMap(prev => ({ ...prev, [language]: newCode }));

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      if (problemKey) {
        saveCodeDraft(username, problemKey, language, newCode);
      }
    }, 800);
  };

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    if (problemKey) {
      saveLanguagePref(username, problemKey, newLang);
      const savedDraft = loadCodeDraft(username, problemKey, newLang);
      if (savedDraft !== null) {
        setCodeMap(prev => ({ ...prev, [newLang]: savedDraft }));
      } else if (!codeMap[newLang] && activeProblem?.starterCode?.[newLang]) {
        setCodeMap(prev => ({ ...prev, [newLang]: activeProblem.starterCode[newLang] }));
      }
    }
  };

  const handleResetCode = () => {
    const defaultCode = activeProblem?.starterCode?.[language] || '';
    setCodeMap(prev => ({ ...prev, [language]: defaultCode }));
    if (problemKey) {
      saveCodeDraft(username, problemKey, language, defaultCode);
    }
  };

  const handleSelectSubmissionCode = (code: string, subLang: string) => {
    if (['cpp', 'python', 'java', 'javascript'].includes(subLang)) {
      const selectedLang = subLang as SupportedLanguage;
      setLanguage(selectedLang);
      if (problemKey) {
        saveLanguagePref(username, problemKey, selectedLang);
        saveCodeDraft(username, problemKey, selectedLang, code);
      }
      setCodeMap(prev => ({ ...prev, [selectedLang]: code }));
      setMobileTab('editor');
    }
  };

  // Run Code handler
  const handleRun = useCallback(() => {
    if (isRunningCode || isSubmitting || !activeProblem) return;
    setIsConsoleOpen(true);
    setMobileTab('editor');
    runCode(activeProblem, language, currentCode, customInput);
  }, [isRunningCode, isSubmitting, runCode, activeProblem, language, currentCode, customInput]);

  // Submit Solution handler
  const handleSubmit = useCallback(() => {
    if (isRunningCode || isSubmitting || !activeProblem) return;
    setIsConsoleOpen(true);
    setMobileTab('editor');
    submitSolution(activeProblem, language, currentCode);
  }, [isRunningCode, isSubmitting, submitSolution, activeProblem, language, currentCode]);

  // Keyboard shortcuts (Cmd/Ctrl+Enter to Run, Cmd/Ctrl+Shift+Enter to Submit, V for Visualizer, S for Stress Tester)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive = 
        activeEl && 
        (activeEl.tagName === 'INPUT' || 
         activeEl.tagName === 'TEXTAREA' || 
         activeEl.getAttribute('contenteditable') === 'true' ||
         activeEl.closest('.monaco-editor') !== null);

      const isCmdOrCtrl = e.metaKey || e.ctrlKey;

      if (isCmdOrCtrl && e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          handleSubmit();
        } else {
          handleRun();
        }
        return;
      }

      if (e.key === 'Escape') {
        if (isStressTesterOpen) {
          setIsStressTesterOpen(false);
        }
        if (isVisualizerOpen) {
          setIsVisualizerOpen(false);
        }
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
        }
        return;
      }

      // V or v key toggles the Algorithm Visualizer when not actively typing in code/input fields
      if ((e.key === 'v' || e.key === 'V') && !isCmdOrCtrl && !e.altKey && !isInputActive) {
        e.preventDefault();
        setIsVisualizerOpen(prev => !prev);
        return;
      }

      // S or s key toggles the Stress Tester when not actively typing in code/input fields
      if ((e.key === 's' || e.key === 'S') && !isCmdOrCtrl && !e.altKey && !isInputActive) {
        e.preventDefault();
        setIsStressTesterOpen(prev => !prev);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRun, handleSubmit, isVisualizerOpen, isStressTesterOpen, showShortcutsModal]);

  // Horizontal Dragging (Left / Right resize)
  useEffect(() => {
    const handleMouseMoveH = (e: MouseEvent) => {
      if (!isDraggingH || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPercent = ((e.clientX - rect.left) / rect.width) * 100;
      if (newPercent >= 20 && newPercent <= 80) {
        setHorizontalSplit(newPercent);
      }
    };

    const handleMouseUpH = () => {
      if (isDraggingH) setIsDraggingH(false);
    };

    if (isDraggingH) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMoveH);
      window.addEventListener('mouseup', handleMouseUpH);
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMoveH);
      window.removeEventListener('mouseup', handleMouseUpH);
    };
  }, [isDraggingH]);

  // Vertical Dragging (Editor / Console resize)
  useEffect(() => {
    const handleMouseMoveV = (e: MouseEvent) => {
      if (!isDraggingV || !rightColumnRef.current) return;
      const rect = rightColumnRef.current.getBoundingClientRect();
      const newPercent = ((e.clientY - rect.top) / rect.height) * 100;
      if (newPercent >= 25 && newPercent <= 85) {
        setVerticalSplit(newPercent);
      }
    };

    const handleMouseUpV = () => {
      if (isDraggingV) setIsDraggingV(false);
    };

    if (isDraggingV) {
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMoveV);
      window.addEventListener('mouseup', handleMouseUpV);
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMoveV);
      window.removeEventListener('mouseup', handleMouseUpV);
    };
  }, [isDraggingV]);

  if (!activeProblem) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--obsidian)] text-[var(--bone)] font-mono text-sm">
        Loading problem workspace...
      </div>
    );
  }

  const currentIndex = problems.findIndex(p => p.id === activeProblem.id);
  const prevProblem = currentIndex > 0 ? problems[currentIndex - 1] : null;
  const nextProblem = currentIndex < problems.length - 1 ? problems[currentIndex + 1] : null;

  return (
    <div className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : 'h-screen'} bg-[var(--obsidian)] text-[var(--bone)] overflow-hidden select-none font-sans relative`}>
      
      {/* 38px Minimal Immersive Topbar */}
      <div className="h-[38px] border-b border-[var(--border)] bg-[var(--carbon)] px-3.5 flex items-center justify-between shrink-0 text-xs z-20 font-mono">
        {/* Left Section: Back, Problem Title, Difficulty & Bookmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/problems')}
            className="text-[var(--text-3)] hover:text-[var(--bone)] p-1 rounded transition-colors flex items-center cursor-pointer"
            title="Back to Problems Catalog"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--bone)] font-sans text-xs truncate max-w-[200px] sm:max-w-xs md:max-w-md">
              {activeProblem.title}
            </span>
            <DifficultyBadge difficulty={activeProblem.difficulty} size="sm" />
          </div>

          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            className={`p-1 rounded transition-colors ${
              isBookmarked ? 'text-[var(--amber)]' : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
            }`}
            title={isBookmarked ? 'Bookmarked' : 'Bookmark Problem'}
          >
            {isBookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Center: Mobile Switcher Tabs */}
        <div className="flex lg:hidden items-center bg-[var(--ash)] p-0.5 rounded-[var(--r-sm)] border border-[var(--border)]">
          <button
            onClick={() => setMobileTab('desc')}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              mobileTab === 'desc'
                ? 'bg-[var(--carbon)] text-[var(--bone)]'
                : 'text-[var(--text-3)]'
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>Problem</span>
          </button>
          <button
            onClick={() => setMobileTab('editor')}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
              mobileTab === 'editor'
                ? 'bg-[var(--carbon)] text-[var(--bone)]'
                : 'text-[var(--text-3)]'
            }`}
          >
            <Code2 className="w-3 h-3" />
            <span>Code</span>
          </button>
        </div>

        {/* Right Section: Prev/Next & Quick Tools */}
        <div className="flex items-center gap-1.5 text-[var(--text-3)]">
          
          {/* Stress Tester Trigger Button */}
          <button
            onClick={() => setIsStressTesterOpen(!isStressTesterOpen)}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs font-mono cursor-pointer ${
              isStressTesterOpen 
                ? 'bg-[var(--accent-dim)] text-[var(--verdigris)] border border-[var(--accent-border)] font-semibold' 
                : 'hover:text-[var(--bone)] hover:bg-[var(--ash)] text-[var(--text-3)]'
            }`}
            title="Dual-Engine Stress Tester (Press S)"
          >
            <Activity className="w-3.5 h-3.5 text-[var(--amber)]" />
            <span className="hidden sm:inline">Stress Test</span>
            <kbd className="hidden md:inline-block px-1 py-0.2 rounded bg-[var(--obsidian)] text-[10px] text-[var(--text-3)] border border-[var(--border)]">S</kbd>
          </button>

          {/* Algorithm Visualizer Trigger Button */}
          <button
            onClick={() => setIsVisualizerOpen(!isVisualizerOpen)}
            className={`flex items-center gap-1 px-2 py-1 rounded transition-colors text-xs font-mono cursor-pointer ${
              isVisualizerOpen 
                ? 'bg-[var(--accent-dim)] text-[var(--verdigris)] border border-[var(--accent-border)] font-semibold' 
                : 'hover:text-[var(--bone)] hover:bg-[var(--ash)] text-[var(--text-3)]'
            }`}
            title="Algorithm Visualizer (Press V)"
          >
            <PlaySquare className="w-3.5 h-3.5 text-[var(--verdigris)]" />
            <span className="hidden sm:inline">Visualizer</span>
            <kbd className="hidden md:inline-block px-1 py-0.2 rounded bg-[var(--obsidian)] text-[10px] text-[var(--text-3)] border border-[var(--border)]">V</kbd>
          </button>

          {/* Keyboard Shortcuts Trigger */}
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="p-1 rounded hover:text-[var(--bone)] hover:bg-[var(--ash)] transition-colors"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>

          {/* Reset Panel Splits */}
          <button
            onClick={() => { setHorizontalSplit(48); setVerticalSplit(62); }}
            className="hidden lg:flex p-1 rounded hover:text-[var(--bone)] hover:bg-[var(--ash)] transition-colors"
            title="Reset split layout"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="hidden sm:flex p-1 rounded hover:text-[var(--bone)] hover:bg-[var(--ash)] transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Workspace'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <div className="h-3 w-px bg-[var(--border)] mx-1" />

          {/* Previous / Next Stepper */}
          <button
            disabled={!prevProblem}
            onClick={() => prevProblem && navigate(`/problems/${prevProblem.slug || prevProblem.id}`)}
            className="p-1 rounded hover:text-[var(--bone)] hover:bg-[var(--ash)] disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title={prevProblem ? `Previous: ${prevProblem.title}` : undefined}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            disabled={!nextProblem}
            onClick={() => nextProblem && navigate(`/problems/${nextProblem.slug || nextProblem.id}`)}
            className="p-1 rounded hover:text-[var(--bone)] hover:bg-[var(--ash)] disabled:opacity-20 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title={nextProblem ? `Next: ${nextProblem.title}` : undefined}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Workspace Layout with Dual-Axis Resizing */}
      <div 
        ref={containerRef}
        className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden bg-[var(--obsidian)] p-1.5 gap-1.5"
      >
        {/* Left Panel: Problem Statement / Submissions / Solution */}
        <div 
          style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${horizontalSplit}%` : '100%' }}
          className={`h-full min-h-0 overflow-hidden rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--carbon)] ${
            mobileTab === 'desc' ? 'flex flex-col flex-1 lg:flex-none' : 'hidden lg:flex lg:flex-col'
          }`}
        >
          <DescriptionPane
            problem={activeProblem}
            submissions={submissions}
            onSelectSubmissionCode={handleSelectSubmissionCode}
          />
        </div>

        {/* Resizable Horizontal Divider (Left / Right) */}
        <div
          onMouseDown={(e) => { e.preventDefault(); setIsDraggingH(true); }}
          onDoubleClick={() => setHorizontalSplit(50)}
          title="Drag to resize panels"
          className="hidden lg:flex w-1 bg-transparent hover:bg-[var(--verdigris)] active:bg-[var(--verdigris)] cursor-col-resize items-center justify-center transition-colors group shrink-0 relative z-20 rounded"
        />

        {/* Right Panel: Editor (Top) & Testcase/Console (Bottom) */}
        <div 
          ref={rightColumnRef}
          style={{ width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${100 - horizontalSplit}%` : '100%' }}
          className={`h-full min-h-0 flex flex-col overflow-hidden gap-1.5 ${
            mobileTab === 'editor' ? 'flex flex-1 lg:flex-none' : 'hidden lg:flex'
          }`}
        >
          {/* Top Half: Code Editor */}
          <div 
            style={{ height: isConsoleOpen ? `${verticalSplit}%` : '100%' }}
            className="min-h-0 flex flex-col overflow-hidden rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--carbon)] transition-[height] duration-75"
          >
            <MonacoCodeEditor
              language={language}
              onLanguageChange={handleLanguageChange}
              code={currentCode}
              onCodeChange={handleCodeChange}
              onResetCode={handleResetCode}
            />
          </div>

          {/* Resizable Vertical Divider (Editor / Console) */}
          {isConsoleOpen && (
            <div
              onMouseDown={(e) => { e.preventDefault(); setIsDraggingV(true); }}
              onDoubleClick={() => setVerticalSplit(60)}
              title="Drag to resize console"
              className="h-1 bg-transparent hover:bg-[var(--verdigris)] active:bg-[var(--verdigris)] cursor-row-resize flex items-center justify-center transition-colors group shrink-0 relative z-20 rounded"
            />
          )}

          {/* Bottom Half: Test Cases / Custom Input / Verdict Console */}
          {isConsoleOpen && (
            <div 
              style={{ height: `${100 - verticalSplit}%` }}
              className="min-h-0 flex flex-col overflow-hidden rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--carbon)] transition-[height] duration-75"
            >
              <ConsoleRunner
                problem={activeProblem}
                results={lastRunResults}
                isRunning={isRunningCode}
                isSubmitting={isSubmitting}
                lastSubmission={activeSubmission}
                customInput={customInput}
                onCustomInputChange={setCustomInput}
                isOpen={isConsoleOpen}
                onToggleOpen={() => setIsConsoleOpen(!isConsoleOpen)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <BottomActionBar
        isConsoleOpen={isConsoleOpen}
        onToggleConsole={() => setIsConsoleOpen(!isConsoleOpen)}
        isRunning={isRunningCode}
        isSubmitting={isSubmitting}
        onRun={handleRun}
        onSubmit={handleSubmit}
        lastResults={lastRunResults}
        lastSubmission={activeSubmission}
      />

      {/* Shortcuts Modal Dialog */}
      {showShortcutsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--obsidian)]/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[var(--r-lg)] bg-[var(--ash)] border border-[var(--border-strong)] p-5 shadow-[var(--shadow-lg)] space-y-4 page-fade">
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <Keyboard className="w-4 h-4 text-[var(--verdigris)]" />
                <h3 className="font-semibold text-[var(--bone)] text-xs font-mono uppercase tracking-wider">Keyboard Shortcuts</h3>
              </div>
              <button 
                onClick={() => setShowShortcutsModal(false)}
                className="p-1 rounded text-[var(--text-3)] hover:text-[var(--bone)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)]">
                <span className="text-[var(--text-2)]">Run Code</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--carbon)] border border-[var(--border)] text-[var(--bone)]">Ctrl / ⌘ + Enter</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)]">
                <span className="text-[var(--text-2)]">Submit Solution</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--carbon)] border border-[var(--border)] text-[var(--verdigris)]">Ctrl / ⌘ + Shift + Enter</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)]">
                <span className="text-[var(--text-2)]">Dual-Engine Stress Tester</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--carbon)] border border-[var(--border)] text-[var(--amber)] font-bold">S</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-[var(--border)]">
                <span className="text-[var(--text-2)]">Algorithm Visualizer</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--carbon)] border border-[var(--border)] text-[var(--verdigris)]">V</kbd>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[var(--text-2)]">Command Palette</span>
                <kbd className="px-2 py-0.5 rounded bg-[var(--carbon)] border border-[var(--border)] text-[var(--bone)]">Ctrl / ⌘ + K</kbd>
              </div>
            </div>

            <button
              onClick={() => setShowShortcutsModal(false)}
              className="btn-secondary w-full justify-center !py-1.5 !text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Algorithm Visualizer Interactive Modal Panel */}
      <AlgorithmVisualizer
        problem={activeProblem}
        isOpen={isVisualizerOpen}
        onClose={() => setIsVisualizerOpen(false)}
      />

      {/* Dual-Engine Stress Tester Panel */}
      <StressTester
        problem={activeProblem}
        isOpen={isStressTesterOpen}
        onClose={() => setIsStressTesterOpen(false)}
        activeLanguage={language}
        currentWorkspaceCode={currentCode}
        onApplyInputToConsole={(input) => {
          setCustomInput(input);
          setIsConsoleOpen(true);
        }}
      />

    </div>
  );
};
