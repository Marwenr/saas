/**
 * Global setup file - runs once before all tests
 * Handles database connection for all test files
 */
import mongoose from 'mongoose';

const MONGODB_URI_TEST =
  process.env.MONGODB_URI_TEST ||
  process.env.MONGODB_URI?.replace(/\/[^/]+$/, '/erp_auto_parts_test') ||
  'mongodb://localhost:27017/erp_auto_parts_test';

export async function setup() {
  try {
    // Disconnect if already connected (e.g., from previous test run)
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      // Wait a bit for disconnection to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    await mongoose.connect(MONGODB_URI_TEST, {
      serverSelectionTimeoutMS: 10000,
      maxPoolSize: 1, // Limit connection pool for tests
    });

    // Wait for connection to be fully ready
    // The connect() promise resolves when connection is established, but we want to ensure it's ready
    let retries = 20;
    while (mongoose.connection.readyState !== 1 && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 50));
      retries--;
    }

    if (mongoose.connection.readyState !== 1) {
      throw new Error(
        `MongoDB connection not ready after connect. State: ${mongoose.connection.readyState}`
      );
    }

    // Verify connection with a ping
    await mongoose.connection.db.admin().command({ ping: 1 });

    console.log('Global Test MongoDB connected:', MONGODB_URI_TEST);
  } catch (error) {
    console.error('Global Test MongoDB connection failed:', error);
    throw error;
  }
}
