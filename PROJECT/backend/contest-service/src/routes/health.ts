import { Router, Request, Response } from 'express';
import { redisClient } from '../config/redis';
import { getActiveConnectionsCount } from '../socket/SocketManager';
import mongoose from 'mongoose';

const router = Router();

const healthHandler = async (_req: Request, res: Response) => {
  const isRedisOnline = redisClient.status === 'ready' || redisClient.status === 'connect';
  const isMongoOnline = mongoose.connection.readyState === 1;
  const activeSockets = getActiveConnectionsCount();

  res.status(200).json({
    service: 'contest-service',
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongodb: isMongoOnline ? 'connected' : 'disconnected',
    redis: isRedisOnline ? 'connected' : 'disconnected',
    connections: {
      mongodb: isMongoOnline ? 'connected' : 'disconnected',
      redis: isRedisOnline ? 'connected' : 'disconnected',
      activeWebSockets: activeSockets,
    },
  });
};

router.get('/health', healthHandler);
router.get('/api/health', healthHandler);

export default router;
