import { Router, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { Submission, ISubmission } from '../models/Submission';
import { Problem } from '../models/Problem';
import { Contest } from '../models/Contest';
import { authenticate, optionalAuthenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { enqueueSubmission } from '../queue/submissionQueue';
import { logger } from '../logger';

const router = Router();

// Rate limiter for code submissions: max 10 requests per minute per IP
const submissionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 submissions per windowMs
  standardHeaders: true, // Return standard rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    error: 'Too many submissions. Maximum 10 requests per minute allowed.',
  },
});

// Validation Schemas
const createSubmissionSchema = z.object({
  problemId: z.string().min(1, 'Problem ID is required'),
  language: z.enum(['cpp', 'python', 'java', 'javascript']),
  code: z.string().min(1, 'Code cannot be empty').max(65536, 'Code exceeds 64KB limit'),
  contestId: z.string().optional(),
});

const listSubmissionsQuerySchema = z.object({
  problemId: z.string().optional(),
  userId: z.string().optional(),
  contestId: z.string().optional(),
  verdict: z.enum([
    'Pending',
    'Accepted',
    'Wrong Answer',
    'Time Limit Exceeded',
    'Memory Limit Exceeded',
    'Runtime Error',
    'Compilation Error',
  ]).optional(),
  language: z.enum(['cpp', 'python', 'java', 'javascript']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

/**
 * POST /api/submissions
 * Create and enqueue a code submission for sandboxed execution
 */
router.post(
  '/',
  submissionLimiter,
  authenticate,
  validate(createSubmissionSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { problemId, language, code, contestId } = req.body;

      // 1. Verify problem exists
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(problemId);
      const problemQuery = isObjectId ? { _id: problemId } : { slug: problemId.toLowerCase() };
      const problem = await Problem.findOne(problemQuery);

      if (!problem) {
        res.status(404).json({
          success: false,
          error: 'Problem not found.',
        });
        return;
      }

      // 2. If contestId is provided, verify contest is currently live
      if (contestId) {
        const contest = await Contest.findById(contestId);
        if (!contest) {
          res.status(404).json({
            success: false,
            error: 'Associated contest not found.',
          });
          return;
        }

        const now = new Date();
        if (now < contest.startTime || now > contest.endTime) {
          res.status(400).json({
            success: false,
            error: 'Contest is not currently active for submissions.',
          });
          return;
        }
      }

      const totalTestCases = problem.sampleTestCases.length + problem.hiddenTestCases.length;

      // 3. Create initial Submission record in MongoDB
      const submission = new Submission({
        userId: req.userId,
        username: req.user?.username,
        problemId: problem._id,
        problemTitle: problem.title,
        contestId: contestId || undefined,
        language,
        code,
        verdict: 'Pending',
        executionTimeMs: 0,
        memoryKb: 0,
        testCasesPassed: 0,
        totalTestCases,
      });

      await submission.save();

      // 4. Increment problem submission counter
      await Problem.findByIdAndUpdate(problem._id, { $inc: { submissionsCount: 1 } });

      // 5. Aggregate all test cases to dispatch to worker
      const allTestCases = [
        ...problem.sampleTestCases.map(tc => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isSample: true,
        })),
        ...problem.hiddenTestCases.map(tc => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isSample: false,
        })),
      ];

      // 6. Enqueue job into BullMQ
      try {
        await enqueueSubmission({
          submissionId: submission._id.toString(),
          problemId: problem._id.toString(),
          userId: req.userId!,
          contestId: contestId || undefined,
          language,
          code,
          timeLimitMs: problem.timeLimitMs,
          memoryLimitMb: problem.memoryLimitMb,
          testCases: allTestCases,
        });
      } catch (queueErr: any) {
        logger.error({ err: queueErr }, `[Submissions Route] BullMQ enqueue failure: ${queueErr.message}`);
        await Submission.findByIdAndDelete(submission._id);
        res.status(503).json({
          success: false,
          message: 'Judge queue unavailable. Try again shortly.',
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: submission,
        message: 'Submission enqueued successfully.',
      });
    } catch (error: any) {
      logger.error({ err: error }, '[Submissions Route] Create Error: ' + (error?.message || error));
      res.status(500).json({
        success: false,
        error: 'Failed to create and dispatch submission.',
      });
    }
  }
);

/**
 * GET /api/submissions
 * List submissions with filtering and pagination
 */
router.get(
  '/',
  optionalAuthenticate,
  validate(listSubmissionsQuerySchema, 'query'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { problemId, userId, contestId, verdict, language, page, limit } = req.query as any;

      const filter: Record<string, any> = {};

      if (problemId) {
        filter.problemId = problemId;
      }
      if (userId && userId !== 'all') {
        filter.userId = userId;
      } else if (!userId && req.userId) {
        filter.userId = req.userId;
      }
      if (contestId) {
        filter.contestId = contestId;
      }
      if (verdict) {
        filter.verdict = verdict;
      }
      if (language) {
        filter.language = language;
      }

      const skip = (page - 1) * limit;

      const [submissions, total] = await Promise.all([
        Submission.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate('userId', 'username name avatarUrl')
          .populate('problemId', 'title slug difficulty'),
        Submission.countDocuments(filter),
      ]);

      res.status(200).json({
        success: true,
        data: {
          submissions,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error: any) {
      logger.error({ err: error }, '[Submissions Route] List Error: ' + (error?.message || error));
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve submissions list.',
      });
    }
  }
);

/**
 * GET /api/submissions/:id
 * Retrieve a specific submission by ID to poll status or inspect details
 */
router.get(
  '/:id',
  optionalAuthenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const submission = await Submission.findById(id)
        .populate('userId', 'username name avatarUrl')
        .populate('problemId', 'title slug difficulty timeLimitMs memoryLimitMb');

      if (!submission) {
        res.status(404).json({
          success: false,
          error: 'Submission not found.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: submission,
      });
    } catch (error: any) {
      logger.error({ err: error }, '[Submissions Route] Detail Error: ' + (error?.message || error));
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve submission details.',
      });
    }
  }
);

export default router;
