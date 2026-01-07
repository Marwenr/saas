'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { TrendingUp, TrendingDown, Eye, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';

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

  // Generate mini trend data for line graph
  const generateTrendData = () => {
    const points = 8;
    const data = [];
    const baseValue = previousValue || currentValue * 0.6;
    const targetValue = currentValue;
    const max = Math.max(baseValue, targetValue);
    const min = Math.min(baseValue, targetValue * 0.5);
    const range = max - min || 1;

    for (let i = 0; i < points; i++) {
      const progress = i / (points - 1);
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

  // Calculate bar chart percentage
  const maxValue = Math.max(currentValue, previousValue || currentValue);
  const barPercentage = maxValue > 0 ? (currentValue / maxValue) * 100 : 0;

  // Use semantic colors for success/error
  const successColor = 'hsl(142 76% 36%)'; // #16A34A
  const errorColor = 'hsl(var(--destructive))'; // #DC2626

  return (
    <Card className="group hover:shadow-lg transition-all duration-200">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <div className="text-primary">
                  {typeof icon === 'string' ? (
                    <span className="text-2xl">{icon}</span>
                  ) : (
                    icon
                  )}
                </div>
              </div>
            )}
            <div>
              <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {title}
              </CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Main value */}
        <div className="text-4xl font-bold mb-4 tracking-tight text-foreground">
          {formatter(currentValue)}
        </div>

        {/* Bar chart visualization */}
        <div className="mb-4">
          <div className="h-2.5 bg-muted rounded-full overflow-hidden shadow-inner">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isPositive ? 'bg-success' : 'bg-destructive'
              )}
              style={{ width: `${Math.min(barPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Percentage change and period */}
        <div className="flex items-center justify-between">
          {hasChange ? (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'gap-1',
                  isPositive
                    ? 'bg-success/10 text-success border-success/20'
                    : 'bg-destructive/10 text-destructive border-destructive/20'
                )}
              >
                {isPositive ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                <span className="text-sm font-bold">
                  {Math.abs(change).toFixed(1)}%
                </span>
              </Badge>
              <span className="text-xs font-medium text-muted-foreground">
                {period}
              </span>
            </div>
          ) : (
            <span className="text-xs font-medium text-muted-foreground">
              {period}
            </span>
          )}

          {/* Mini line graph */}
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
                    stopColor={isPositive ? successColor : errorColor}
                    stopOpacity="0.3"
                  />
                  <stop
                    offset="100%"
                    stopColor={isPositive ? successColor : errorColor}
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
                stroke={isPositive ? successColor : errorColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
