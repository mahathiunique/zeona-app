import { Platform } from 'react-native';

export interface ThemeColors {
  readonly primary: string;
  readonly primaryLight: string;
  readonly primaryDark: string;
  readonly secondary: string;
  readonly secondaryLight: string;
  readonly accentPink: string;
  readonly accentPurple: string;
  readonly accentYellow: string;
  readonly background: string;
  readonly backgroundCard: string;
  readonly backgroundSecondary: string;
  readonly text: string;
  readonly textSecondary: string;
  readonly textMuted: string;
  readonly success: string;
  readonly error: string;
  readonly warning: string;
  readonly info: string;
  readonly border: string;
  readonly shadow: string;
  readonly tabBarBackground: string;
  readonly overlay: string;
}

export const Colors: { readonly light: ThemeColors; readonly dark: ThemeColors } = {
  light: {
    primary: '#ABC4FF',
    primaryLight: '#CCDDFD',
    primaryDark: '#8EB2FF',
    secondary: '#ADDCED',
    secondaryLight: '#E3F4FB',
    
    // Accents
    accentPink: '#F8D9EC',
    accentPurple: '#E6CEF4',
    accentYellow: '#F9EFD7',
    
    // Backgrounds
    background: '#FFFDF5',          // Warm off-white
    backgroundCard: '#FFFFFF',      // Clean white card
    backgroundSecondary: '#F2EFE6', // Soft warm sand/gray
    
    // Text colors
    text: '#2D2A26',               // Warm dark charcoal
    textSecondary: '#6B655C',      // Medium warm gray
    textMuted: '#9B9487',          // Muted warm gray
    
    // Status/Feedback
    success: '#81C784',
    error: '#E57373',
    warning: '#FFD54F',
    info: '#64B5F6',

    // Structural
    border: '#E8E4D9',
    shadow: 'rgba(45, 42, 38, 0.06)',
    tabBarBackground: '#FFFFFF',
    overlay: 'rgba(45, 42, 38, 0.4)',
  },
  dark: {
    primary: '#ABC4FF',
    primaryLight: '#CCDDFD',
    primaryDark: '#8EB2FF',
    secondary: '#ADDCED',
    secondaryLight: '#23343A',
    
    // Accents
    accentPink: '#F8D9EC',
    accentPurple: '#E6CEF4',
    accentYellow: '#F9EFD7',
    
    // Backgrounds
    background: '#151412',          // Deep warm black
    backgroundCard: '#1E1C1A',      // Dark warm brown-charcoal card
    backgroundSecondary: '#272522', // Medium warm charcoal
    
    // Text colors
    text: '#FDFBF7',               // Off-white
    textSecondary: '#D0C9BE',      // Soft light warm gray
    textMuted: '#8A8276',          // Muted warm gray
    
    // Status/Feedback
    success: '#66BB6A',
    error: '#EF5350',
    warning: '#FFCA28',
    info: '#42A5F5',

    // Structural
    border: '#2E2B27',
    shadow: 'rgba(0, 0, 0, 0.3)',
    tabBarBackground: '#1E1C1A',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
};

export type ThemeColor = keyof typeof Colors.light;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  giant: 64,
} as const;

export const BorderRadius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  round: 9999,
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    rounded: 'System',
    mono: 'Courier New',
  },
  android: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif-condensed',
    mono: 'monospace',
  },
  default: {
    sans: 'System',
    serif: 'System',
    rounded: 'System',
    mono: 'System',
  },
});

export const Typography = {
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as const,
  },
  h2: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
  },
  h3: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600' as const,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
  },
  bodySecondary: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
  },
  button: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '600' as const,
  },
} as const;

export const Shadows = {
  soft: {
    shadowColor: '#2D2A26',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  medium: {
    shadowColor: '#2D2A26',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  strong: {
    shadowColor: '#2D2A26',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
};

export const Layout = {
  window: {
    width: '100%',
    height: '100%',
  },
  isSmallDevice: false,
};
