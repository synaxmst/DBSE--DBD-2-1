import { Queue } from 'bullmq';
import { redisClient } from '../config/redis';
import logger from '../logger';

export interface SubmissionJobData {
  submissionId: string;
  problemId: string;
  userId: string;
  contestId?: string;
  language: 'cpp' | 'python' | 'java' | 'javascript';
  code: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  testCases: Array<{
    input: string;
    expectedOutput: string;
    isSample?: boolean;
  }>;
}

export const SUBMISSION_QUEUE_NAME = 'submissions';

// Initialize BullMQ Queue with shared Redis client
export const submissionQueue = new Queue<SubmissionJobData>(SUBMISSION_QUEUE_NAME, {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs for audit
      age: 3600,   // Keep for 1 hour
    },
    removeOnFail: {
      count: 500,  // Keep last 500 failed jobs
    },
  },
});

/**
 * Enqueue a new submission job to be processed by the sandboxed Judge Worker
 */
export const enqueueSubmission = async (jobData: SubmissionJobData) => {
  try {
    const job = await submissionQueue.add(`judge-${jobData.submissionId}`, jobData, {
      jobId: jobData.submissionId,
    });
    logger.info(`[Queue] Enqueued submission ${jobData.submissionId} to ${SUBMISSION_QUEUE_NAME} queue (Job ID: ${job.id})`);
    return job;
  } catch (error: any) {
    logger.error({ error }, `[Queue] Failed to enqueue submission ${jobData.submissionId}`);
    throw new Error(`Submission queue failure: ${error.message}`);
  }
};
