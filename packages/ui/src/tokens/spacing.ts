// ==========================================================================
// SPACING TOKENS
// 4px base unit - Notion-like generous spacing
// ==========================================================================

// Base spacing scale (in rem, 4px base)
export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem', // 12px
  3.5: '0.875rem', // 14px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  28: '7rem', // 112px
  32: '8rem', // 128px
  36: '9rem', // 144px
  40: '10rem', // 160px
  44: '11rem', // 176px
  48: '12rem', // 192px
  52: '13rem', // 208px
  56: '14rem', // 224px
  60: '15rem', // 240px
  64: '16rem', // 256px
  72: '18rem', // 288px
  80: '20rem', // 320px
  96: '24rem', // 384px
} as const;

// Semantic spacing for consistent layouts
export const semanticSpacing = {
  // Page layout
  page: {
    paddingX: spacing[6], // 24px
    paddingY: spacing[8], // 32px
    paddingXLg: spacing[8], // 32px on large screens
    maxWidth: '1440px',
  },

  // Section layout
  section: {
    gap: spacing[8], // 32px between major sections
    marginBottom: spacing[12], // 48px
  },

  // Card layout
  card: {
    padding: spacing[6], // 24px
    paddingSm: spacing[4], // 16px for compact cards
    gap: spacing[4], // 16px between cards
  },

  // Stack (vertical spacing)
  stack: {
    xs: spacing[1], // 4px
    sm: spacing[2], // 8px
    md: spacing[4], // 16px (default)
    lg: spacing[6], // 24px
    xl: spacing[8], // 32px
  },

  // Inline (horizontal spacing)
  inline: {
    xs: spacing[1], // 4px
    sm: spacing[2], // 8px
    md: spacing[3], // 12px (default)
    lg: spacing[4], // 16px
    xl: spacing[6], // 24px
  },

  // Form layout
  form: {
    gap: spacing[5], // 20px between form fields
    labelGap: spacing[1.5], // 6px between label and input
    groupGap: spacing[8], // 32px between form groups
  },

  // Table layout
  table: {
    cellPaddingX: spacing[4], // 16px
    cellPaddingY: spacing[3], // 12px
    headerPaddingY: spacing[3], // 12px
  },

  // Modal/Dialog
  modal: {
    padding: spacing[6], // 24px
    headerPadding: spacing[6], // 24px
    footerPadding: spacing[4], // 16px
    gap: spacing[4], // 16px
  },

  // Sidebar
  sidebar: {
    width: '256px', // Expanded
    widthCollapsed: '64px', // Collapsed (icon only)
    padding: spacing[4], // 16px
    itemPadding: spacing[3], // 12px
    itemGap: spacing[1], // 4px
  },
} as const;

// Border radius
export const borderRadius = {
  none: '0',
  sm: '0.25rem', // 4px
  default: '0.375rem', // 6px
  md: '0.5rem', // 8px
  lg: '0.75rem', // 12px
  xl: '1rem', // 16px
  '2xl': '1.5rem', // 24px
  full: '9999px',
} as const;

// Type exports
export type Spacing = keyof typeof spacing;
export type BorderRadius = keyof typeof borderRadius;
