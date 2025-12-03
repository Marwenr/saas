/**
 * API helpers for AI reference search
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
 * Search for equivalent references using AI
 * @param {string} reference - The reference to search for
 * @returns {Promise<Object>} Response with equivalents: { success: true, data: { requested_ref, equivalents: {...} }, chatId }
 */
export async function searchReference(reference) {
  return fetchAPI('/api/ai/search-reference', {
    method: 'POST',
    body: JSON.stringify({ reference }),
  });
}

/**
 * Get chat history
 * @param {Object} params - Query parameters
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 20)
 * @returns {Promise<Object>} Response with chats and pagination: { chats: [], pagination: { page, limit, total, pages } }
 */
export async function getChatHistory({ page = 1, limit = 20 } = {}) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return fetchAPI(`/api/ai/history?${params.toString()}`);
}

/**
 * Get a specific chat record
 * @param {string} id - Chat record ID
 * @returns {Promise<Object>} Response with chat: { chat: {...} }
 */
export async function getChat(id) {
  return fetchAPI(`/api/ai/chat/${id}`);
}
