// ==========================================================================
// STATUS BADGE
// Traffic light status indicator (green/yellow/red/gray)
// ==========================================================================

import React from 'react';
import { cn } from '../utils.js';

export type StatusType = 'healthy' | 'warning' | 'error' | 'pending';

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

const statusConfig: Record<
  StatusType,
  { color: string; bg: string; label: string }
> = {
  healthy: {
    color: 'text-green-700',
    bg: 'bg-green-100',
    label: 'Healthy',
  },
  warning: {
    color: 'text-yellow-700',
    bg: 'bg-yellow-100',
    label: 'Warning',
  },
  error: {
    color: 'text-red-700',
    bg: 'bg-red-100',
    label: 'Error',
  },
  pending: {
    color: 'text-gray-700',
    bg: 'bg-gray-100',
    label: 'Pending',
  },
};

const sizeConfig = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

const dotSizeConfig = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

export function StatusBadge({
  status,
  label,
  size = 'md',
  showDot = true,
  className,
}: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        config.bg,
        config.color,
        sizeConfig[size],
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            'rounded-full',
            dotSizeConfig[size],
            status === 'healthy' && 'bg-green-500',
            status === 'warning' && 'bg-yellow-500',
            status === 'error' && 'bg-red-500',
            status === 'pending' && 'bg-gray-400'
          )}
        />
      )}
      {label ?? config.label}
    </span>
  );
}
