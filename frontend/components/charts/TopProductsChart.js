'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

/**
 * Top Products chart component
 */
export default function TopProductsChart({ products, dataKey = 'totalQty' }) {
  if (!products || products.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--text-secondary)]">
        No data available
      </div>
    );
  }

  // Limit to top 10 for better visualization
  const chartData = products.slice(0, 10).map(product => ({
    name: product.name?.substring(0, 20) || 'Unknown',
    quantity: product.totalQty || 0,
    revenue: product.totalRevenue || 0,
  }));

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis
            type="number"
            stroke="var(--text-secondary)"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="var(--text-secondary)"
            style={{ fontSize: '12px' }}
            width={150}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Bar
            dataKey={dataKey === 'totalQty' ? 'quantity' : 'revenue'}
            fill="#3b82f6"
            name={dataKey === 'totalQty' ? 'Quantity' : 'Revenue'}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
