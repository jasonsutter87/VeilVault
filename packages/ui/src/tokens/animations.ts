// ==========================================================================
// ANIMATION TOKENS
// Fast, subtle animations - Notion-like snappy feel
// ==========================================================================

// Duration presets
export const duration = {
  instant: '0ms',
  fast: '100ms',
  normal: '200ms',
  slow: '300ms',
  slower: '400ms',
  slowest: '500ms',
} as const;

// Easing functions
export const easing = {
  // Standard easings
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',

  // Custom curves (more polished feel)
  default: 'cubic-bezier(0.4, 0, 0.2, 1)', // Material ease-out
  in: 'cubic-bezier(0.4, 0, 1, 1)',
  out: 'cubic-bezier(0, 0, 0.2, 1)',
  inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

  // Bouncy/spring effects (use sparingly)
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  springGentle: 'cubic-bezier(0.25, 1.1, 0.5, 1)',

  // Sharp/snappy
  sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
} as const;

// Pre-built transitions for common use cases
export const transitions = {
  // Colors & backgrounds
  colors: `color ${duration.normal} ${easing.default}, background-color ${duration.normal} ${easing.default}, border-color ${duration.normal} ${easing.default}`,

  // Opacity
  opacity: `opacity ${duration.normal} ${easing.default}`,
  opacityFast: `opacity ${duration.fast} ${easing.default}`,

  // Transform
  transform: `transform ${duration.normal} ${easing.default}`,
  transformFast: `transform ${duration.fast} ${easing.default}`,

  // All properties (use carefully - can be expensive)
  all: `all ${duration.normal} ${easing.default}`,
  allFast: `all ${duration.fast} ${easing.default}`,

  // Shadow
  shadow: `box-shadow ${duration.normal} ${easing.default}`,

  // Combined for buttons/interactive elements
  button: `color ${duration.fast} ${easing.default}, background-color ${duration.fast} ${easing.default}, border-color ${duration.fast} ${easing.default}, box-shadow ${duration.fast} ${easing.default}, transform ${duration.fast} ${easing.out}`,

  // Combined for cards
  card: `box-shadow ${duration.normal} ${easing.default}, transform ${duration.normal} ${easing.out}`,
} as const;

// Keyframe animation definitions (for CSS-in-JS or Tailwind)
export const keyframes = {
  // Fade
  fadeIn: {
    from: { opacity: '0' },
    to: { opacity: '1' },
  },
  fadeOut: {
    from: { opacity: '1' },
    to: { opacity: '0' },
  },

  // Slide
  slideInFromTop: {
    from: { transform: 'translateY(-4px)', opacity: '0' },
    to: { transform: 'translateY(0)', opacity: '1' },
  },
  slideInFromBottom: {
    from: { transform: 'translateY(4px)', opacity: '0' },
    to: { transform: 'translateY(0)', opacity: '1' },
  },
  slideInFromLeft: {
    from: { transform: 'translateX(-4px)', opacity: '0' },
    to: { transform: 'translateX(0)', opacity: '1' },
  },
  slideInFromRight: {
    from: { transform: 'translateX(4px)', opacity: '0' },
    to: { transform: 'translateX(0)', opacity: '1' },
  },

  // Scale
  scaleIn: {
    from: { transform: 'scale(0.95)', opacity: '0' },
    to: { transform: 'scale(1)', opacity: '1' },
  },
  scaleOut: {
    from: { transform: 'scale(1)', opacity: '1' },
    to: { transform: 'scale(0.95)', opacity: '0' },
  },

  // Spin
  spin: {
    from: { transform: 'rotate(0deg)' },
    to: { transform: 'rotate(360deg)' },
  },

  // Pulse
  pulse: {
    '0%, 100%': { opacity: '1' },
    '50%': { opacity: '0.5' },
  },

  // Bounce (subtle)
  bounce: {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-4px)' },
  },

  // Shake (for errors)
  shake: {
    '0%, 100%': { transform: 'translateX(0)' },
    '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
    '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
  },

  // Skeleton loading
  shimmer: {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },
} as const;

// Animation presets (duration + easing + keyframe)
export const animations = {
  fadeIn: `fadeIn ${duration.normal} ${easing.out}`,
  fadeOut: `fadeOut ${duration.normal} ${easing.in}`,
  slideUp: `slideInFromBottom ${duration.normal} ${easing.out}`,
  slideDown: `slideInFromTop ${duration.normal} ${easing.out}`,
  slideLeft: `slideInFromRight ${duration.normal} ${easing.out}`,
  slideRight: `slideInFromLeft ${duration.normal} ${easing.out}`,
  scaleIn: `scaleIn ${duration.normal} ${easing.out}`,
  scaleOut: `scaleOut ${duration.fast} ${easing.in}`,
  spin: `spin 1s ${easing.linear} infinite`,
  pulse: `pulse 2s ${easing.inOut} infinite`,
  bounce: `bounce 1s ${easing.inOut} infinite`,
  shake: `shake ${duration.slow} ${easing.default}`,
  shimmer: `shimmer 1.5s ${easing.linear} infinite`,
} as const;

// Reduced motion variants (respect prefers-reduced-motion)
export const reducedMotion = {
  duration: duration.instant,
  transition: 'none',
  animation: 'none',
} as const;

// Type exports
export type Duration = keyof typeof duration;
export type Easing = keyof typeof easing;
export type Transition = keyof typeof transitions;
export type Animation = keyof typeof animations;
