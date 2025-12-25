'use client';

import { useEffect, useState } from 'react';
import Container from '../../../components/Container';
import AuthGuard from '../../../components/AuthGuard';
import { useAuth } from '../../../lib/useAuth';
import { fetchSalesProductsReport } from '../../../lib/reports';

function SalesAnalyticsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Filters
  const [period, setPeriod] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sortBy, setSortBy] = useState('qty');
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadData();
    }
  }, [authLoading, isAuthenticated, period, from, to, sortBy, limit]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        period,
        sortBy,
        limit,
      };

      if (period === 'range') {
        if (!from || !to) {
          setError('Please select both start and end dates for custom range');
          setLoading(false);
          return;
        }
        params.from = from;
        params.to = to;
      }

      const result = await fetchSalesProductsReport(params);
      setData(result);
    } catch (err) {
      console.error('Failed to load report:', err);
      setError(err.message || 'Failed to load sales analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = value => {
    return `${(value || 0).toFixed(2)} TND`;
  };

  const formatNumber = value => {
    return (value || 0).toLocaleString();
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <Container fullWidth>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Sales Analytics
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Best-selling and most profitable products analysis
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Period
              </label>
              <select
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="day">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="range">Custom Range</option>
              </select>
            </div>

            {period === 'range' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={from}
                    onChange={e => setFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={to}
                    onChange={e => setTo(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="qty">Quantity Sold</option>
                <option value="revenue">Revenue</option>
                <option value="margin">Profit Margin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Limit
              </label>
              <input
                type="number"
                value={limit}
                onChange={e =>
                  setLimit(Math.min(parseInt(e.target.value) || 50, 200))
                }
                min="1"
                max="200"
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {data?.totals && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
              <div className="text-sm text-[var(--text-secondary)] mb-1">
                Total Quantity
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {formatNumber(data.totals.totalQty)}
              </div>
            </div>
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
              <div className="text-sm text-[var(--text-secondary)] mb-1">
                Total Revenue
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {formatCurrency(data.totals.totalRevenueExcl)}
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                (incl. tax: {formatCurrency(data.totals.totalRevenueIncl)})
              </div>
            </div>
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
              <div className="text-sm text-[var(--text-secondary)] mb-1">
                Total Cost
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {formatCurrency(data.totals.totalCost)}
              </div>
            </div>
            <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
              <div className="text-sm text-[var(--text-secondary)] mb-1">
                Total Margin
              </div>
              <div className="text-2xl font-bold text-[var(--text-primary)]">
                {formatCurrency(data.totals.totalMarginExcl)}
              </div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                ({data.totals.totalMarginRate.toFixed(1)}% margin rate)
              </div>
            </div>
          </div>
        )}

        {/* Products Table */}
        {data?.products && (
          <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-[var(--bg-tertiary)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                      Product
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                      Revenue (Excl. Tax)
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                      Revenue (Incl. Tax)
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                      Cost
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                      Margin
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                      Margin %
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                      Avg Purchase Price
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                      Margin vs Avg
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)] border-b border-[var(--border-color)]">
                      Margin % vs Avg
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.length === 0 ? (
                    <tr>
                      <td
                        colSpan="11"
                        className="px-4 py-8 text-center text-[var(--text-secondary)]"
                      >
                        No sales data found for the selected period
                      </td>
                    </tr>
                  ) : (
                    data.products.map(product => (
                      <tr
                        key={product.productId}
                        className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]"
                      >
                        <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                          {product.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                          {product.sku || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)] font-medium">
                          {formatNumber(product.totalQty)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)]">
                          {formatCurrency(product.totalRevenueExcl)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-[var(--text-primary)]">
                          {formatCurrency(product.totalRevenueIncl)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-[var(--text-secondary)]">
                          {formatCurrency(product.totalCost)}
                        </td>
                        <td
                          className={`px-4 py-3 text-sm text-right font-medium ${
                            product.marginExcl >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatCurrency(product.marginExcl)}
                        </td>
                        <td
                          className={`px-4 py-3 text-sm text-right font-medium ${
                            product.marginRate >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {product.marginRate.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-[var(--text-secondary)]">
                          {formatCurrency(product.periodAvgPurchasePrice || 0)}
                          {product.periodAvgSource && (
                            <span className="text-xs ml-1 text-[var(--text-secondary)]">
                              (
                              {product.periodAvgSource === 'period+last'
                                ? 'period+last'
                                : product.periodAvgSource === 'period'
                                  ? 'period'
                                  : product.periodAvgSource === 'last'
                                    ? 'last'
                                    : 'fallback'}
                              )
                            </span>
                          )}
                        </td>
                        <td
                          className={`px-4 py-3 text-sm text-right font-medium ${
                            (product.periodMargin || 0) >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {formatCurrency(product.periodMargin || 0)}
                        </td>
                        <td
                          className={`px-4 py-3 text-sm text-right font-medium ${
                            (product.periodMarginRate || 0) >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {(product.periodMarginRate || 0).toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Date Range Info */}
        {data?.dateRange && (
          <div className="mt-4 text-sm text-[var(--text-secondary)]">
            Period: {new Date(data.dateRange.from).toLocaleDateString()} -{' '}
            {new Date(data.dateRange.to).toLocaleDateString()}
          </div>
        )}
      </Container>
    </div>
  );
}

export default function SalesAnalytics() {
  return (
    <AuthGuard>
      <SalesAnalyticsPage />
    </AuthGuard>
  );
}
