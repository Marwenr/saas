/**
 * Fastify server setup
 */
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';
import Fastify from 'fastify';
import mongoose from 'mongoose';

import authRoutes from './routes/authRoutes.js';
import { connectDB } from './utils/db.js';

// Load environment variables
dotenv.config();

// Initialize Fastify with Pino logger
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
});

// Register plugins
async function registerPlugins() {
  // CORS
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Cookie support
  await fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET || 'your-secret-key-change-in-production',
  });

  // JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-change-in-production',
    cookie: {
      cookieName: 'accessToken',
      signed: false,
    },
  });
}

// Register routes
async function registerRoutes() {
  // Health check
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // API routes
  await fastify.register(authRoutes, { prefix: '/api/auth' });
}

// Global error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  // JWT errors
  if (error.statusCode === 401) {
    return reply.code(401).send({
      error: 'Unauthorized',
    });
  }

  // Validation errors
  if (error.validation) {
    return reply.code(400).send({
      error: 'Validation error',
      details: error.validation,
    });
  }

  // Default error
  return reply.code(error.statusCode || 500).send({
    error: error.message || 'Internal server error',
  });
});

// Start server
export async function start() {
  try {
    // Register plugins first (health check doesn't need DB)
    await registerPlugins();

    // Register routes (including health check)
    await registerRoutes();

    // Start server first (so health checks can pass)
    const port = process.env.PORT || 3001;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    fastify.log.info(`Server listening on http://${host}:${port}`);

    // Connect to MongoDB in background (with retries)
    try {
      await connectDB();
    } catch (err) {
      fastify.log.error(
        'MongoDB connection failed, but server is running:',
        err
      );
      // Server continues running - MongoDB will reconnect when available
    }
  } catch (err) {
    fastify.log.error('Server startup error:', err);
    process.exit(1);
  }
}

// Graceful shutdown
export async function stop() {
  try {
    await fastify.close();
    await mongoose.connection.close();
    fastify.log.info('Server shut down gracefully');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

export default fastify;
