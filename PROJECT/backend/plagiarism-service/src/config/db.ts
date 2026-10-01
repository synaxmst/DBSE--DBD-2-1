import mongoose from 'mongoose';
import { logger } from '../logger';

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/algoflow';

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`[Plagiarism DB] Connected to MongoDB at ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (error: any) {
    logger.warn({ err: error }, `[Plagiarism DB] MongoDB connection error: ${error.message}`);
  }

  mongoose.connection.on('disconnected', () => {
    logger.warn('[Plagiarism DB] MongoDB disconnected.');
  });
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  logger.info('[Plagiarism DB] MongoDB disconnected cleanly.');
};
