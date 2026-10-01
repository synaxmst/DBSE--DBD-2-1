import { Router, Response } from 'express';
import { z } from 'zod';
import { Contest, IContest } from '../models/Contest';
import { Submission } from '../models/Submission';
import { Problem } from '../models/Problem';
import { authenticate, authorize, optionalAuthenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logger } from '../logger';

const router = Router();

// Validation Schemas
const createContestSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  slug: z.string().optional(),
  description: z.string().optional(),
  startTime: z.string().datetime({ message: 'Must be a valid ISO datetime string' }),
  endTime: z.string().datetime({ message: 'Must be a valid ISO datetime string' }),
  durationMinutes: z.number().min(10).max(10080).default(90),
  problemIds: z.array(z.string()).optional().default([]),
  problems: z.array(z.union([z.string(), z.record(z.any())])).optional(),
  scoringMode: z.string().optional().default('ICPC'),
  bannerBadge: z.string().optional(),
  editorial: z.string().optional(),
});

const updateEditorialSchema = z.object({
  editorial: z.string({ required_error: 'Editorial content must be a string' }),
});

const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

/**
 * GET /api/contests
 * List all upcoming, live, and ended contests
 */
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const contests = await Contest.find()
      .sort({ startTime: -1 })
      .populate('createdBy', 'username name');

    // Update runtime statuses based on current timestamp
    const now = new Date();
    const updatedContests = contests.map(c => {
      const contestObj = c.toObject();
      if (now < c.startTime) {
        contestObj.status = 'upcoming';
      } else if (now >= c.startTime && now <= c.endTime) {
        contestObj.status = 'live';
      } else {
        contestObj.status = 'ended';
      }
      return contestObj;
    });

    res.status(200).json({
      success: true,
      data: updatedContests,
    });
  } catch (error: any) {
    logger.error({ err: error },'[Contests Route] List Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve contests.',
    });
  }
});

/**
 * GET /api/contests/:id
 * Retrieve contest details by ID or slug
 */
router.get(
  '/:id',
  optionalAuthenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
      const query = isObjectId ? { _id: id } : { slug: id.toLowerCase() };

      const contest = await Contest.findOne(query)
        .populate({
          path: 'problemIds',
          select: '-hiddenTestCases',
        })
        .populate('createdBy', 'username name');

      if (!contest) {
        res.status(404).json({
          success: false,
          error: 'Contest not found.',
        });
        return;
      }

      const contestObj = contest.toObject();
      const now = new Date();
      if (now < contest.startTime) {
        contestObj.status = 'upcoming';
        // If upcoming, conceal problems from contestants until contest starts
        if (!req.user || req.user.role === 'user') {
          contestObj.problemIds = [];
        }
      } else if (now >= contest.startTime && now <= contest.endTime) {
        contestObj.status = 'live';
      } else {
        contestObj.status = 'ended';
      }

      res.status(200).json({
        success: true,
        data: contestObj,
      });
    } catch (error: any) {
      logger.error({ err: error },'[Contests Route] Detail Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve contest details.',
      });
    }
  }
);

/**
 * POST /api/contests
 * Create a new tournament round (Admin and Setter only)
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'setter'),
  validate(createContestSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const payload = req.body;
      const startTime = new Date(payload.startTime);
      const endTime = new Date(payload.endTime);

      if (endTime <= startTime) {
        res.status(400).json({
          success: false,
          error: 'End time must be after start time.',
        });
        return;
      }

      const baseSlug = payload.slug ? generateSlug(payload.slug) : generateSlug(payload.title);
      let finalSlug = baseSlug;
      const slugExists = await Contest.findOne({ slug: finalSlug });
      if (slugExists) {
        finalSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
      }

      const rawProblemIds = (payload.problemIds && payload.problemIds.length > 0)
        ? payload.problemIds
        : (payload.problems || []).map((p: any) => (typeof p === 'string' ? p : p._id || p.id)).filter(Boolean);

      const now = new Date();
      let status: 'upcoming' | 'live' | 'ended' = 'upcoming';
      if (now >= startTime && now <= endTime) status = 'live';
      else if (now > endTime) status = 'ended';

      const contest = new Contest({
        title: payload.title,
        slug: finalSlug,
        description: payload.description,
        startTime,
        endTime,
        durationMinutes: payload.durationMinutes || 90,
        problemIds: rawProblemIds,
        scoringMode: payload.scoringMode || 'ICPC',
        bannerBadge: payload.bannerBadge || (payload.scoringMode === 'ICPC' ? 'ICPC Scoring • 20m Penalty' : 'Rated (Div. 1 + Div. 2)'),
        editorial: payload.editorial || '',
        createdBy: req.userId,
        registeredUserIds: [],
        status,
      });

      await contest.save();

      res.status(201).json({
        success: true,
        data: contest,
        message: 'Contest created successfully.',
      });
    } catch (error: any) {
      logger.error({ err: error },'[Contests Route] Create Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create contest.',
      });
    }
  }
);

/**
 * POST /api/contests/:id/register
 * Register the logged-in user for a contest
 */
router.post(
  '/:id/register',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const userId = req.userId!;

      const contest = await Contest.findById(id);
      if (!contest) {
        res.status(404).json({
          success: false,
          error: 'Contest not found.',
        });
        return;
      }

      const isAlreadyRegistered = contest.registeredUserIds.some(
        uId => uId.toString() === userId
      );

      if (isAlreadyRegistered) {
        res.status(400).json({
          success: false,
          error: 'You are already registered for this contest.',
        });
        return;
      }

      contest.registeredUserIds.push(req.user!._id);
      await contest.save();

      res.status(200).json({
        success: true,
        message: 'Successfully registered for contest.',
        data: {
          registeredCount: contest.registeredUserIds.length,
        },
      });
    } catch (error: any) {
      logger.error({ err: error },'[Contests Route] Register Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to register for contest.',
      });
    }
  }
);

/**
 * PUT /api/contests/:id/editorial
 * Update contest editorial markdown (Admin and Setter only)
 */
router.put(
  '/:id/editorial',
  authenticate,
  authorize('admin', 'setter'),
  validate(updateEditorialSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
      const query = isObjectId ? { _id: id } : { slug: id.toLowerCase() };

      const contest = await Contest.findOne(query);
      if (!contest) {
        res.status(404).json({
          success: false,
          error: 'Contest not found.',
        });
        return;
      }

      contest.editorial = req.body.editorial;
      await contest.save();

      res.status(200).json({
        success: true,
        data: contest,
        message: 'Contest editorial updated successfully.',
      });
    } catch (error: any) {
      logger.error({ err: error }, '[Contests Route] Update Editorial Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update contest editorial.',
      });
    }
  }
);

/**
 * GET /api/contests/:id/leaderboard
 * Compute and return ICPC-style contest leaderboard standings
 */
router.get(
  '/:id/leaderboard',
  optionalAuthenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const contest = await Contest.findById(id);
      if (!contest) {
        res.status(404).json({
          success: false,
          error: 'Contest not found.',
        });
        return;
      }

      // Fetch all submissions for this contest
      const submissions = await Submission.find({ contestId: contest._id })
        .sort({ createdAt: 1 })
        .populate('userId', 'username name avatarUrl rating institution');

      // Aggregate user scores and penalty times
      const userStats: Record<string, any> = {};

      for (const sub of submissions) {
        const uId = sub.userId?._id?.toString() || sub.userId?.toString();
        if (!uId) continue;

        if (!userStats[uId]) {
          userStats[uId] = {
            user: sub.userId,
            score: 0,
            solvedCount: 0,
            penaltyMinutes: 0,
            problemResults: {},
          };
        }

        const pId = sub.problemId.toString();
        if (!userStats[uId].problemResults[pId]) {
          userStats[uId].problemResults[pId] = {
            solved: false,
            attempts: 0,
            timeMinutes: 0,
          };
        }

        const pRes = userStats[uId].problemResults[pId];

        if (!pRes.solved) {
          pRes.attempts += 1;

          if (sub.verdict === 'Accepted') {
            pRes.solved = true;
            const minutesSinceStart = Math.max(
              0,
              Math.floor((sub.createdAt.getTime() - contest.startTime.getTime()) / (1000 * 60))
            );
            pRes.timeMinutes = minutesSinceStart;
            userStats[uId].solvedCount += 1;
            userStats[uId].score += 100;
            // Standard ICPC penalty: time in minutes + 20 minutes per prior wrong attempt
            userStats[uId].penaltyMinutes += minutesSinceStart + (pRes.attempts - 1) * 20;
          }
        }
      }

      // Convert to ranked array
      const leaderboard = Object.values(userStats).sort((a: any, b: any) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.penaltyMinutes - b.penaltyMinutes;
      });

      // Assign ranks
      const rankedLeaderboard = leaderboard.map((entry: any, index: number) => ({
        rank: index + 1,
        ...entry,
      }));

      res.status(200).json({
        success: true,
        data: {
          contest: {
            id: contest._id,
            title: contest.title,
            status: contest.status,
          },
          leaderboard: rankedLeaderboard,
        },
      });
    } catch (error: any) {
      logger.error({ err: error },'[Contests Route] Leaderboard Error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate contest leaderboard.',
      });
    }
  }
);

export default router;
