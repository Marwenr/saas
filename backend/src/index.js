/**
 * Backend server entry point
 * Fastify server with MongoDB connection
 */
import Fastify from 'fastify';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { log, DEFAULT_PORT } from '@saas/shared';

// Load environment variables
dotenv.config();

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    // Pretty logging in development (requires: pnpm add -D pino-pretty)
    // transport: process.env.NODE_ENV === 'development' ? {
    //   target: 'pino-pretty',
    //   options: { colorize: true },
    // } : undefined,
  },
});

// MongoDB connection
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/saas-starter';

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    log.info('MongoDB connected successfully');
  } catch (error) {
    log.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

// Health check route
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// API routes placeholder
fastify.get('/api/v1', async (request, reply) => {
  return { message: 'API v1', version: '1.0.0' };
});

// Start server
const start = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Fastify server
    const port = process.env.PORT || DEFAULT_PORT.backend;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    log.info(`Server listening on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await fastify.close();
  await mongoose.connection.close();
  log.info('Server shut down gracefully');
  process.exit(0);
});

// Start the server
start();

