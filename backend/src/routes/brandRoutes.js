/**
 * Brand routes
 */
import { getBrands, createBrand } from '../controllers/brandController.js';
import { authenticate } from '../utils/auth.js';

async function brandRoutes(fastify, _options) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Get all brands (with optional search)
  fastify.get('/', getBrands);

  // Create a new brand
  fastify.post('/', createBrand);
}

export default brandRoutes;
