import { Router, Response } from 'express';
import { Contest } from '../models/Contest';
import { authenticate, authorize, optionalAuthenticate, AuthRequest } from '../middleware/auth';
import { leaderboardService } from '../leaderboard/LeaderboardService';
import { logger } from '../logger';

const router = Router();

const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

/**
 * GET /contests
 * List all contests with optional status filter
 */
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const filter: Record<string, any> = {};

    if (status && ['upcoming', 'live', 'ended'].includes(status as string)) {
      filter.status = status;
    }

    const contests = await Contest.find(filter)
      .sort({ startTime: -1 })
      .populate('createdBy', 'username name');

    res.status(200).json({
      success: true,
      data: contests,
    });
  } catch (error: any) {
    logger.error({ err: error }, '[Contest Service] List error: ' + (error?.message || error));
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve contests.',
    });
  }
});

/**
 * GET /contests/:id
 * Retrieve contest details and current leaderboard
 */
router.get('/:id', optionalAuthenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { slug: id.toLowerCase() };

    const contest = await Contest.findOne(query)
      .populate('problemIds', 'title slug difficulty timeLimitMs memoryLimitMb tags')
      .populate('createdBy', 'username name');

    if (!contest) {
      res.status(404).json({
        success: false,
        error: 'Contest not found.',
      });
      return;
    }

    // If upcoming, hide problems from non-admin participants
    const contestObj = contest.toObject();
    if (contest.status === 'upcoming' && (!req.user || req.user.role === 'user')) {
      contestObj.problemIds = [];
    }

    // Fetch top 10 leaderboard standings from Redis
    const leaderboard = await leaderboardService.getLeaderboard(contest._id.toString(), 1, 10);

    res.status(200).json({
      success: true,
      data: {
        contest: contestObj,
        leaderboard: leaderboard.entries,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, '[Contest Service] Detail error: ' + (error?.message || error));
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve contest details.',
    });
  }
});

/**
 * POST /contests
 * Create a new contest tournament (Admin and Setter)
 */
router.post(
  '/',
  authenticate,
  authorize('admin', 'setter'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        title,
        description,
        slug,
        startTime,
        endTime,
        durationMinutes,
        problemIds,
        scoringMode,
        bannerBadge,
      } = req.body;

      if (!title || !startTime || !endTime) {
        res.status(400).json({
          success: false,
          error: 'Title, startTime, and endTime are required.',
        });
        return;
      }

      const start = new Date(startTime);
      const end = new Date(endTime);

      if (end <= start) {
        res.status(400).json({
          success: false,
          error: 'End time must be after start time.',
        });
        return;
      }

      const baseSlug = slug ? generateSlug(slug) : generateSlug(title);
      let finalSlug = baseSlug;
      const slugExists = await Contest.findOne({ slug: finalSlug });
      if (slugExists) {
        finalSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;
      }

      const rawProblemIds = (problemIds && problemIds.length > 0)
        ? problemIds
        : (req.body.problems || []).map((p: any) => (typeof p === 'string' ? p : p._id || p.id)).filter(Boolean);

      const now = new Date();
      let status: 'upcoming' | 'live' | 'ended' = 'upcoming';
      if (now >= start && now <= end) status = 'live';
      else if (now > end) status = 'ended';

      const contest = new Contest({
        title,
        slug: finalSlug,
        description,
        startTime: start,
        endTime: end,
        durationMinutes: durationMinutes || 90,
        problemIds: rawProblemIds,
        scoringMode: scoringMode || 'ICPC',
        bannerBadge: bannerBadge || (scoringMode === 'ICPC' ? 'ICPC Scoring • 20m Penalty' : 'Rated (Div. 1 + Div. 2)'),
        createdBy: req.userId,
        registeredUserIds: [],
        status,
        finalRankings: [],
      });

      await contest.save();

      res.status(201).json({
        success: true,
        data: contest,
        message: 'Contest created successfully.',
      });
    } catch (error: any) {
      logger.error({ err: error }, '[Contest Service] Create error: ' + (error?.message || error));
      res.status(500).json({
        success: false,
        error: 'Failed to create contest.',
      });
    }
  }
);

/**
 * PUT /contests/:id
 * Update an existing contest (Admin only)
 */
router.put(
  '/:id',
  authenticate,
  authorize('admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const contest = await Contest.findByIdAndUpdate(id, updates, { new: true });
      if (!contest) {
        res.status(404).json({
          success: false,
          error: 'Contest not found.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: contest,
        message: 'Contest updated successfully.',
      });
    } catch (error: any) {
      logger.error({ err: error }, '[Contest Service] Update error: ' + (error?.message || error));
      res.status(500).json({
        success: false,
        error: 'Failed to update contest.',
      });
    }
  }
);

/**
 * POST /contests/:id/register
 * Register authenticated user for a tournament
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

      const isRegistered = contest.registeredUserIds.some((u) => u.toString() === userId);
      if (isRegistered) {
        res.status(400).json({
          success: false,
          error: 'User already registered for this contest.',
        });
        return;
      }

      contest.registeredUserIds.push(req.user!._id);
      await contest.save();

      res.status(200).json({
        success: true,
        message: 'Registered for contest successfully.',
        data: {
          registeredCount: contest.registeredUserIds.length,
        },
      });
    } catch (error: any) {
      logger.error({ err: error }, '[Contest Service] Register error: ' + (error?.message || error));
      res.status(500).json({
        success: false,
        error: 'Failed to register for contest.',
      });
    }
  }
);

/**
 * GET /contests/:id/leaderboard
 * Paginated leaderboard rankings from Redis Sorted Sets
 */
router.get(
  '/:id/leaderboard',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const page = parseInt((req.query.page as string) || '1', 10);
      const limit = parseInt((req.query.limit as string) || '50', 10);

      const leaderboardData = await leaderboardService.getLeaderboard(id, page, limit);

      res.status(200).json({
        success: true,
        data: leaderboardData,
      });
    } catch (error: any) {
      logger.error({ err: error }, '[Contest Service] Leaderboard error: ' + (error?.message || error));
      res.status(500).json({
        success: false,
        error: 'Failed to fetch leaderboard.',
      });
    }
  }
);

/**
 * GET /contests/:id/my-rank
 * Retrieve the calling user's current live standing
 */
router.get(
  '/:id/my-rank',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const rankInfo = await leaderboardService.getUserRank(id, req.userId!);

      res.status(200).json({
        success: true,
        data: rankInfo,
      });
    } catch (error: any) {
      logger.error({ err: error }, '[Contest Service] My Rank error: ' + (error?.message || error));
      res.status(500).json({
        success: false,
        error: "Failed to fetch user's rank.",
      });
    }
  }
);

export default router;
