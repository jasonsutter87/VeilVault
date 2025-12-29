// ==========================================================================
// SELECT COMPONENT
// Native select with custom styling
// ==========================================================================

import React, { forwardRef, useId } from 'react';
import { cn } from '../../utils.js';

export type SelectSize = 'sm' | 'md' | 'lg';
export type SelectVariant = 'default' | 'filled' | 'ghost';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  /** Visual size */
  size?: SelectSize;
  /** Visual variant */
  variant?: SelectVariant;
  /** Select label */
  label?: string;
  /** Error message - also sets aria-invalid */
  error?: string;
  /** Helper text below select */
  hint?: string;
  /** Options to display */
  options: SelectOption[];
  /** Placeholder option */
  placeholder?: string;
  /** Full width */
  fullWidth?: boolean;
}

const sizeClasses: Record<SelectSize, string> = {
  sm: 'h-8 text-sm pl-2.5 pr-8',
  md: 'h-10 text-sm pl-3 pr-10',
  lg: 'h-12 text-base pl-4 pr-12',
};

const iconSizeClasses: Record<SelectSize, string> = {
  sm: 'right-2 w-4 h-4',
  md: 'right-3 w-4 h-4',
  lg: 'right-4 w-5 h-5',
};

const variantClasses: Record<SelectVariant, string> = {
  default: cn(
    'border bg-white dark:bg-neutral-900',
    'border-neutral-200 dark:border-neutral-700',
    'hover:border-neutral-300 dark:hover:border-neutral-600',
    'focus:border-brand-500 dark:focus:border-brand-400'
  ),
  filled: cn(
    'border-transparent',
    'bg-neutral-100 dark:bg-neutral-800',
    'hover:bg-neutral-200 dark:hover:bg-neutral-700',
    'focus:bg-white dark:focus:bg-neutral-900',
    'focus:border-brand-500 dark:focus:border-brand-400',
    'focus:ring-1 focus:ring-brand-500/20'
  ),
  ghost: cn(
    'border-transparent bg-transparent',
    'hover:bg-neutral-100 dark:hover:bg-neutral-800',
    'focus:bg-neutral-50 dark:focus:bg-neutral-900'
  ),
};

// Chevron down icon
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 20 20"
    fill="currentColor"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
      clipRule="evenodd"
    />
  </svg>
);

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      size = 'md',
      variant = 'default',
      label,
      error,
      hint,
      options,
      placeholder,
      id,
      fullWidth = true,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;
    const hintId = `${selectId}-hint`;

    return (
      <div className={cn('flex flex-col', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={selectId}
            className={cn(
              'mb-1.5 text-sm font-medium',
              'text-neutral-700 dark:text-neutral-300',
              disabled && 'text-neutral-400 dark:text-neutral-500'
            )}
          >
            {label}
            {required && (
              <span className="ml-0.5 text-error-500" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            required={required}
            className={cn(
              // Base styles
              'w-full appearance-none rounded-md border transition-colors duration-fast',
              'text-neutral-900 dark:text-neutral-100',
              'cursor-pointer',

              // Focus
              'focus:outline-none focus:ring-2 focus:ring-brand-500/20',

              // Size
              sizeClasses[size],

              // Variant
              variantClasses[variant],

              // Error state
              error && [
                'border-error-500 dark:border-error-400',
                'focus:border-error-500 dark:focus:border-error-400',
                'focus:ring-error-500/20',
              ],

              // Disabled
              disabled && [
                'cursor-not-allowed opacity-50',
                'bg-neutral-50 dark:bg-neutral-900',
              ],

              className
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={
              cn(error && errorId, hint && !error && hintId) || undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          <ChevronDownIcon
            className={cn(
              'absolute top-1/2 -translate-y-1/2 pointer-events-none',
              'text-neutral-400 dark:text-neutral-500',
              iconSizeClasses[size]
            )}
          />
        </div>

        {error && (
          <p
            id={errorId}
            role="alert"
            className="mt-1.5 text-sm text-error-600 dark:text-error-400"
          >
            {error}
          </p>
        )}

        {hint && !error && (
          <p
            id={hintId}
            className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400"
          >
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
