/**
 * Customer routes
 */
import {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerFinance,
  getCustomerInvoices,
  recordCustomerPayment,
} from '../controllers/customerController.js';
import { authenticate } from '../utils/auth.js';

async function customerRoutes(fastify, _options) {
  // All routes require authentication
  fastify.addHook('onRequest', authenticate);

  // Get all customers (with pagination and search)
  fastify.get('/', getCustomers);

  // Get a single customer by ID
  fastify.get('/:id', getCustomer);

  // Create a new customer
  fastify.post('/', createCustomer);

  // Update a customer
  fastify.put('/:id', updateCustomer);

  // Soft delete a customer
  fastify.delete('/:id', deleteCustomer);

  // Customer finance endpoints
  fastify.get('/:id/finance', getCustomerFinance);
  fastify.get('/:id/invoices', getCustomerInvoices);
  fastify.post('/:id/payments', recordCustomerPayment);
}

export default customerRoutes;
