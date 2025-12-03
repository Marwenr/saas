/**
 * API helpers for customers
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000';

export async function fetchCustomers({
  search = '',
  page = 1,
  limit = 20,
  clientType,
  classification,
  isActive,
} = {}) {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', limit);
  if (search) params.set('search', search);
  if (clientType) params.set('clientType', clientType);
  if (classification) params.set('classification', classification);
  if (isActive !== undefined) params.set('isActive', isActive);

  const res = await fetch(`${API_BASE_URL}/api/clients?${params.toString()}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch customers');
  }

  return res.json(); // { customers, pagination: { page, limit, total, pages } }
}

export async function fetchCustomer(id) {
  const res = await fetch(`${API_BASE_URL}/api/clients/${id}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch customer');
  }

  return res.json(); // { customer }
}

export async function createCustomer(payload) {
  const res = await fetch(`${API_BASE_URL}/api/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to create customer');
  }
  return data; // { customer }
}

export async function updateCustomer(id, payload) {
  const res = await fetch(`${API_BASE_URL}/api/clients/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to update customer');
  }
  return data; // { customer }
}

export async function deleteCustomer(id) {
  const res = await fetch(`${API_BASE_URL}/api/clients/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to delete customer');
  }
  return data; // { success: true, message, customer }
}

/**
 * Get customer finance information
 */
export async function fetchCustomerFinance(id) {
  const res = await fetch(`${API_BASE_URL}/api/clients/${id}/finance`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch customer finance');
  }

  return res.json(); // { finance }
}

/**
 * Get customer invoices
 */
export async function fetchCustomerInvoices(
  id,
  { page = 1, limit = 20, status } = {}
) {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', limit);
  if (status) params.set('status', status);

  const res = await fetch(
    `${API_BASE_URL}/api/clients/${id}/invoices?${params.toString()}`,
    {
      credentials: 'include',
    }
  );

  if (!res.ok) {
    throw new Error('Failed to fetch invoices');
  }

  return res.json(); // { invoices, pagination }
}

/**
 * Record a payment for a customer
 */
export async function recordCustomerPayment(id, payload) {
  const res = await fetch(`${API_BASE_URL}/api/clients/${id}/payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to record payment');
  }
  return data; // { payment, invoice }
}
