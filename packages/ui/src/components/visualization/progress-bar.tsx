// ==========================================================================
// PROGRESS BAR COMPONENT
// Linear progress indicator
// ==========================================================================

import React from 'react';
import { cn } from '../../utils.js';

export type ProgressSize = 'sm' | 'md' | 'lg';
export type ProgressVariant = 'default' | 'success' | 'warning' | 'error' | 'brand';

export interface ProgressBarProps {
  /** Progress value (0-100) */
  value: number;
  /** Maximum value */
  max?: number;
  /** Visual variant/color */
  variant?: ProgressVariant;
  /** Size */
  size?: ProgressSize;
  /** Show percentage label */
  showLabel?: boolean;
  /** Label position */
  labelPosition?: 'right' | 'inside' | 'top';
  /** Custom label */
  label?: string;
  /** Animated/striped background */
  animated?: boolean;
  /** Indeterminate state */
  indeterminate?: boolean;
  /** Custom class name */
  className?: string;
}

const sizeClasses: Record<ProgressSize, { track: string; label: string }> = {
  sm: {
    track: 'h-1',
    label: 'text-xs',
  },
  md: {
    track: 'h-2',
    label: 'text-sm',
  },
  lg: {
    track: 'h-3',
    label: 'text-sm',
  },
};

const variantClasses: Record<ProgressVariant, string> = {
  default: 'bg-neutral-500 dark:bg-neutral-400',
  brand: 'bg-brand-500 dark:bg-brand-400',
  success: 'bg-success-500 dark:bg-success-400',
  warning: 'bg-warning-500 dark:bg-warning-400',
  error: 'bg-error-500 dark:bg-error-400',
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  variant = 'brand',
  size = 'md',
  showLabel = false,
  labelPosition = 'right',
  label,
  animated = false,
  indeterminate = false,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const sizeClass = sizeClasses[size];

  const displayLabel = label ?? `${Math.round(percentage)}%`;

  return (
    <div
      className={cn(
        'w-full',
        labelPosition === 'top' && 'space-y-1',
        className
      )}
    >
      {/* Top label */}
      {showLabel && labelPosition === 'top' && (
        <div className="flex justify-between items-center">
          <span className={cn('text-neutral-700 dark:text-neutral-300', sizeClass.label)}>
            Progress
          </span>
          <span className={cn('text-neutral-500 dark:text-neutral-400', sizeClass.label)}>
            {displayLabel}
          </span>
        </div>
      )}

      <div className={cn('flex items-center gap-3', labelPosition === 'inside' && 'relative')}>
        {/* Track */}
        <div
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={displayLabel}
          className={cn(
            'flex-1 overflow-hidden rounded-full',
            'bg-neutral-200 dark:bg-neutral-700',
            sizeClass.track
          )}
        >
          {/* Fill */}
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              variantClasses[variant],
              animated && [
                'bg-gradient-to-r',
                'from-transparent via-white/20 to-transparent',
                'bg-[length:200%_100%]',
                'animate-shimmer',
              ],
              indeterminate && [
                'w-1/3',
                'animate-[indeterminate_1.5s_ease-in-out_infinite]',
              ]
            )}
            style={indeterminate ? undefined : { width: `${percentage}%` }}
          />
        </div>

        {/* Right label */}
        {showLabel && labelPosition === 'right' && (
          <span
            className={cn(
              'flex-shrink-0 min-w-[3rem] text-right',
              'text-neutral-500 dark:text-neutral-400',
              sizeClass.label
            )}
          >
            {displayLabel}
          </span>
        )}

        {/* Inside label (for lg size) */}
        {showLabel && labelPosition === 'inside' && size === 'lg' && percentage > 10 && (
          <span
            className={cn(
              'absolute left-2 text-xs font-medium text-white',
              'mix-blend-difference'
            )}
            style={{ left: `${Math.min(percentage - 2, 95)}%` }}
          >
            {displayLabel}
          </span>
        )}
      </div>

      {/* Keyframes for indeterminate animation */}
      <style>{`
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
};

ProgressBar.displayName = 'ProgressBar';

// ==========================================================================
// PROGRESS CIRCLE
// Circular progress indicator
// ==========================================================================

export interface ProgressCircleProps {
  /** Progress value (0-100) */
  value: number;
  /** Maximum value */
  max?: number;
  /** Size in pixels */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Visual variant/color */
  variant?: ProgressVariant;
  /** Show percentage in center */
  showLabel?: boolean;
  /** Custom label */
  label?: string;
  /** Custom class name */
  className?: string;
}

const circleVariantClasses: Record<ProgressVariant, string> = {
  default: 'stroke-neutral-500 dark:stroke-neutral-400',
  brand: 'stroke-brand-500 dark:stroke-brand-400',
  success: 'stroke-success-500 dark:stroke-success-400',
  warning: 'stroke-warning-500 dark:stroke-warning-400',
  error: 'stroke-error-500 dark:stroke-error-400',
};

export const ProgressCircle: React.FC<ProgressCircleProps> = ({
  value,
  max = 100,
  size = 64,
  strokeWidth = 4,
  variant = 'brand',
  showLabel = true,
  label,
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const displayLabel = label ?? `${Math.round(percentage)}%`;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-neutral-200 dark:stroke-neutral-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(circleVariantClasses[variant], 'transition-all duration-300')}
        />
      </svg>

      {/* Label */}
      {showLabel && (
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'text-neutral-700 dark:text-neutral-300 font-medium',
            size <= 48 ? 'text-xs' : size <= 80 ? 'text-sm' : 'text-base'
          )}
        >
          {displayLabel}
        </span>
      )}
    </div>
  );
};

ProgressCircle.displayName = 'ProgressCircle';
