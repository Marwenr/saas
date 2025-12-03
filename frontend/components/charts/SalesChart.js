'use client';

import {
  LineChart,
  Line,
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
 * Sales comparison chart component
 */
export default function SalesChart({
  currentData,
  previousData,
  type = 'line',
}) {
  // Prepare data for chart (assuming we have daily/weekly/monthly breakdown)
  // For now, we'll show a simple comparison bar chart
  const chartData = [
    {
      name: 'Current',
      value: currentData || 0,
    },
    {
      name: 'Previous',
      value: previousData || 0,
    },
  ];

  const ChartComponent = type === 'bar' ? BarChart : LineChart;
  const DataComponent = type === 'bar' ? Bar : Line;

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis
            dataKey="name"
            stroke="var(--text-secondary)"
            style={{ fontSize: '12px' }}
          />
          <YAxis stroke="var(--text-secondary)" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
            }}
          />
          <Legend />
          <DataComponent
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            fill="#3b82f6"
            name="Sales"
          />
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}
