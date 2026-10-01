import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { logger } from '../logger';

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: IUser;
    userId?: string;
    username?: string;
    role?: string;
    isGuest?: boolean;
  };
}

let io: SocketIOServer | null = null;
const JWT_SECRET = process.env.JWT_SECRET || 'algoflow_jwt_secret_dev_key_2026';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

/**
 * Initialize Socket.io server attached to Express HTTP server with JWT Handshake Auth
 */
export const initSocketServer = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || origin === CORS_ORIGIN || origin.startsWith('http://localhost:')) {
          callback(null, true);
        } else {
          callback(null, true);
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // JWT Handshake Authentication Middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      // If no token is provided, the socket connects as a guest (read-only, no auth error)
      if (!token) {
        socket.data = {
          username: 'Guest',
          isGuest: true,
        };
        return next();
      }

      // If a token is provided, verify it as before
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
      const user = await User.findById(decoded.userId);

      if (!user) {
        return next(new Error('Authentication error: User not found.'));
      }

      // Attach socket.data.userId and socket.data.role only when token is valid
      socket.data = {
        user,
        userId: user._id.toString(),
        username: user.username,
        role: user.role,
        isGuest: false,
      };

      next();
    } catch (err: any) {
      return next(new Error(`Authentication error: ${err.message}`));
    }
  });

  // Connection Lifecycle
  io.on('connection', (socket: AuthenticatedSocket) => {
    const displayName = socket.data.username || 'Guest';
    const userTag = socket.data.userId ? `(${socket.data.userId})` : '[guest]';
    logger.info(`[Socket] Client connected: socketId=${socket.id}, user=${displayName} ${userTag}`);

    // Guest sockets cannot emit scoring events
    socket.use(([event], next) => {
      if ((!socket.data.userId || socket.data.isGuest) && /score|scoring/i.test(event)) {
        return next(new Error('Unauthorized: Guest sockets cannot emit scoring events.'));
      }
      next();
    });

    // Contest Room Join
    socket.on('join:contest', (contestId: string) => {
      const room = `contest:${contestId}`;
      socket.join(room);
      logger.info(`[Socket] User ${displayName} joined room: ${room}`);
      socket.emit('joined:contest', { contestId, room });
    });

    // Contest Room Leave
    socket.on('leave:contest', (contestId: string) => {
      const room = `contest:${contestId}`;
      socket.leave(room);
      logger.info(`[Socket] User ${displayName} left room: ${room}`);
      socket.emit('left:contest', { contestId, room });
    });

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket] Client disconnected: socketId=${socket.id}, reason=${reason}`);
    });
  });

  return io;
};

/**
 * Get active Socket.io instance
 */
export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io server has not been initialized.');
  }
  return io;
};

/**
 * Emit real-time event to all clients in a contest room
 */
export const emitToContest = (contestId: string, event: string, data: any): void => {
  if (!io) return;
  const room = `contest:${contestId}`;
  io.to(room).emit(event, data);
  logger.info(`[Socket Broadcast] Emitted '${event}' to ${room}`);
};

/**
 * Global broadcast to all connected clients across the platform
 */
export const broadcastGlobal = (event: string, data: any): void => {
  if (!io) return;
  io.emit(event, data);
};

/**
 * Return total active socket connections count
 */
export const getActiveConnectionsCount = (): number => {
  if (!io) return 0;
  return io.sockets.sockets.size;
};
