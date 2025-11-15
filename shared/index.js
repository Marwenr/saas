/**
 * Shared utilities and constants
 * This module exports common utilities and constants used across frontend and backend
 */

// Re-export all modules
export * from './api.js';
export * from './constants.js';
export * from './validators.js';

// Constants
export const API_VERSION = 'v1';
export const DEFAULT_PORT = {
  frontend: 3000,
  backend: 4000,
  mongodb: 27017,
};

// Utility functions
export const log = {
  info: (message, ...args) => console.log(`[INFO] ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[WARN] ${message}`, ...args),
  error: (message, ...args) => console.error(`[ERROR] ${message}`, ...args),
};

// Default export
export default {
  API_VERSION,
  DEFAULT_PORT,
  log,
};
