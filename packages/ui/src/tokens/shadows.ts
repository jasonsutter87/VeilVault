// ==========================================================================
// SHADOW TOKENS
// Subtle Stripe-inspired shadows - very light, almost invisible
// ==========================================================================

// Light mode shadows
export const shadows = {
  none: 'none',

  // Elevation levels
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.03)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',

  // Inner shadow
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.03)',
} as const;

// Semantic shadows for specific components
export const componentShadows = {
  // Cards & containers
  card: shadows.sm,
  cardHover: shadows.md,
  cardActive: shadows.xs,

  // Dropdowns & popovers
  dropdown: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
  popover: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',

  // Modals & dialogs
  modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
  drawer: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',

  // Tooltips
  tooltip: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',

  // Buttons (subtle lift on hover)
  buttonHover: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',

  // Inputs (focus state)
  inputFocus: '0 0 0 3px rgba(59, 130, 246, 0.15)',
} as const;

// Focus ring shadows
export const focusRings = {
  // Default focus ring (brand color)
  default: '0 0 0 2px rgba(59, 130, 246, 0.5)',
  brand: '0 0 0 2px rgba(59, 130, 246, 0.5)',

  // Status focus rings
  success: '0 0 0 2px rgba(34, 197, 94, 0.5)',
  warning: '0 0 0 2px rgba(234, 179, 8, 0.5)',
  error: '0 0 0 2px rgba(239, 68, 68, 0.5)',

  // Offset focus ring (for elements with borders)
  offset: '0 0 0 2px #ffffff, 0 0 0 4px rgba(59, 130, 246, 0.5)',
} as const;

// Dark mode shadows (deeper shadows for contrast)
export const darkShadows = {
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.2)',
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.2)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.35), 0 2px 4px -2px rgba(0, 0, 0, 0.25)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.35), 0 4px 6px -4px rgba(0, 0, 0, 0.25)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',

  card: '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.2)',
  dropdown: '0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
  modal: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
} as const;

// Type exports
export type Shadow = keyof typeof shadows;
export type ComponentShadow = keyof typeof componentShadows;
export type FocusRing = keyof typeof focusRings;
