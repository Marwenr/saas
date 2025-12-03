/**
 * Inventory routes
 */
import {
  getStockMovements,
  createStockMovement,
  getLowStockProducts,
} from '../controllers/inventoryController.js';
import { authenticate } from '../utils/auth.js';

async function inventoryRoutes(fastify, _options) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Get stock movements (with pagination and filtering)
  fastify.get('/movements', getStockMovements);

  // Create a stock movement
  fastify.post('/movements', createStockMovement);

  // Get products with low stock
  fastify.get('/low-stock', getLowStockProducts);
}

export default inventoryRoutes;
