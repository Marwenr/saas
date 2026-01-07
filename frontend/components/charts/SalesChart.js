'use client';

import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
 * Sales Chart Component
 * Displays sales data as a line or area chart
 */
export default function SalesChart({ data, type = 'line', dataKey = 'value' }) {
  const ChartComponent = type === 'area' ? AreaChart : LineChart;
  const DataComponent = type === 'area' ? Area : Line;

  // Use primary color from theme
  const primaryColor = 'hsl(var(--primary))';

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent
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
          <DataComponent
            type="monotone"
            dataKey="value"
            stroke={primaryColor}
            fill={primaryColor}
            name="Sales"
          />
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}
