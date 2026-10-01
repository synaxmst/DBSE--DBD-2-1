import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { User } from '../models/User';
import { Problem } from '../models/Problem';
import { Submission } from '../models/Submission';
import { redisClient } from '../config/redis';

const router = Router();

// All admin routes require authentication + admin or setter role
router.use(authenticate);
router.use(authorize('admin', 'setter'));

/**
 * GET /api/admin/stats
 * Platform-wide counts for the dashboard header
 */
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const [userCount, problemCount, submissionCount, acceptedCount] = await Promise.all([
      User.countDocuments(),
      Problem.countDocuments({ isPublished: true }),
      Submission.countDocuments(),
      Submission.countDocuments({ verdict: 'Accepted' }),
    ]);

    res.json({
      success: true,
      data: {
        userCount,
        problemCount,
        submissionCount,
        acceptedCount,
        acceptanceRate: submissionCount > 0
          ? Math.round((acceptedCount / submissionCount) * 100)
          : 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/users?page=1&limit=20&search=
 * Paginated user list for user management table
 */
router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const search = (req.query.search as string || '').trim();

    const query = search
      ? {
          $or: [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { name: { $regex: search, $options: 'i' } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        users,
        total,
        page,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * PATCH /api/admin/users/:id/role
 * Change a user's role (admin only)
 */
router.patch('/users/:id/role', authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!['user', 'setter', 'admin'].includes(role)) {
      res.status(400).json({ success: false, error: 'Invalid role. Must be user, setter, or admin.' });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found.' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/submissions/recent?limit=20
 * Recent submissions across all users for live monitor
 */
router.get('/submissions/recent', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

    const submissions = await Submission.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('userId', 'username name')
      .populate('problemId', 'title slug difficulty')
      .lean();

    res.json({ success: true, data: submissions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/health
 * System health: Redis status and BullMQ queue depth
 */
router.get('/health', async (_req: AuthRequest, res: Response) => {
  try {
    const redisStatus = redisClient.status;
    let queueDepth = 0;
    let queueFailed = 0;

    try {
      const waiting = await redisClient.llen('bull:submissions:wait');
      const active = await redisClient.llen('bull:submissions:active');
      const failed = await redisClient.llen('bull:submissions:failed');
      queueDepth = waiting + active;
      queueFailed = failed;
    } catch {
      // Queue stats unavailable
    }

    res.json({
      success: true,
      data: {
        redis: redisStatus === 'ready' ? 'connected' : redisStatus,
        queueDepth,
        queueFailed,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
