// ==========================================================================
// CHECKBOX COMPONENT
// Custom styled checkbox with label support
// ==========================================================================

import React, { forwardRef, useId } from 'react';
import { cn } from '../../utils.js';

export type CheckboxSize = 'sm' | 'md' | 'lg';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** Visual size */
  size?: CheckboxSize;
  /** Checkbox label */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Error message */
  error?: string;
  /** Indeterminate state */
  indeterminate?: boolean;
}

const sizeClasses: Record<CheckboxSize, { box: string; label: string; desc: string }> = {
  sm: {
    box: 'h-3.5 w-3.5',
    label: 'text-sm',
    desc: 'text-xs',
  },
  md: {
    box: 'h-4 w-4',
    label: 'text-sm',
    desc: 'text-sm',
  },
  lg: {
    box: 'h-5 w-5',
    label: 'text-base',
    desc: 'text-sm',
  },
};

// Check icon
const CheckIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2.5 6L5 8.5L9.5 4" />
  </svg>
);

// Minus icon for indeterminate
const MinusIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M2.5 6H9.5" />
  </svg>
);

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      size = 'md',
      label,
      description,
      error,
      id,
      disabled,
      indeterminate = false,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const checkboxId = id || generatedId;
    const descriptionId = `${checkboxId}-description`;

    const sizeClass = sizeClasses[size];

    // Handle indeterminate state via ref
    const checkboxRef = React.useCallback(
      (node: HTMLInputElement | null) => {
        if (node) {
          node.indeterminate = indeterminate;
        }
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref, indeterminate]
    );

    return (
      <div className={cn('relative flex items-start', className)}>
        <div className="flex h-5 items-center">
          <div className="relative">
            <input
              ref={checkboxRef}
              type="checkbox"
              id={checkboxId}
              disabled={disabled}
              className={cn(
                // Base styles
                'appearance-none rounded border transition-colors duration-fast',
                sizeClass.box,

                // Default state
                'border-neutral-300 dark:border-neutral-600',
                'bg-white dark:bg-neutral-900',

                // Hover
                'hover:border-neutral-400 dark:hover:border-neutral-500',

                // Focus
                'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2',
                'dark:focus:ring-offset-neutral-900',

                // Checked state
                'checked:border-brand-500 checked:bg-brand-500',
                'checked:hover:border-brand-600 checked:hover:bg-brand-600',
                'dark:checked:border-brand-400 dark:checked:bg-brand-400',

                // Indeterminate state
                indeterminate && [
                  'border-brand-500 bg-brand-500',
                  'hover:border-brand-600 hover:bg-brand-600',
                  'dark:border-brand-400 dark:bg-brand-400',
                ],

                // Error state
                error && [
                  'border-error-500 dark:border-error-400',
                  'focus:ring-error-500/20',
                ],

                // Disabled
                disabled && 'cursor-not-allowed opacity-50',

                'cursor-pointer'
              )}
              aria-describedby={description ? descriptionId : undefined}
              aria-invalid={error ? 'true' : undefined}
              {...props}
            />

            {/* Check/Minus icon overlay */}
            <div
              className={cn(
                'pointer-events-none absolute inset-0 flex items-center justify-center',
                'text-white opacity-0 transition-opacity duration-fast',
                // Show when checked or indeterminate
                (props.checked || indeterminate) && 'opacity-100'
              )}
              aria-hidden="true"
            >
              {indeterminate ? (
                <MinusIcon className={sizeClass.box} />
              ) : (
                <CheckIcon className={sizeClass.box} />
              )}
            </div>
          </div>
        </div>

        {(label || description) && (
          <div className="ml-2">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  'font-medium cursor-pointer',
                  sizeClass.label,
                  'text-neutral-900 dark:text-neutral-100',
                  disabled && 'cursor-not-allowed text-neutral-400 dark:text-neutral-500'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p
                id={descriptionId}
                className={cn(
                  sizeClass.desc,
                  'text-neutral-500 dark:text-neutral-400',
                  disabled && 'text-neutral-400 dark:text-neutral-500'
                )}
              >
                {description}
              </p>
            )}
          </div>
        )}

        {error && (
          <p
            role="alert"
            className={cn(
              'absolute -bottom-5 left-0',
              'text-xs text-error-600 dark:text-error-400'
            )}
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

// ==========================================================================
// CHECKBOX GROUP
// Group of checkboxes with shared label
// ==========================================================================

export interface CheckboxGroupOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface CheckboxGroupProps {
  /** Group label */
  label?: string;
  /** Options to display */
  options: CheckboxGroupOption[];
  /** Currently selected values */
  value: string[];
  /** Change handler */
  onChange: (value: string[]) => void;
  /** Size of checkboxes */
  size?: CheckboxSize;
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

export const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  options,
  value,
  onChange,
  size = 'md',
  orientation = 'vertical',
  error,
  disabled,
  className,
}) => {
  const groupId = useId();

  const handleChange = (optionValue: string, checked: boolean) => {
    if (checked) {
      onChange([...value, optionValue]);
    } else {
      onChange(value.filter((v) => v !== optionValue));
    }
  };

  return (
    <fieldset
      className={cn('flex flex-col', className)}
      aria-describedby={error ? `${groupId}-error` : undefined}
    >
      {label && (
        <legend
          className={cn(
            'mb-2 text-sm font-medium',
            'text-neutral-700 dark:text-neutral-300',
            disabled && 'text-neutral-400 dark:text-neutral-500'
          )}
        >
          {label}
        </legend>
      )}

      <div
        className={cn(
          'flex',
          orientation === 'vertical' ? 'flex-col gap-3' : 'flex-row flex-wrap gap-4'
        )}
        role="group"
      >
        {options.map((option) => (
          <Checkbox
            key={option.value}
            size={size}
            label={option.label}
            description={option.description}
            checked={value.includes(option.value)}
            onChange={(e) => handleChange(option.value, e.target.checked)}
            disabled={disabled || option.disabled}
          />
        ))}
      </div>

      {error && (
        <p
          id={`${groupId}-error`}
          role="alert"
          className="mt-2 text-sm text-error-600 dark:text-error-400"
        >
          {error}
        </p>
      )}
    </fieldset>
  );
};

CheckboxGroup.displayName = 'CheckboxGroup';
