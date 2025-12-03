'use client';

/**
 * Modern KPI Card component with comparison to previous period
 * Features: icon, value, bar chart, percentage change, mini line graph
 */
export default function KPICard({
  title,
  currentValue,
  previousValue,
  formatter = val => val,
  icon,
  period = 'This period',
}) {
  // Calculate percentage change
  const change =
    previousValue !== null && previousValue !== undefined && previousValue !== 0
      ? ((currentValue - previousValue) / previousValue) * 100
      : previousValue === 0 && currentValue > 0
        ? 100
        : previousValue === 0 && currentValue === 0
          ? 0
          : null;

  const isPositive = change !== null && change >= 0;
  const hasChange = change !== null;

  const changeColor = isPositive
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400';

  // Generate mini trend data for line graph (more realistic)
  const generateTrendData = () => {
    const points = 8;
    const data = [];
    const baseValue = previousValue || currentValue * 0.6;
    const targetValue = currentValue;
    const max = Math.max(baseValue, targetValue);
    const min = Math.min(baseValue, targetValue * 0.5);
    const range = max - min || 1;

    // Create a more realistic trend with some variation
    for (let i = 0; i < points; i++) {
      const progress = i / (points - 1);
      // Add some variation to make it look more realistic
      const variation = (Math.sin(progress * Math.PI * 2) * 0.1 + 1) * 0.5;
      const value =
        baseValue + (targetValue - baseValue) * progress * variation;
      const normalized = ((value - min) / range) * 100;
      data.push(Math.max(5, Math.min(95, normalized)));
    }
    return data;
  };

  const trendData = generateTrendData();
  const maxTrend = Math.max(...trendData);
  const minTrend = Math.min(...trendData);
  const trendRange = maxTrend - minTrend || 1;

  // Generate SVG path for line graph
  const generatePath = () => {
    const width = 80;
    const height = 32;
    const stepX = width / (trendData.length - 1);
    const points = trendData.map((value, index) => {
      const x = index * stepX;
      const normalizedHeight =
        ((value - minTrend) / trendRange) * height || height * 0.3;
      const y = height - normalizedHeight;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  // Calculate bar chart percentage (normalized to 0-100)
  const maxValue = Math.max(currentValue, previousValue || currentValue);
  const barPercentage = maxValue > 0 ? (currentValue / maxValue) * 100 : 0;

  return (
    <div className="p-6 bg-white dark:bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-sm hover:shadow-lg transition-all duration-200 group">
      {/* Header with icon and title */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <span className="text-2xl">{icon}</span>
            </div>
          )}
          <div className="pt-1">
            <div className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              {title}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
            <svg
              className="w-4 h-4 text-[var(--text-secondary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>
          <button className="p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
            <svg
              className="w-4 h-4 text-[var(--text-secondary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Main value */}
      <div className="text-4xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">
        {formatter(currentValue)}
      </div>

      {/* Bar chart visualization */}
      <div className="mb-4">
        <div className="h-2.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isPositive
                ? 'bg-gradient-to-r from-green-400 to-green-600 dark:from-green-500 dark:to-green-700'
                : 'bg-gradient-to-r from-red-400 to-red-600 dark:from-red-500 dark:to-red-700'
            }`}
            style={{ width: `${Math.min(barPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Percentage change and period */}
      <div className="flex items-center justify-between">
        {hasChange ? (
          <div className={`flex items-center gap-2 ${changeColor}`}>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-md ${
                isPositive
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : 'bg-red-50 dark:bg-red-900/20'
              }`}
            >
              {isPositive ? (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 15l7-7 7 7"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              )}
              <span className="text-sm font-bold">
                {Math.abs(change).toFixed(1)}%
              </span>
            </div>
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {period}
            </span>
          </div>
        ) : (
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {period}
          </span>
        )}

        {/* Mini line graph - SVG version */}
        <div className="w-24 h-10 flex items-center justify-end">
          <svg width="80" height="32" className="overflow-visible">
            <defs>
              <linearGradient
                id={`gradient-${title.replace(/\s+/g, '-')}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor={isPositive ? '#22c55e' : '#ef4444'}
                  stopOpacity="0.3"
                />
                <stop
                  offset="100%"
                  stopColor={isPositive ? '#22c55e' : '#ef4444'}
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>
            <path
              d={`${generatePath()} L 80,32 L 0,32 Z`}
              fill={`url(#gradient-${title.replace(/\s+/g, '-')})`}
            />
            <path
              d={generatePath()}
              fill="none"
              stroke={isPositive ? '#22c55e' : '#ef4444'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
