import { Worker, Job } from 'bullmq';
import { redisClient } from './config/redis';
import { Submission, ISubmission } from './models/Submission';
import { Problem, IProblem } from './models/Problem';
import { User } from './models/User';
import { Contest } from './models/Contest';
import { testRunner, EvaluationSummary } from './judge/TestRunner';
import { SupportedLanguage } from './judge/languages';
import { logger } from './logger';

export interface SubmissionJobPayload {
  submissionId: string;
  problemId: string;
  userId: string;
  contestId?: string;
  language: SupportedLanguage;
  code: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  testCases: Array<{
    input: string;
    expectedOutput: string;
    isSample?: boolean;
  }>;
}

const SUBMISSION_QUEUE_NAME = 'submissions';
const CONCURRENCY = parseInt(process.env.MAX_CONCURRENT_JOBS || '3', 10);

/**
 * Update Redis Sorted Set for real-time contest leaderboard rankings
 * Score formula: score = (problemsSolved * 1_000_000) - totalPenaltyMinutes
 */
const updateContestLeaderboard = async (
  contestId: string,
  userId: string
): Promise<void> => {
  try {
    const contest = await Contest.findById(contestId);
    if (!contest) return;

    // Fetch all submissions for this user in this contest
    const submissions = await Submission.find({
      contestId: contest._id,
      userId,
    }).sort({ createdAt: 1 });

    const problemAttempts: Record<string, { solved: boolean; attempts: number; timeMinutes: number }> = {};

    for (const sub of submissions) {
      const pId = sub.problemId.toString();
      if (!problemAttempts[pId]) {
        problemAttempts[pId] = { solved: false, attempts: 0, timeMinutes: 0 };
      }

      if (!problemAttempts[pId].solved) {
        problemAttempts[pId].attempts += 1;

        if (sub.verdict === 'Accepted') {
          problemAttempts[pId].solved = true;
          const minutes = Math.max(
            0,
            Math.floor((sub.createdAt.getTime() - contest.startTime.getTime()) / (1000 * 60))
          );
          problemAttempts[pId].timeMinutes = minutes;
        }
      }
    }

    let solvedCount = 0;
    let penaltyMinutes = 0;

    for (const pId in problemAttempts) {
      const p = problemAttempts[pId];
      if (p.solved) {
        solvedCount += 1;
        penaltyMinutes += p.timeMinutes + (p.attempts - 1) * 20; // 20 min penalty per rejected attempt before AC
      }
    }

    // High score ranks top: solve count is primary weight, penalty minutes deduct from score
    const rankScore = solvedCount * 1000000 - penaltyMinutes;
    const redisKey = `contest:${contestId}:leaderboard`;

    await redisClient.zadd(redisKey, rankScore, userId);
    logger.info(`[Contest Leaderboard] Updated Redis ZSET '${redisKey}': user=${userId} score=${rankScore} (solved=${solvedCount}, penalty=${penaltyMinutes}m)`);
  } catch (error: any) {
    logger.warn({ err: error }, `[Contest Leaderboard] Error updating leaderboard for contest ${contestId}: ${error.message}`);
  }
};

/**
 * Core submission processor executed for each BullMQ job
 */
export const processSubmissionJob = async (job: Job<SubmissionJobPayload>): Promise<EvaluationSummary> => {
  const { submissionId, problemId, userId, contestId, language, code, timeLimitMs, memoryLimitMb, testCases } = job.data;

  logger.info(`[Worker] Started judging submission ${submissionId} (Lang: ${language.toUpperCase()}, TestCases: ${testCases.length})`);

  // 1. Mark submission status as 'Running' in MongoDB
  await Submission.findByIdAndUpdate(submissionId, { verdict: 'Running' });

  // 2. Execute sandboxed test evaluation
  const evaluation = await testRunner.runAgainstTestCases({
    code,
    language,
    testCases,
    timeLimitMs,
    memoryLimitMb,
  });

  logger.info(`[Worker] Judged submission ${submissionId} -> Verdict: ${evaluation.finalVerdict} (${evaluation.testCasesPassed}/${evaluation.totalTestCases} passed, ${evaluation.maxExecutionTimeMs}ms, ${evaluation.maxMemoryKb}KB)`);

  // 3. Persist final results to MongoDB
  const stdoutSnippet = evaluation.results.find((r) => r.stdout.length > 0)?.stdout;

  const updatedSubmission = await Submission.findByIdAndUpdate(
    submissionId,
    {
      verdict: evaluation.finalVerdict,
      executionTimeMs: evaluation.maxExecutionTimeMs,
      memoryKb: evaluation.maxMemoryKb,
      testCasesPassed: evaluation.testCasesPassed,
      totalTestCases: evaluation.totalTestCases,
      errorLog: evaluation.errorLog || evaluation.compilationError,
      stdout: stdoutSnippet,
    },
    { new: true }
  );

  // 4. If problem was solved (Accepted), update User stats & problem counters
  if (evaluation.finalVerdict === 'Accepted') {
    try {
      const problem = await Problem.findById(problemId);
      const user = await User.findById(userId);

      if (problem && user) {
        const alreadySolved = user.solvedProblems.some((id) => id.toString() === problemId);

        if (!alreadySolved) {
          user.solvedProblems.push(problem._id);
          user.rating += 8;

          if (problem.difficulty === 'Easy') user.easySolved += 1;
          else if (problem.difficulty === 'Medium') user.mediumSolved += 1;
          else if (problem.difficulty === 'Hard') user.hardSolved += 1;

          await user.save();
          await Problem.findByIdAndUpdate(problemId, { $inc: { totalAccepted: 1 } });
          logger.info(`[Worker] Solved problem recorded for user ${user.username}. New rating: ${user.rating}`);
        }
      }
    } catch (statErr: any) {
      logger.warn({ err: statErr }, `[Worker] User stat update error: ${statErr.message}`);
    }
  }

  // 5. If this submission belongs to a contest, update Redis Leaderboard
  if (contestId) {
    await updateContestLeaderboard(contestId, userId);
  }

  return evaluation;
};

const INITIAL_BACKOFF_MS = 5000;
const MAX_BACKOFF_MS = 60000;

let currentWorker: Worker<SubmissionJobPayload> | null = null;
let retryDelayMs = INITIAL_BACKOFF_MS;
let restartTimeout: ReturnType<typeof setTimeout> | null = null;
let isRestarting = false;
let isTerminating = false;

/**
 * Resets the exponential backoff delay to initial 5s on successful job completion
 */
export const resetBackoffDelay = (): void => {
  if (retryDelayMs !== INITIAL_BACKOFF_MS) {
    logger.info(`[Worker Manager] Job completed successfully. Resetting auto-restart backoff delay to ${INITIAL_BACKOFF_MS / 1000}s.`);
    retryDelayMs = INITIAL_BACKOFF_MS;
  }
};

/**
 * Schedule auto-restart with exponential backoff (5s -> 10s -> 20s -> 40s -> max 60s)
 */
export const scheduleWorkerRestart = (reason: string): void => {
  if (isTerminating || isRestarting) return;
  isRestarting = true;

  const waitTime = retryDelayMs;
  logger.error(`[Worker Manager] Worker error/crash detected (${reason}). Waiting ${waitTime / 1000}s before auto-restart (exponential backoff)...`);

  // Calculate next retry delay for subsequent failures
  retryDelayMs = Math.min(retryDelayMs * 2, MAX_BACKOFF_MS);

  if (restartTimeout) {
    clearTimeout(restartTimeout);
  }

  restartTimeout = setTimeout(async () => {
    isRestarting = false;
    if (isTerminating) return;

    try {
      if (currentWorker) {
        try {
          await currentWorker.close();
        } catch {
          // ignore cleanup notice
        }
        currentWorker = null;
      }

      logger.info('[Worker Manager] Reinitializing BullMQ judge worker instance...');
      startJudgeWorker();
    } catch (err: any) {
      logger.error({ err }, '[Worker Manager] Worker reinitialization failed: ' + err.message);
      scheduleWorkerRestart(err.message);
    }
  }, waitTime);
};

/**
 * Stop and close worker instance (invoked during graceful shutdown)
 */
export const stopJudgeWorker = async (): Promise<void> => {
  isTerminating = true;
  if (restartTimeout) {
    clearTimeout(restartTimeout);
    restartTimeout = null;
  }

  if (currentWorker) {
    try {
      await currentWorker.close();
      logger.info('[Worker Manager] Active BullMQ worker instance closed.');
    } catch (err: any) {
      logger.warn({ err }, '[Worker Manager] Worker close notice: ' + err.message);
    }
    currentWorker = null;
  }
};

/**
 * Get active worker instance
 */
export const getActiveWorker = (): Worker<SubmissionJobPayload> | null => {
  return currentWorker;
};

/**
 * Initialize and return the BullMQ Worker instance with auto-restart handling
 */
export const startJudgeWorker = (): Worker<SubmissionJobPayload> => {
  isTerminating = false;

  const worker = new Worker<SubmissionJobPayload>(
    SUBMISSION_QUEUE_NAME,
    async (job) => {
      return await processSubmissionJob(job);
    },
    {
      connection: redisClient,
      concurrency: CONCURRENCY,
      limiter: {
        max: 10,
        duration: 1000,
      },
    }
  );

  currentWorker = worker;

  worker.on('ready', () => {
    logger.info(`[Worker] BullMQ Worker connected to '${SUBMISSION_QUEUE_NAME}' queue (Concurrency: ${CONCURRENCY})`);
  });

  worker.on('completed', (job) => {
    logger.info(`[Worker] Job ${job.id} completed successfully.`);
    // Reset backoff counter on successful job
    resetBackoffDelay();
  });

  worker.on('failed', (job, err) => {
    logger.error({ err }, `[Worker] Job ${job?.id} failed with error: ` + err.message);
  });

  let lastWorkerErrorLog = 0;
  worker.on('error', (err) => {
    const now = Date.now();
    if (now - lastWorkerErrorLog > 30000) {
      lastWorkerErrorLog = now;
      logger.warn({ err: err?.message || 'ECONNREFUSED' }, `[Worker] Redis unavailable for BullMQ queue. Retrying with backoff...`);
    }
    scheduleWorkerRestart(err.message);
  });

  worker.on('closed', () => {
    if (!isTerminating && !isRestarting) {
      logger.warn(`[Worker] BullMQ worker closed unexpectedly. Initiating auto-restart...`);
      scheduleWorkerRestart('Worker closed unexpectedly');
    }
  });

  return worker;
};
