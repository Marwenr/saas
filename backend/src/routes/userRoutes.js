/**
 * User management routes
 * Only owners can access these routes
 */
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/userController.js';
import { authenticate } from '../utils/auth.js';

async function userRoutes(fastify, _options) {
  // All routes require authentication (owner role check is in controllers)
  fastify.addHook('onRequest', authenticate);

  // Get all users for the company (owner only)
  fastify.get('/users', getUsers);

  // Create a new user (owner only)
  fastify.post('/users', createUser);

  // Update a user (owner only)
  fastify.put('/users/:id', updateUser);

  // Delete a user (owner only)
  fastify.delete('/users/:id', deleteUser);
}

export default userRoutes;
