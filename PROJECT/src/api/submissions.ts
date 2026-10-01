import apiClient from './client';
import type { Submission, SupportedLanguage, Verdict, Difficulty } from '../types/judge';

export interface CreateSubmissionPayload {
  problemId: string;
  language: SupportedLanguage;
  code: string;
  contestId?: string;
}

export interface SubmissionFilters {
  problemId?: string;
  userId?: string;
  contestId?: string;
  verdict?: Verdict;
  language?: SupportedLanguage;
  page?: number;
  limit?: number;
}

export const normalizeSubmission = (raw: any): Submission => {
  if (!raw) return raw;

  const problemDifficulty: Difficulty =
    raw.problemId && typeof raw.problemId === 'object' && raw.problemId.difficulty
      ? raw.problemId.difficulty
      : raw.problemDifficulty || 'Medium';

  const problemTitle: string =
    raw.problemTitle ||
    (raw.problemId && typeof raw.problemId === 'object' && raw.problemId.title) ||
    'Problem';

  const problemId: string =
    raw.problemId && typeof raw.problemId === 'object'
      ? raw.problemId._id?.toString() || raw.problemId.id
      : raw.problemId?.toString() || '';

  const userId: string =
    raw.userId && typeof raw.userId === 'object'
      ? raw.userId._id?.toString() || raw.userId.id
      : raw.userId?.toString() || '';

  const username: string =
    raw.username ||
    (raw.userId && typeof raw.userId === 'object' && raw.userId.username) ||
    'Coder';

  return {
    id: raw._id ? raw._id.toString() : raw.id || '',
    userId,
    username,
    problemId,
    problemTitle,
    problemDifficulty,
    language: raw.language,
    code: raw.code || '',
    verdict: raw.verdict || 'Pending',
    executionTimeMs: raw.executionTimeMs ?? 0,
    memoryKb: raw.memoryKb ?? 0,
    submittedAt: raw.createdAt || raw.submittedAt || new Date().toISOString(),
    testCasesPassed: raw.testCasesPassed,
    totalTestCases: raw.totalTestCases,
    stdout: raw.stdout,
    errorMessage: raw.errorLog || raw.errorMessage,
  };
};

/**
 * Submit code for sandboxed evaluation
 */
export const createSubmission = async (payload: CreateSubmissionPayload): Promise<Submission> => {
  const response = await apiClient.post('/submissions', payload);
  return normalizeSubmission(response.data.data);
};

/**
 * Fetch a specific submission by ID
 */
export const getSubmission = async (id: string): Promise<Submission> => {
  const response = await apiClient.get(`/submissions/${id}`);
  return normalizeSubmission(response.data.data);
};

/**
 * List submissions with query filters
 */
export const getSubmissions = async (filters?: SubmissionFilters): Promise<{
  submissions: Submission[];
  total: number;
}> => {
  const response = await apiClient.get('/submissions', { params: filters });
  const data = response.data.data;
  return {
    submissions: (data.submissions || []).map(normalizeSubmission),
    total: data.pagination?.total || (data.submissions || []).length,
  };
};

/**
 * Poll submission status until execution finishes (verdict is not 'Pending' or 'Running')
 */
export const pollSubmissionUntilDone = async (
  submissionId: string,
  onUpdate?: (sub: Submission) => void,
  intervalMs: number = 1500,
  timeoutMs: number = 60000
): Promise<Submission> => {
  const startTime = Date.now();

  return new Promise<Submission>((resolve, reject) => {
    const checkStatus = async () => {
      try {
        const sub = await getSubmission(submissionId);

        if (onUpdate) {
          onUpdate(sub);
        }

        const isFinished = sub.verdict !== 'Pending' && sub.verdict !== 'Running';

        if (isFinished) {
          resolve(sub);
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          console.warn(`[Submission Poller] Polling timed out after ${timeoutMs}ms for submission ${submissionId}`);
          resolve(sub);
          return;
        }

        setTimeout(checkStatus, intervalMs);
      } catch (err) {
        if (Date.now() - startTime > timeoutMs) {
          reject(err);
        } else {
          // Retry on network glitch
          setTimeout(checkStatus, intervalMs);
        }
      }
    };

    checkStatus();
  });
};
