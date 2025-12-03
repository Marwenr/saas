/**
 * Supplier routes
 */
import {
  getSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplierController.js';
import { authenticate } from '../utils/auth.js';

async function supplierRoutes(fastify, _options) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Get all suppliers (with pagination and search)
  fastify.get('/', getSuppliers);

  // Get a single supplier by ID
  fastify.get('/:id', getSupplier);

  // Create a new supplier
  fastify.post('/', createSupplier);

  // Update a supplier
  fastify.put('/:id', updateSupplier);

  // Soft delete a supplier
  fastify.delete('/:id', deleteSupplier);
}

export default supplierRoutes;
