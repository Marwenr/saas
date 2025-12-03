/**
 * POS (Point of Sale) routes
 */
import { createSale, getSales, getSale } from '../controllers/posController.js';
import { authenticate } from '../utils/auth.js';

async function posRoutes(fastify, _options) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Create a new sale
  fastify.post('/sales', createSale);

  // Get all sales (with pagination and date filtering)
  fastify.get('/sales', getSales);

  // Get a single sale by ID
  fastify.get('/sales/:id', getSale);
}

export default posRoutes;
