// ==========================================================================
// MODAL COMPONENT
// Dialog overlay with focus trap
// ==========================================================================

import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from '../../utils.js';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Modal description */
  description?: string;
  /** Modal content */
  children: React.ReactNode;
  /** Footer content (usually buttons) */
  footer?: React.ReactNode;
  /** Size variant */
  size?: ModalSize;
  /** Close on backdrop click */
  closeOnBackdrop?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
  /** Show close button */
  showCloseButton?: boolean;
  /** Custom class name for content */
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-4xl',
};

// Close icon
const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
  </svg>
);

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // Handle escape key
  useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, closeOnEscape, onClose]);

  // Focus management
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement;
      modalRef.current?.focus();

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      document.body.style.overflow = '';

      // Return focus
      if (previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement?.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement?.focus();
    }
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      {/* Backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/50 dark:bg-black/70',
          'animate-fadeIn'
        )}
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={cn(
          'relative w-full',
          sizeClasses[size],
          'bg-white dark:bg-neutral-900',
          'border border-neutral-200 dark:border-neutral-700',
          'rounded-lg shadow-modal',
          'animate-scaleIn',
          'focus:outline-none'
        )}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div
            className={cn(
              'flex items-start justify-between gap-4',
              'px-6 py-4',
              'border-b border-neutral-200 dark:border-neutral-700'
            )}
          >
            <div>
              {title && (
                <h2
                  id="modal-title"
                  className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id="modal-description"
                  className="mt-1 text-sm text-neutral-500 dark:text-neutral-400"
                >
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className={cn(
                  'p-1 rounded-md -m-1',
                  'text-neutral-400 dark:text-neutral-500',
                  'hover:text-neutral-600 dark:hover:text-neutral-300',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500/20',
                  'transition-colors duration-fast'
                )}
                aria-label="Close modal"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={cn('px-6 py-4', className)}>{children}</div>

        {/* Footer */}
        {footer && (
          <div
            className={cn(
              'flex items-center justify-end gap-3',
              'px-6 py-4',
              'border-t border-neutral-200 dark:border-neutral-700',
              'bg-neutral-50 dark:bg-neutral-800/50',
              'rounded-b-lg'
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

Modal.displayName = 'Modal';

// ==========================================================================
// CONFIRM MODAL
// Pre-styled confirmation dialog
// ==========================================================================

export interface ConfirmModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Confirm handler */
  onConfirm: () => void;
  /** Modal title */
  title: string;
  /** Modal description */
  description?: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Variant for confirm button */
  variant?: 'primary' | 'danger';
  /** Loading state */
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  loading = false,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md',
              'border border-neutral-200 dark:border-neutral-700',
              'bg-white dark:bg-neutral-900',
              'text-neutral-700 dark:text-neutral-300',
              'hover:bg-neutral-50 dark:hover:bg-neutral-800',
              'focus:outline-none focus:ring-2 focus:ring-brand-500/20',
              'transition-colors duration-fast',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-md',
              'text-white',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              'transition-colors duration-fast',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              variant === 'danger'
                ? [
                    'bg-error-500 hover:bg-error-600',
                    'focus:ring-error-500/20',
                  ]
                : [
                    'bg-brand-500 hover:bg-brand-600',
                    'focus:ring-brand-500/20',
                  ]
            )}
          >
            {loading ? 'Loading...' : confirmText}
          </button>
        </>
      }
    >
      {/* Empty content - description is in the header */}
      <span className="sr-only">{description}</span>
    </Modal>
  );
};

ConfirmModal.displayName = 'ConfirmModal';
