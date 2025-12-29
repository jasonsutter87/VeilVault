// ==========================================================================
// METRIC CARD COMPONENT
// KPI display card with trend indicator
// ==========================================================================

import React from 'react';
import { cn } from '../../utils.js';

export type MetricTrend = 'up' | 'down' | 'stable';
export type MetricSentiment = 'positive' | 'negative' | 'neutral';

export interface MetricCardProps {
  /** Metric label */
  label: string;
  /** Metric value */
  value: string | number;
  /** Previous value for comparison */
  previousValue?: string | number;
  /** Change from previous (e.g., "+12%", "-5") */
  change?: string;
  /** Trend direction */
  trend?: MetricTrend;
  /** Whether trend is positive or negative (up can be bad for some metrics) */
  sentiment?: MetricSentiment;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Metric description */
  description?: string;
  /** Loading state */
  loading?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class name */
  className?: string;
}

const sizeClasses = {
  sm: {
    wrapper: 'p-3',
    value: 'text-xl font-bold',
    label: 'text-xs',
    change: 'text-xs',
    icon: 'w-8 h-8',
  },
  md: {
    wrapper: 'p-4',
    value: 'text-2xl font-bold',
    label: 'text-sm',
    change: 'text-xs',
    icon: 'w-10 h-10',
  },
  lg: {
    wrapper: 'p-6',
    value: 'text-3xl font-bold',
    label: 'text-base',
    change: 'text-sm',
    icon: 'w-12 h-12',
  },
};

// Trend icons
const TrendUpIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
      clipRule="evenodd"
    />
  </svg>
);

const TrendDownIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z"
      clipRule="evenodd"
    />
  </svg>
);

const TrendStableIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z"
      clipRule="evenodd"
    />
  </svg>
);

const sentimentColors: Record<MetricSentiment, string> = {
  positive: 'text-success-600 dark:text-success-400',
  negative: 'text-error-600 dark:text-error-400',
  neutral: 'text-neutral-500 dark:text-neutral-400',
};

const sentimentBgColors: Record<MetricSentiment, string> = {
  positive: 'bg-success-50 dark:bg-success-900/20',
  negative: 'bg-error-50 dark:bg-error-900/20',
  neutral: 'bg-neutral-100 dark:bg-neutral-800',
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  previousValue,
  change,
  trend = 'stable',
  sentiment = 'neutral',
  icon,
  description,
  loading = false,
  onClick,
  size = 'md',
  className,
}) => {
  const sizeClass = sizeClasses[size];

  const TrendIcon =
    trend === 'up'
      ? TrendUpIcon
      : trend === 'down'
      ? TrendDownIcon
      : TrendStableIcon;

  if (loading) {
    return (
      <div
        className={cn(
          'rounded-lg border border-neutral-200 dark:border-neutral-700',
          'bg-white dark:bg-neutral-900',
          sizeClass.wrapper,
          className
        )}
      >
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
          <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
          <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg border border-neutral-200 dark:border-neutral-700',
        'bg-white dark:bg-neutral-900',
        'transition-all duration-fast',
        onClick && [
          'cursor-pointer',
          'hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-600',
        ],
        sizeClass.wrapper,
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Label */}
          <p
            className={cn(
              'text-neutral-500 dark:text-neutral-400 font-medium',
              sizeClass.label
            )}
          >
            {label}
          </p>

          {/* Value */}
          <p
            className={cn(
              'text-neutral-900 dark:text-neutral-100 mt-1',
              sizeClass.value
            )}
          >
            {value}
          </p>

          {/* Change indicator */}
          {(change || previousValue !== undefined) && (
            <div className={cn('flex items-center gap-1 mt-2', sizeClass.change)}>
              <span
                className={cn(
                  'flex items-center gap-0.5 px-1.5 py-0.5 rounded',
                  sentimentBgColors[sentiment],
                  sentimentColors[sentiment]
                )}
              >
                <TrendIcon className="w-3 h-3" />
                <span className="font-medium">{change}</span>
              </span>
              {previousValue !== undefined && (
                <span className="text-neutral-400 dark:text-neutral-500">
                  from {previousValue}
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {description && (
            <p
              className={cn(
                'text-neutral-400 dark:text-neutral-500 mt-2',
                sizeClass.change
              )}
            >
              {description}
            </p>
          )}
        </div>

        {/* Icon */}
        {icon && (
          <div
            className={cn(
              'flex-shrink-0 flex items-center justify-center rounded-lg',
              'bg-brand-50 dark:bg-brand-900/20',
              'text-brand-600 dark:text-brand-400',
              sizeClass.icon
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

MetricCard.displayName = 'MetricCard';

// ==========================================================================
// METRIC CARD GRID
// Layout for multiple metric cards
// ==========================================================================

export interface MetricCardGridProps {
  /** Number of columns */
  columns?: 2 | 3 | 4;
  /** Children - MetricCard components */
  children: React.ReactNode;
  /** Custom class name */
  className?: string;
}

const columnClasses = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
};

export const MetricCardGrid: React.FC<MetricCardGridProps> = ({
  columns = 4,
  children,
  className,
}) => {
  return (
    <div className={cn('grid gap-4', columnClasses[columns], className)}>
      {children}
    </div>
  );
};

MetricCardGrid.displayName = 'MetricCardGrid';
