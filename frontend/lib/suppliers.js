/**
 * API helpers for suppliers
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000';

export async function fetchSuppliers({
  search = '',
  page = 1,
  limit = 20,
} = {}) {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', limit);
  if (search) params.set('search', search);

  const res = await fetch(
    `${API_BASE_URL}/api/suppliers?${params.toString()}`,
    {
      credentials: 'include',
    }
  );

  if (!res.ok) {
    throw new Error('Failed to fetch suppliers');
  }

  return res.json(); // { suppliers, pagination: { page, limit, total, pages } }
}

export async function createSupplier(payload) {
  const res = await fetch(`${API_BASE_URL}/api/suppliers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to create supplier');
  }
  return data; // { supplier }
}

export async function updateSupplier(id, payload) {
  const res = await fetch(`${API_BASE_URL}/api/suppliers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to update supplier');
  }
  return data; // { supplier }
}

export async function deleteSupplier(id) {
  const res = await fetch(`${API_BASE_URL}/api/suppliers/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to delete supplier');
  }
  return data; // { success: true, message, supplier }
}
