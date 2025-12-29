// ==========================================================================
// USE THEME HOOK
// Hook for accessing and controlling the theme
// ==========================================================================

'use client';

import { useContext, createContext } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeContextValue {
  /** Current theme setting ('light', 'dark', or 'system') */
  theme: Theme;
  /** Resolved theme after system preference applied ('light' or 'dark') */
  resolvedTheme: ResolvedTheme;
  /** Update the theme */
  setTheme: (theme: Theme) => void;
  /** Toggle between light and dark */
  toggleTheme: () => void;
  /** Whether the theme is currently being resolved */
  isLoading: boolean;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Hook to access theme context
 * Must be used within a ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

/**
 * Get the system color scheme preference
 */
export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Resolve theme setting to actual theme
 */
export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}
