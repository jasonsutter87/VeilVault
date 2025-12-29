// ==========================================================================
// ALERT COMPONENT
// Inline alert banners for important messages
// ==========================================================================

import React from 'react';
import { cn } from '../../utils.js';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  /** Alert variant/type */
  variant?: AlertVariant;
  /** Alert title */
  title?: string;
  /** Alert message */
  children: React.ReactNode;
  /** Custom icon */
  icon?: React.ReactNode;
  /** Show icon */
  showIcon?: boolean;
  /** Dismissible */
  dismissible?: boolean;
  /** Dismiss handler */
  onDismiss?: () => void;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Custom class name */
  className?: string;
}

// Icons for each variant
const icons: Record<AlertVariant, React.FC<{ className?: string }>> = {
  info: ({ className }) => (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
  success: ({ className }) => (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
        clipRule="evenodd"
      />
    </svg>
  ),
  warning: ({ className }) => (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  ),
  error: ({ className }) => (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

const variantStyles: Record<AlertVariant, { container: string; icon: string; title: string }> = {
  info: {
    container: cn(
      'bg-brand-50 dark:bg-brand-900/20',
      'border-brand-200 dark:border-brand-800'
    ),
    icon: 'text-brand-500',
    title: 'text-brand-800 dark:text-brand-200',
  },
  success: {
    container: cn(
      'bg-success-50 dark:bg-success-900/20',
      'border-success-200 dark:border-success-800'
    ),
    icon: 'text-success-500',
    title: 'text-success-800 dark:text-success-200',
  },
  warning: {
    container: cn(
      'bg-warning-50 dark:bg-warning-900/20',
      'border-warning-200 dark:border-warning-800'
    ),
    icon: 'text-warning-500',
    title: 'text-warning-800 dark:text-warning-200',
  },
  error: {
    container: cn(
      'bg-error-50 dark:bg-error-900/20',
      'border-error-200 dark:border-error-800'
    ),
    icon: 'text-error-500',
    title: 'text-error-800 dark:text-error-200',
  },
};

// Close icon
const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
  </svg>
);

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  icon,
  showIcon = true,
  dismissible = false,
  onDismiss,
  action,
  className,
}) => {
  const styles = variantStyles[variant];
  const Icon = icons[variant];

  return (
    <div
      className={cn(
        'relative flex gap-3 p-4',
        'border rounded-lg',
        styles.container,
        className
      )}
      role="alert"
    >
      {/* Icon */}
      {showIcon && (
        <div className={cn('flex-shrink-0 mt-0.5', styles.icon)}>
          {icon || <Icon className="w-5 h-5" />}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && (
          <h3 className={cn('text-sm font-medium', styles.title)}>{title}</h3>
        )}
        <div
          className={cn(
            'text-sm',
            'text-neutral-700 dark:text-neutral-300',
            title && 'mt-1'
          )}
        >
          {children}
        </div>

        {/* Action */}
        {action && (
          <div className="mt-3">
            <button
              type="button"
              onClick={action.onClick}
              className={cn(
                'text-sm font-medium',
                styles.title,
                'hover:underline',
                'focus:outline-none focus:underline'
              )}
            >
              {action.label}
            </button>
          </div>
        )}
      </div>

      {/* Dismiss button */}
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            'flex-shrink-0 p-1 rounded-md -m-1',
            'text-neutral-400 dark:text-neutral-500',
            'hover:text-neutral-600 dark:hover:text-neutral-300',
            'hover:bg-black/5 dark:hover:bg-white/5',
            'focus:outline-none focus:ring-2 focus:ring-brand-500/20',
            'transition-colors duration-fast'
          )}
          aria-label="Dismiss"
        >
          <CloseIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

Alert.displayName = 'Alert';

// ==========================================================================
// INLINE ALERT
// Compact version for form validation
// ==========================================================================

export interface InlineAlertProps {
  /** Alert variant/type */
  variant?: AlertVariant;
  /** Alert message */
  children: React.ReactNode;
  /** Custom class name */
  className?: string;
}

export const InlineAlert: React.FC<InlineAlertProps> = ({
  variant = 'error',
  children,
  className,
}) => {
  const styles = variantStyles[variant];
  const Icon = icons[variant];

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm',
        styles.icon,
        className
      )}
      role="alert"
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-neutral-700 dark:text-neutral-300">{children}</span>
    </div>
  );
};

InlineAlert.displayName = 'InlineAlert';
