// ==========================================================================
// TABLE COMPONENT
// Data table with sorting support
// ==========================================================================

import React from 'react';
import { cn } from '../../utils.js';

// ==========================================================================
// TABLE ROOT
// ==========================================================================

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  /** Add striped row backgrounds */
  striped?: boolean;
  /** Add hover effect on rows */
  hoverable?: boolean;
  /** Compact padding */
  compact?: boolean;
  /** Fixed layout */
  fixed?: boolean;
}

export const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, striped, hoverable, compact, fixed, children, ...props }, ref) => {
    return (
      <div className="w-full overflow-x-auto">
        <table
          ref={ref}
          className={cn(
            'w-full text-sm text-left',
            'text-neutral-900 dark:text-neutral-100',
            fixed && 'table-fixed',
            className
          )}
          data-striped={striped || undefined}
          data-hoverable={hoverable || undefined}
          data-compact={compact || undefined}
          {...props}
        >
          {children}
        </table>
      </div>
    );
  }
);

Table.displayName = 'Table';

// ==========================================================================
// TABLE HEADER
// ==========================================================================

export interface TableHeaderProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  TableHeaderProps
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      'bg-neutral-50 dark:bg-neutral-800/50',
      'border-b border-neutral-200 dark:border-neutral-700',
      className
    )}
    {...props}
  />
));

TableHeader.displayName = 'TableHeader';

// ==========================================================================
// TABLE BODY
// ==========================================================================

export interface TableBodyProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  TableBodyProps
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn('[&_tr:last-child]:border-0', className)}
    {...props}
  />
));

TableBody.displayName = 'TableBody';

// ==========================================================================
// TABLE ROW
// ==========================================================================

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** Selected state */
  selected?: boolean;
}

export const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, selected, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        'border-b border-neutral-200 dark:border-neutral-700',
        'transition-colors duration-fast',

        // Striped (applied via parent data attribute)
        '[table[data-striped]_&:nth-child(even)]:bg-neutral-50',
        'dark:[table[data-striped]_&:nth-child(even)]:bg-neutral-800/30',

        // Hoverable (applied via parent data attribute)
        '[table[data-hoverable]_&]:hover:bg-neutral-100',
        'dark:[table[data-hoverable]_&]:hover:bg-neutral-800/50',

        // Selected
        selected && 'bg-brand-50 dark:bg-brand-900/20',

        className
      )}
      aria-selected={selected || undefined}
      {...props}
    />
  )
);

TableRow.displayName = 'TableRow';

// ==========================================================================
// TABLE HEAD CELL
// ==========================================================================

export type SortDirection = 'asc' | 'desc' | null;

export interface TableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Enable sorting */
  sortable?: boolean;
  /** Current sort direction */
  sortDirection?: SortDirection;
  /** Sort change handler */
  onSort?: () => void;
}

// Sort icon component
const SortIcon = ({ direction }: { direction: SortDirection }) => {
  if (!direction) {
    return (
      <svg
        className="w-4 h-4 ml-1 text-neutral-400"
        viewBox="0 0 16 16"
        fill="currentColor"
      >
        <path d="M8 4.5l3 3H5l3-3zM8 11.5l3-3H5l3 3z" />
      </svg>
    );
  }

  return (
    <svg
      className="w-4 h-4 ml-1 text-brand-500"
      viewBox="0 0 16 16"
      fill="currentColor"
    >
      {direction === 'asc' ? (
        <path d="M8 4.5l4 4H4l4-4z" />
      ) : (
        <path d="M8 11.5l4-4H4l4 4z" />
      )}
    </svg>
  );
};

export const TableHead = React.forwardRef<
  HTMLTableCellElement,
  TableHeadProps
>(({ className, sortable, sortDirection, onSort, children, ...props }, ref) => {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (sortable && onSort && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onSort();
    }
  };

  return (
    <th
      ref={ref}
      className={cn(
        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
        'text-neutral-600 dark:text-neutral-400',

        // Compact
        '[table[data-compact]_&]:px-3 [table[data-compact]_&]:py-2',

        // Sortable
        sortable && [
          'cursor-pointer select-none',
          'hover:text-neutral-900 dark:hover:text-neutral-200',
          'transition-colors duration-fast',
        ],

        className
      )}
      onClick={sortable ? onSort : undefined}
      onKeyDown={handleKeyDown}
      tabIndex={sortable ? 0 : undefined}
      role={sortable ? 'button' : undefined}
      aria-sort={
        sortDirection === 'asc'
          ? 'ascending'
          : sortDirection === 'desc'
          ? 'descending'
          : undefined
      }
      {...props}
    >
      <div className="flex items-center">
        {children}
        {sortable && <SortIcon direction={sortDirection || null} />}
      </div>
    </th>
  );
});

TableHead.displayName = 'TableHead';

// ==========================================================================
// TABLE CELL
// ==========================================================================

export interface TableCellProps
  extends React.TdHTMLAttributes<HTMLTableCellElement> {
  /** Truncate content */
  truncate?: boolean;
}

export const TableCell = React.forwardRef<
  HTMLTableCellElement,
  TableCellProps
>(({ className, truncate, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'px-4 py-3',

      // Compact
      '[table[data-compact]_&]:px-3 [table[data-compact]_&]:py-2',

      // Truncate
      truncate && 'max-w-0 truncate',

      className
    )}
    {...props}
  />
));

TableCell.displayName = 'TableCell';

// ==========================================================================
// TABLE FOOTER
// ==========================================================================

export interface TableFooterProps
  extends React.HTMLAttributes<HTMLTableSectionElement> {}

export const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  TableFooterProps
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      'bg-neutral-50 dark:bg-neutral-800/50',
      'border-t border-neutral-200 dark:border-neutral-700',
      'font-medium',
      className
    )}
    {...props}
  />
));

TableFooter.displayName = 'TableFooter';

// ==========================================================================
// TABLE CAPTION
// ==========================================================================

export interface TableCaptionProps
  extends React.HTMLAttributes<HTMLTableCaptionElement> {
  /** Position of caption */
  position?: 'top' | 'bottom';
}

export const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  TableCaptionProps
>(({ className, position = 'bottom', ...props }, ref) => (
  <caption
    ref={ref}
    className={cn(
      'px-4 py-2 text-sm text-neutral-500 dark:text-neutral-400',
      position === 'top' ? 'caption-top' : 'caption-bottom',
      className
    )}
    {...props}
  />
));

TableCaption.displayName = 'TableCaption';
