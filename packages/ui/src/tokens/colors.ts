// ==========================================================================
// COLOR TOKENS
// Light and Dark mode palettes - Notion/Stripe inspired
// ==========================================================================

// Light Mode (Default)
export const lightColors = {
  // Brand - Blue scale
  brand: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Primary
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // Status - Traffic light system
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e', // Primary
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  warning: {
    50: '#fefce8',
    100: '#fef9c3',
    200: '#fef08a',
    300: '#fde047',
    400: '#facc15',
    500: '#eab308', // Primary
    600: '#ca8a04',
    700: '#a16207',
    800: '#854d0e',
    900: '#713f12',
  },

  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444', // Primary
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Neutral - Notion-inspired grays
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a',
  },

  // Semantic aliases
  background: {
    primary: '#ffffff',
    secondary: '#fafafa',
    tertiary: '#f5f5f5',
  },

  foreground: {
    primary: '#171717',
    secondary: '#525252',
    tertiary: '#737373',
    muted: '#a3a3a3',
    inverse: '#ffffff',
  },

  border: {
    light: '#f5f5f5',
    default: '#e5e5e5',
    dark: '#d4d4d4',
  },
} as const;

// Dark Mode
export const darkColors = {
  // Brand - Adjusted for dark backgrounds
  brand: {
    50: '#1e3a8a',
    100: '#1e40af',
    200: '#1d4ed8',
    300: '#2563eb',
    400: '#3b82f6',
    500: '#60a5fa', // Primary (lighter in dark mode)
    600: '#93c5fd',
    700: '#bfdbfe',
    800: '#dbeafe',
    900: '#eff6ff',
  },

  // Status - Slightly adjusted for dark mode
  success: {
    50: '#052e16',
    100: '#14532d',
    200: '#166534',
    300: '#15803d',
    400: '#16a34a',
    500: '#22c55e',
    600: '#4ade80',
    700: '#86efac',
    800: '#bbf7d0',
    900: '#dcfce7',
  },

  warning: {
    50: '#422006',
    100: '#713f12',
    200: '#854d0e',
    300: '#a16207',
    400: '#ca8a04',
    500: '#eab308',
    600: '#facc15',
    700: '#fde047',
    800: '#fef08a',
    900: '#fef9c3',
  },

  error: {
    50: '#450a0a',
    100: '#7f1d1d',
    200: '#991b1b',
    300: '#b91c1c',
    400: '#dc2626',
    500: '#ef4444',
    600: '#f87171',
    700: '#fca5a5',
    800: '#fecaca',
    900: '#fee2e2',
  },

  // Neutral - Inverted for dark mode
  neutral: {
    0: '#0a0a0a',
    50: '#171717',
    100: '#262626',
    200: '#404040',
    300: '#525252',
    400: '#737373',
    500: '#a3a3a3',
    600: '#d4d4d4',
    700: '#e5e5e5',
    800: '#f5f5f5',
    900: '#fafafa',
    950: '#ffffff',
  },

  // Semantic aliases
  background: {
    primary: '#0a0a0a',
    secondary: '#171717',
    tertiary: '#262626',
  },

  foreground: {
    primary: '#fafafa',
    secondary: '#d4d4d4',
    tertiary: '#a3a3a3',
    muted: '#737373',
    inverse: '#171717',
  },

  border: {
    light: '#262626',
    default: '#404040',
    dark: '#525252',
  },
} as const;

// CSS Variable names for theme switching
export const cssVariables = {
  // Background
  '--color-bg-primary': 'var(--color-bg-primary)',
  '--color-bg-secondary': 'var(--color-bg-secondary)',
  '--color-bg-tertiary': 'var(--color-bg-tertiary)',

  // Foreground
  '--color-fg-primary': 'var(--color-fg-primary)',
  '--color-fg-secondary': 'var(--color-fg-secondary)',
  '--color-fg-tertiary': 'var(--color-fg-tertiary)',
  '--color-fg-muted': 'var(--color-fg-muted)',

  // Brand
  '--color-brand-50': 'var(--color-brand-50)',
  '--color-brand-100': 'var(--color-brand-100)',
  '--color-brand-500': 'var(--color-brand-500)',
  '--color-brand-600': 'var(--color-brand-600)',
  '--color-brand-700': 'var(--color-brand-700)',

  // Status
  '--color-success-500': 'var(--color-success-500)',
  '--color-warning-500': 'var(--color-warning-500)',
  '--color-error-500': 'var(--color-error-500)',

  // Border
  '--color-border-light': 'var(--color-border-light)',
  '--color-border-default': 'var(--color-border-default)',
  '--color-border-dark': 'var(--color-border-dark)',
} as const;

// Type exports
export type ColorScale = typeof lightColors.brand;
export type SemanticColors = typeof lightColors.background;
export type ColorTheme = 'light' | 'dark';
