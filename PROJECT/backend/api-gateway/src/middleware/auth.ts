import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser, UserRole } from '../models/User';

export interface AuthRequest extends Request {
  user?: IUser;
  userId?: string;
  userRole?: UserRole;
}

export interface JWTPayload {
  userId: string;
  role: UserRole;
  username: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'algoflow_jwt_secret_dev_key_2026';

/**
 * Authentication middleware: verifies JWT bearer token and attaches user to request
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. No Bearer token provided.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    const user = await User.findById(decoded.userId).select('-passwordHash');
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User associated with token no longer exists.',
      });
      return;
    }

    req.user = user;
    req.userId = user._id.toString();
    req.userRole = user.role;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        error: 'Token has expired. Please log in again.',
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: 'Invalid authentication token.',
    });
  }
};

/**
 * Optional authentication: extracts user if token provided, but doesn't block unauthenticated requests
 */
export const optionalAuthenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      const user = await User.findById(decoded.userId).select('-passwordHash');
      if (user) {
        req.user = user;
        req.userId = user._id.toString();
        req.userRole = user.role;
      }
    }
  } catch {
    // Ignore error for optional authentication
  }
  next();
};

/**
 * Role-based authorization guard
 */
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !req.userRole) {
      res.status(401).json({
        success: false,
        error: 'Authentication required.',
      });
      return;
    }

    if (!roles.includes(req.userRole)) {
      res.status(403).json({
        success: false,
        error: `Access forbidden: Required role [${roles.join(', ')}], current role is '${req.userRole}'.`,
      });
      return;
    }

    next();
  };
};
