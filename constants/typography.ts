/**
 * Zeona Design System — Typography Tokens
 */

export const fontFamilies = {
  // Loaded via expo-font from Google Fonts
  sans:         'DMSans_400Regular',
  sansMedium:   'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
  sansBold:     'DMSans_700Bold',
  serif:        'Playfair_400Regular',
  serifBold:    'Playfair_700Bold',
  serifItalic:  'Playfair_400Regular_Italic',
  // System fallback used until fonts load
  system:       undefined,
} as const;

export const fontSizes = {
  xs:   11,
  sm:   13,
  base: 15,
  md:   17,
  lg:   20,
  xl:   24,
  '2xl': 28,
  '3xl': 34,
  '4xl': 40,
} as const;

export const lineHeights = {
  tight:   1.2,
  snug:    1.35,
  normal:  1.5,
  relaxed: 1.65,
  loose:   2.0,
} as const;

export const letterSpacings = {
  tighter: -0.5,
  tight:   -0.25,
  normal:   0,
  wide:     0.25,
  wider:    0.5,
  widest:   1.0,
} as const;

/** Pre-composed text style sets for common patterns */
export const textStyles = {
  displayLarge: {
    fontSize:      fontSizes['3xl'],
    lineHeight:    fontSizes['3xl'] * lineHeights.tight,
    letterSpacing: letterSpacings.tighter,
    fontFamily:    fontFamilies.serifBold,
  },
  displayMedium: {
    fontSize:      fontSizes['2xl'],
    lineHeight:    fontSizes['2xl'] * lineHeights.tight,
    letterSpacing: letterSpacings.tighter,
    fontFamily:    fontFamilies.serifBold,
  },
  headingLarge: {
    fontSize:      fontSizes.xl,
    lineHeight:    fontSizes.xl * lineHeights.snug,
    letterSpacing: letterSpacings.tight,
    fontFamily:    fontFamilies.sansBold,
  },
  headingMedium: {
    fontSize:      fontSizes.lg,
    lineHeight:    fontSizes.lg * lineHeights.snug,
    letterSpacing: letterSpacings.tight,
    fontFamily:    fontFamilies.sansSemiBold,
  },
  headingSmall: {
    fontSize:      fontSizes.md,
    lineHeight:    fontSizes.md * lineHeights.normal,
    letterSpacing: letterSpacings.normal,
    fontFamily:    fontFamilies.sansSemiBold,
  },
  bodyLarge: {
    fontSize:      fontSizes.md,
    lineHeight:    fontSizes.md * lineHeights.relaxed,
    letterSpacing: letterSpacings.normal,
    fontFamily:    fontFamilies.sans,
  },
  bodyMedium: {
    fontSize:      fontSizes.base,
    lineHeight:    fontSizes.base * lineHeights.relaxed,
    letterSpacing: letterSpacings.normal,
    fontFamily:    fontFamilies.sans,
  },
  bodySmall: {
    fontSize:      fontSizes.sm,
    lineHeight:    fontSizes.sm * lineHeights.normal,
    letterSpacing: letterSpacings.normal,
    fontFamily:    fontFamilies.sans,
  },
  label: {
    fontSize:      fontSizes.sm,
    lineHeight:    fontSizes.sm * lineHeights.normal,
    letterSpacing: letterSpacings.wide,
    fontFamily:    fontFamilies.sansMedium,
  },
  caption: {
    fontSize:      fontSizes.xs,
    lineHeight:    fontSizes.xs * lineHeights.normal,
    letterSpacing: letterSpacings.wide,
    fontFamily:    fontFamilies.sans,
  },
} as const;
