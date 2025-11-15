/**
 * Shared constants for JWT, cookies, and API routes
 */

// JWT token names
export const JWT_NAMES = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
};

// Cookie names
export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
};

// API route paths
export const API_ROUTES = {
  // Health check
  HEALTH: '/health',

  // Authentication routes
  AUTH: {
    BASE: '/api/auth',
    REGISTER: '/api/auth/register',
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    ME: '/api/auth/me',
  },
};

// JWT expiration times (in seconds)
export const JWT_EXPIRATION = {
  ACCESS_TOKEN: 15 * 60, // 15 minutes
  REFRESH_TOKEN: 7 * 24 * 60 * 60, // 7 days
};

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};
