/**
 * API helpers for purchases
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000';

export async function fetchPurchaseOrders({
  page = 1,
  limit = 20,
  status = '',
  supplierId = '',
} = {}) {
  const params = new URLSearchParams();
  params.set('page', page);
  params.set('limit', limit);
  if (status) params.set('status', status);
  if (supplierId) params.set('supplierId', supplierId);

  const res = await fetch(
    `${API_BASE_URL}/api/purchases/orders?${params.toString()}`,
    {
      credentials: 'include',
    }
  );

  if (!res.ok) {
    throw new Error('Failed to fetch purchase orders');
  }

  return res.json(); // { purchaseOrders, pagination: { page, limit, total, pages } }
}

export async function fetchPurchaseOrder(id) {
  const res = await fetch(`${API_BASE_URL}/api/purchases/orders/${id}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch purchase order');
  }

  return res.json(); // { purchaseOrder }
}

export async function createPurchaseOrder(payload) {
  const res = await fetch(`${API_BASE_URL}/api/purchases/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.message || data.error || 'Failed to create purchase order'
    );
  }
  return data; // { purchaseOrder }
}

export async function receivePurchaseOrder(id, items) {
  const res = await fetch(
    `${API_BASE_URL}/api/purchases/orders/${id}/receive`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ items }),
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data.message || data.error || 'Failed to receive purchase order'
    );
  }
  return data; // { purchaseOrder, stockMovements }
}
