// ==========================================================================
// BREAKPOINT TOKENS
// Mobile-first responsive design breakpoints
// ==========================================================================

// Breakpoint values (min-width)
export const breakpoints = {
  sm: '640px', // Mobile landscape
  md: '768px', // Tablet
  lg: '1024px', // Desktop
  xl: '1280px', // Large desktop
  '2xl': '1536px', // Extra large
} as const;

// Media query strings for use in CSS-in-JS
export const mediaQueries = {
  sm: `@media (min-width: ${breakpoints.sm})`,
  md: `@media (min-width: ${breakpoints.md})`,
  lg: `@media (min-width: ${breakpoints.lg})`,
  xl: `@media (min-width: ${breakpoints.xl})`,
  '2xl': `@media (min-width: ${breakpoints['2xl']})`,

  // Max-width queries (for mobile-first exceptions)
  smMax: `@media (max-width: ${parseInt(breakpoints.sm) - 1}px)`,
  mdMax: `@media (max-width: ${parseInt(breakpoints.md) - 1}px)`,
  lgMax: `@media (max-width: ${parseInt(breakpoints.lg) - 1}px)`,

  // Range queries
  smOnly: `@media (min-width: ${breakpoints.sm}) and (max-width: ${parseInt(breakpoints.md) - 1}px)`,
  mdOnly: `@media (min-width: ${breakpoints.md}) and (max-width: ${parseInt(breakpoints.lg) - 1}px)`,
  lgOnly: `@media (min-width: ${breakpoints.lg}) and (max-width: ${parseInt(breakpoints.xl) - 1}px)`,

  // Orientation
  landscape: '@media (orientation: landscape)',
  portrait: '@media (orientation: portrait)',

  // Dark mode preference
  darkMode: '@media (prefers-color-scheme: dark)',
  lightMode: '@media (prefers-color-scheme: light)',

  // Reduced motion preference
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  noReducedMotion: '@media (prefers-reduced-motion: no-preference)',

  // High contrast
  highContrast: '@media (prefers-contrast: high)',

  // Hover capability (touch vs pointer devices)
  canHover: '@media (hover: hover)',
  cannotHover: '@media (hover: none)',

  // Pointer type
  finePointer: '@media (pointer: fine)',
  coarsePointer: '@media (pointer: coarse)',
} as const;

// Container widths (max-width for content containers)
export const containerWidths = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1440px',
  full: '100%',
} as const;

// Sidebar behavior by breakpoint
export const sidebarBehavior = {
  mobile: {
    maxWidth: parseInt(breakpoints.md) - 1,
    mode: 'hidden' as const, // Hamburger menu
    width: '0px',
  },
  tablet: {
    minWidth: parseInt(breakpoints.md),
    maxWidth: parseInt(breakpoints.lg) - 1,
    mode: 'collapsed' as const, // Icon-only
    width: '64px',
  },
  desktop: {
    minWidth: parseInt(breakpoints.lg),
    mode: 'expanded' as const, // Full sidebar
    width: '256px',
  },
} as const;

// Grid columns by breakpoint
export const gridColumns = {
  default: 1, // Mobile
  sm: 2, // Mobile landscape
  md: 2, // Tablet
  lg: 3, // Desktop
  xl: 4, // Large desktop
} as const;

// Type exports
export type Breakpoint = keyof typeof breakpoints;
export type MediaQuery = keyof typeof mediaQueries;
export type ContainerWidth = keyof typeof containerWidths;
