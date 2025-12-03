/**
 * Purchase routes
 */
import {
  createPurchaseOrder,
  getPurchaseOrders,
  getPurchaseOrder,
  receivePurchaseOrder,
} from '../controllers/purchaseController.js';
import { authenticate } from '../utils/auth.js';

async function purchaseRoutes(fastify, _options) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Purchase order routes
  // Create a new purchase order
  fastify.post('/orders', createPurchaseOrder);

  // Get all purchase orders (with pagination and filtering)
  fastify.get('/orders', getPurchaseOrders);

  // Get a single purchase order by ID
  fastify.get('/orders/:id', getPurchaseOrder);

  // Receive products from a purchase order
  fastify.post('/orders/:id/receive', receivePurchaseOrder);
}

export default purchaseRoutes;
