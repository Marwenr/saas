/**
 * API helpers for inventory management
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
 * Create a stock movement
 * @param {Object} payload - Stock movement data
 * @param {string} payload.productId - Product ID
 * @param {string} payload.type - Movement type: 'IN' | 'OUT' | 'ADJUST'
 * @param {number} payload.quantity - Quantity
 * @param {string} [payload.reason] - Reason for movement
 * @returns {Promise<Object>} Response with product and movement: { product: {...}, movement: {...} }
 */
export async function createStockMovement(payload) {
  return fetchAPI('/api/inventory/movements', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch stock movements with pagination and filtering
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 20)
 * @param {string} [params.productId] - Filter by product ID (optional)
 * @returns {Promise<Object>} Response with movements and pagination: { items: [], total, page, limit, totalPages }
 */
export async function fetchStockMovements({
  productId,
  page = 1,
  limit = 20,
} = {}) {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', limit);
  if (productId) params.set('productId', productId);

  return fetchAPI(`/api/inventory/movements?${params.toString()}`);
}

/**
 * Fetch products with low stock
 * @param {Object} params - Query parameters
 * @param {number} [params.page] - Page number (default: 1)
 * @param {number} [params.limit] - Items per page (default: 20)
 * @returns {Promise<Object>} Response with products and pagination: { products: [], pagination: { page, limit, total, pages } }
 */
export async function fetchLowStockProducts({ page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', limit);

  return fetchAPI(`/api/inventory/low-stock?${params.toString()}`);
}
