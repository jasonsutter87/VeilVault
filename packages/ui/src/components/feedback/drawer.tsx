// ==========================================================================
// DRAWER COMPONENT
// Slide-out panel for secondary content
// ==========================================================================

import React, { useEffect, useRef, useCallback } from 'react';
import { cn } from '../../utils.js';

export type DrawerPosition = 'left' | 'right' | 'top' | 'bottom';
export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface DrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** Drawer title */
  title?: string;
  /** Drawer description */
  description?: string;
  /** Drawer content */
  children: React.ReactNode;
  /** Footer content */
  footer?: React.ReactNode;
  /** Position */
  position?: DrawerPosition;
  /** Size */
  size?: DrawerSize;
  /** Close on backdrop click */
  closeOnBackdrop?: boolean;
  /** Close on escape key */
  closeOnEscape?: boolean;
  /** Show close button */
  showCloseButton?: boolean;
  /** Custom class name for content */
  className?: string;
}

const sizeClasses: Record<DrawerPosition, Record<DrawerSize, string>> = {
  left: {
    sm: 'w-64',
    md: 'w-80',
    lg: 'w-96',
    xl: 'w-[28rem]',
    full: 'w-full max-w-lg',
  },
  right: {
    sm: 'w-64',
    md: 'w-80',
    lg: 'w-96',
    xl: 'w-[28rem]',
    full: 'w-full max-w-lg',
  },
  top: {
    sm: 'h-48',
    md: 'h-64',
    lg: 'h-80',
    xl: 'h-96',
    full: 'h-full max-h-[80vh]',
  },
  bottom: {
    sm: 'h-48',
    md: 'h-64',
    lg: 'h-80',
    xl: 'h-96',
    full: 'h-full max-h-[80vh]',
  },
};

const positionClasses: Record<DrawerPosition, string> = {
  left: 'left-0 top-0 h-full',
  right: 'right-0 top-0 h-full',
  top: 'top-0 left-0 w-full',
  bottom: 'bottom-0 left-0 w-full',
};

const animationClasses: Record<DrawerPosition, { enter: string; exit: string }> = {
  left: {
    enter: 'animate-[slideInLeft_200ms_ease-out]',
    exit: '-translate-x-full',
  },
  right: {
    enter: 'animate-[slideInRight_200ms_ease-out]',
    exit: 'translate-x-full',
  },
  top: {
    enter: 'animate-[slideInTop_200ms_ease-out]',
    exit: '-translate-y-full',
  },
  bottom: {
    enter: 'animate-[slideInBottom_200ms_ease-out]',
    exit: 'translate-y-full',
  },
};

// Close icon
const CloseIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
  </svg>
);

export const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  position = 'right',
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
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
      drawerRef.current?.focus();

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
    if (e.key !== 'Tab' || !drawerRef.current) return;

    const focusableElements = drawerRef.current.querySelectorAll(
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
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'drawer-title' : undefined}
      aria-describedby={description ? 'drawer-description' : undefined}
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

      {/* Drawer */}
      <div
        ref={drawerRef}
        className={cn(
          'absolute flex flex-col',
          positionClasses[position],
          sizeClasses[position][size],
          'bg-white dark:bg-neutral-900',
          'border-neutral-200 dark:border-neutral-700',
          position === 'left' && 'border-r',
          position === 'right' && 'border-l',
          position === 'top' && 'border-b',
          position === 'bottom' && 'border-t',
          'shadow-modal',
          animationClasses[position].enter,
          'focus:outline-none'
        )}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div
            className={cn(
              'flex items-start justify-between gap-4 flex-shrink-0',
              'px-6 py-4',
              'border-b border-neutral-200 dark:border-neutral-700'
            )}
          >
            <div>
              {title && (
                <h2
                  id="drawer-title"
                  className="text-lg font-semibold text-neutral-900 dark:text-neutral-100"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id="drawer-description"
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
                aria-label="Close drawer"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={cn('flex-1 overflow-y-auto px-6 py-4', className)}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className={cn(
              'flex items-center justify-end gap-3 flex-shrink-0',
              'px-6 py-4',
              'border-t border-neutral-200 dark:border-neutral-700',
              'bg-neutral-50 dark:bg-neutral-800/50'
            )}
          >
            {footer}
          </div>
        )}
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes slideInTop {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        @keyframes slideInBottom {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

Drawer.displayName = 'Drawer';
