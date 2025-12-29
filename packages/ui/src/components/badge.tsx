'use client';

// ==========================================================================
// BADGE COMPONENT
// Simple badge for labeling and categorization
// ==========================================================================
import { cn } from '../utils.js';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantClasses = {
  default: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300',
  outline: 'bg-transparent border border-neutral-300 text-neutral-700 dark:border-neutral-600 dark:text-neutral-300',
  success: 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-300',
  warning: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
  error: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300',
  info: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
};

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
  lg: 'text-sm px-2.5 py-1',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
}
