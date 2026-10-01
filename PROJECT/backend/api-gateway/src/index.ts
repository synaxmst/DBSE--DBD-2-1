import dotenv from 'dotenv';
// Load environment variables before any other imports
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './config/db';
import { connectRedis, redisClient } from './config/redis';
import logger from './logger';

// Route Imports
import authRoutes from './routes/auth';
import problemsRoutes from './routes/problems';
import submissionsRoutes from './routes/submissions';
import contestsRoutes from './routes/contests';
import adminRoutes from './routes/admin';
import plagiarismRoutes from './routes/plagiarism';

const app = express();
const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// 1. Global Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, postman) or matching frontend
      if (!origin || origin === CORS_ORIGIN || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev mode
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 2. Global Rate Limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 300 : 3000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP address. Please try again later.',
  },
});

app.use('/api/', globalLimiter);

// 3. Health & System Telemetry Endpoint
const healthHandler = async (_req: Request, res: Response) => {
  const isMongoOnline = mongoose.connection.readyState === 1;
  const isRedisOnline = redisClient.status === 'ready' || redisClient.status === 'connect';

  res.status(200).json({
    service: 'api-gateway',
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongodb: isMongoOnline ? 'connected' : 'disconnected',
    redis: isRedisOnline ? 'connected' : 'disconnected',
    connections: {
      mongodb: isMongoOnline ? 'connected' : 'disconnected',
      redis: isRedisOnline ? 'connected' : 'disconnected',
    },
  });
};

app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

app.get('/api', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to AlgoFlow Online Code Judge API Gateway v1.0',
    endpoints: {
      auth: '/api/auth',
      problems: '/api/problems',
      submissions: '/api/submissions',
      contests: '/api/contests',
      admin: '/api/admin',
      health: '/health',
    },
  });
});

// 4. Mount Domain Routers
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemsRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/contests', contestsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/plagiarism', plagiarismRoutes);

// 5. 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route not found: [${req.method}] ${req.originalUrl}`,
  });
});

// 6. Global Unhandled Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, '[Global Error Handler]');

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// 7. Server Initialization
const startServer = async () => {
  try {
    // Initialize DB Connection
    await connectDB();

    // Initialize Redis Client
    await connectRedis();

    const server = app.listen(PORT, () => {
      logger.info(`🚀 AlgoFlow API Gateway running on http://localhost:${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔒 CORS Origin: ${CORS_ORIGIN}`);
    });

    // Graceful Shutdown
    let isShuttingDown = false;
    const shutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      logger.info(`Received ${signal}. Initiating graceful shutdown...`);

      try {
        // Step 1: Close HTTP server
        await new Promise<void>((resolve) => {
          server.close((err) => {
            if (err) logger.warn({ err: err.message }, 'HTTP server close notice');
            logger.info('1. HTTP server closed.');
            resolve();
          });
        });

        // Step 2: Disconnect MongoDB
        try {
          await disconnectDB();
          logger.info('2. MongoDB disconnected.');
        } catch (dbErr: any) {
          logger.warn({ err: dbErr.message }, 'MongoDB disconnect notice');
        }

        // Step 3: Disconnect Redis
        try {
          await redisClient.quit();
          logger.info('3. Redis disconnected.');
        } catch (redisErr: any) {
          logger.warn({ err: redisErr.message }, 'Redis disconnect notice');
        }

        logger.info('Graceful shutdown completed. Exiting code 0.');
        process.exit(0);
      } catch (err: any) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error({ error }, 'Failed to initialize server');
    process.exit(1);
  }
};

startServer();

export default app;
