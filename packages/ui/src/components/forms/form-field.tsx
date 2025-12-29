// ==========================================================================
// FORM FIELD COMPONENT
// Wrapper component for consistent form field layout
// ==========================================================================

import React, { useId } from 'react';
import { cn } from '../../utils.js';

export interface FormFieldProps {
  /** Field label */
  label?: string;
  /** Label position */
  labelPosition?: 'top' | 'left' | 'hidden';
  /** Error message */
  error?: string;
  /** Helper text */
  hint?: string;
  /** Required indicator */
  required?: boolean;
  /** Disabled state (passed to children via context) */
  disabled?: boolean;
  /** HTML id for the form control */
  htmlFor?: string;
  /** Children - the form control */
  children: React.ReactNode;
  /** Full width */
  fullWidth?: boolean;
  /** Custom class name */
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  labelPosition = 'top',
  error,
  hint,
  required,
  disabled,
  htmlFor,
  children,
  fullWidth = true,
  className,
}) => {
  const generatedId = useId();
  const fieldId = htmlFor || generatedId;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;

  // Clone children to inject props
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
        id: fieldId,
        disabled,
        required,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': cn(
          error && errorId,
          hint && !error && hintId
        ) || undefined,
      });
    }
    return child;
  });

  if (labelPosition === 'left') {
    return (
      <div
        className={cn(
          'grid grid-cols-[auto_1fr] items-start gap-4',
          fullWidth && 'w-full',
          className
        )}
      >
        {label && (
          <label
            htmlFor={fieldId}
            className={cn(
              'pt-2 text-sm font-medium',
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

        <div className="flex flex-col">
          {enhancedChildren}

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
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', fullWidth && 'w-full', className)}>
      {label && labelPosition !== 'hidden' && (
        <label
          htmlFor={fieldId}
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

      {/* Screen reader only label for hidden labels */}
      {label && labelPosition === 'hidden' && (
        <label htmlFor={fieldId} className="sr-only">
          {label}
          {required && ' (required)'}
        </label>
      )}

      {enhancedChildren}

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
};

FormField.displayName = 'FormField';

// ==========================================================================
// FORM SECTION
// Group related form fields with a heading
// ==========================================================================

export interface FormSectionProps {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Children - form fields */
  children: React.ReactNode;
  /** Custom class name */
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {description}
            </p>
          )}
        </div>
      )}

      <div className="space-y-4">{children}</div>
    </div>
  );
};

FormSection.displayName = 'FormSection';

// ==========================================================================
// FORM ACTIONS
// Container for form submit/cancel buttons
// ==========================================================================

export interface FormActionsProps {
  /** Alignment of buttons */
  align?: 'left' | 'right' | 'center' | 'between';
  /** Children - buttons */
  children: React.ReactNode;
  /** Add top border */
  border?: boolean;
  /** Custom class name */
  className?: string;
}

export const FormActions: React.FC<FormActionsProps> = ({
  align = 'right',
  children,
  border = false,
  className,
}) => {
  const alignClasses: Record<string, string> = {
    left: 'justify-start',
    right: 'justify-end',
    center: 'justify-center',
    between: 'justify-between',
  };

  return (
    <div
      className={cn(
        'flex flex-wrap gap-3',
        alignClasses[align],
        border && 'border-t border-neutral-200 dark:border-neutral-700 pt-4',
        className
      )}
    >
      {children}
    </div>
  );
};

FormActions.displayName = 'FormActions';
