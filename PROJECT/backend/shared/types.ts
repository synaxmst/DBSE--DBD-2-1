export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type SupportedLanguage = 'cpp' | 'python' | 'java' | 'javascript';

export type Verdict =
  | 'Pending'
  | 'Accepted'
  | 'Wrong Answer'
  | 'Time Limit Exceeded'
  | 'Memory Limit Exceeded'
  | 'Runtime Error'
  | 'Compilation Error';

export type UserRole = 'user' | 'admin' | 'setter';

export type ContestStatus = 'upcoming' | 'live' | 'ended';

export interface TestCasePayload {
  input: string;
  expectedOutput: string;
  explanation?: string;
  isSample?: boolean;
}

export interface SubmissionJobData {
  submissionId: string;
  problemId: string;
  userId: string;
  contestId?: string;
  language: SupportedLanguage;
  code: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  sampleTestCases: TestCasePayload[];
  hiddenTestCases: TestCasePayload[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
