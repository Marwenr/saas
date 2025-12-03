/**
 * Authentication routes
 */
import {
  register,
  login,
  refresh,
  me,
  logout,
} from '../controllers/authController.js';
import { registerCompany } from '../controllers/companyController.js';
import { authenticate } from '../utils/auth.js';

async function authRoutes(fastify, _options) {
  // Register
  fastify.post('/register', register);

  // Register company with owner
  fastify.post('/register-company', registerCompany);

  // Login
  fastify.post('/login', login);

  // Refresh token
  fastify.post('/refresh', refresh);

  // Logout
  fastify.post('/logout', logout);

  // Get current user (protected)
  fastify.get(
    '/me',
    {
      preHandler: [authenticate],
    },
    me
  );
}

export default authRoutes;
