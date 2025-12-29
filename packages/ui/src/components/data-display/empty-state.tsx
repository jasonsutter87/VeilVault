// ==========================================================================
// EMPTY STATE COMPONENT
// Display when no data is available
// ==========================================================================

import React from 'react';
import { cn } from '../../utils.js';

export interface EmptyStateProps {
  /** Title text */
  title?: string;
  /** Description text */
  description?: string;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Action button(s) */
  action?: React.ReactNode;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Custom class name */
  className?: string;
}

const sizeClasses = {
  sm: {
    wrapper: 'py-8 px-4',
    icon: 'w-10 h-10 mb-3',
    title: 'text-base',
    description: 'text-sm',
    action: 'mt-4',
  },
  md: {
    wrapper: 'py-12 px-6',
    icon: 'w-12 h-12 mb-4',
    title: 'text-lg',
    description: 'text-sm',
    action: 'mt-5',
  },
  lg: {
    wrapper: 'py-16 px-8',
    icon: 'w-16 h-16 mb-5',
    title: 'text-xl',
    description: 'text-base',
    action: 'mt-6',
  },
};

// Default empty icon
const DefaultIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data',
  description,
  icon,
  action,
  size = 'md',
  className,
}) => {
  const sizeClass = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizeClass.wrapper,
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'text-neutral-400 dark:text-neutral-500',
          sizeClass.icon
        )}
      >
        {icon || <DefaultIcon className="w-full h-full" />}
      </div>

      {/* Title */}
      {title && (
        <h3
          className={cn(
            'font-medium text-neutral-900 dark:text-neutral-100',
            sizeClass.title
          )}
        >
          {title}
        </h3>
      )}

      {/* Description */}
      {description && (
        <p
          className={cn(
            'mt-1 text-neutral-500 dark:text-neutral-400 max-w-sm',
            sizeClass.description
          )}
        >
          {description}
        </p>
      )}

      {/* Action */}
      {action && <div className={sizeClass.action}>{action}</div>}
    </div>
  );
};

EmptyState.displayName = 'EmptyState';

// ==========================================================================
// PRESET EMPTY STATES
// Common empty state configurations
// ==========================================================================

// No search results
export interface NoResultsProps {
  query?: string;
  onClear?: () => void;
  className?: string;
}

const SearchIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

export const NoResults: React.FC<NoResultsProps> = ({
  query,
  onClear,
  className,
}) => (
  <EmptyState
    icon={<SearchIcon className="w-full h-full" />}
    title="No results found"
    description={
      query
        ? `No results for "${query}". Try adjusting your search.`
        : 'Try adjusting your search or filters.'
    }
    action={
      onClear && (
        <button
          type="button"
          onClick={onClear}
          className={cn(
            'text-sm font-medium',
            'text-brand-600 dark:text-brand-400',
            'hover:text-brand-700 dark:hover:text-brand-300',
            'transition-colors duration-fast'
          )}
        >
          Clear search
        </button>
      )
    }
    className={className}
  />
);

NoResults.displayName = 'NoResults';

// Error state
export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

const ErrorIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4m0 4h.01" />
  </svg>
);

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description = 'An error occurred while loading data.',
  onRetry,
  className,
}) => (
  <EmptyState
    icon={<ErrorIcon className="w-full h-full text-error-500" />}
    title={title}
    description={description}
    action={
      onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md',
            'bg-brand-500 text-white',
            'hover:bg-brand-600',
            'transition-colors duration-fast',
            'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2'
          )}
        >
          Try again
        </button>
      )
    }
    className={className}
  />
);

ErrorState.displayName = 'ErrorState';

// Coming soon / Under construction
export interface ComingSoonProps {
  feature?: string;
  className?: string;
}

const ConstructionIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

export const ComingSoon: React.FC<ComingSoonProps> = ({
  feature,
  className,
}) => (
  <EmptyState
    icon={<ConstructionIcon className="w-full h-full text-warning-500" />}
    title="Coming soon"
    description={
      feature
        ? `${feature} is currently under development and will be available soon.`
        : 'This feature is currently under development.'
    }
    className={className}
  />
);

ComingSoon.displayName = 'ComingSoon';
