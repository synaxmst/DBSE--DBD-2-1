import mongoose from 'mongoose';
import logger from '../logger';

export const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/algoflow';

  try {
    mongoose.set('strictQuery', true);
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    logger.info(`[Database] MongoDB connected successfully to ${mongoose.connection.host}/${mongoose.connection.name}`);
  } catch (error) {
    logger.error({ error }, '[Database] MongoDB connection error');
    // In production we would exit, in local dev we log warning so gateway can still operate
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  mongoose.connection.on('disconnected', () => {
    logger.warn('[Database] MongoDB connection disconnected.');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, '[Database] MongoDB connection error event');
  });
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  logger.info('[Database] MongoDB disconnected cleanly.');
};

