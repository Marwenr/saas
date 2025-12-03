/**
 * API helpers for products
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
 * Fetch products with pagination and search
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 20)
 * @param {string} params.search - Search query (optional)
 * @returns {Promise<Object>} Response with products and pagination: { products: [], pagination: { page, limit, total, pages } }
 */
export async function fetchProducts({
  page = 1,
  limit = 20,
  search = '',
} = {}) {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', limit);
  if (search) params.set('search', search);

  return fetchAPI(`/api/products?${params.toString()}`);
}

/**
 * Fetch a single product by ID
 * @param {string} id - Product ID
 * @returns {Promise<Object>} Response with product: { product: {...} }
 */
export async function fetchProduct(id) {
  return fetchAPI(`/api/products/${id}`);
}

/**
 * Fetch product analytics by ID
 * @param {string} id - Product ID
 * @returns {Promise<Object>} Analytics payload
 */
export async function fetchProductAnalytics(id) {
  return fetchAPI(`/api/products/${id}/analytics`);
}

/**
 * Create a new product
 * @param {Object} payload - Product data
 * @returns {Promise<Object>} Response with created product: { product: {...} }
 */
export async function createProduct(payload) {
  return fetchAPI('/api/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Update an existing product
 * @param {string} id - Product ID
 * @param {Object} payload - Product data to update
 * @returns {Promise<Object>} Response with updated product: { product: {...} }
 */
export async function updateProduct(id, payload) {
  return fetchAPI(`/api/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Delete a product (soft delete)
 * @param {string} id - Product ID
 * @returns {Promise<Object>} Response with success message: { message: '...', product: {...} }
 */
export async function deleteProduct(id) {
  return fetchAPI(`/api/products/${id}`, {
    method: 'DELETE',
  });
}
