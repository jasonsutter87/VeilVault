// ==========================================================================
// TEXTAREA COMPONENT
// Multi-line text input with auto-resize option
// ==========================================================================

import React, { forwardRef, useId, useCallback, useRef, useEffect } from 'react';
import { cn } from '../../utils.js';

export type TextAreaSize = 'sm' | 'md' | 'lg';
export type TextAreaVariant = 'default' | 'filled' | 'ghost';

export interface TextAreaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  /** Visual size */
  size?: TextAreaSize;
  /** Visual variant */
  variant?: TextAreaVariant;
  /** Textarea label */
  label?: string;
  /** Error message - also sets aria-invalid */
  error?: string;
  /** Helper text below textarea */
  hint?: string;
  /** Full width */
  fullWidth?: boolean;
  /** Auto-resize based on content */
  autoResize?: boolean;
  /** Minimum rows when auto-resizing */
  minRows?: number;
  /** Maximum rows when auto-resizing */
  maxRows?: number;
}

const sizeClasses: Record<TextAreaSize, string> = {
  sm: 'text-sm px-2.5 py-1.5',
  md: 'text-sm px-3 py-2',
  lg: 'text-base px-4 py-2.5',
};

const variantClasses: Record<TextAreaVariant, string> = {
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

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      className,
      size = 'md',
      variant = 'default',
      label,
      error,
      hint,
      id,
      fullWidth = true,
      disabled,
      required,
      autoResize = false,
      minRows = 3,
      maxRows = 10,
      onChange,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const errorId = `${textareaId}-error`;
    const hintId = `${textareaId}-hint`;

    const internalRef = useRef<HTMLTextAreaElement | null>(null);

    // Calculate line height based on size
    const getLineHeight = () => {
      switch (size) {
        case 'sm':
          return 20; // text-sm line height
        case 'lg':
          return 24; // text-base line height
        default:
          return 20; // text-sm line height
      }
    };

    const adjustHeight = useCallback(() => {
      const textarea = internalRef.current;
      if (!textarea || !autoResize) return;

      const lineHeight = getLineHeight();
      const minHeight = minRows * lineHeight;
      const maxHeight = maxRows * lineHeight;

      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';

      // Calculate new height
      const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
    }, [autoResize, minRows, maxRows, size]);

    // Adjust height on mount and when value changes
    useEffect(() => {
      adjustHeight();
    }, [adjustHeight, props.value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      adjustHeight();
      onChange?.(e);
    };

    // Combine refs
    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        internalRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    return (
      <div className={cn('flex flex-col', fullWidth && 'w-full')}>
        {label && (
          <label
            htmlFor={textareaId}
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

        <textarea
          ref={setRefs}
          id={textareaId}
          disabled={disabled}
          required={required}
          rows={autoResize ? minRows : props.rows || 3}
          onChange={handleChange}
          className={cn(
            // Base styles
            'w-full rounded-md border transition-colors duration-fast',
            'text-neutral-900 dark:text-neutral-100',
            'placeholder:text-neutral-400 dark:placeholder:text-neutral-500',
            'resize-none',

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

            // Allow resize if not auto-resizing
            !autoResize && 'resize-y',

            className
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={
            cn(error && errorId, hint && !error && hintId) || undefined
          }
          {...props}
        />

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

TextArea.displayName = 'TextArea';
