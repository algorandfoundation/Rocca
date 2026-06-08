import { StyleSheet } from 'react-native-unistyles';

// ─── Design Tokens ────────────────────────────────────────────────────────────

const typography = {
  fonts: {
    regular: 'PlusJakartaSans-Regular',
    medium: 'PlusJakartaSans-Regular_Medium',
    semiBold: 'PlusJakartaSans-Regular_SemiBold',
    bold: 'PlusJakartaSans-Regular_Bold',
  },
  fontSizes: {
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
};

const radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
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

const primitiveFoundation = {
  typography,
  spacing,
  radii,
  shadows,
} as const;

type PrimitiveTokens = typeof primitiveFoundation & {
  color: {
    brand: {
      primary: string;
      hover: string;
      soft: string;
    };
    neutral: {
      '0': string;
      '10': string;
      '20': string;
      '70': string;
      '90': string;
      '100': string;
    };
    state: {
      success: string;
      danger: string;
      warning: string;
    };
    border: string;
  };
};

// ─── Themes ───────────────────────────────────────────────────────────────────

const lightPrimitives: PrimitiveTokens = {
  ...primitiveFoundation,
  color: {
    brand: {
      primary: '#1a73e8',
      hover: '#1557b0',
      soft: '#e3f2fd',
    },
    neutral: {
      '0': '#ffffff',
      '10': '#f8f9fa',
      '20': '#f1f3f4',
      '70': '#5f6368',
      '90': '#202124',
      '100': '#111111',
    },
    state: {
      success: '#34a853',
      danger: '#ea4335',
      warning: '#fbbc05',
    },
    border: '#dadce0',
  },
};

const darkPrimitives: PrimitiveTokens = {
  ...primitiveFoundation,
  color: {
    brand: {
      primary: '#4da3f7',
      hover: '#81c0ff',
      soft: '#1c2f4d',
    },
    neutral: {
      '0': '#2d2d2d',
      '10': '#242424',
      '20': '#1e1e1e',
      '70': '#9aa0a6',
      '90': '#e8eaed',
      '100': '#111111',
    },
    state: {
      success: '#5dba71',
      danger: '#f28b82',
      warning: '#fdd663',
    },
    border: '#3c4043',
  },
};

const createSemanticTokens = (primitives: PrimitiveTokens) => ({
  fg: {
    highEmphasis: primitives.color.neutral['90'],
    mediumEmphasis: primitives.color.neutral['70'],
    inverse: primitives.color.neutral['0'],
    primary: primitives.color.brand.primary,
    success: primitives.color.state.success,
    danger: primitives.color.state.danger,
    warning: primitives.color.state.warning,
  },
  bg: {
    app: primitives.color.neutral['20'],
    surface: primitives.color.neutral['0'],
    chat: primitives.color.neutral['10'],
    dark: primitives.color.neutral['100'],
    darkAlt: primitives.color.neutral['90'],
    header: primitives.color.neutral['100'],
    bubbleUser: primitives.color.brand.soft,
    bubbleBot: primitives.color.neutral['0'],
  },
  stroke: {
    default: primitives.color.border,
  },
});

const createTheme = (primitives: PrimitiveTokens) => {
  const semantic = createSemanticTokens(primitives);

  return {
    primitives,
    semantic,
  };
};

const lightTheme = createTheme(lightPrimitives);
const darkTheme = createTheme(darkPrimitives);

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
