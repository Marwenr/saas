/**
 * API helpers for reports
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchAPI(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  };
  const res = await fetch(url, config);
  let data = {};
  const ct = res.headers.get('content-type');
  if (ct && ct.includes('application/json')) {
    data = await res.json();
  }
  if (!res.ok) {
    const err = new Error(data.error || data.message || 'Request failed');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export async function fetchRecommendedSuppliersReport() {
  return fetchAPI('/api/reports/recommended-suppliers');
}

/**
 * Fetch sales products analytics report
 * @param {Object} params - Query parameters
 * @param {string} params.period - "day" | "week" | "month" | "year" | "range"
 * @param {string} [params.from] - ISO date string YYYY-MM-DD (required if period="range")
 * @param {string} [params.to] - ISO date string YYYY-MM-DD (required if period="range")
 * @param {string} [params.sortBy] - "qty" | "revenue" | "margin"
 * @param {number} [params.limit] - Number of results (default: 50, max: 200)
 */
export async function fetchSalesProductsReport(params = {}) {
  const queryParams = new URLSearchParams();

  if (params.period) queryParams.set('period', params.period);
  if (params.from) queryParams.set('from', params.from);
  if (params.to) queryParams.set('to', params.to);
  if (params.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params.limit) queryParams.set('limit', params.limit.toString());

  const queryString = queryParams.toString();
  const endpoint = `/api/reports/sales-products${queryString ? `?${queryString}` : ''}`;

  return fetchAPI(endpoint);
}

/**
 * Fetch stock alerts report
 * @param {Object} params - Query parameters
 * @param {number} [params.limit] - Number of results (default: 50, max: 200)
 * @param {string} [params.sort] - "asc" | "desc" (default: "asc")
 */
export async function fetchStockAlertsReport(params = {}) {
  const queryParams = new URLSearchParams();

  if (params.limit) queryParams.set('limit', params.limit.toString());
  if (params.sort) queryParams.set('sort', params.sort);

  const queryString = queryParams.toString();
  const endpoint = `/api/reports/stock-alerts${queryString ? `?${queryString}` : ''}`;

  return fetchAPI(endpoint);
}

/**
 * Fetch top products report
 * @param {Object} params - Query parameters
 * @param {string} params.period - "day" | "week" | "month" | "year" | "range"
 * @param {string} [params.from] - ISO date string YYYY-MM-DD (required if period="range")
 * @param {string} [params.to] - ISO date string YYYY-MM-DD (required if period="range")
 * @param {string} [params.sortBy] - "qty" | "revenue" (default: "qty")
 * @param {number} [params.limit] - Number of results (default: 10, max: 100)
 */
export async function fetchTopProductsReport(params = {}) {
  const queryParams = new URLSearchParams();

  if (params.period) queryParams.set('period', params.period);
  if (params.from) queryParams.set('from', params.from);
  if (params.to) queryParams.set('to', params.to);
  if (params.sortBy) queryParams.set('sortBy', params.sortBy);
  if (params.limit) queryParams.set('limit', params.limit.toString());

  const queryString = queryParams.toString();
  const endpoint = `/api/reports/top-products${queryString ? `?${queryString}` : ''}`;

  return fetchAPI(endpoint);
}

/**
 * Fetch sales summary report
 * @param {Object} params - Query parameters
 * @param {string} params.period - "day" | "week" | "month" | "year" | "range"
 * @param {string} [params.from] - ISO date string YYYY-MM-DD (required if period="range")
 * @param {string} [params.to] - ISO date string YYYY-MM-DD (required if period="range")
 */
export async function fetchSalesSummaryReport(params = {}) {
  const queryParams = new URLSearchParams();

  if (params.period) queryParams.set('period', params.period);
  if (params.from) queryParams.set('from', params.from);
  if (params.to) queryParams.set('to', params.to);

  const queryString = queryParams.toString();
  const endpoint = `/api/reports/sales-summary${queryString ? `?${queryString}` : ''}`;

  return fetchAPI(endpoint);
}

/**
 * Fetch sales summary by date range (convenience function)
 * @param {string} from - ISO date string YYYY-MM-DD
 * @param {string} to - ISO date string YYYY-MM-DD
 */
export async function fetchSalesSummary(from, to) {
  return fetchSalesSummaryReport({
    period: 'range',
    from,
    to,
  });
}

/**
 * Fetch top products by date range (convenience function)
 * @param {string} from - ISO date string YYYY-MM-DD
 * @param {string} to - ISO date string YYYY-MM-DD
 * @param {number} limit - Number of results (default: 10, max: 100)
 */
export async function fetchTopProducts(from, to, limit = 10) {
  return fetchTopProductsReport({
    period: 'range',
    from,
    to,
    limit,
    sortBy: 'qty',
  });
}
