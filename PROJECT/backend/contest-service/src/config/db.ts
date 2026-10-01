import mongoose from 'mongoose';
import { logger } from '../logger';

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/algoflow';

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`[Contest DB] Connected to MongoDB successfully at ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (error: any) {
    logger.warn({ err: error }, `[Contest DB] MongoDB connection warning: ${error.message}`);
  }

  mongoose.connection.on('disconnected', () => {
    logger.warn('[Contest DB] MongoDB disconnected.');
  });
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  logger.info('[Contest DB] MongoDB disconnected cleanly.');
};
