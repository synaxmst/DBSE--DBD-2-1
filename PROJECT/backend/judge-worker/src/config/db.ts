import mongoose from 'mongoose';
import { logger } from '../logger';

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/algoflow';

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`[Judge DB] Connected to MongoDB at ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (error: any) {
    logger.warn({ err: error }, `[Judge DB] MongoDB connection error: ${error.message}. Worker will retry on job processing.`);
  }

  mongoose.connection.on('disconnected', () => {
    logger.warn('[Judge DB] MongoDB disconnected.');
  });
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  logger.info('[Judge DB] MongoDB disconnected cleanly.');
};
