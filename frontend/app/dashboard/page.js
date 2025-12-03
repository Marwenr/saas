'use client';

import { useEffect, useState } from 'react';
import Container from '../../components/Container';
import AuthGuard from '../../components/AuthGuard';
import Button from '../../components/Button';
import { useAuth } from '../../lib/useAuth';
import {
  fetchSalesSummaryReport,
  fetchStockAlertsReport,
  fetchTopProductsReport,
} from '../../lib/reports';
import KPICard from '../../components/charts/KPICard';

function DashboardPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Summary data
  const [salesSummary, setSalesSummary] = useState(null);
  const [stockAlerts, setStockAlerts] = useState(null);
  const [topProducts, setTopProducts] = useState(null);

  // Filters
  const [period, setPeriod] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [topProductsLimit, setTopProductsLimit] = useState(10);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadData();
    }
  }, [authLoading, isAuthenticated, period, from, to, topProductsLimit]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        period,
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

      // Load all data in parallel
      const [summaryData, alertsData, topProductsData] = await Promise.all([
        fetchSalesSummaryReport(params),
        fetchStockAlertsReport({ limit: 50 }),
        fetchTopProductsReport({
          ...params,
          limit: topProductsLimit,
          sortBy: 'qty',
        }),
      ]);

      setSalesSummary(summaryData);
      setStockAlerts(alertsData);
      setTopProducts(topProductsData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
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

  const getPeriodLabel = () => {
    switch (period) {
      case 'day':
        return 'Today';
      case 'week':
        return 'This week';
      case 'month':
        return 'This month';
      case 'year':
        return 'This year';
      case 'range':
        return 'Custom range';
      default:
        return 'This period';
    }
  };

  return (
    <div className="py-8 min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 dark:from-[var(--bg-primary)] dark:via-[var(--bg-primary)] dark:to-[var(--bg-primary)]">
      <Container>
        {/* Modern Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-2 tracking-tight">
                Dashboard
              </h1>
              <p className="text-base text-[var(--text-secondary)]">
                Overview of your sales, stock alerts, and top products
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="tertiary"
                size="md"
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                }
              >
                Customize widget
              </Button>
              <Button
                variant="tertiary"
                size="md"
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    />
                  </svg>
                }
              >
                Filter
              </Button>
              <Button
                variant="tertiary"
                size="md"
                icon={
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                }
              >
                Share
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Period Filter - Modern Collapsible */}
        <div className="mb-8 p-6 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Period
              </label>
              <select
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
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
                    className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
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
                    className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Top Products Limit
              </label>
              <input
                type="number"
                value={topProductsLimit}
                onChange={e =>
                  setTopProductsLimit(
                    Math.min(parseInt(e.target.value) || 10, 100)
                  )
                }
                min="1"
                max="100"
                className="w-full px-3 py-2.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Summary Cards - Modern Design */}
        {salesSummary?.summary && (
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                  Sales Overview
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  Key performance indicators for your business
                </p>
              </div>
              <Button variant="primary" size="md">
                + Add New
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <KPICard
                title="Total Sales (TND)"
                currentValue={salesSummary.summary.totalRevenueIncl || 0}
                previousValue={
                  salesSummary.previousSummary?.totalRevenueIncl ||
                  salesSummary.previousPeriod?.summary?.totalRevenueIncl ||
                  null
                }
                formatter={formatCurrency}
                icon="💰"
                period={getPeriodLabel()}
              />
              <KPICard
                title="Number of Sales"
                currentValue={
                  salesSummary.summary.totalOrders ||
                  salesSummary.summary.totalSales ||
                  0
                }
                previousValue={
                  salesSummary.previousSummary?.totalOrders ||
                  salesSummary.previousSummary?.totalSales ||
                  salesSummary.previousPeriod?.summary?.totalOrders ||
                  salesSummary.previousPeriod?.summary?.totalSales ||
                  null
                }
                formatter={formatNumber}
                icon="📊"
                period={getPeriodLabel()}
              />
              <KPICard
                title="Total Quantity Sold"
                currentValue={
                  salesSummary.summary.totalQty ||
                  salesSummary.summary.totalItems ||
                  0
                }
                previousValue={
                  salesSummary.previousSummary?.totalQty ||
                  salesSummary.previousSummary?.totalItems ||
                  salesSummary.previousPeriod?.summary?.totalQty ||
                  salesSummary.previousPeriod?.summary?.totalItems ||
                  null
                }
                formatter={formatNumber}
                icon="📦"
                period={getPeriodLabel()}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Stock Alerts - Modern Design */}
          <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md">
            <div className="p-6 border-b border-[var(--border-color)] bg-gradient-to-r from-red-50/50 to-transparent dark:from-red-900/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3 mb-2">
                    <span className="text-3xl">⚠️</span>
                    <span>Stock Alerts</span>
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Products below minimum stock threshold
                    {stockAlerts?.totalAlerts !== undefined && (
                      <span className="ml-2 font-semibold text-purple-600 dark:text-purple-400">
                        ({stockAlerts.totalAlerts}{' '}
                        {stockAlerts.totalAlerts === 1 ? 'alert' : 'alerts'})
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {stockAlerts?.items && stockAlerts.items.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {stockAlerts.items.map(item => {
                    const progress =
                      item.minStockQty > 0
                        ? Math.min(
                            (item.stockQty / item.minStockQty) * 100,
                            100
                          )
                        : 0;
                    const isCritical = item.difference < 0;

                    return (
                      <div
                        key={item.productId}
                        className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)] hover:shadow-sm transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="font-medium text-[var(--text-primary)]">
                              {item.name}
                            </div>
                            <div className="text-sm text-[var(--text-secondary)] mt-1">
                              SKU: {item.sku}
                              {item.brand && ` • ${item.brand}`}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div
                              className={`text-xl font-bold ${
                                isCritical
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-orange-600 dark:text-orange-400'
                              }`}
                            >
                              {item.stockQty}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              / {item.minStockQty} min
                            </div>
                          </div>
                        </div>
                        <div className="mb-2">
                          <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isCritical
                                  ? 'bg-red-500 dark:bg-red-600'
                                  : 'bg-orange-500 dark:bg-orange-600'
                              }`}
                              style={{ width: `${Math.max(progress, 5)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-xs text-[var(--text-secondary)]">
                          Difference: {item.difference > 0 ? '+' : ''}
                          {item.difference} units
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-[var(--text-secondary)]">
                  <div className="text-4xl mb-2">✅</div>
                  <div>No stock alerts. All products are well stocked!</div>
                </div>
              )}
            </div>
          </div>

          {/* Top Products - Modern Design */}
          <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-md">
            <div className="p-6 border-b border-[var(--border-color)] bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3 mb-2">
                    <span className="text-3xl">🏆</span>
                    <span>Top Products</span>
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Best-selling products by quantity
                    {topProducts?.dateRange && (
                      <span className="ml-2">
                        (
                        {new Date(
                          topProducts.dateRange.from
                        ).toLocaleDateString()}{' '}
                        -{' '}
                        {new Date(
                          topProducts.dateRange.to
                        ).toLocaleDateString()}
                        )
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {topProducts?.products && topProducts.products.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {topProducts.products.map((product, index) => {
                    const maxQty = Math.max(
                      ...topProducts.products.map(p => p.totalQty)
                    );
                    const progress =
                      maxQty > 0 ? (product.totalQty / maxQty) * 100 : 0;

                    return (
                      <div
                        key={product.productId}
                        className="p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)] hover:shadow-sm transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-sm font-bold text-purple-700 dark:text-purple-300">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-[var(--text-primary)] truncate">
                                {product.name}
                              </div>
                              <div className="text-sm text-[var(--text-secondary)] mt-1">
                                SKU: {product.sku}
                                {product.brand && ` • ${product.brand}`}
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-xl font-bold text-[var(--text-primary)]">
                              {formatNumber(product.totalQty)}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              units sold
                            </div>
                            <div className="text-sm font-medium text-green-600 dark:text-green-400 mt-1">
                              {formatCurrency(product.totalRevenue)}
                            </div>
                          </div>
                        </div>
                        <div className="h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-purple-500 dark:bg-purple-600 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-[var(--text-secondary)]">
                  <div className="text-4xl mb-2">📊</div>
                  <div>No sales data found for the selected period</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Date Range Info */}
        {salesSummary?.dateRange && (
          <div className="mt-6 text-sm text-[var(--text-secondary)] text-center">
            Period: {new Date(salesSummary.dateRange.from).toLocaleDateString()}{' '}
            - {new Date(salesSummary.dateRange.to).toLocaleDateString()}
          </div>
        )}
      </Container>
    </div>
  );
}

export default function Dashboard() {
  return (
    <AuthGuard>
      <DashboardPage />
    </AuthGuard>
  );
}
