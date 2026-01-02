/**
 * API helpers for brands
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
    const error = new Error(data.error || data.message || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Fetch brands with optional search
 * @param {Object} params - Query parameters
 * @param {string} params.search - Search query (optional)
 * @returns {Promise<Object>} Response with brands: { brands: [{ _id, name }] }
 */
export async function fetchBrands({ search = '' } = {}) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);

  const url = `/api/brands${params.toString() ? `?${params.toString()}` : ''}`;
  return fetchAPI(url);
}

/**
 * Create a new brand
 * @param {Object} payload - Brand data
 * @param {string} payload.name - Brand name
 * @returns {Promise<Object>} Response with created brand: { brand: { _id, name } }
 */
export async function createBrand(payload) {
  return fetchAPI('/api/brands', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
