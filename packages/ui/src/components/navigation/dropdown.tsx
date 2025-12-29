// ==========================================================================
// DROPDOWN COMPONENT
// Menu dropdown with keyboard navigation
// ==========================================================================

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { cn } from '../../utils.js';

export type DropdownAlign = 'start' | 'center' | 'end';
export type DropdownSide = 'top' | 'bottom' | 'left' | 'right';

// ==========================================================================
// DROPDOWN ROOT
// ==========================================================================

export interface DropdownProps {
  /** Trigger element */
  trigger: React.ReactNode;
  /** Dropdown content */
  children: React.ReactNode;
  /** Alignment */
  align?: DropdownAlign;
  /** Side to open on */
  side?: DropdownSide;
  /** Controlled open state */
  open?: boolean;
  /** Open change handler */
  onOpenChange?: (open: boolean) => void;
  /** Close on item select */
  closeOnSelect?: boolean;
  /** Custom class name for menu */
  className?: string;
}

const alignClasses: Record<DropdownAlign, string> = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
};

const sideClasses: Record<DropdownSide, string> = {
  top: 'bottom-full mb-1',
  bottom: 'top-full mt-1',
  left: 'right-full mr-1',
  right: 'left-full ml-1',
};

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  align = 'start',
  side = 'bottom',
  open: controlledOpen,
  onOpenChange,
  closeOnSelect = true,
  className,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        !triggerRef.current?.contains(e.target as Node) &&
        !menuRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, setOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  // Keyboard navigation in menu
  const handleMenuKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = menuRef.current?.querySelectorAll<HTMLElement>(
      '[role="menuitem"]:not([disabled])'
    );
    if (!items?.length) return;

    const currentIndex = Array.from(items).findIndex(
      (item) => item === document.activeElement
    );

    const itemsArray = Array.from(items);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        itemsArray[(currentIndex + 1) % itemsArray.length]?.focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        itemsArray[(currentIndex - 1 + itemsArray.length) % itemsArray.length]?.focus();
        break;
      case 'Home':
        e.preventDefault();
        itemsArray[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        itemsArray[itemsArray.length - 1]?.focus();
        break;
    }
  }, []);

  // Focus first item when menu opens
  useEffect(() => {
    if (isOpen) {
      const firstItem = menuRef.current?.querySelector<HTMLElement>(
        '[role="menuitem"]:not([disabled])'
      );
      firstItem?.focus();
    }
  }, [isOpen]);

  const handleItemClick = () => {
    if (closeOnSelect) {
      setOpen(false);
    }
  };

  return (
    <div className="relative inline-block">
      {/* Trigger */}
      <div
        ref={triggerRef}
        onClick={() => setOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
      >
        {trigger}
      </div>

      {/* Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-orientation="vertical"
          onKeyDown={handleMenuKeyDown}
          onClick={handleItemClick}
          className={cn(
            'absolute z-50 min-w-[180px]',
            'bg-white dark:bg-neutral-800',
            'border border-neutral-200 dark:border-neutral-700',
            'rounded-lg shadow-dropdown',
            'py-1',
            'animate-fadeIn',
            alignClasses[align],
            sideClasses[side],
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
};

Dropdown.displayName = 'Dropdown';

// ==========================================================================
// DROPDOWN ITEM
// ==========================================================================

export interface DropdownItemProps {
  /** Item content */
  children: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Destructive action */
  destructive?: boolean;
  /** Icon before label */
  icon?: React.ReactNode;
  /** Keyboard shortcut */
  shortcut?: string;
  /** Custom class name */
  className?: string;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  children,
  onClick,
  disabled = false,
  destructive = false,
  icon,
  shortcut,
  className,
}) => {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-sm',
        'text-left transition-colors duration-fast',
        'focus:outline-none focus:bg-neutral-100 dark:focus:bg-neutral-700',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : destructive
          ? [
              'text-error-600 dark:text-error-400',
              'hover:bg-error-50 dark:hover:bg-error-900/20',
            ]
          : [
              'text-neutral-700 dark:text-neutral-300',
              'hover:bg-neutral-100 dark:hover:bg-neutral-700',
            ],
        className
      )}
    >
      {icon && (
        <span className="flex-shrink-0 w-4 h-4">{icon}</span>
      )}
      <span className="flex-1">{children}</span>
      {shortcut && (
        <span className="text-xs text-neutral-400 dark:text-neutral-500">
          {shortcut}
        </span>
      )}
    </button>
  );
};

DropdownItem.displayName = 'DropdownItem';

// ==========================================================================
// DROPDOWN SEPARATOR
// ==========================================================================

export const DropdownSeparator: React.FC<{ className?: string }> = ({
  className,
}) => (
  <div
    role="separator"
    className={cn(
      'my-1 h-px bg-neutral-200 dark:bg-neutral-700',
      className
    )}
  />
);

DropdownSeparator.displayName = 'DropdownSeparator';

// ==========================================================================
// DROPDOWN LABEL
// ==========================================================================

export interface DropdownLabelProps {
  /** Label text */
  children: React.ReactNode;
  /** Custom class name */
  className?: string;
}

export const DropdownLabel: React.FC<DropdownLabelProps> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      'px-3 py-1.5 text-xs font-semibold uppercase tracking-wider',
      'text-neutral-400 dark:text-neutral-500',
      className
    )}
  >
    {children}
  </div>
);

DropdownLabel.displayName = 'DropdownLabel';

// ==========================================================================
// DROPDOWN CHECKBOX ITEM
// ==========================================================================

export interface DropdownCheckboxItemProps {
  /** Item content */
  children: React.ReactNode;
  /** Checked state */
  checked: boolean;
  /** Change handler */
  onCheckedChange: (checked: boolean) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

const CheckIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 16 16" fill="currentColor">
    <path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" />
  </svg>
);

export const DropdownCheckboxItem: React.FC<DropdownCheckboxItemProps> = ({
  children,
  checked,
  onCheckedChange,
  disabled = false,
  className,
}) => {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onCheckedChange(!checked);
      }}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-sm',
        'text-left transition-colors duration-fast',
        'focus:outline-none focus:bg-neutral-100 dark:focus:bg-neutral-700',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : [
              'text-neutral-700 dark:text-neutral-300',
              'hover:bg-neutral-100 dark:hover:bg-neutral-700',
            ],
        className
      )}
    >
      <span
        className={cn(
          'flex-shrink-0 w-4 h-4 flex items-center justify-center',
          'rounded border',
          checked
            ? 'bg-brand-500 border-brand-500 text-white'
            : 'border-neutral-300 dark:border-neutral-600'
        )}
      >
        {checked && <CheckIcon className="w-3 h-3" />}
      </span>
      <span className="flex-1">{children}</span>
    </button>
  );
};

DropdownCheckboxItem.displayName = 'DropdownCheckboxItem';
