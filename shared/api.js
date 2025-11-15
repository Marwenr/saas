/**
 * API helpers for making HTTP requests
 */

/**
 * Get the base API URL from environment or default
 * @returns {string} Base API URL
 */
export function getBaseApiUrl() {
  if (typeof window !== 'undefined') {
    // Browser environment - use Next.js env variable
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  }
  // Server environment
  return (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:4000'
  );
}

/**
 * Create a full API URL from a path
 * @param {string} path - API path (e.g., '/api/auth/login')
 * @returns {string} Full API URL
 */
export function apiUrl(path) {
  const base = getBaseApiUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Default fetch options with credentials
 * @param {RequestInit} [options={}] - Additional fetch options
 * @returns {RequestInit} Fetch options with credentials
 */
export function getFetchOptions(options = {}) {
  return {
    credentials: 'include', // Include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };
}

/**
 * Fetch wrapper that handles errors and JSON parsing
 * @param {string} url - URL to fetch
 * @param {RequestInit} [options={}] - Fetch options
 * @returns {Promise<any>} Parsed JSON response
 * @throws {Error} If request fails or response is not ok
 */
export async function apiFetch(url, options = {}) {
  const fullUrl = url.startsWith('http') ? url : apiUrl(url);
  const fetchOptions = getFetchOptions(options);

  const response = await fetch(fullUrl, fetchOptions);

  // Handle non-JSON responses
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return null;
  }

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data.error || `HTTP error! status: ${response.status}`
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * GET request helper
 * @param {string} url - API endpoint
 * @param {RequestInit} [options={}] - Additional fetch options
 * @returns {Promise<any>} Response data
 */
export async function apiGet(url, options = {}) {
  return apiFetch(url, {
    ...options,
    method: 'GET',
  });
}

/**
 * POST request helper
 * @param {string} url - API endpoint
 * @param {any} [body] - Request body
 * @param {RequestInit} [options={}] - Additional fetch options
 * @returns {Promise<any>} Response data
 */
export async function apiPost(url, body, options = {}) {
  return apiFetch(url, {
    ...options,
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PUT request helper
 * @param {string} url - API endpoint
 * @param {any} [body] - Request body
 * @param {RequestInit} [options={}] - Additional fetch options
 * @returns {Promise<any>} Response data
 */
export async function apiPut(url, body, options = {}) {
  return apiFetch(url, {
    ...options,
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * PATCH request helper
 * @param {string} url - API endpoint
 * @param {any} [body] - Request body
 * @param {RequestInit} [options={}] - Additional fetch options
 * @returns {Promise<any>} Response data
 */
export async function apiPatch(url, body, options = {}) {
  return apiFetch(url, {
    ...options,
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * DELETE request helper
 * @param {string} url - API endpoint
 * @param {RequestInit} [options={}] - Additional fetch options
 * @returns {Promise<any>} Response data
 */
export async function apiDelete(url, options = {}) {
  return apiFetch(url, {
    ...options,
    method: 'DELETE',
  });
}
