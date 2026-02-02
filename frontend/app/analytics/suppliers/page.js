'use client';

import { useEffect, useState } from 'react';

import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/useAuth';
import { fetchRecommendedSuppliersReport } from '../../../lib/reports';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import Link from 'next/link';

function SuppliersAnalyticsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadData();
    }
  }, [authLoading, isAuthenticated]);

  const loadData = async (search = '') => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRecommendedSuppliersReport({
        search: search.trim() || undefined,
      });
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to load report:', err);
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = e => {
    e.preventDefault();
    loadData(searchQuery);
  };

  const handleSearchChange = e => {
    setSearchQuery(e.target.value);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-height-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">
          Recommended Suppliers
        </h1>
        <p className="text-muted-foreground mt-1">
          Products with their recommended supplier based on last price or
          preference.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            type="text"
            placeholder="Search by reference (manufacturerRef, OEM), name, or any product field..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="flex-1"
          />
          <Button type="submit">Search</Button>
          {searchQuery && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSearchQuery('');
                loadData('');
              }}
            >
              Clear
            </Button>
          )}
        </form>
      </div>

      <div className="border border-border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-semibold text-foreground border-b border-border">
                  Product
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-foreground border-b border-border">
                  Réf. fabricant
                </th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-foreground border-b border-border">
                  Recommended Supplier
                </th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-foreground border-b border-border">
                  Last Price
                </th>
                <th className="px-4 py-2 text-right text-sm font-semibold text-foreground border-b border-border">
                  Average Price
                </th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-foreground border-b border-border">
                  # Suppliers
                </th>
                <th className="px-4 py-2 text-center text-sm font-semibold text-foreground border-b border-border">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map(row => (
                <tr key={row.productId} className="border-b border-border">
                  <td className="px-4 py-2 text-sm text-foreground">
                    {row.name || '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">
                    {row.manufacturerRef || '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-foreground">
                    {row.recommendedSupplierName || '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-right text-foreground">
                    {row.recommendedLastPrice !== null
                      ? `${row.recommendedLastPrice.toFixed(3)} TND`
                      : '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-right text-foreground">
                    {row.recommendedAveragePrice !== null
                      ? `${row.recommendedAveragePrice.toFixed(3)} TND`
                      : '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-center text-foreground">
                    {row.suppliersCount || 0}
                  </td>
                  <td className="px-4 py-2 text-sm text-center">
                    <Link
                      href={`/products/${row.productId}`}
                      className="text-primary hover:underline"
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
