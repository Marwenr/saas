/**
 * API fetch wrappers for authentication endpoints
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Base fetch wrapper with credentials
 */
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Important for cookies
  };

  const response = await fetch(url, config);

  // Try to parse JSON, but handle empty responses
  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(data.error || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Register a new user
 */
export async function register(email, password, name = '') {
  return fetchAPI('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

/**
 * Login user
 */
export async function login(email, password) {
  return fetchAPI('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Logout user
 */
export async function logout() {
  return fetchAPI('/api/auth/logout', {
    method: 'POST',
  });
}

/**
 * Refresh access token
 */
export async function refreshToken() {
  return fetchAPI('/api/auth/refresh', {
    method: 'POST',
  });
}

/**
 * Get current user (protected)
 */
export async function getCurrentUser() {
  return fetchAPI('/api/auth/me', {
    method: 'GET',
  });
}
