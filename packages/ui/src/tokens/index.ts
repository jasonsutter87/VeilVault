// ==========================================================================
// DESIGN TOKENS
// Central export for all design system tokens
// ==========================================================================

// Colors
export {
  lightColors,
  darkColors,
  cssVariables,
  type ColorScale,
  type SemanticColors,
  type ColorTheme,
} from './colors.js';

// Typography
export {
  fontFamily,
  fontSize,
  lineHeight,
  fontWeight,
  letterSpacing,
  textStyles,
  type FontSize,
  type FontWeight,
  type TextStyle,
} from './typography.js';

// Spacing
export {
  spacing,
  semanticSpacing,
  borderRadius,
  type Spacing,
  type BorderRadius,
} from './spacing.js';

// Shadows
export {
  shadows,
  componentShadows,
  focusRings,
  darkShadows,
  type Shadow,
  type ComponentShadow,
  type FocusRing,
} from './shadows.js';

// Animations
export {
  duration,
  easing,
  transitions,
  keyframes,
  animations,
  reducedMotion,
  type Duration,
  type Easing,
  type Transition,
  type Animation,
} from './animations.js';

// Breakpoints
export {
  breakpoints,
  mediaQueries,
  containerWidths,
  sidebarBehavior,
  gridColumns,
  type Breakpoint,
  type MediaQuery,
  type ContainerWidth,
} from './breakpoints.js';
