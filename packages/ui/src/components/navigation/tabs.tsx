// ==========================================================================
// TABS COMPONENT
// Tab navigation with panels
// ==========================================================================

import React, { createContext, useContext, useState, useId, useCallback } from 'react';
import { cn } from '../../utils.js';

export type TabsVariant = 'underline' | 'pills' | 'boxed';
export type TabsSize = 'sm' | 'md' | 'lg';

// ==========================================================================
// TABS CONTEXT
// ==========================================================================

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
  variant: TabsVariant;
  size: TabsSize;
  baseId: string;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tab components must be used within Tabs');
  }
  return context;
};

// ==========================================================================
// TABS ROOT
// ==========================================================================

export interface TabsProps {
  /** Default active tab (uncontrolled) */
  defaultValue?: string;
  /** Active tab value (controlled) */
  value?: string;
  /** Tab change handler */
  onValueChange?: (value: string) => void;
  /** Visual variant */
  variant?: TabsVariant;
  /** Size */
  size?: TabsSize;
  /** Orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Children */
  children: React.ReactNode;
  /** Custom class name */
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  defaultValue,
  value,
  onValueChange,
  variant = 'underline',
  size = 'md',
  orientation = 'horizontal',
  children,
  className,
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const baseId = useId();

  const activeTab = value ?? internalValue;

  const setActiveTab = useCallback(
    (newValue: string) => {
      if (value === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    },
    [value, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, variant, size, baseId }}>
      <div
        className={cn(
          orientation === 'vertical' && 'flex gap-4',
          className
        )}
        data-orientation={orientation}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
};

Tabs.displayName = 'Tabs';

// ==========================================================================
// TAB LIST
// ==========================================================================

export interface TabListProps {
  /** Tab triggers */
  children: React.ReactNode;
  /** Custom class name */
  className?: string;
  /** Aria label for tab list */
  'aria-label'?: string;
}

const variantListClasses: Record<TabsVariant, string> = {
  underline: 'border-b border-neutral-200 dark:border-neutral-700',
  pills: 'bg-neutral-100 dark:bg-neutral-800 rounded-lg p-1',
  boxed: 'border border-neutral-200 dark:border-neutral-700 rounded-lg p-1',
};

export const TabList: React.FC<TabListProps> = ({
  children,
  className,
  'aria-label': ariaLabel,
}) => {
  const { variant } = useTabsContext();

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex gap-1',
        variantListClasses[variant],
        className
      )}
    >
      {children}
    </div>
  );
};

TabList.displayName = 'TabList';

// ==========================================================================
// TAB TRIGGER
// ==========================================================================

export interface TabTriggerProps {
  /** Tab value */
  value: string;
  /** Tab label */
  children: React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
  /** Icon before label */
  icon?: React.ReactNode;
  /** Custom class name */
  className?: string;
}

const sizeClasses: Record<TabsSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

const variantTriggerClasses: Record<TabsVariant, { base: string; active: string; inactive: string }> = {
  underline: {
    base: cn(
      'relative -mb-px border-b-2 transition-colors duration-fast',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20'
    ),
    active: 'border-brand-500 text-brand-600 dark:text-brand-400',
    inactive: cn(
      'border-transparent',
      'text-neutral-500 dark:text-neutral-400',
      'hover:text-neutral-700 dark:hover:text-neutral-300',
      'hover:border-neutral-300 dark:hover:border-neutral-600'
    ),
  },
  pills: {
    base: cn(
      'rounded-md transition-all duration-fast',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20'
    ),
    active: 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm',
    inactive: cn(
      'text-neutral-500 dark:text-neutral-400',
      'hover:text-neutral-700 dark:hover:text-neutral-300',
      'hover:bg-white/50 dark:hover:bg-neutral-700/50'
    ),
  },
  boxed: {
    base: cn(
      'rounded-md transition-all duration-fast',
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20'
    ),
    active: 'bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400',
    inactive: cn(
      'text-neutral-500 dark:text-neutral-400',
      'hover:text-neutral-700 dark:hover:text-neutral-300',
      'hover:bg-neutral-50 dark:hover:bg-neutral-800'
    ),
  },
};

export const TabTrigger: React.FC<TabTriggerProps> = ({
  value,
  children,
  disabled = false,
  icon,
  className,
}) => {
  const { activeTab, setActiveTab, variant, size, baseId } = useTabsContext();
  const isActive = activeTab === value;
  const styles = variantTriggerClasses[variant];

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      onClick={() => setActiveTab(value)}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium',
        sizeClasses[size],
        styles.base,
        isActive ? styles.active : styles.inactive,
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
};

TabTrigger.displayName = 'TabTrigger';

// ==========================================================================
// TAB CONTENT
// ==========================================================================

export interface TabContentProps {
  /** Tab value */
  value: string;
  /** Panel content */
  children: React.ReactNode;
  /** Force mount (keep in DOM when hidden) */
  forceMount?: boolean;
  /** Custom class name */
  className?: string;
}

export const TabContent: React.FC<TabContentProps> = ({
  value,
  children,
  forceMount = false,
  className,
}) => {
  const { activeTab, baseId } = useTabsContext();
  const isActive = activeTab === value;

  if (!isActive && !forceMount) {
    return null;
  }

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      hidden={!isActive}
      tabIndex={0}
      className={cn(
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:ring-offset-2',
        'mt-4',
        className
      )}
    >
      {children}
    </div>
  );
};

TabContent.displayName = 'TabContent';
