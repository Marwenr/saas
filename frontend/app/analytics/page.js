'use client';

import { useEffect, useState } from 'react';
import Container from '../../components/Container';
import AuthGuard from '../../components/AuthGuard';
import { useAuth } from '../../lib/useAuth';
import { fetchSalesSummary, fetchTopProducts } from '../../lib/reports';
import {
  getDateRange,
  getPreviousPeriodRange,
  formatDateString,
  formatDateDisplay,
} from '../../lib/dateUtils';
import KPICard from '../../components/charts/KPICard';
import SalesChart from '../../components/charts/SalesChart';
import TopProductsChart from '../../components/charts/TopProductsChart';

function AnalyticsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Period selection
  const [period, setPeriod] = useState('month');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  // Data
  const [currentSummary, setCurrentSummary] = useState(null);
  const [previousSummary, setPreviousSummary] = useState(null);
  const [currentTopProducts, setCurrentTopProducts] = useState(null);
  const [previousTopProducts, setPreviousTopProducts] = useState(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadData();
    }
  }, [authLoading, isAuthenticated, period, from, to]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date ranges
      let currentRange, previousRange;

      if (period === 'range') {
        if (!from || !to) {
          setError('Please select both start and end dates for custom range');
          setLoading(false);
          return;
        }
        currentRange = getDateRange('range', from, to);
        previousRange = getPreviousPeriodRange('range', from, to);
      } else {
        currentRange = getDateRange(period);
        previousRange = getPreviousPeriodRange(period);
      }

      const currentFrom = formatDateString(currentRange.startDate);
      const currentTo = formatDateString(currentRange.endDate);
      const previousFrom = formatDateString(previousRange.startDate);
      const previousTo = formatDateString(previousRange.endDate);

      // Load current period data (backend now includes previousPeriod in response)
      const currentSummaryData = await fetchSalesSummary(
        currentFrom,
        currentTo
      );

      // Extract previous period data from the response if available
      const previousSummaryData = currentSummaryData.previousPeriod?.summary
        ? { summary: currentSummaryData.previousPeriod.summary }
        : await fetchSalesSummary(previousFrom, previousTo);

      // Load top products for both periods
      const [currentTopProductsData, previousTopProductsData] =
        await Promise.all([
          fetchTopProducts(currentFrom, currentTo, 10),
          fetchTopProducts(previousFrom, previousTo, 10),
        ]);

      setCurrentSummary(currentSummaryData);
      setPreviousSummary(previousSummaryData);
      setCurrentTopProducts(currentTopProductsData);
      setPreviousTopProducts(previousTopProductsData);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
      setError(err.message || 'Failed to load analytics data');
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

  const currentPeriodLabel =
    period === 'range' && from && to
      ? `${formatDateDisplay(new Date(from))} - ${formatDateDisplay(new Date(to))}`
      : period === 'day'
        ? 'Today'
        : period === 'week'
          ? 'This Week'
          : period === 'month'
            ? 'This Month'
            : period === 'year'
              ? 'This Year'
              : 'Current Period';

  const previousPeriodLabel =
    period === 'range' && from && to
      ? 'Previous Period'
      : period === 'day'
        ? 'Yesterday'
        : period === 'week'
          ? 'Last Week'
          : period === 'month'
            ? 'Last Month'
            : period === 'year'
              ? 'Last Year'
              : 'Previous Period';

  return (
    <div className="py-8">
      <Container>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[var(--text-primary)]">
            Analytics
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Sales analytics with period comparison
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 dark:bg-red-900/20 border border-red-400 dark:border-red-700 rounded-lg text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Period Filter */}
        <div className="mb-6 p-4 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Period
              </label>
              <select
                value={period}
                onChange={e => {
                  setPeriod(e.target.value);
                  if (e.target.value !== 'range') {
                    setFrom('');
                    setTo('');
                  }
                }}
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
          </div>

          {/* Period Labels */}
          {(currentSummary || previousSummary) && (
            <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-[var(--text-secondary)]">
                    Current:{' '}
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {currentPeriodLabel}
                  </span>
                </div>
                <div>
                  <span className="text-[var(--text-secondary)]">
                    Previous:{' '}
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {previousPeriodLabel}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KPI Cards */}
        {currentSummary?.summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <KPICard
              title="Total Sales (TND)"
              currentValue={currentSummary.summary.totalRevenueIncl || 0}
              previousValue={
                currentSummary.previousPeriod?.summary?.totalRevenueIncl ||
                currentSummary.previousSummary?.totalRevenueIncl ||
                previousSummary?.summary?.totalRevenueIncl ||
                null
              }
              formatter={formatCurrency}
              icon="💰"
            />
            <KPICard
              title="Number of Sales"
              currentValue={
                currentSummary.summary.totalOrders ||
                currentSummary.summary.totalSales ||
                0
              }
              previousValue={
                currentSummary.previousPeriod?.summary?.totalOrders ||
                currentSummary.previousPeriod?.summary?.totalSales ||
                currentSummary.previousSummary?.totalOrders ||
                currentSummary.previousSummary?.totalSales ||
                previousSummary?.summary?.totalOrders ||
                previousSummary?.summary?.totalSales ||
                null
              }
              formatter={formatNumber}
              icon="📊"
            />
            <KPICard
              title="Total Quantity Sold"
              currentValue={
                currentSummary.summary.totalQty ||
                currentSummary.summary.totalItems ||
                0
              }
              previousValue={
                currentSummary.previousPeriod?.summary?.totalQty ||
                currentSummary.previousPeriod?.summary?.totalItems ||
                currentSummary.previousSummary?.totalQty ||
                currentSummary.previousSummary?.totalItems ||
                previousSummary?.summary?.totalQty ||
                previousSummary?.summary?.totalItems ||
                null
              }
              formatter={formatNumber}
              icon="📦"
            />
          </div>
        )}

        {/* Sales Comparison Chart */}
        {currentSummary?.summary && previousSummary?.summary && (
          <div className="mb-6 p-6 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Sales Comparison
            </h2>
            <SalesChart
              currentData={currentSummary.summary.totalRevenueIncl}
              previousData={previousSummary.summary.totalRevenueIncl}
              type="bar"
            />
          </div>
        )}

        {/* Top Products Chart */}
        {currentTopProducts?.products && (
          <div className="mb-6 p-6 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              🏆 Top Products (Current Period)
            </h2>
            <TopProductsChart
              products={currentTopProducts.products}
              dataKey="totalQty"
            />
          </div>
        )}

        {/* Top Products Comparison */}
        {currentTopProducts?.products && previousTopProducts?.products && (
          <div className="mb-6 p-6 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
              Top Products Comparison
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                  {currentPeriodLabel}
                </h3>
                <TopProductsChart
                  products={currentTopProducts.products}
                  dataKey="totalQty"
                />
              </div>
              <div>
                <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
                  {previousPeriodLabel}
                </h3>
                <TopProductsChart
                  products={previousTopProducts.products}
                  dataKey="totalQty"
                />
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}

export default function Analytics() {
  return (
    <AuthGuard>
      <AnalyticsPage />
    </AuthGuard>
  );
}
