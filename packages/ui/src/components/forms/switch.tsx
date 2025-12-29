// ==========================================================================
// SWITCH COMPONENT
// Toggle switch for boolean values
// ==========================================================================

import React, { forwardRef, useId } from 'react';
import { cn } from '../../utils.js';

export type SwitchSize = 'sm' | 'md' | 'lg';

export interface SwitchProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** Visual size */
  size?: SwitchSize;
  /** Switch label */
  label?: string;
  /** Description text below label */
  description?: string;
  /** Label position */
  labelPosition?: 'left' | 'right';
}

const sizeClasses: Record<
  SwitchSize,
  { track: string; thumb: string; translate: string; label: string; desc: string }
> = {
  sm: {
    track: 'h-4 w-7',
    thumb: 'h-3 w-3',
    translate: 'translate-x-3',
    label: 'text-sm',
    desc: 'text-xs',
  },
  md: {
    track: 'h-5 w-9',
    thumb: 'h-4 w-4',
    translate: 'translate-x-4',
    label: 'text-sm',
    desc: 'text-sm',
  },
  lg: {
    track: 'h-6 w-11',
    thumb: 'h-5 w-5',
    translate: 'translate-x-5',
    label: 'text-base',
    desc: 'text-sm',
  },
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  (
    {
      className,
      size = 'md',
      label,
      description,
      labelPosition = 'right',
      id,
      disabled,
      checked,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const switchId = id || generatedId;
    const descriptionId = `${switchId}-description`;

    const sizeClass = sizeClasses[size];

    const switchElement = (
      <div className="relative inline-flex items-center">
        <input
          ref={ref}
          type="checkbox"
          id={switchId}
          role="switch"
          disabled={disabled}
          checked={checked}
          className="sr-only peer"
          aria-describedby={description ? descriptionId : undefined}
          {...props}
        />

        {/* Track */}
        <div
          className={cn(
            'rounded-full transition-colors duration-fast',
            sizeClass.track,

            // Default state
            'bg-neutral-200 dark:bg-neutral-700',

            // Hover
            'peer-hover:bg-neutral-300 dark:peer-hover:bg-neutral-600',

            // Focus
            'peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/20',
            'peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-offset-neutral-900',

            // Checked state
            'peer-checked:bg-brand-500 dark:peer-checked:bg-brand-400',
            'peer-checked:peer-hover:bg-brand-600 dark:peer-checked:peer-hover:bg-brand-500',

            // Disabled
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />

        {/* Thumb */}
        <div
          className={cn(
            'absolute left-0.5 top-1/2 -translate-y-1/2',
            'rounded-full bg-white shadow-sm',
            'transition-transform duration-fast',
            sizeClass.thumb,

            // Move when checked
            checked && sizeClass.translate
          )}
        />
      </div>
    );

    const labelElement = (label || description) && (
      <div className={cn(labelPosition === 'left' ? 'mr-3' : 'ml-3')}>
        {label && (
          <label
            htmlFor={switchId}
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
    );

    return (
      <div className={cn('inline-flex items-center', className)}>
        {labelPosition === 'left' && labelElement}
        {switchElement}
        {labelPosition === 'right' && labelElement}
      </div>
    );
  }
);

Switch.displayName = 'Switch';
