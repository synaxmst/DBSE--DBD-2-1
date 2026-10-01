import dotenv from 'dotenv';
dotenv.config();

import http from 'http';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { connectDB, disconnectDB } from './config/db';
import { connectRedis, redisClient } from './config/redis';
import { initSocketServer, getIO } from './socket/SocketManager';
import { contestLifecycle } from './contest/ContestLifecycle';
import { logger } from './logger';

// Routes
import contestsRouter from './routes/contests';
import healthRouter from './routes/health';

const app = express();
const PORT = process.env.PORT || 4001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// 1. Create HTTP Server
const httpServer = http.createServer(app);

// 2. Attach Socket.io Server
const io = initSocketServer(httpServer);

// 3. Global Express Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === CORS_ORIGIN || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// 4. Mount Routes
app.use('/contests', contestsRouter);
app.use('/api/contests', contestsRouter);
app.use('/', healthRouter);

// 5. 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route not found: [${req.method}] ${req.originalUrl}`,
  });
});

// 6. Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, '[Contest Service Error]');
  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

// 7. Startup Sequence
const startServer = async () => {
  try {
    logger.info('====================================================');
    logger.info('🏆 AlgoFlow Contest & Live Leaderboard Service');
    logger.info('====================================================');

    // Connect DB & Redis
    await connectDB();
    await connectRedis();

    // Start automated lifecycle cron job
    contestLifecycle.start();

    // Start HTTP & Socket server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Contest Service & WebSocket listening on http://localhost:${PORT}`);
      logger.info(`📡 WebSocket endpoint ready for live leaderboard streaming`);
      logger.info('====================================================');
    });

    // Graceful Shutdown
    let isShuttingDown = false;
    const shutdown = async (signal: string) => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      logger.info(`\n[Contest Service] Received ${signal}. Initiating graceful shutdown...`);

      try {
        // Step 1: Stop cron & socket, and close HTTP server
        contestLifecycle.stop();
        io.close();
        await new Promise<void>((resolve) => {
          httpServer.close((err) => {
            if (err) logger.warn({ err }, `[Contest Service] HTTP server close notice: ${err.message}`);
            logger.info('[Contest Service] 1. HTTP server closed.');
            resolve();
          });
        });

        // Step 2: Disconnect MongoDB
        try {
          await disconnectDB();
          logger.info('[Contest Service] 2. MongoDB disconnected.');
        } catch (dbErr: any) {
          logger.warn({ err: dbErr }, `[Contest Service] MongoDB disconnect notice: ${dbErr.message}`);
        }

        // Step 3: Disconnect Redis
        try {
          await redisClient.quit();
          logger.info('[Contest Service] 3. Redis disconnected.');
        } catch (redisErr: any) {
          logger.warn({ err: redisErr }, `[Contest Service] Redis disconnect notice: ${redisErr.message}`);
        }

        logger.info('[Contest Service] Graceful shutdown completed. Exiting code 0.');
        process.exit(0);
      } catch (err: any) {
        logger.error({ err }, '[Contest Service] Error during shutdown: ' + (err?.message || err));
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error: any) {
    logger.error({ err: error }, '[Contest Service] Fatal startup error: ' + (error?.message || error));
    process.exit(1);
  }
};

startServer();

export default app;
