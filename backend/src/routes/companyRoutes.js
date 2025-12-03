/**
 * Company routes
 */
import {
  registerCompany,
  getCompany,
} from '../controllers/companyController.js';
import { authenticate } from '../utils/auth.js';

async function companyRoutes(fastify, _options) {
  // Register company with owner
  fastify.post('/register', registerCompany);

  // Get company information (protected)
  fastify.get(
    '/me',
    {
      preHandler: [authenticate],
    },
    getCompany
  );
}

export default companyRoutes;
