/**
 * MongoDB connection utility
 */
import mongoose from 'mongoose';

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/saas-starter';

const MAX_RETRIES = 10;
const RETRY_DELAY = 2000; // 2 seconds

export async function connectDB() {
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('MongoDB connected successfully');
      return;
    } catch (error) {
      retries++;
      console.error(
        `MongoDB connection attempt ${retries}/${MAX_RETRIES} failed:`,
        error.message
      );

      if (retries >= MAX_RETRIES) {
        console.error('MongoDB connection failed after maximum retries');
        // Don't exit - let the server start and retry later
        throw error;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

export async function disconnectDB() {
  try {
    await mongoose.connection.close();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('MongoDB disconnection error:', error);
  }
}
