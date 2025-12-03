/**
 * Authentication utilities
 */
import User from '../models/User.js';

/**
 * Verify JWT token and attach user to request
 */
export async function authenticate(request, reply) {
  try {
    await request.jwtVerify();
  } catch (_err) {
    reply.code(401).send({
      error: 'Unauthorized - Invalid or missing token',
    });
  }
}

/**
 * Get user from JWT token
 */
export async function getUserFromToken(request) {
  const userId = request.user.userId;
  return User.findById(userId);
}
