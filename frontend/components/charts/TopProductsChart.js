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
 * Top Products Chart Component
 * Displays top products as a bar chart
 */
export default function TopProductsChart({
  // Newer prop name (used by older versions of this component)
  data,
  // Current usage across the app (analytics page passes `products`)
  products,
  dataKey = 'totalQty',
  height = 320,
}) {
  // Use primary color from theme
  const primaryColor = 'hsl(var(--primary))';

  const source = Array.isArray(products)
    ? products
    : Array.isArray(data)
      ? data
      : [];

  // Normalize to a stable shape for recharts (the backend returns totalQty/totalRevenue)
  const chartData = source.map(item => ({
    name: item?.name || item?.manufacturerRef || 'Unknown',
    totalQty: Number(item?.totalQty ?? item?.quantity ?? 0),
    totalRevenue: Number(item?.totalRevenue ?? item?.revenue ?? 0),
  }));

  const valueKey = dataKey === 'totalRevenue' ? 'totalRevenue' : 'totalQty';

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="name"
            stroke="hsl(var(--muted-foreground))"
            style={{
              fontSize: '12px',
            }}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            style={{
              fontSize: '12px',
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <Bar
            dataKey={valueKey}
            fill={primaryColor}
            name={valueKey === 'totalQty' ? 'Quantity' : 'Revenue'}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
