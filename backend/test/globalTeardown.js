/**
 * Global teardown file - runs once after all tests
 * Closes database connection and forces process exit
 */
import mongoose from 'mongoose';

import { closeAllApps } from './helpers/app.js';

export async function teardown() {
  try {
    console.log('Starting global teardown...');

    // Close all Fastify app instances first
    await closeAllApps();
    console.log('All Fastify apps closed');

    // End all active MongoDB sessions
    try {
      const activeSessions = mongoose.connection.sessions || new Map();
      for (const session of activeSessions.values()) {
        try {
          if (session && typeof session.endSession === 'function') {
            await session.endSession();
          }
        } catch (_e) {
          // Ignore errors on individual sessions
        }
      }
      console.log('All MongoDB sessions closed');
    } catch (_e) {
      // Ignore if sessions API is not available
    }

    // Close all mongoose connections
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('Global Test MongoDB disconnected');
    }

    // Close all other mongoose connections that might exist
    const connections = mongoose.connections || [];
    for (const conn of connections) {
      if (conn.readyState !== 0) {
        try {
          await conn.close();
        } catch (_e) {
          // Ignore errors on individual connections
        }
      }
    }

    // Force disconnect all connections
    await mongoose.disconnect();

    // Give a small delay to ensure all cleanup completes, but don't keep process alive
    await new Promise(resolve => {
      const timer = setTimeout(resolve, 100);
      timer.unref?.();
    });

    console.log('All database connections closed');
  } catch (error) {
    console.error('Error during teardown:', error.message);
  } finally {
    // Force exit immediately - don't wait for anything
    // This prevents the process from hanging
    console.log('Forcing process exit...');

    // Use setImmediate to ensure all pending operations complete
    setImmediate(() => {
      process.exit(0);
    });
  }
}
