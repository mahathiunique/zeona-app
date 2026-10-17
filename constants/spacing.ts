/**
 * Zeona Design System — Spacing, Radii, Shadows, Layout tokens
 */

/** 4-pt base grid spacing scale */
export const spacing = {
  0:    0,
  0.5:  2,
  1:    4,
  1.5:  6,
  2:    8,
  2.5:  10,
  3:    12,
  3.5:  14,
  4:    16,
  5:    20,
  6:    24,
  7:    28,
  8:    32,
  10:   40,
  12:   48,
  14:   56,
  16:   64,
  20:   80,
  24:   96,
  32:   128,
} as const;

/** Border-radius scale */
export const radii = {
  none:   0,
  xs:     4,
  sm:     8,
  md:     12,
  lg:     16,
  xl:     20,
  '2xl':  24,
  '3xl':  32,
  full:   9999,
} as const;

/** iOS-style box shadow presets */
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  xl: {
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.14,
    shadowRadius: 40,
    elevation: 12,
  },
} as const;

/** Reusable layout values */
export const layout = {
  screenPaddingH:     spacing[5],
  screenPaddingV:     spacing[6],
  cardPaddingH:       spacing[4],
  cardPaddingV:       spacing[4],
  tabBarHeight:       64,
  headerHeight:       60,
  minTouchTarget:     44,
  maxContentWidth:    428,  // iPhone 15 Pro Max width
} as const;

/** Animation durations in ms */
export const durations = {
  instant:    0,
  fast:       150,
  normal:     250,
  slow:       400,
  verySlow:   600,
} as const;

/** Opacity levels */
export const opacities = {
  transparent: 0,
  disabled:    0.4,
  muted:       0.6,
  subtle:      0.8,
  full:        1,
} as const;
