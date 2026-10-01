import apiClient from './client';
import type { Problem, Difficulty, SupportedLanguage, TestCase, ProblemStatus } from '../types/judge';

export interface ProblemFilters {
  search?: string;
  difficulty?: Difficulty;
  tag?: string;
  status?: ProblemStatus | 'all';
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface GetProblemsResponse {
  problems: Problem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateProblemPayload {
  title: string;
  slug?: string;
  description: string;
  difficulty: Difficulty;
  timeLimitMs?: number;
  memoryLimitMb?: number;
  tags?: string[];
  constraints?: string[];
  sampleTestCases: Array<{
    input: string;
    expectedOutput: string;
    explanation?: string;
  }>;
  hiddenTestCases?: Array<{
    input: string;
    expectedOutput: string;
  }>;
  starterCode?: Record<SupportedLanguage, string>;
  status?: ProblemStatus;
}

export const normalizeProblem = (raw: any): Problem => {
  if (!raw) return raw;

  const sampleTestCases: TestCase[] = (raw.sampleTestCases || []).map((tc: any, index: number) => ({
    id: tc.id || `tc-sample-${index + 1}`,
    input: tc.input || '',
    expectedOutput: tc.expectedOutput || '',
    explanation: tc.explanation || '',
  }));

  const starterCode = raw.starterCode || {
    cpp: `#include <vector>\n\nclass Solution {\npublic:\n    // write your solution here\n};`,
    python: `class Solution:\n    # write your solution here\n    pass`,
    java: `class Solution {\n    // write your solution here\n}`,
    javascript: `/**\n * @param {any}\n * @return {any}\n */\nfunction solution() {\n    // write your solution here\n}`,
  };

  const submissionsCount = raw.submissionsCount ?? 0;
  const totalAccepted = raw.totalAccepted ?? 0;
  const acceptanceRate =
    submissionsCount > 0 ? Number(((totalAccepted / submissionsCount) * 100).toFixed(1)) : 0;

  const status: ProblemStatus =
    raw.status || (raw.isPublished === false ? 'draft' : 'published');

  return {
    id: raw._id ? raw._id.toString() : raw.id || '',
    title: raw.title || '',
    slug: raw.slug || '',
    difficulty: raw.difficulty || 'Medium',
    acceptanceRate,
    timeLimitMs: raw.timeLimitMs ?? 1000,
    memoryLimitMb: raw.memoryLimitMb ?? 256,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    description: raw.description || '',
    constraints: Array.isArray(raw.constraints) ? raw.constraints : [],
    sampleTestCases,
    hiddenTestCasesCount: raw.hiddenTestCases ? raw.hiddenTestCases.length : (raw.hiddenTestCasesCount ?? 0),
    starterCode,
    status,
    submissionsCount,
    totalAccepted,
    author: raw.authorName || raw.author || 'AlgoFlow Editorial',
    authorId: raw.authorId ? raw.authorId.toString() : undefined,
  };
};

/**
 * Fetch problems list with optional query filtering
 */
export const getProblems = async (filters?: ProblemFilters): Promise<GetProblemsResponse> => {
  const response = await apiClient.get('/problems', { params: filters });
  const data = response.data.data;
  return {
    problems: (data.problems || []).map(normalizeProblem),
    pagination: data.pagination || {
      total: (data.problems || []).length,
      page: 1,
      limit: 50,
      totalPages: 1,
    },
  };
};

/**
 * Fetch a single problem by ID or slug
 */
export const getProblem = async (idOrSlug: string): Promise<Problem> => {
  const response = await apiClient.get(`/problems/${idOrSlug}`);
  return normalizeProblem(response.data.data);
};

/**
 * Create a new problem (Admin and Setter)
 */
export const createProblem = async (payload: CreateProblemPayload): Promise<Problem> => {
  const response = await apiClient.post('/problems', payload);
  return normalizeProblem(response.data.data);
};

/**
 * Update an existing problem (Admin and Setter)
 */
export const updateProblem = async (id: string, payload: Partial<CreateProblemPayload>): Promise<Problem> => {
  const response = await apiClient.put(`/problems/${id}`, payload);
  return normalizeProblem(response.data.data);
};

/**
 * Delete an existing problem (Admin and Setter)
 */
export const deleteProblem = async (id: string): Promise<void> => {
  await apiClient.delete(`/problems/${id}`);
};
