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
export default function TopProductsChart({ data, dataKey = 'totalQty' }) {
  // Use primary color from theme
  const primaryColor = 'hsl(var(--primary))';

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
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
            dataKey={dataKey === 'totalQty' ? 'quantity' : 'revenue'}
            fill={primaryColor}
            name={dataKey === 'totalQty' ? 'Quantity' : 'Revenue'}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
