// ==========================================================================
// SKELETON COMPONENT
// Loading placeholder with shimmer animation
// ==========================================================================

import React from 'react';
import { cn } from '../../utils.js';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width (default: 100%) */
  width?: string | number;
  /** Height (default: 1rem) */
  height?: string | number;
  /** Border radius variant */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  /** Disable animation */
  animate?: boolean;
}

const variantClasses: Record<string, string> = {
  text: 'rounded',
  circular: 'rounded-full',
  rectangular: 'rounded-none',
  rounded: 'rounded-md',
};

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  width,
  height,
  variant = 'text',
  animate = true,
  style,
  ...props
}) => {
  return (
    <div
      className={cn(
        'bg-neutral-200 dark:bg-neutral-700',
        variantClasses[variant],
        animate && [
          'animate-shimmer',
          'bg-gradient-to-r',
          'from-neutral-200 via-neutral-100 to-neutral-200',
          'dark:from-neutral-700 dark:via-neutral-600 dark:to-neutral-700',
          'bg-[length:200%_100%]',
        ],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width || '100%',
        height: typeof height === 'number' ? `${height}px` : height || '1rem',
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
};

Skeleton.displayName = 'Skeleton';

// ==========================================================================
// SKELETON TEXT
// Multiple lines of skeleton text
// ==========================================================================

export interface SkeletonTextProps {
  /** Number of lines */
  lines?: number;
  /** Last line width (percentage) */
  lastLineWidth?: number;
  /** Gap between lines */
  gap?: 'sm' | 'md' | 'lg';
  /** Line height */
  lineHeight?: string | number;
  /** Custom class name */
  className?: string;
  /** Disable animation */
  animate?: boolean;
}

const gapClasses = {
  sm: 'gap-1.5',
  md: 'gap-2',
  lg: 'gap-3',
};

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  lastLineWidth = 60,
  gap = 'md',
  lineHeight = '1rem',
  className,
  animate = true,
}) => {
  return (
    <div className={cn('flex flex-col', gapClasses[gap], className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={lineHeight}
          width={index === lines - 1 ? `${lastLineWidth}%` : '100%'}
          animate={animate}
        />
      ))}
    </div>
  );
};

SkeletonText.displayName = 'SkeletonText';

// ==========================================================================
// SKELETON AVATAR
// Circular avatar placeholder
// ==========================================================================

export interface SkeletonAvatarProps {
  /** Size in pixels */
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  /** Custom class name */
  className?: string;
  /** Disable animation */
  animate?: boolean;
}

const avatarSizes: Record<string, number> = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
};

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 'md',
  className,
  animate = true,
}) => {
  const sizeValue = typeof size === 'number' ? size : avatarSizes[size];

  return (
    <Skeleton
      variant="circular"
      width={sizeValue}
      height={sizeValue}
      animate={animate}
      className={className}
    />
  );
};

SkeletonAvatar.displayName = 'SkeletonAvatar';

// ==========================================================================
// SKELETON CARD
// Card-shaped placeholder
// ==========================================================================

export interface SkeletonCardProps {
  /** Include header section */
  header?: boolean;
  /** Include avatar in header */
  avatar?: boolean;
  /** Number of content lines */
  lines?: number;
  /** Include action buttons */
  actions?: boolean;
  /** Custom class name */
  className?: string;
  /** Disable animation */
  animate?: boolean;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  header = true,
  avatar = false,
  lines = 3,
  actions = false,
  className,
  animate = true,
}) => {
  return (
    <div
      className={cn(
        'rounded-lg border border-neutral-200 dark:border-neutral-700',
        'bg-white dark:bg-neutral-900',
        'p-4 space-y-4',
        className
      )}
    >
      {header && (
        <div className="flex items-center gap-3">
          {avatar && <SkeletonAvatar size="md" animate={animate} />}
          <div className="flex-1 space-y-2">
            <Skeleton height={16} width="40%" animate={animate} />
            <Skeleton height={12} width="25%" animate={animate} />
          </div>
        </div>
      )}

      <SkeletonText lines={lines} animate={animate} />

      {actions && (
        <div className="flex gap-2 pt-2">
          <Skeleton height={32} width={80} variant="rounded" animate={animate} />
          <Skeleton height={32} width={80} variant="rounded" animate={animate} />
        </div>
      )}
    </div>
  );
};

SkeletonCard.displayName = 'SkeletonCard';

// ==========================================================================
// SKELETON TABLE
// Table-shaped placeholder
// ==========================================================================

export interface SkeletonTableProps {
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  columns?: number;
  /** Include header row */
  header?: boolean;
  /** Custom class name */
  className?: string;
  /** Disable animation */
  animate?: boolean;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  header = true,
  className,
  animate = true,
}) => {
  return (
    <div
      className={cn(
        'rounded-lg border border-neutral-200 dark:border-neutral-700',
        'overflow-hidden',
        className
      )}
    >
      {/* Header */}
      {header && (
        <div className="flex gap-4 p-4 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={`header-${i}`}
              height={12}
              width={i === 0 ? '30%' : '20%'}
              animate={animate}
            />
          ))}
        </div>
      )}

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className={cn(
            'flex gap-4 p-4',
            rowIndex < rows - 1 && 'border-b border-neutral-200 dark:border-neutral-700'
          )}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              height={16}
              width={colIndex === 0 ? '30%' : '20%'}
              animate={animate}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

SkeletonTable.displayName = 'SkeletonTable';
