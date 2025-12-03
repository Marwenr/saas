/**
 * Vitest setup file
 * Runs before each test file to ensure clean database state
 * Handles database connection for all tests
 */
import mongoose from 'mongoose';
import { beforeAll, afterEach, afterAll } from 'vitest';

import { closeAllApps } from './helpers/app.js';

const MONGODB_URI_TEST =
  process.env.MONGODB_URI_TEST ||
  process.env.MONGODB_URI?.replace(/\/[^/]+$/, '/erp_auto_parts_test') ||
  'mongodb://localhost:27017/erp_auto_parts_test';

// Track if we've connected in this process
let isConnected = false;

/**
 * Ensure database connection is established
 * This runs once and reuses the connection for all tests
 */
async function ensureConnection() {
  // If already connected, verify it's working
  if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
    try {
      await mongoose.connection.db.admin().command({ ping: 1 });
      return; // Connection is good
    } catch (_e) {
      // Ping failed, connection might be stale, reconnect
      console.warn('Connection ping failed, reconnecting...');
      try {
        await mongoose.disconnect();
      } catch (_disconnectError) {
        // Ignore disconnect errors
      }
      isConnected = false;
    }
  }

  // If not connected, connect now
  if (!isConnected && mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(MONGODB_URI_TEST, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 1,
      });
      isConnected = true;
      console.log('Test MongoDB connected:', MONGODB_URI_TEST);
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  // Wait for connection to be fully ready
  let retries = 20;
  while (retries > 0) {
    if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
      try {
        await mongoose.connection.db.admin().command({ ping: 1 });
        return; // Connection is ready
      } catch (_e) {
        // Ping failed, wait and retry
      }
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    retries--;
  }

  throw new Error(
    `Database connection not ready after waiting. State: ${mongoose.connection.readyState}, DB: ${!!mongoose.connection.db}`
  );
}

/**
 * Clean up all collections at the start of each test file
 * This ensures each test file starts with a clean database
 */
beforeAll(async () => {
  // Ensure connection is established
  await ensureConnection();

  // Clean up all collections at the start of each test file
  await cleanupDatabase();
});

/**
 * Clean up collections after each test
 * This ensures test isolation within each test file
 */
afterEach(async () => {
  // Wait longer to ensure all async operations from the test complete
  // This helps prevent race conditions where cleanup happens before writes finish
  // MongoDB operations can take time to propagate, especially with indexes
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 200);
    // Clear timer reference to help garbage collection
    timer.unref?.();
  });

  // Clean up after each test to ensure isolation
  await cleanupDatabase();
});

/**
 * Clean up after all tests in a test file complete
 * This ensures Fastify apps are closed after each test file
 */
afterAll(async () => {
  // Close all Fastify apps created during this test file
  await closeAllApps();

  // Small delay to ensure cleanup completes, but don't keep process alive
  await new Promise(resolve => {
    const timer = setTimeout(resolve, 100);
    // Unref timer so it doesn't prevent process exit
    timer.unref?.();
  });
});

/**
 * Wait for all pending database operations to complete
 * This ensures that all writes are committed before cleanup
 */
async function waitForDatabaseOperations() {
  // Ensure connection is ready first
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    await ensureConnection();
  }

  try {
    const db = mongoose.connection.db;
    if (!db) {
      return;
    }

    // Force a write concern acknowledgment by doing a simple operation
    // This ensures all pending writes are committed
    await db.admin().command({ ping: 1 });

    // Wait a bit more to ensure all operations propagate
    await new Promise(resolve => setTimeout(resolve, 50));
  } catch (_error) {
    // Ignore errors
  }
}

/**
 * Clean up all collections in the database
 * Deletes all documents while preserving indexes
 */
async function cleanupDatabase() {
  // Ensure connection is ready first
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    await ensureConnection();
  }

  // Wait for all pending operations to complete before cleanup
  await waitForDatabaseOperations();

  try {
    const db = mongoose.connection.db;
    if (!db) {
      return;
    }

    // Get all collection names
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    if (collectionNames.length === 0) {
      return;
    }

    // Delete all documents from each collection
    // Use sequential deletion to avoid race conditions and ensure proper order
    // Delete in reverse order of likely dependencies to avoid foreign key issues
    const orderedCollections = [
      'stockmovements',
      'sales',
      'purchaseorders',
      'products',
      'suppliers',
      'users',
      'companies',
    ];

    // First, delete collections in dependency order (child collections first)
    for (const preferredName of orderedCollections) {
      // Find matching collection (case-insensitive)
      const matchingName = collectionNames.find(
        name => name.toLowerCase() === preferredName.toLowerCase()
      );

      if (matchingName) {
        try {
          const collection = db.collection(matchingName);
          await collection.deleteMany({});
        } catch (error) {
          if (error.code !== 26 && error.name !== 'MongoServerError') {
            console.warn(
              `Warning: Could not clean collection ${matchingName}:`,
              error.message
            );
          }
        }
      }
    }

    // Then delete any remaining collections that weren't in the ordered list
    for (const collectionName of collectionNames) {
      const isOrdered = orderedCollections.some(
        name => name.toLowerCase() === collectionName.toLowerCase()
      );

      if (!isOrdered) {
        try {
          const collection = db.collection(collectionName);
          await collection.deleteMany({});
        } catch (error) {
          if (error.code !== 26 && error.name !== 'MongoServerError') {
            console.warn(
              `Warning: Could not clean collection ${collectionName}:`,
              error.message
            );
          }
        }
      }
    }

    // Ensure all operations are committed
    try {
      await db.admin().command({ ping: 1 });
    } catch (_e) {
      // Ignore ping errors
    }

    // Small delay to ensure all deletes are fully committed
    // This is important for MongoDB to ensure all operations are written to disk
    await new Promise(resolve => setTimeout(resolve, 100));
  } catch (error) {
    // Log but don't fail tests on cleanup errors
    console.error('Error during database cleanup:', error.message);
  }
}
