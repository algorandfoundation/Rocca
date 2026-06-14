import { StyleSheet } from 'react-native-unistyles';

// ─── Palette ──────────────────────────────────────────────────────────────────

export const palette = {
  blue: {
    100: '#e3f2fd',
    300: '#81c0ff',
    400: '#4da3f7',
    500: '#1a73e8',
    700: '#1557b0',
    900: '#1c2f4d',
  },
  neutral: {
    0: '#ffffff',
    50: '#f8f9fa',
    100: '#f1f3f4',
    200: '#e8eaed',
    300: '#dadce0',
    400: '#9aa0a6',
    500: '#5f6368',
    700: '#3c4043',
    800: '#2d2d2d',
    850: '#242424',
    900: '#202124',
    925: '#1e1e1e',
    950: '#111111',
  },
  green: {
    400: '#5dba71',
    500: '#34a853',
  },
  red: {
    400: '#f28b82',
    500: '#ea4335',
  },
  yellow: {
    100: '#fff8e1',
    400: '#fdd663',
    500: '#fbbc05',
  },
  black: '#000000',
} as const;

// ─── Shared Tokens ────────────────────────────────────────────────────────────

const spacing = {
  gap: (v: number) => v * 8,
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
};

const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

const typography = {
  fonts: {
    regular: 'PlusJakartaSans-Regular',
    medium: 'PlusJakartaSans-Regular_Medium',
    semiBold: 'PlusJakartaSans-Regular_SemiBold',
    bold: 'PlusJakartaSans-Regular_Bold',
  },
  sizes: {
    xs: 9,
    sm: 11,
    md: 13,
    base: 14,
    lg: 17,
    xl: 18,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },
} as const;

const shadows = {
  sm: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  primary: {
    shadowColor: palette.blue[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
} as const;

// ─── Themes ───────────────────────────────────────────────────────────────────

const createColors = (mode: 'light' | 'dark') => {
  const isLight = mode === 'light';
  return {
    brand: {
      primary: isLight ? palette.blue[500] : palette.blue[400],
      hover: isLight ? palette.blue[700] : palette.blue[300],
      soft: isLight ? palette.blue[100] : palette.blue[900],
    },
    fg: {
      default: isLight ? palette.neutral[900] : palette.neutral[200],
      muted: isLight ? palette.neutral[500] : palette.neutral[400],
      inverse: isLight ? palette.neutral[0] : palette.neutral[800],
      onLight: palette.neutral[950],
      primary: isLight ? palette.blue[500] : palette.blue[400],
      success: isLight ? palette.green[500] : palette.green[400],
      danger: isLight ? palette.red[500] : palette.red[400],
      warning: isLight ? palette.yellow[500] : palette.yellow[400],
    },
    bg: {
      app: isLight ? palette.neutral[100] : palette.neutral[925],
      surface: isLight ? palette.neutral[0] : palette.neutral[800],
      white: palette.neutral[0],
      chat: isLight ? palette.neutral[50] : palette.neutral[850],
      dark: palette.neutral[950],
      darkAlt: isLight ? palette.neutral[900] : palette.neutral[200],
      header: palette.neutral[950],
      bubbleUser: isLight ? palette.blue[100] : palette.blue[900],
      bubbleBot: isLight ? palette.neutral[0] : palette.neutral[800],
    },
    border: {
      default: isLight ? palette.neutral[300] : palette.neutral[700],
    },
    state: {
      success: isLight ? palette.green[500] : palette.green[400],
      danger: isLight ? palette.red[500] : palette.red[400],
      warning: isLight ? palette.yellow[500] : palette.yellow[400],
    },
  };
};

const createTheme = (mode: 'light' | 'dark') => ({
  palette,
  colors: createColors(mode),
  spacing,
  borderRadius,
  typography,
  shadows,
});

const lightTheme = createTheme('light');
const darkTheme = createTheme('dark');

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
