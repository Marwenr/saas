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
 * Login user (multi-tenant aware)
 *
 * After successful login, the backend sets httpOnly cookies with JWT tokens
 * containing user ID, companyId, and role. The response includes user data
 * with companyId and role for immediate multi-tenant context.
 *
 * The JWT tokens in cookies are used for subsequent authenticated requests.
 * After login, call checkAuth() from useAuth hook to load full user and company
 * data from the /me endpoint.
 *
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Response with user data: { message, user: { id, email, name, companyId, role } }
 * @throws {Error} If login fails
 */
export async function login(email, password) {
  const data = await fetchAPI('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  // Backend login response includes user with companyId and role
  // The JWT token in httpOnly cookies also contains companyId and role
  // After login, refresh auth state via checkAuth() to load full company object
  return data;
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
 * Get current user (protected, multi-tenant aware)
 *
 * Returns the authenticated user's data along with their company information.
 * This endpoint uses the JWT token from httpOnly cookies for authentication.
 *
 * @returns {Promise<Object>} Response with user and company data:
 *   { user: { id, email, name, role, companyId, ... }, company: { id, name, email, ... } }
 * @throws {Error} If not authenticated or user not found
 */
export async function getCurrentUser() {
  return fetchAPI('/api/auth/me', {
    method: 'GET',
  });
}

/**
 * Register a new company with owner (multi-tenant signup)
 *
 * This endpoint creates both a company and an owner user in a single transaction.
 * The owner user is automatically linked to the company with role 'owner'.
 * After successful registration, the backend sets httpOnly cookies with JWT tokens
 * containing user ID, companyId, and role for immediate authentication.
 *
 * Payload format:
 * {
 *   company: { name, email, phone, country },
 *   user: { email, password, fullName }
 * }
 *
 * @param {Object} payload - Registration data
 * @param {Object} payload.company - Company data
 * @param {string} payload.company.name - Company name (required)
 * @param {string} payload.company.email - Company email (required)
 * @param {string} [payload.company.phone] - Company phone (optional)
 * @param {string} [payload.company.country] - Company country (optional, defaults to 'TN')
 * @param {Object} payload.user - Owner user data
 * @param {string} payload.user.email - Owner email (required)
 * @param {string} payload.user.password - Owner password (required, min 6 chars)
 * @param {string} [payload.user.fullName] - Owner full name (optional, also accepts 'name')
 * @returns {Promise<Object>} Response with company and user data: { user, company, message }
 * @throws {Error} If registration fails
 */
export async function registerCompany({ company, user }) {
  // Transform nested payload to match backend expected flat format
  // Backend expects: companyName, companyEmail, ownerEmail, etc.
  // Accept both 'fullName' and 'name' for user name field
  const backendPayload = {
    companyName: company.name,
    companyEmail: company.email,
    companyPhone: company.phone,
    companyCountry: company.country || 'TN',
    ownerEmail: user.email,
    ownerPassword: user.password,
    ownerName: user.fullName || user.name || '',
  };

  const res = await fetch(`${API_URL}/api/auth/register-company`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // IMPORTANT: send cookies for session management
    body: JSON.stringify(backendPayload),
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    const message =
      (data && data.message) || data?.error || 'Failed to register company';
    throw new Error(message);
  }

  return data; // expected: { user, company, message }
}
