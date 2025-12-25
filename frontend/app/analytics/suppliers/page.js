'use client';

import { useEffect, useState } from 'react';
import Container from '../../../components/Container';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/useAuth';
import { fetchRecommendedSuppliersReport } from '../../../lib/reports';
import Link from 'next/link';

function SuppliersAnalyticsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadData();
    }
  }, [authLoading, isAuthenticated]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRecommendedSuppliersReport();
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to load report:', err);
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-height-screen">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <Container fullWidth>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Recommended Suppliers
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Products with their recommended supplier based on last price or
            preference.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-[var(--bg-tertiary)]">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                    Product
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                    SKU
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                    Recommended Supplier
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                    Last Price
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                    Average Price
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                    # Suppliers
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map(row => (
                  <tr
                    key={row.productId}
                    className="border-b border-[var(--border-color)]"
                  >
                    <td className="px-4 py-2 text-sm text-[var(--text-primary)]">
                      {row.name || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-[var(--text-secondary)]">
                      {row.sku || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-[var(--text-primary)]">
                      {row.recommendedSupplierName || '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-[var(--text-primary)]">
                      {row.recommendedLastPrice !== null
                        ? `${row.recommendedLastPrice.toFixed(2)} TND`
                        : '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-[var(--text-primary)]">
                      {row.recommendedAveragePrice !== null
                        ? `${row.recommendedAveragePrice.toFixed(2)} TND`
                        : '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-center text-[var(--text-primary)]">
                      {row.suppliersCount || 0}
                    </td>
                    <td className="px-4 py-2 text-sm text-center">
                      <Link
                        href={`/products/${row.productId}`}
                        className="text-primary-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Container>
    </div>
  );
}

export default function SuppliersAnalytics() {
  return (
    <AuthGuard>
      <SuppliersAnalyticsPage />
    </AuthGuard>
  );
}
