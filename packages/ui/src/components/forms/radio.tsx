// ==========================================================================
// RADIO COMPONENT
// Custom styled radio button with label support
// ==========================================================================

import React, { forwardRef, useId } from 'react';
import { cn } from '../../utils.js';

export type RadioSize = 'sm' | 'md' | 'lg';

export interface RadioProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** Visual size */
  size?: RadioSize;
  /** Radio label */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Error message */
  error?: string;
}

const sizeClasses: Record<RadioSize, { radio: string; dot: string; label: string; desc: string }> = {
  sm: {
    radio: 'h-3.5 w-3.5',
    dot: 'h-1.5 w-1.5',
    label: 'text-sm',
    desc: 'text-xs',
  },
  md: {
    radio: 'h-4 w-4',
    dot: 'h-2 w-2',
    label: 'text-sm',
    desc: 'text-sm',
  },
  lg: {
    radio: 'h-5 w-5',
    dot: 'h-2.5 w-2.5',
    label: 'text-base',
    desc: 'text-sm',
  },
};

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  (
    {
      className,
      size = 'md',
      label,
      description,
      error,
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const radioId = id || generatedId;
    const descriptionId = `${radioId}-description`;

    const sizeClass = sizeClasses[size];

    return (
      <div className={cn('relative flex items-start', className)}>
        <div className="flex h-5 items-center">
          <div className="relative">
            <input
              ref={ref}
              type="radio"
              id={radioId}
              disabled={disabled}
              className={cn(
                // Base styles
                'appearance-none rounded-full border transition-colors duration-fast',
                sizeClass.radio,

                // Default state
                'border-neutral-300 dark:border-neutral-600',
                'bg-white dark:bg-neutral-900',

                // Hover
                'hover:border-neutral-400 dark:hover:border-neutral-500',

                // Focus
                'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:ring-offset-2',
                'dark:focus:ring-offset-neutral-900',

                // Checked state
                'checked:border-brand-500 checked:bg-white',
                'checked:hover:border-brand-600',
                'dark:checked:border-brand-400 dark:checked:bg-neutral-900',

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

            {/* Inner dot */}
            <div
              className={cn(
                'pointer-events-none absolute inset-0 flex items-center justify-center',
                'opacity-0 transition-opacity duration-fast',
                'peer-checked:opacity-100'
              )}
              aria-hidden="true"
            >
              <div
                className={cn(
                  'rounded-full bg-brand-500 dark:bg-brand-400',
                  sizeClass.dot,
                  // Only show when checked
                  props.checked ? 'opacity-100' : 'opacity-0'
                )}
              />
            </div>
          </div>
        </div>

        {(label || description) && (
          <div className="ml-2">
            {label && (
              <label
                htmlFor={radioId}
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

Radio.displayName = 'Radio';

// ==========================================================================
// RADIO GROUP
// Group of radio buttons with shared name
// ==========================================================================

export interface RadioGroupOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  /** Group name (required for form handling) */
  name: string;
  /** Group label */
  label?: string;
  /** Options to display */
  options: RadioGroupOption[];
  /** Currently selected value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Size of radio buttons */
  size?: RadioSize;
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Required state */
  required?: boolean;
  /** Custom class name */
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  label,
  options,
  value,
  onChange,
  size = 'md',
  orientation = 'vertical',
  error,
  disabled,
  required,
  className,
}) => {
  const groupId = useId();

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
          {required && (
            <span className="ml-0.5 text-error-500" aria-hidden="true">
              *
            </span>
          )}
        </legend>
      )}

      <div
        className={cn(
          'flex',
          orientation === 'vertical' ? 'flex-col gap-3' : 'flex-row flex-wrap gap-4'
        )}
        role="radiogroup"
      >
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            size={size}
            label={option.label}
            description={option.description}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
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

RadioGroup.displayName = 'RadioGroup';
