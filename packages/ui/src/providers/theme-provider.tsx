// ==========================================================================
// THEME PROVIDER
// Manages light/dark theme with system preference support
// ==========================================================================

'use client';

import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  ThemeContext,
  type Theme,
  type ResolvedTheme,
  type ThemeContextValue,
  getSystemTheme,
  resolveTheme,
} from '../hooks/use-theme.js';

const STORAGE_KEY = 'veilvault-theme';

export interface ThemeProviderProps {
  /** Child components */
  children: React.ReactNode;
  /** Default theme if none stored */
  defaultTheme?: Theme;
  /** Force a specific theme (ignores user preference) */
  forcedTheme?: ResolvedTheme;
  /** Storage key for persisting theme preference */
  storageKey?: string;
  /** Disable system theme detection */
  disableSystemTheme?: boolean;
  /** Attribute to set on document element ('class' or 'data-theme') */
  attribute?: 'class' | 'data-theme';
}

/**
 * ThemeProvider component
 *
 * Provides theme context to the application with:
 * - Light mode default
 * - Dark mode toggle
 * - System preference detection
 * - Persistence via localStorage
 * - SSR-safe hydration
 */
export function ThemeProvider({
  children,
  defaultTheme = 'light',
  forcedTheme,
  storageKey = STORAGE_KEY,
  disableSystemTheme = false,
  attribute = 'class',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize theme from storage or system preference
  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as Theme | null;

    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      setThemeState(stored);
    } else if (!disableSystemTheme) {
      setThemeState('system');
    }

    setIsLoading(false);
  }, [storageKey, disableSystemTheme]);

  // Resolve and apply theme
  useEffect(() => {
    const resolved = forcedTheme ?? resolveTheme(theme);
    setResolvedTheme(resolved);

    // Apply to document
    const root = document.documentElement;

    if (attribute === 'class') {
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
    } else {
      root.setAttribute('data-theme', resolved);
    }

    // Update color-scheme for native elements
    root.style.colorScheme = resolved;
  }, [theme, forcedTheme, attribute]);

  // Listen for system theme changes
  useEffect(() => {
    if (disableSystemTheme || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      setResolvedTheme(getSystemTheme());
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, disableSystemTheme]);

  // Set theme and persist
  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      localStorage.setItem(storageKey, newTheme);
    },
    [storageKey]
  );

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  }, [resolvedTheme, setTheme]);

  const value: ThemeContextValue = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      toggleTheme,
      isLoading,
    }),
    [theme, resolvedTheme, setTheme, toggleTheme, isLoading]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Script to prevent flash of wrong theme
 * Insert in <head> before any content
 */
export function ThemeScript({
  storageKey = STORAGE_KEY,
  defaultTheme = 'light',
}: {
  storageKey?: string;
  defaultTheme?: Theme;
}) {
  const script = `
    (function() {
      try {
        var stored = localStorage.getItem('${storageKey}');
        var theme = stored || '${defaultTheme}';

        if (theme === 'system') {
          theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        document.documentElement.classList.add(theme);
        document.documentElement.style.colorScheme = theme;
      } catch (e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
