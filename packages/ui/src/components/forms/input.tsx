// ==========================================================================
// INPUT COMPONENT
// Text input with variants, icons, and error states
// ==========================================================================

import React, { forwardRef, useId } from 'react';
import { cn } from '../../utils.js';

export type InputSize = 'sm' | 'md' | 'lg';
export type InputVariant = 'default' | 'filled' | 'ghost';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Visual size */
  size?: InputSize;
  /** Visual variant */
  variant?: InputVariant;
  /** Input label */
  label?: string;
  /** Error message - also sets aria-invalid */
  error?: string;
  /** Helper text below input */
  hint?: string;
  /** Icon on the left side */
  leftIcon?: React.ReactNode;
  /** Icon/button on the right side */
  rightIcon?: React.ReactNode;
  /** Full width */
  fullWidth?: boolean;
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'h-8 text-sm px-2.5',
  md: 'h-10 text-sm px-3',
  lg: 'h-12 text-base px-4',
};

const variantClasses: Record<InputVariant, string> = {
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

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      size = 'md',
      variant = 'default',
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      id,
      fullWidth = true,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const hasLeftIcon = !!leftIcon;
    const hasRightIcon = !!rightIcon;

    return (
      <div className={cn('flex flex-col', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={inputId}
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
          {leftIcon && (
            <div
              className={cn(
                'absolute left-3 top-1/2 -translate-y-1/2',
                'text-neutral-400 dark:text-neutral-500',
                'pointer-events-none'
              )}
            >
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            className={cn(
              // Base styles
              'w-full rounded-md border transition-colors duration-fast',
              'text-neutral-900 dark:text-neutral-100',
              'placeholder:text-neutral-400 dark:placeholder:text-neutral-500',

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

              // Icon padding
              hasLeftIcon && 'pl-10',
              hasRightIcon && 'pr-10',

              className
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={
              cn(error && errorId, hint && !error && hintId) || undefined
            }
            {...props}
          />

          {rightIcon && (
            <div
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2',
                'text-neutral-400 dark:text-neutral-500'
              )}
            >
              {rightIcon}
            </div>
          )}
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

Input.displayName = 'Input';
