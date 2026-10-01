import Redis from 'ioredis';
import { logger } from '../logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = new Redis(redisUrl, {
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 2000);
    return delay;
  },
  lazyConnect: true,
});

let lastLoggedError = 0;

redisClient.on('connect', () => {
  lastLoggedError = 0;
  logger.info('[Plagiarism Redis] Connected to Redis successfully.');
});

redisClient.on('error', (err: any) => {
  const now = Date.now();
  if (now - lastLoggedError > 30000) {
    lastLoggedError = now;
    logger.warn({ err: err?.message || 'ECONNREFUSED' }, '[Plagiarism Redis] Redis server unreachable on port 6379.');
  }
});

export const connectRedis = async (): Promise<void> => {
  try {
    if (redisClient.status !== 'ready' && redisClient.status !== 'connecting') {
      await redisClient.connect();
    }
  } catch (error: any) {
    const now = Date.now();
    if (now - lastLoggedError > 30000) {
      lastLoggedError = now;
      logger.warn({ err: error?.message || 'ECONNREFUSED' }, `[Plagiarism Redis] Redis not reachable at ${redisUrl}: ${error?.message || 'ECONNREFUSED'}`);
    }
  }
};
