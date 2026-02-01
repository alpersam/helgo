/**
 * Helgo Design System
 * Liquid Glass Aesthetic - iOS-native feel
 */

export const colors = {
  // Primary accent
  primary: '#667EEA',
  primaryLight: '#8B9CF5',
  primaryDark: '#4C5FD5',

  // Secondary accent (Helgo brand)
  accent: '#FF6B6B',
  accentLight: '#FF8A8A',
  accentDark: '#E54B4B',

  // Success / Nature
  success: '#34C759',
  successLight: '#4ADE80',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',

  // Glass tints
  glass: {
    light: 'rgba(255, 255, 255, 0.72)',
    lightSubtle: 'rgba(255, 255, 255, 0.45)',
    lightBorder: 'rgba(255, 255, 255, 0.28)',
    dark: 'rgba(0, 0, 0, 0.35)',
    darkSubtle: 'rgba(0, 0, 0, 0.18)',
  },

  // Backgrounds
  background: {
    primary: '#F2F2F7',
    gradient: {
      start: '#E8ECFF',
      middle: '#F5E6FF',
      end: '#FFE6EC',
    },
  },

  // Text
  text: {
    primary: '#1C1C1E',
    secondary: '#6B6B6B',
    tertiary: '#8E8E93',
    inverse: '#FFFFFF',
    muted: '#AEAEB2',
  },

  // Semantic
  semantic: {
    fog: '#94A3B8',
    reflection: '#60A5FA',
    glow: '#FBBF24',
    green: '#22C55E',
    shelter: '#A78BFA',
  },
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  xxl: 28,
  pill: 100,
  circle: 9999,
} as const;

export const typography = {
  // Font family (iOS system font)
  family: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },

  // Font sizes
  size: {
    xs: 11,
    sm: 13,
    md: 15,
    body: 17,
    lg: 20,
    xl: 24,
    xxl: 28,
    hero: 34,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.4,
    normal: 0,
    wide: 0.5,
    extraWide: 1.2,
  },

  // Font weights
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  }),
} as const;

export const blur = {
  light: 25,
  medium: 40,
  heavy: 60,
} as const;

export const animation = {
  spring: {
    gentle: {
      damping: 20,
      stiffness: 150,
      mass: 1,
    },
    bouncy: {
      damping: 12,
      stiffness: 180,
      mass: 0.8,
    },
    snappy: {
      damping: 18,
      stiffness: 300,
      mass: 0.6,
    },
  },
  timing: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
} as const;

// Combined theme export
export const theme = {
  colors,
  spacing,
  radius,
  typography,
  shadows,
  blur,
  animation,
} as const;

export type Theme = typeof theme;
