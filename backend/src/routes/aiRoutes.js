/**
 * AI routes - Reference search and chat history
 */
import {
  searchReference,
  getHistory,
  getChat,
} from '../controllers/aiController.js';
import { authenticate } from '../utils/auth.js';

async function aiRoutes(fastify, _options) {
  // Search for equivalent references (protected)
  fastify.post(
    '/search-reference',
    {
      preHandler: [authenticate],
    },
    searchReference
  );

  // Get chat history (protected)
  fastify.get(
    '/history',
    {
      preHandler: [authenticate],
    },
    getHistory
  );

  // Get specific chat record (protected)
  fastify.get(
    '/chat/:id',
    {
      preHandler: [authenticate],
    },
    getChat
  );
}

export default aiRoutes;
