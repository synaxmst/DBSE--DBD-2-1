import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { 
  Problem, 
  Submission, 
  User, 
  Contest,
  SupportedLanguage, 
  TestCaseResult 
} from '../types/judge';

// API & Socket Integrations
import * as authApi from '../api/auth';
import * as problemsApi from '../api/problems';
import * as submissionsApi from '../api/submissions';
import { getContests } from '../api/contests';
import { connectContestSocket, disconnectContestSocket } from '../socket/contestSocket';
import { evaluateCode } from '../utils/codeEvaluator';

interface JudgeContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  systemStatus: any;
  problems: Problem[];
  contests: Contest[];
  submissions: Submission[];
  userSubmissions: Submission[];
  activeProblemId: string;
  setActiveProblemId: (id: string) => void;
  activeProblem: Problem;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'login' | 'register';
  setAuthModalMode: (mode: 'login' | 'register') => void;
  
  // Execution states
  isRunningCode: boolean;
  isSubmitting: boolean;
  isLoadingProblems: boolean;
  isLoadingSubmission: boolean;
  apiError: string | null;
  setApiError: (err: string | null) => void;
  lastRunResults: TestCaseResult[] | null;
  setLastRunResults: (results: TestCaseResult[] | null) => void;
  lastSubmissionResult: Submission | null;
  setLastSubmissionResult: (submission: Submission | null) => void;
  
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  
  // Auth Operations
  loginUser: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
  registerUser: (username: string, email: string, password: string, name?: string) => Promise<void>;
  logoutUser: () => void;
  
  // Data Operations
  loadProblems: (filters?: problemsApi.ProblemFilters) => Promise<void>;
  loadSubmissions: (filters?: submissionsApi.SubmissionFilters) => Promise<void>;
  runCode: (problem: Problem, language: SupportedLanguage, code: string, customInput?: string) => Promise<TestCaseResult[]>;
  submitSolution: (problem: Problem, language: SupportedLanguage, code: string, contestId?: string) => Promise<Submission>;
  isProblemSolved: (problemId: string) => boolean;
  addNewProblem: (newProblem: Problem) => Promise<void>;
  deleteProblem: (id: string) => Promise<void>;
}

const JudgeContext = createContext<JudgeContextType | undefined>(undefined);

export const JudgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const savedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (token && savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [systemStatus] = useState<any>({ isOnline: true, judgeWorker: 'online', database: 'connected' });
  const [problems, setProblems] = useState<Problem[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeProblemId, setActiveProblemId] = useState<string>('');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('algoflow_theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });
  const [isRunningCode, setIsRunningCode] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingProblems, setIsLoadingProblems] = useState<boolean>(false);
  const [isLoadingSubmission, setIsLoadingSubmission] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const [lastRunResults, setLastRunResults] = useState<TestCaseResult[] | null>(null);
  const [lastSubmissionResult, setLastSubmissionResult] = useState<Submission | null>(null);

  const navigate = useNavigate();

  // 1. Theme Management with documentElement class, data-theme attribute, and localStorage
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    localStorage.setItem('algoflow_theme', theme);
  }, [theme]);

  // Session expired event handler from 401 interceptor
  useEffect(() => {
    const handleAuthExpired = () => {
      logoutUser();
      navigate('/login', { state: { message: 'Your session has expired. Please log in again.' } });
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [navigate]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // 2. Global Hotkey listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setIsAuthModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 3. Load Current User from Token on Startup
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        try {
          const user = await authApi.getMe();
          setCurrentUser(user);
          connectContestSocket();
        } catch {
          console.warn('[JudgeContext] Local token expired or backend offline. Using fallback profile.');
        }
      }
    };
    initAuth();
  }, []);

  // 4. Load Problems & Submissions from Backend on Startup
  const loadProblems = useCallback(async (filters?: problemsApi.ProblemFilters) => {
    setIsLoadingProblems(true);
    try {
      const response = await problemsApi.getProblems(filters);
      if (response.problems && response.problems.length > 0) {
        setProblems(response.problems);
        setActiveProblemId(prev => {
          const exists = response.problems.some(p => p.id === prev);
          return exists ? prev : response.problems[0].id;
        });
      }
      setApiError(null);
    } catch {
      console.warn('[JudgeContext] Backend problems API unavailable. Retaining mock problems catalogue.');
    } finally {
      setIsLoadingProblems(false);
    }
  }, []);

  const loadSubmissions = useCallback(async (filters?: submissionsApi.SubmissionFilters) => {
    try {
      const activeFilters: submissionsApi.SubmissionFilters = {
        ...(currentUser?.id ? { userId: currentUser.id } : {}),
        ...filters,
      };
      const response = await submissionsApi.getSubmissions(activeFilters);
      if (response.submissions) {
        setSubmissions(response.submissions);
      }
    } catch {
      console.warn('[JudgeContext] Backend submissions API unavailable. Retaining local history.');
    }
  }, [currentUser?.id]);

  const loadContests = useCallback(async () => {
    try {
      const data = await getContests();
      if (data && data.length > 0) {
        setContests(data);
      }
    } catch {
      console.warn('[JudgeContext] Backend contests API unavailable.');
    }
  }, []);

  useEffect(() => {
    loadProblems();
    loadSubmissions();
    loadContests();
  }, [loadProblems, loadSubmissions, loadContests]);

  const userSubmissions = React.useMemo(() => {
    if (!currentUser) return submissions;
    return submissions.filter(
      s => s.userId === currentUser.id || s.username === currentUser.username
    );
  }, [submissions, currentUser]);

  // Active Problem Resolution
  const activeProblem = problems.find(p => p.id === activeProblemId) || problems[0] || {} as Problem;

  const isProblemSolved = (problemId: string): boolean => {
    return submissions.some(
      s => s.problemId === problemId && s.verdict === 'Accepted' && (s.userId === currentUser?.id || s.username === currentUser?.username)
    );
  };


  // 5. Authentication Handlers
  const loginUser = async (identifier: string, password: string, rememberMe: boolean = true): Promise<void> => {
    setApiError(null);
    try {
      const data = await authApi.login(identifier, password);
      if (rememberMe) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      } else {
        sessionStorage.setItem('token', data.token);
        sessionStorage.setItem('user', JSON.stringify(data.user));
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      setCurrentUser(data.user);
      setLastRunResults(null);
      setLastSubmissionResult(null);
      connectContestSocket();
      setIsAuthModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Login failed';
      setApiError(msg);
      throw new Error(msg);
    }
  };

  const registerUser = async (
    username: string,
    email: string,
    password: string,
    name?: string
  ): Promise<void> => {
    setApiError(null);
    try {
      const data = await authApi.register({ username, email, password, name });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      setCurrentUser(data.user);
      setLastRunResults(null);
      setLastSubmissionResult(null);
      connectContestSocket();
      setIsAuthModalOpen(false);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Registration failed';
      setApiError(msg);
      throw new Error(msg);
    }
  };

  const logoutUser = () => {
    setCurrentUser(null);
    setLastRunResults(null);
    setLastSubmissionResult(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('algoflow_token');
    localStorage.removeItem('algoflow_user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('algoflow_token');
    sessionStorage.removeItem('algoflow_user');
    disconnectContestSocket();
  };

  // 6. Run Code Handler (Sample test cases or custom input)
  const runCode = async (
    problem: Problem,
    language: SupportedLanguage,
    code: string,
    customInput?: string
  ): Promise<TestCaseResult[]> => {
    setIsRunningCode(true);
    setApiError(null);

    try {
      // 1. If custom input provided, evaluate custom run
      if (customInput && customInput.trim().length > 0) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const evaluatedCustom = evaluateCode(
          problem,
          language,
          code,
          customInput,
          '(Custom input evaluation)'
        );
        evaluatedCustom.testCaseId = 'custom-input';

        // Also evaluate sample test cases so tab switching stays populated
        const sampleResults = problem.sampleTestCases.map((tc, idx) => {
          const res = evaluateCode(problem, language, code, tc.input, tc.expectedOutput);
          res.testCaseId = tc.id || `tc-${idx}`;
          return res;
        });

        const allResults = [evaluatedCustom, ...sampleResults];
        setLastRunResults(allResults);
        setIsRunningCode(false);
        return allResults;
      }

      // 2. Attempt real backend submission
      try {
        const sub = await submissionsApi.createSubmission({
          problemId: problem.id,
          language,
          code,
        });

        const finalSub = await submissionsApi.pollSubmissionUntilDone(sub.id, (pendingSub) => {
          setLastSubmissionResult(pendingSub);
        });

        const passed = finalSub.verdict === 'Accepted';
        const sampleResults: TestCaseResult[] = problem.sampleTestCases.map((tc, idx) => {
          const evalRes = evaluateCode(problem, language, code, tc.input, tc.expectedOutput);
          return {
            testCaseId: tc.id || `tc-${idx}`,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            actualOutput: passed ? tc.expectedOutput : (finalSub.errorMessage || evalRes.actualOutput),
            passed: finalSub.verdict === 'Accepted',
            executionTimeMs: finalSub.executionTimeMs,
            memoryKb: finalSub.memoryKb,
            stdout: finalSub.stdout || evalRes.stdout,
            error: finalSub.errorMessage,
          };
        });

        setLastRunResults(sampleResults);
        setIsRunningCode(false);
        return sampleResults;
      } catch (backendErr: any) {
        // Fall back to client evaluation if local JS execution
        if (language === 'javascript') {
          const results: TestCaseResult[] = problem.sampleTestCases.map((tc, idx) => {
            const evalRes = evaluateCode(problem, language, code, tc.input, tc.expectedOutput);
            evalRes.testCaseId = tc.id || `tc-${idx}`;
            return evalRes;
          });
          setLastRunResults(results);
          setIsRunningCode(false);
          return results;
        }

        const errMsg = backendErr.response?.data?.message || backendErr.message || 'Cannot connect to judge service.';
        setApiError(errMsg);
        setIsRunningCode(false);
        throw new Error(errMsg);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Cannot connect to judge service.';
      setApiError(errMsg);
      setIsRunningCode(false);
      throw err;
    }
  };

  // 7. Submit Solution Handler (Full hidden test case suite evaluation)
  const submitSolution = async (
    problem: Problem,
    language: SupportedLanguage,
    code: string,
    contestId?: string
  ): Promise<Submission> => {
    setIsSubmitting(true);
    setIsLoadingSubmission(true);
    setApiError(null);

    // Evaluate sample test cases for immediate visual feedback
    const sampleEvalResults: TestCaseResult[] = problem.sampleTestCases.map((tc, idx) => {
      const evalRes = evaluateCode(problem, language, code, tc.input, tc.expectedOutput);
      evalRes.testCaseId = tc.id || `tc-${idx}`;
      return evalRes;
    });
    setLastRunResults(sampleEvalResults);

    try {
      // Real Backend submission + BullMQ queue + Worker polling
      const newSub = await submissionsApi.createSubmission({
        problemId: problem.id,
        language,
        code,
        contestId,
      });

      setLastSubmissionResult(newSub);

      const finalSub = await submissionsApi.pollSubmissionUntilDone(newSub.id, (pendingSub) => {
        setLastSubmissionResult(pendingSub);
      });

      setSubmissions(prev => [finalSub, ...prev.filter(s => s.id !== finalSub.id)]);
      setLastSubmissionResult(finalSub);
      setIsSubmitting(false);
      setIsLoadingSubmission(false);

      // Update user stats if Accepted
      if (finalSub.verdict === 'Accepted' && currentUser && !isProblemSolved(problem.id)) {
        const diffKey = problem.difficulty === 'Easy' ? 'easySolved' : problem.difficulty === 'Medium' ? 'mediumSolved' : 'hardSolved';
        setCurrentUser({
          ...currentUser,
          solvedCount: currentUser.solvedCount + 1,
          [diffKey]: currentUser[diffKey] + 1,
          rating: currentUser.rating + 8,
        });
      }

      return finalSub;
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Submission failed. Please check your connection.';
      setApiError(errorMsg);
      setIsSubmitting(false);
      setIsLoadingSubmission(false);
      throw new Error(errorMsg);
    }
  };

  // 8. Add New Problem Handler
  const addNewProblem = async (newProblem: Problem) => {
    try {
      const created = await problemsApi.createProblem({
        title: newProblem.title,
        slug: newProblem.slug,
        description: newProblem.description,
        difficulty: newProblem.difficulty,
        timeLimitMs: newProblem.timeLimitMs,
        memoryLimitMb: newProblem.memoryLimitMb,
        tags: newProblem.tags,
        constraints: newProblem.constraints,
        sampleTestCases: newProblem.sampleTestCases,
        hiddenTestCases: newProblem.hiddenTestCases,
        starterCode: newProblem.starterCode,
        status: newProblem.status,
      });
      setProblems(prev => [created, ...prev]);
    } catch {
      console.warn('[JudgeContext] Backend createProblem unavailable, saving to local state.');
      setProblems(prev => [newProblem, ...prev]);
    }
  };

  // 9. Delete Problem Handler
  const deleteProblem = async (id: string) => {
    try {
      await problemsApi.deleteProblem(id);
      setProblems(prev => prev.filter(p => (p.id !== id && p.slug !== id)));
    } catch (err: any) {
      console.error('[JudgeContext] Delete problem error:', err);
      // Still filter from local state
      setProblems(prev => prev.filter(p => (p.id !== id && p.slug !== id)));
      throw err;
    }
  };

  return (
    <JudgeContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        systemStatus,
        problems,
        contests,
        submissions,
        userSubmissions,
        activeProblemId,
        setActiveProblemId,
        activeProblem,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isAuthModalOpen,
        setIsAuthModalOpen,
        authModalMode,
        setAuthModalMode,
        isRunningCode,
        isSubmitting,
        isLoadingProblems,
        isLoadingSubmission,
        apiError,
        setApiError,
        theme,
        toggleTheme,
        lastRunResults,
        setLastRunResults,
        lastSubmissionResult,
        setLastSubmissionResult,
        loginUser,
        registerUser,
        logoutUser,
        loadProblems,
        loadSubmissions,
        runCode,
        submitSolution,
        isProblemSolved,
        addNewProblem,
        deleteProblem,
      }}
    >
      {children}
    </JudgeContext.Provider>
  );
};

export const useJudge = () => {
  const context = useContext(JudgeContext);
  if (!context) {
    throw new Error('useJudge must be used within a JudgeProvider');
  }
  return context;
};

export function saveCodeDraft(username: string, slug: string, language: string, code: string): void {
  const key = `algoflow:code:${username}:${slug}:${language}`;
  try { localStorage.setItem(key, code); } catch {}
}

export function loadCodeDraft(username: string, slug: string, language: string): string | null {
  const key = `algoflow:code:${username}:${slug}:${language}`;
  try { return localStorage.getItem(key); } catch { return null; }
}

export function saveLanguagePref(username: string, slug: string, language: string): void {
  const key = `algoflow:lang:${username}:${slug}`;
  try { localStorage.setItem(key, language); } catch {}
}

export function loadLanguagePref(username: string, slug: string): string | null {
  const key = `algoflow:lang:${username}:${slug}`;
  try { return localStorage.getItem(key); } catch { return null; }
}

