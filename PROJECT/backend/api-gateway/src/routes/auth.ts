import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User, IUser } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import logger from '../logger';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'algoflow_jwt_secret_dev_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Validation Schemas
const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').optional(),
  institution: z.string().optional(),
  role: z.enum(['user', 'admin', 'setter']).optional(),
});

const loginSchema = z.object({
  identifier: z.string().min(1, 'Username or Email is required'),
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  name: z.string().optional(),
  institution: z.string().optional(),
  avatarUrl: z.string().url('Must be a valid URL').optional(),
});

/**
 * Generate JWT token helper
 */
const generateToken = (user: IUser): string => {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
      username: user.username,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN as any }
  );
};

/**
 * POST /api/auth/register
 * Register a new user account
 */
router.post(
  '/register',
  validate(registerSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { username, email, password, name, institution, role } = req.body;

      // Check if username or email already exists
      const existingUser = await User.findOne({
        $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
      });

      if (existingUser) {
        const isEmail = existingUser.email === email.toLowerCase();
        res.status(409).json({
          success: false,
          error: isEmail ? 'Email is already registered.' : 'Username is already taken.',
        });
        return;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Create new user
      const user = new User({
        username: username.toLowerCase(),
        name: name || username,
        email: email.toLowerCase(),
        passwordHash,
        institution,
        role: role || 'user',
        rating: 1500,
        rank: 0,
        solvedProblems: [],
      });

      await user.save();

      const token = generateToken(user);

      res.status(201).json({
        success: true,
        data: {
          token,
          user: user.toJSON(),
        },
        message: 'Account registered successfully.',
      });
    } catch (error: any) {
      logger.error({ error }, '[Auth Route] Register Error');
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred while creating your account.',
      });
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticate user with credentials and return JWT
 */
router.post(
  '/login',
  validate(loginSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { identifier, password } = req.body;
      const lowerIdentifier = identifier.toLowerCase();

      // Find user by either username or email
      const user = await User.findOne({
        $or: [{ username: lowerIdentifier }, { email: lowerIdentifier }],
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials. User not found.',
        });
        return;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials. Incorrect password.',
        });
        return;
      }

      const token = generateToken(user);

      res.status(200).json({
        success: true,
        data: {
          token,
          user: user.toJSON(),
        },
        message: 'Logged in successfully.',
      });
    } catch (error: any) {
      logger.error({ error }, '[Auth Route] Login Error');
      res.status(500).json({
        success: false,
        error: 'An unexpected error occurred during authentication.',
      });
    }
  }
);

/**
 * GET /api/auth/me
 * Retrieve the authenticated user's profile and problem solving stats
 */
router.get(
  '/me',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await User.findById(req.userId)
        .populate('solvedProblems', 'title slug difficulty')
        .select('-passwordHash');

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found.',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error: any) {
      logger.error({ error }, '[Auth Route] Get Profile Error');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user profile.',
      });
    }
  }
);

/**
 * PUT /api/auth/profile
 * Update user profile details
 */
router.put(
  '/profile',
  authenticate,
  validate(updateProfileSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, institution, avatarUrl } = req.body;

      const user = await User.findByIdAndUpdate(
        req.userId,
        {
          ...(name && { name }),
          ...(institution !== undefined && { institution }),
          ...(avatarUrl !== undefined && { avatarUrl }),
        },
        { new: true }
      ).select('-passwordHash');

      res.status(200).json({
        success: true,
        data: user,
        message: 'Profile updated successfully.',
      });
    } catch (error: any) {
      logger.error({ error }, '[Auth Route] Update Profile Error');
      res.status(500).json({
        success: false,
        error: 'Failed to update user profile.',
      });
    }
  }
);

export default router;
