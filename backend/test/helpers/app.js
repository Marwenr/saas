/**
 * Test helper to create a Fastify app instance for testing
 */
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import Fastify from 'fastify';

import authRoutes from '../../src/routes/authRoutes.js';
import companyRoutes from '../../src/routes/companyRoutes.js';
import inventoryRoutes from '../../src/routes/inventoryRoutes.js';
import posRoutes from '../../src/routes/posRoutes.js';
import productRoutes from '../../src/routes/productRoutes.js';
import purchaseRoutes from '../../src/routes/purchaseRoutes.js';
import reportRoutes from '../../src/routes/reportRoutes.js';
import supplierRoutes from '../../src/routes/supplierRoutes.js';

// Global registry to track all Fastify instances for cleanup
const appRegistry = new Set();

/**
 * Create a Fastify app instance for testing
 * @returns {Promise<FastifyInstance>} Fastify app instance
 */
export async function buildApp() {
  // Create Fastify instance with test logger (minimal logging)
  const app = Fastify({
    logger: {
      level: 'error', // Only log errors in tests
    },
  });

  // Register plugins
  await app.register(cors, {
    origin: '*',
    credentials: true,
  });

  await app.register(cookie, {
    secret: 'test-secret-key',
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET || 'test-jwt-secret',
    cookie: {
      cookieName: 'accessToken',
      signed: false,
    },
  });

  // Register routes
  app.get('/health', async (_request, _reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(companyRoutes, { prefix: '/api/company' });
  await app.register(productRoutes, { prefix: '/api/products' });
  await app.register(inventoryRoutes, { prefix: '/api/inventory' });
  await app.register(posRoutes, { prefix: '/api/pos' });
  await app.register(supplierRoutes, { prefix: '/api/suppliers' });
  await app.register(purchaseRoutes, { prefix: '/api/purchases' });
  await app.register(reportRoutes, { prefix: '/api/reports' });

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    if (error.statusCode === 401) {
      return reply.code(401).send({
        error: 'Unauthorized',
      });
    }

    if (error.validation) {
      return reply.code(400).send({
        error: 'Validation error',
        details: error.validation,
      });
    }

    return reply.code(error.statusCode || 500).send({
      error: error.message || 'Internal server error',
    });
  });

  // Register app for cleanup
  appRegistry.add(app);

  // Remove from registry when app is closed
  app.addHook('onClose', () => {
    appRegistry.delete(app);
  });

  return app;
}

/**
 * Create a JWT token for testing
 * @param {Object} payload - Token payload
 * @param {string} payload.userId - User ID
 * @param {string} payload.companyId - Company ID
 * @param {string} payload.role - User role
 * @param {FastifyInstance} app - Fastify app instance
 * @returns {string} JWT token
 */
export function createTestToken(app, payload) {
  return app.jwt.sign(payload);
}

/**
 * Close a Fastify app instance
 * @param {FastifyInstance} app - Fastify app instance to close
 * @returns {Promise<void>}
 */
export async function closeApp(app) {
  if (app && typeof app.close === 'function') {
    try {
      await app.close();
      appRegistry.delete(app);
    } catch (error) {
      // Ignore errors when closing
      console.warn('Error closing Fastify app:', error.message);
    }
  }
}

/**
 * Close all registered Fastify app instances
 * This is called during global teardown to ensure all apps are closed
 * @returns {Promise<void>}
 */
export async function closeAllApps() {
  const appsToClose = Array.from(appRegistry);
  appRegistry.clear();

  // Close apps sequentially to avoid race conditions
  for (const app of appsToClose) {
    try {
      if (app && typeof app.close === 'function') {
        // Set a timeout for closing to prevent hanging
        await Promise.race([
          app.close(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('App close timeout')), 2000)
          ),
        ]).catch(() => {
          // Force close if timeout
          try {
            if (app.server && typeof app.server.close === 'function') {
              app.server.close();
            }
          } catch (_e) {
            // Ignore errors
          }
        });
      }
    } catch (_error) {
      // Ignore errors when closing - try to force close
      try {
        if (app && app.server && typeof app.server.close === 'function') {
          app.server.close();
        }
      } catch (_e) {
        // Ignore errors
      }
    }
  }
}

/**
 * Wait for all pending database operations to complete
 * This helps ensure test isolation by waiting for all async operations
 * @returns {Promise<void>}
 */
export async function waitForDatabaseOperations() {
  const mongoose = await import('mongoose');
  if (mongoose.default.connection.readyState === 1) {
    // Wait a small amount to ensure all pending operations complete
    await new Promise(resolve => setTimeout(resolve, 50));
    // Ping the database to ensure connection is ready
    try {
      await mongoose.default.connection.db.admin().command({ ping: 1 });
    } catch (_e) {
      // Ignore ping errors
    }
  }
}
