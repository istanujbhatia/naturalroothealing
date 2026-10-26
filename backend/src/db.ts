import mongoose from 'mongoose';
import type { Logger } from 'pino';

export async function connectDatabase(uri: string, logger: Logger): Promise<void> {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('MongoDB connection established');
  } catch (error) {
    logger.error({ err: error }, 'MongoDB connection failed');
    throw new Error('MongoDB connection failed');
  }
}

export async function disconnectDatabase(logger: Logger): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB connection closed');
}

export function databaseStatus(): 'connected' | 'connecting' | 'disconnected' | 'disconnecting' {
  switch (mongoose.connection.readyState) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return 'disconnected';
  }
}
