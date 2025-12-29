// ==========================================================================
// BREADCRUMB COMPONENT
// Navigation trail showing current location
// ==========================================================================

import React from 'react';
import { cn } from '../../utils.js';

export type BreadcrumbSize = 'sm' | 'md' | 'lg';

// ==========================================================================
// BREADCRUMB ROOT
// ==========================================================================

export interface BreadcrumbProps {
  /** Breadcrumb items */
  children: React.ReactNode;
  /** Custom separator */
  separator?: React.ReactNode;
  /** Size variant */
  size?: BreadcrumbSize;
  /** Custom class name */
  className?: string;
}

const sizeClasses: Record<BreadcrumbSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

// Default separator
const DefaultSeparator = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
      clipRule="evenodd"
    />
  </svg>
);

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  children,
  separator = <DefaultSeparator className="w-4 h-4" />,
  size = 'md',
  className,
}) => {
  const items = React.Children.toArray(children);

  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol
        className={cn(
          'flex items-center flex-wrap gap-1',
          sizeClasses[size]
        )}
      >
        {items.map((child, index) => (
          <li key={index} className="flex items-center gap-1">
            {index > 0 && (
              <span
                className="text-neutral-400 dark:text-neutral-500"
                aria-hidden="true"
              >
                {separator}
              </span>
            )}
            {child}
          </li>
        ))}
      </ol>
    </nav>
  );
};

Breadcrumb.displayName = 'Breadcrumb';

// ==========================================================================
// BREADCRUMB ITEM
// ==========================================================================

export interface BreadcrumbItemProps {
  /** Item content */
  children: React.ReactNode;
  /** Link href */
  href?: string;
  /** Whether this is the current page */
  current?: boolean;
  /** Icon before text */
  icon?: React.ReactNode;
  /** Click handler (for non-link items) */
  onClick?: () => void;
  /** Custom class name */
  className?: string;
}

export const BreadcrumbItem: React.FC<BreadcrumbItemProps> = ({
  children,
  href,
  current = false,
  icon,
  onClick,
  className,
}) => {
  const content = (
    <>
      {icon && (
        <span className="flex-shrink-0 w-4 h-4 mr-1">{icon}</span>
      )}
      {children}
    </>
  );

  if (current) {
    return (
      <span
        className={cn(
          'flex items-center font-medium',
          'text-neutral-900 dark:text-neutral-100',
          className
        )}
        aria-current="page"
      >
        {content}
      </span>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        className={cn(
          'flex items-center',
          'text-neutral-500 dark:text-neutral-400',
          'hover:text-neutral-700 dark:hover:text-neutral-300',
          'transition-colors duration-fast',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20',
          'rounded',
          className
        )}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center',
        'text-neutral-500 dark:text-neutral-400',
        'hover:text-neutral-700 dark:hover:text-neutral-300',
        'transition-colors duration-fast',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20',
        'rounded',
        className
      )}
    >
      {content}
    </button>
  );
};

BreadcrumbItem.displayName = 'BreadcrumbItem';

// ==========================================================================
// BREADCRUMB ELLIPSIS
// For collapsing middle items
// ==========================================================================

export interface BreadcrumbEllipsisProps {
  /** Click handler to expand */
  onClick?: () => void;
  /** Custom class name */
  className?: string;
}

export const BreadcrumbEllipsis: React.FC<BreadcrumbEllipsisProps> = ({
  onClick,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center w-6 h-6',
        'text-neutral-400 dark:text-neutral-500',
        'hover:text-neutral-600 dark:hover:text-neutral-300',
        'hover:bg-neutral-100 dark:hover:bg-neutral-800',
        'rounded transition-colors duration-fast',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20',
        className
      )}
      aria-label="Show more breadcrumbs"
    >
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <circle cx="5" cy="10" r="1.5" />
        <circle cx="10" cy="10" r="1.5" />
        <circle cx="15" cy="10" r="1.5" />
      </svg>
    </button>
  );
};

BreadcrumbEllipsis.displayName = 'BreadcrumbEllipsis';

// ==========================================================================
// HOME ICON (common breadcrumb icon)
// ==========================================================================

export const BreadcrumbHomeIcon: React.FC<{ className?: string }> = ({
  className,
}) => (
  <svg
    className={cn('w-4 h-4', className)}
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
  </svg>
);

BreadcrumbHomeIcon.displayName = 'BreadcrumbHomeIcon';
