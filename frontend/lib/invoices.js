/**
 * API helpers for invoice parsing
 */

const API_BASE_URL = 'http://localhost:8000';

/**
 * Parse an invoice image file
 * @param {File} file - Image file to parse
 * @returns {Promise<Object>} Parsed invoice data
 */
export async function parseInvoice(file) {
  if (!file) {
    throw new Error('No file provided');
  }

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${API_BASE_URL}/invoice/parse`, {
      method: 'POST',
      // Don't set Content-Type header - let browser set it automatically with boundary for FormData
      headers: {
        Accept: 'application/json',
      },
      // Don't include credentials for external API (causes CORS issues)
      body: formData,
    });

    // Check if response is ok
    if (!res.ok) {
      let errorMessage = `Erreur ${res.status}: ${res.statusText}`;

      // Try to get error message from response
      try {
        const errorData = await res.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch (e) {
        // If response is not JSON, try to get text
        try {
          const text = await res.text();
          if (text) errorMessage = text;
        } catch (e2) {
          // Ignore
        }
      }

      throw new Error(errorMessage);
    }

    // Parse JSON response
    const data = await res.json();
    return data;
  } catch (error) {
    // Handle network errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(
        `Impossible de se connecter au service. Vérifiez que le service est démarré à ${API_BASE_URL}`
      );
    }
    throw error;
  }
}
