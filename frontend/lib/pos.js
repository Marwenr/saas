/**
 * API helpers for POS (Point of Sale)
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
 * Create a new sale
 * @param {Object} payload - Sale data
 * @param {string} [payload.customerName] - Customer name
 * @param {string} [payload.paymentMethod] - Payment method ('CASH' or 'CHECK')
 * @param {Array} payload.items - Sale items: [{ productId, qty, unitPrice?, taxRate? }]
 * @param {string} [payload.reference] - Reference number
 * @param {string} [payload.saleDate] - Sale date (ISO string, optional)
 * @returns {Promise<Object>} Response with sale: { sale: {...}, stockMovements: [...] }
 */
export async function createSale(payload) {
  // Convert paymentMethod to uppercase if provided
  if (payload.paymentMethod) {
    payload.paymentMethod = payload.paymentMethod.toUpperCase();
  }
  return fetchAPI('/api/pos/sales', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Fetch sales with pagination and date filtering
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 20)
 * @param {string} params.startDate - Start date (YYYY-MM-DD format, optional)
 * @param {string} params.endDate - End date (YYYY-MM-DD format, optional)
 * @param {string} params.paymentMethod - Filter by payment method ('CASH', 'CHECK', optional)
 * @param {string} params.client - Filter by customer ID (optional)
 * @returns {Promise<Object>} Response with sales and pagination: { sales: [], pagination: { page, limit, total, pages } }
 */
export async function fetchSales({
  page = 1,
  limit = 20,
  startDate,
  endDate,
  paymentMethod,
  client,
} = {}) {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', limit);
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (paymentMethod) params.set('paymentMethod', paymentMethod);
  if (client) params.set('client', client);

  return fetchAPI(`/api/pos/sales?${params.toString()}`);
}

/**
 * Fetch a single sale by ID
 * @param {string} id - Sale ID
 * @returns {Promise<Object>} Response with sale: { sale: {...} }
 */
export async function fetchSale(id) {
  return fetchAPI(`/api/pos/sales/${id}`);
}
