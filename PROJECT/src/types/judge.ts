export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type SupportedLanguage = 'cpp' | 'python' | 'java' | 'javascript';

export type Verdict =
  | 'Accepted'
  | 'Wrong Answer'
  | 'Time Limit Exceeded'
  | 'Memory Limit Exceeded'
  | 'Runtime Error'
  | 'Compilation Error'
  | 'Pending'
  | 'Running';

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  explanation?: string;
  isCustom?: boolean;
}

export interface TestCaseResult {
  testCaseId: string;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  passed: boolean;
  executionTimeMs?: number;
  memoryKb?: number;
  stdout?: string;
  error?: string;
}

export type ProblemStatus = 'draft' | 'published' | 'archived';

export interface Problem {
  id: string;
  title: string;
  slug: string;
  difficulty: Difficulty;
  acceptanceRate: number;
  timeLimitMs: number;
  memoryLimitMb: number;
  tags: string[];
  description: string;
  constraints: string[];
  sampleTestCases: TestCase[];
  hiddenTestCases?: TestCase[];
  hiddenTestCasesCount: number;
  starterCode: Record<SupportedLanguage, string>;
  status?: ProblemStatus;
  editorial?: string;
  submissionsCount: number;
  totalAccepted: number;
  author: string;
  authorId?: string;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'user' | 'admin' | 'setter';
  rating: number;
  rank: number;
  solvedCount: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  avatarUrl?: string;
  institution?: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  userId: string;
  username: string;
  problemId: string;
  problemTitle: string;
  problemDifficulty: Difficulty;
  language: SupportedLanguage;
  code: string;
  verdict: Verdict;
  executionTimeMs: number;
  memoryKb: number;
  submittedAt: string;
  testCasesPassed?: number;
  totalTestCases?: number;
  stdout?: string;
  errorMessage?: string;
}

export interface Contest {
  id: string;
  title: string;
  slug: string;
  description?: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: 'Upcoming' | 'Live' | 'Ended';
  participantCount: number;
  problemIds: string[];
  scoringMode?: string;
  bannerBadge?: string;
  editorial?: string;
}

export interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    username: string;
    name: string;
    rating: number;
    avatarUrl?: string;
    institution?: string;
  };
  score: number;
  solvedCount: number;
  penaltyMinutes: number;
  problemResults: Record<string, { solved: boolean; attempts: number; timeMinutes?: number }>;
}

export interface SystemStatus {
  bullMqQueueStatus: 'Active' | 'Degraded';
  activeWorkers: number;
  totalWorkers: number;
  avgLatencyMs: number;
  submissionsToday: number;
  redisMemoryUsage: string;
  dockerSandbox: 'Online (gVisor Isolated)' | 'Offline';
}
