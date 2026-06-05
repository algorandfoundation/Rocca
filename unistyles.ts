import { StyleSheet } from 'react-native-unistyles';

// ─── Design Tokens ────────────────────────────────────────────────────────────

const typography = {
  fonts: {
    regular: 'PlusJakartaSans-Regular',
    medium: 'PlusJakartaSans-Medium',
    semiBold: 'PlusJakartaSans-SemiBold',
    bold: 'PlusJakartaSans-Bold',
  },
  fontSizes: {
    xs: 9,
    sm: 11,
    md: 13,
    base: 14,
    lg: 17,
    xl: 18,
    '2xl': 22,
    '3xl': 36,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
};

const spacing = {
  gap: (v: number) => v * 8,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
};

const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  primary: {
    shadowColor: '#1a73e8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
} as const;

// ─── Themes ───────────────────────────────────────────────────────────────────

const lightTheme = {
  colors: {
    // Brand
    primary: '#1a73e8',
    primaryHover: '#1557b0',
    primaryLight: '#e3f2fd',
    success: '#34a853',
    danger: '#ea4335',
    warning: '#fbbc05',
    // Backgrounds
    bgApp: '#f1f3f4',
    bgWhite: '#ffffff',
    bgChat: '#f8f9fa',
    bgDark: '#111111',
    bgDarkAlt: '#202124',
    // Text
    textPrimary: '#202124',
    textSecondary: '#5f6368',
    textInverse: '#ffffff',
    // UI
    border: '#dadce0',
    headerBg: '#111111',
    // Chat bubbles
    bubbleUser: '#e3f2fd',
    bubbleBot: '#ffffff',
  },
  typography,
  spacing,
  radii,
  shadows,
  // Kept for backwards compatibility
  gap: (v: number) => v * 8,
};

const darkTheme: typeof lightTheme = {
  colors: {
    primary: '#4da3f7',
    primaryHover: '#81c0ff',
    primaryLight: '#1c2f4d',
    success: '#5dba71',
    danger: '#f28b82',
    warning: '#fdd663',
    bgApp: '#1e1e1e',
    bgWhite: '#2d2d2d',
    bgChat: '#242424',
    bgDark: '#111111',
    bgDarkAlt: '#202124',
    textPrimary: '#e8eaed',
    textSecondary: '#9aa0a6',
    textInverse: '#111111',
    border: '#3c4043',
    headerBg: '#111111',
    bubbleUser: '#1c2f4d',
    bubbleBot: '#2d2d2d',
  },
  typography,
  spacing,
  radii,
  shadows,
  gap: (v: number) => v * 8,
};

const appThemes = {
  light: lightTheme,
  dark: darkTheme,
};

// ─── Breakpoints ──────────────────────────────────────────────────────────────

const breakpoints = {
  xs: 0,
  sm: 300,
  md: 500,
  lg: 800,
  xl: 1200,
};

// ─── Module Augmentation ──────────────────────────────────────────────────────

type AppBreakpoints = typeof breakpoints;
type AppThemes = typeof appThemes;

declare module 'react-native-unistyles' {
  export interface UnistylesThemes extends AppThemes {}
  export interface UnistylesBreakpoints extends AppBreakpoints {}
}

StyleSheet.configure({
  settings: {
    initialTheme: 'light',
  },
  breakpoints,
  themes: appThemes,
});
