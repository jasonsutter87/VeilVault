// ==========================================================================
// PAGINATION COMPONENT
// Page navigation for data tables and lists
// ==========================================================================

import React from 'react';
import { cn } from '../../utils.js';

export interface PaginationProps {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Page change handler */
  onPageChange: (page: number) => void;
  /** Number of visible page buttons */
  siblingCount?: number;
  /** Show first/last buttons */
  showFirstLast?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

// Icon components
const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
      clipRule="evenodd"
    />
  </svg>
);

const ChevronRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
      clipRule="evenodd"
    />
  </svg>
);

const ChevronDoubleLeftIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M15.79 14.77a.75.75 0 01-1.06.02l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 111.08 1.04L11.832 10l3.938 3.71a.75.75 0 01.02 1.06zm-6 0a.75.75 0 01-1.06.02l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 111.08 1.04L5.832 10l3.938 3.71a.75.75 0 01.02 1.06z"
      clipRule="evenodd"
    />
  </svg>
);

const ChevronDoubleRightIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path
      fillRule="evenodd"
      d="M4.21 5.23a.75.75 0 011.06-.02l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 11-1.08-1.04L8.168 10 4.23 6.29a.75.75 0 01-.02-1.06zm6 0a.75.75 0 011.06-.02l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 11-1.08-1.04L14.168 10 10.23 6.29a.75.75 0 01-.02-1.06z"
      clipRule="evenodd"
    />
  </svg>
);

const sizeClasses = {
  sm: {
    button: 'h-7 min-w-[28px] text-xs',
    icon: 'h-3.5 w-3.5',
    gap: 'gap-0.5',
  },
  md: {
    button: 'h-9 min-w-[36px] text-sm',
    icon: 'h-4 w-4',
    gap: 'gap-1',
  },
  lg: {
    button: 'h-11 min-w-[44px] text-base',
    icon: 'h-5 w-5',
    gap: 'gap-1.5',
  },
};

// Generate page numbers to display
function getPageNumbers(
  currentPage: number,
  totalPages: number,
  siblingCount: number
): (number | 'ellipsis')[] {
  const totalNumbers = siblingCount * 2 + 3; // siblings + current + first + last
  const totalBlocks = totalNumbers + 2; // + 2 ellipses

  if (totalPages <= totalBlocks) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 2);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages - 1);

  const showLeftEllipsis = leftSiblingIndex > 2;
  const showRightEllipsis = rightSiblingIndex < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftRange = Array.from(
      { length: 3 + siblingCount * 2 },
      (_, i) => i + 1
    );
    return [...leftRange, 'ellipsis', totalPages];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightRange = Array.from(
      { length: 3 + siblingCount * 2 },
      (_, i) => totalPages - (3 + siblingCount * 2) + i + 1
    );
    return [1, 'ellipsis', ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i
  );

  return [1, 'ellipsis', ...middleRange, 'ellipsis', totalPages];
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  showFirstLast = true,
  size = 'md',
  disabled = false,
  className,
}) => {
  const sizeClass = sizeClasses[size];
  const pageNumbers = getPageNumbers(currentPage, totalPages, siblingCount);

  const buttonBaseClass = cn(
    'inline-flex items-center justify-center',
    'rounded-md border transition-colors duration-fast',
    'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2',
    'dark:focus:ring-offset-neutral-900',
    sizeClass.button
  );

  const navButtonClass = cn(
    buttonBaseClass,
    'px-2',
    'border-neutral-200 dark:border-neutral-700',
    'bg-white dark:bg-neutral-900',
    'hover:bg-neutral-50 dark:hover:bg-neutral-800',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white',
    'dark:disabled:hover:bg-neutral-900'
  );

  const pageButtonClass = (isActive: boolean) =>
    cn(
      buttonBaseClass,
      'px-3',
      isActive
        ? [
            'border-brand-500 bg-brand-50 text-brand-600',
            'dark:border-brand-400 dark:bg-brand-900/20 dark:text-brand-400',
          ]
        : [
            'border-neutral-200 dark:border-neutral-700',
            'bg-white dark:bg-neutral-900',
            'hover:bg-neutral-50 dark:hover:bg-neutral-800',
            'text-neutral-700 dark:text-neutral-300',
          ]
    );

  if (totalPages <= 1) return null;

  return (
    <nav
      className={cn('flex items-center', sizeClass.gap, className)}
      aria-label="Pagination"
      role="navigation"
    >
      {/* First page */}
      {showFirstLast && (
        <button
          type="button"
          className={navButtonClass}
          onClick={() => onPageChange(1)}
          disabled={disabled || currentPage === 1}
          aria-label="Go to first page"
        >
          <ChevronDoubleLeftIcon className={sizeClass.icon} />
        </button>
      )}

      {/* Previous page */}
      <button
        type="button"
        className={navButtonClass}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={disabled || currentPage === 1}
        aria-label="Go to previous page"
      >
        <ChevronLeftIcon className={sizeClass.icon} />
      </button>

      {/* Page numbers */}
      {pageNumbers.map((page, index) =>
        page === 'ellipsis' ? (
          <span
            key={`ellipsis-${index}`}
            className={cn(
              sizeClass.button,
              'inline-flex items-center justify-center',
              'text-neutral-400 dark:text-neutral-500'
            )}
          >
            ...
          </span>
        ) : (
          <button
            key={page}
            type="button"
            className={pageButtonClass(page === currentPage)}
            onClick={() => onPageChange(page)}
            disabled={disabled}
            aria-label={`Go to page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}

      {/* Next page */}
      <button
        type="button"
        className={navButtonClass}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={disabled || currentPage === totalPages}
        aria-label="Go to next page"
      >
        <ChevronRightIcon className={sizeClass.icon} />
      </button>

      {/* Last page */}
      {showFirstLast && (
        <button
          type="button"
          className={navButtonClass}
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || currentPage === totalPages}
          aria-label="Go to last page"
        >
          <ChevronDoubleRightIcon className={sizeClass.icon} />
        </button>
      )}
    </nav>
  );
};

Pagination.displayName = 'Pagination';

// ==========================================================================
// PAGINATION INFO
// Shows "Showing X to Y of Z results"
// ==========================================================================

export interface PaginationInfoProps {
  /** Current page (1-indexed) */
  currentPage: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
  /** Custom class name */
  className?: string;
}

export const PaginationInfo: React.FC<PaginationInfoProps> = ({
  currentPage,
  pageSize,
  totalItems,
  className,
}) => {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) {
    return (
      <p className={cn('text-sm text-neutral-500 dark:text-neutral-400', className)}>
        No results
      </p>
    );
  }

  return (
    <p className={cn('text-sm text-neutral-500 dark:text-neutral-400', className)}>
      Showing{' '}
      <span className="font-medium text-neutral-900 dark:text-neutral-100">
        {start}
      </span>{' '}
      to{' '}
      <span className="font-medium text-neutral-900 dark:text-neutral-100">
        {end}
      </span>{' '}
      of{' '}
      <span className="font-medium text-neutral-900 dark:text-neutral-100">
        {totalItems}
      </span>{' '}
      results
    </p>
  );
};

PaginationInfo.displayName = 'PaginationInfo';
