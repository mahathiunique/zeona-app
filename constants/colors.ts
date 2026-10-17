/**
 * Zeona Design System — Color Tokens
 * Premium, calming, feminine palette.
 */

export const palette = {
  // ── Lavender family ─────────────────────────────────────────────────────────
  lavender50:  '#faf5ff',
  lavender100: '#f3e8ff',
  lavender200: '#e9d5ff',
  lavender300: '#d8b4fe',
  lavender400: '#c084fc',
  lavender500: '#a855f7',
  lavender600: '#9333ea',

  // ── Soft violet family ───────────────────────────────────────────────────────
  violet50:  '#f5f3ff',
  violet100: '#ede9fe',
  violet200: '#ddd6fe',
  violet300: '#c4b5fd',
  violet400: '#a78bfa',
  violet500: '#8b5cf6',
  violet600: '#7c3aed',

  // ── Blush / rose family ──────────────────────────────────────────────────────
  blush50:  '#fff1f2',
  blush100: '#ffe4e6',
  blush200: '#fecdd3',
  blush300: '#fda4af',
  blush400: '#fb7185',
  blush500: '#f43f5e',

  // ── Cream / warm white ───────────────────────────────────────────────────────
  cream50:  '#fffdf7',
  cream100: '#fef9ee',
  cream200: '#fef3d0',
  cream300: '#fde68a',

  // ── Botanical green (muted) ──────────────────────────────────────────────────
  sage50:  '#f0fdf4',
  sage100: '#dcfce7',
  sage200: '#bbf7d0',
  sage300: '#86efac',
  sage400: '#4ade80',
  sage500: '#22c55e',

  // ── Neutral grays ───────────────────────────────────────────────────────────
  gray50:  '#fafafa',
  gray100: '#f4f4f5',
  gray200: '#e4e4e7',
  gray300: '#d4d4d8',
  gray400: '#a1a1aa',
  gray500: '#71717a',
  gray600: '#52525b',
  gray700: '#3f3f46',
  gray800: '#27272a',
  gray900: '#18181b',

  // ── Absolute ────────────────────────────────────────────────────────────────
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const colors = {
  // ── Brand ───────────────────────────────────────────────────────────────────
  primary:          palette.violet500,
  primaryLight:     palette.violet200,
  primaryDark:      palette.violet600,
  primarySubtle:    palette.violet50,

  secondary:        palette.lavender400,
  secondaryLight:   palette.lavender200,
  secondarySubtle:  palette.lavender50,

  accent:           palette.blush300,
  accentLight:      palette.blush100,

  sage:             palette.sage400,
  sageSubtle:       palette.sage50,

  peach:            '#fba779',
  peachSubtle:      '#fff7ed',

  sky:              '#38bdf8',
  skySubtle:        '#f0f9ff',

  ivory:            '#faf8f5',
  ivorySubtle:      '#fffdfa',

  // ── Backgrounds ─────────────────────────────────────────────────────────────
  background:       '#faf8f5', // Warm ivory
  backgroundCard:   palette.white,
  backgroundMuted:  palette.lavender50, // Extremely pale lavender

  // ── Surfaces ────────────────────────────────────────────────────────────────
  surface:          palette.white,
  surfaceOverlay:   'rgba(139,92,246,0.06)',

  // ── Text ────────────────────────────────────────────────────────────────────
  textPrimary:      palette.gray800,
  textSecondary:    palette.gray500,
  textTertiary:     palette.gray400,
  textInverse:      palette.white,
  textBrand:        palette.violet600,

  // ── Borders ─────────────────────────────────────────────────────────────────
  border:           palette.violet100,
  borderStrong:     palette.violet200,

  // ── Semantic ────────────────────────────────────────────────────────────────
  success:          palette.sage400,
  successSubtle:    palette.sage50,
  warning:          '#f59e0b',
  warningSubtle:    '#fffbeb',
  error:            palette.blush400,
  errorSubtle:      palette.blush50,
  info:             palette.violet400,
  infoSubtle:       palette.violet50,

  // ── Tab bar ─────────────────────────────────────────────────────────────────
  tabActive:        palette.violet500,
  tabInactive:      palette.gray400,
  tabBackground:    palette.white,

  // ── Gradient stops ──────────────────────────────────────────────────────────
  gradientStart:    '#faf8f5', // Warm ivory
  gradientMid:      '#faf5ff', // Extremely pale lavender
  gradientEnd:      '#f3e8ff', // Soft violet
} as const;

export type ColorKey = keyof typeof colors;
