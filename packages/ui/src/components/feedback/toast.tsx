// ==========================================================================
// TOAST COMPONENT
// Notification toasts with automatic dismissal
// ==========================================================================

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { cn } from '../../utils.js';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Icons for each toast type
const icons: Record<ToastType, React.FC<{ className?: string }>> = {
  success: ({ className }) => (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
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
  warning: ({ className }) => (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  ),
  info: ({ className }) => (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

const typeStyles: Record<ToastType, string> = {
  success: 'text-success-500',
  error: 'text-error-500',
  warning: 'text-warning-500',
  info: 'text-brand-500',
};

// Close icon
const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
  </svg>
);

// ==========================================================================
// TOAST ITEM
// ==========================================================================

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

export const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const { id, type, title, description, duration = 5000, action } = toast;
  const Icon = icons[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => onDismiss(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, duration, onDismiss]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 w-full max-w-sm p-4',
        'bg-white dark:bg-neutral-800',
        'border border-neutral-200 dark:border-neutral-700',
        'rounded-lg shadow-dropdown',
        'animate-slideUp'
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Icon */}
      <div className={cn('flex-shrink-0 mt-0.5', typeStyles[type])}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {title}
        </p>
        {description && (
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {description}
          </p>
        )}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={cn(
              'mt-2 text-sm font-medium',
              'text-brand-600 dark:text-brand-400',
              'hover:text-brand-700 dark:hover:text-brand-300',
              'transition-colors duration-fast'
            )}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Close button */}
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className={cn(
          'flex-shrink-0 p-1 rounded-md',
          'text-neutral-400 dark:text-neutral-500',
          'hover:text-neutral-600 dark:hover:text-neutral-300',
          'hover:bg-neutral-100 dark:hover:bg-neutral-700',
          'focus:outline-none focus:ring-2 focus:ring-brand-500/20',
          'transition-colors duration-fast'
        )}
        aria-label="Dismiss"
      >
        <CloseIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

// ==========================================================================
// TOAST CONTAINER
// ==========================================================================

interface ToastContainerProps {
  position?: ToastPosition;
}

const positionClasses: Record<ToastPosition, string> = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-center': 'top-4 left-1/2 -translate-x-1/2',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
};

export const ToastContainer: React.FC<ToastContainerProps> = ({
  position = 'top-right',
}) => {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-2',
        positionClasses[position]
      )}
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
};

// ==========================================================================
// TOAST CONTEXT
// ==========================================================================

interface ToastContextValue {
  toasts: Toast[];
  toast: (options: Omit<Toast, 'id'>) => string;
  success: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => string;
  error: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => string;
  warning: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => string;
  info: (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// ==========================================================================
// TOAST PROVIDER
// ==========================================================================

interface ToastProviderProps {
  children: React.ReactNode;
  /** Maximum number of toasts to show */
  limit?: number;
  /** Default toast duration */
  defaultDuration?: number;
}

let toastCounter = 0;

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  limit = 5,
  defaultDuration = 5000,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    (options: Omit<Toast, 'id'>): string => {
      const id = `toast-${++toastCounter}`;
      const newToast: Toast = {
        id,
        duration: defaultDuration,
        ...options,
      };

      setToasts((prev) => {
        const updated = [...prev, newToast];
        return updated.slice(-limit);
      });

      return id;
    },
    [defaultDuration, limit]
  );

  const success = useCallback(
    (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) =>
      toast({ type: 'success', title, ...options }),
    [toast]
  );

  const error = useCallback(
    (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) =>
      toast({ type: 'error', title, ...options }),
    [toast]
  );

  const warning = useCallback(
    (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) =>
      toast({ type: 'warning', title, ...options }),
    [toast]
  );

  const info = useCallback(
    (title: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'title'>>) =>
      toast({ type: 'info', title, ...options }),
    [toast]
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider
      value={{ toasts, toast, success, error, warning, info, dismiss, dismissAll }}
    >
      {children}
    </ToastContext.Provider>
  );
};

ToastProvider.displayName = 'ToastProvider';
