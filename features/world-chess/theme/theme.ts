const primitives = {
  color: {
    brand: {
      primary: '#BCFE00',
      'primary-alpha': 'rgba(188, 254, 0, 0.16)',
      secondary: '#A7815A',
      'secondary-alpha': 'rgba(167, 129, 90, 0.16)',
      tertiary: '#FF6136',
      'tertiary-alpha': 'rgba(255, 97, 54, 0.16)',
    },
    neutral: {
      '0': '#FAFAFA',
      '5': '#F5F5F5',
      '7': '#EDEDED',
      '10': '#E5E5E5',
      '15': '#DBDBDB',
      '20': '#D1D1D1',
      '25': '#C2C2C2',
      '30': '#B3B3B3',
      '35': '#9E9E9E',
      '40': '#8A8A8A',
      '45': '#808080',
      '50': '#757575',
      '55': '#666666',
      '60': '#575757',
      '65': '#4F4F4F',
      '70': '#454545',
      '75': '#3D3D3D',
      '80': '#333333',
      '85': '#292929',
      '90': '#1E1E1E',
      '95': '#0F0F0F',
      '97': '#080808',
      White: '#FFFFFF',
      Black: '#000000',
      Overlay: 'rgba(0, 0, 0, 0.5)',
      Transparent: 'rgba(0, 0, 0, 0)',
      Shadow: 'rgba(0, 0, 0, 0.1)',
    },
    error: {
      '0': '#FFF5F5',
      '5': '#FFE6E6',
      '10': '#FFCCCC',
      '20': '#FF9999',
      '30': '#FF6666',
      '40': '#FF3333',
      '50': '#FF0000',
      '60': '#CC0000',
      '70': '#990000',
      '80': '#660000',
      '90': '#420000',
      '95': '#240000',
    },
    warning: {
      '0': '#FFFBF0',
      '5': '#FFF9E6',
      '10': '#FFF3CC',
      '20': '#FFE799',
      '30': '#FFDC66',
      '40': '#FFD033',
      '50': '#FFC400',
      '60': '#F0B800',
      '70': '#E0AC00',
      '80': '#CC9D00',
      '90': '#523F00',
      '95': '#291F00',
    },
    success: {
      '0': '#F5FAF8',
      '5': '#E6F3EE',
      '10': '#CCE6DC',
      '20': '#99CEB9',
      '30': '#66B596',
      '40': '#339D73',
      '50': '#008450',
      '60': '#006A40',
      '70': '#004F30',
      '80': '#003520',
      '90': '#002215',
      '95': '#00120B',
    },
    information: {
      '0': '#F0F8FC',
      '5': '#E6F3FB',
      '10': '#CDE6F6',
      '20': '#9BCDED',
      '30': '#69B5E4',
      '40': '#379CDB',
      '50': '#0583D2',
      '60': '#0469A8',
      '70': '#034F7E',
      '80': '#023454',
      '90': '#012237',
      '95': '#011522',
    },
  },
  spacing: {
    '0': 0,
    '2': 2,
    '4': 4,
    '6': 6,
    '8': 8,
    '12': 12,
    '16': 16,
    '20': 20,
    '24': 24,
    '32': 32,
    '40': 40,
    '48': 48,
    '64': 64,
    '80': 80,
    '96': 96,
    '120': 120,
  },
  radius: {
    '0': 0,
    '2': 2,
    '4': 4,
    '6': 6,
    '8': 8,
    '12': 12,
    '16': 16,
    '24': 24,
    '32': 32,
    '9999': 9999,
  },
  opacity: {
    '%0': 0,
    '%10': 10,
    '%20': 20,
    '%30': 30,
    '%40': 40,
    '%50': 50,
    '%60': 60,
    '%70': 70,
    '%80': 80,
    '%90': 90,
    '%100': 100,
  },
  'border-width': {
    '0': 0,
    '1': 1,
    '2': 2,
  },
  font: {
    family: {
      numeric: 'PP Right Grotesk Tall Medium',
      header: 'Gerbera',
      p: 'Gerbera',
      label: 'Gerbera',
    },
    weight: {
      bold: 'Bold',
      semibold: 'Semi Bold',
      medium: 'Medium',
      regular: 'Regular',
      light: 'Light',
    },
    size: {
      'display-lg': 96,
      'display-md': 56,
      'numeric-sm': 32,
      h1: 48,
      h2: 40,
      h3: 32,
      h4: 24,
      h5: 20,
      h6: 16,
      'p-lg': 16,
      'p-md': 14,
      'p-sm': 12,
      'p-xs': 10,
    },
    'line-height': {
      h1: 64,
      h2: 48,
      h3: 40,
      h4: 32,
      h5: 24,
      h6: 20,
      'p-lg': 24,
      'p-md': 20,
      'p-sm': 16,
      'p-xs': 12,
    },
    'letter-spacing': {
      'display-lg': 0.800000011920929,
      'display-md': 0.800000011920929,
      'display-sm': 0.800000011920929,
      h1: -0.800000011920929,
      h2: -0.800000011920929,
      h3: -0.800000011920929,
      h4: -0.800000011920929,
      h5: -0.800000011920929,
      h6: -0.800000011920929,
      'p-lg': -0.800000011920929,
      'p-md': -0.800000011920929,
      'p-sm': 0,
      'p-xs': 0,
    },
  },
};

const semanticRefs = {
  fg: {
    black: {
      $ref: 'color.neutral.Black',
    },
    white: {
      $ref: 'color.neutral.White',
    },
    'high-emphasis': {
      $ref: 'color.neutral.White',
    },
    'medium-emphasis': {
      $ref: 'color.neutral.40',
    },
    'low-emphasis': {
      $ref: 'color.neutral.60',
    },
    'lowest-emphasis': {
      $ref: 'color.neutral.70',
    },
    disabled: {
      $ref: 'color.neutral.80',
    },
    placeholder: {
      $ref: 'color.neutral.50',
    },
    label: {
      $ref: 'color.neutral.15',
    },
    'brand-primary': {
      $ref: 'color.brand.primary',
    },
    'brand-secondary': {
      $ref: 'color.brand.secondary',
    },
    'brand-tertiary': {
      $ref: 'color.brand.tertiary',
    },
    'inverse-high-emphasis': {
      $ref: 'color.neutral.Black',
    },
    'inverse-medium-emphasis': {
      $ref: 'color.neutral.60',
    },
    'inverse-low-emphasis': {
      $ref: 'color.neutral.50',
    },
    'inverse-lowest-emphasis': {
      $ref: 'color.neutral.40',
    },
    'inverse-disabled': {
      $ref: 'color.neutral.30',
    },
    'inverse-brand-primary': {
      $ref: 'color.brand.primary-alpha',
    },
    'inverse-brand-secondary': {
      $ref: 'color.brand.secondary-alpha',
    },
    'inverse-brand-tertiary': {
      $ref: 'color.brand.tertiary-alpha',
    },
    information: {
      $ref: 'color.information.40',
    },
    success: {
      $ref: 'color.success.40',
    },
    warning: {
      $ref: 'color.warning.40',
    },
    error: {
      $ref: 'color.error.40',
    },
  },
  bg: {
    'app-bg': {
      $ref: 'color.neutral.Black',
    },
    'surface-1': {
      $ref: 'color.neutral.85',
    },
    overlay: {
      $ref: 'color.neutral.Overlay',
    },
    'brand-primary': {
      $ref: 'color.brand.primary',
    },
    'brand-secondary': {
      $ref: 'color.brand.secondary',
    },
    'brand-tertiary': {
      $ref: 'color.brand.tertiary',
    },
    'inverse-brand-primary': {
      $ref: 'color.brand.primary-alpha',
    },
    'inverse-brand-secondary': {
      $ref: 'color.brand.secondary-alpha',
    },
    'inverse-brand-tertiary': {
      $ref: 'color.brand.tertiary-alpha',
    },
    disabled: {
      $ref: 'color.neutral.75',
    },
    information: {
      $ref: 'color.information.95',
    },
    success: {
      $ref: 'color.success.95',
    },
    warning: {
      $ref: 'color.warning.95',
    },
    error: {
      $ref: 'color.error.95',
    },
  },
  stroke: {
    transparent: {
      $ref: 'color.neutral.Transparent',
    },
    'high-emphasis': {
      $ref: 'color.neutral.White',
    },
    'medium-emphasis': {
      $ref: 'color.neutral.40',
    },
    'low-emphasis': {
      $ref: 'color.neutral.60',
    },
    'lowest-emphasis': {
      $ref: 'color.neutral.70',
    },
    disabled: {
      $ref: 'color.neutral.75',
    },
    'brand-primary': {
      $ref: 'color.brand.primary',
    },
    'brand-secondary': {
      $ref: 'color.brand.secondary',
    },
    'brand-tertiary': {
      $ref: 'color.brand.tertiary',
    },
    information: {
      $ref: 'color.information.40',
    },
    warning: {
      $ref: 'color.warning.40',
    },
    success: {
      $ref: 'color.success.40',
    },
    error: {
      $ref: 'color.error.40',
    },
  },
  shadow: {
    'shadow-lg_03': 'rgba(10, 13, 18, 0.04)',
    'shadow-sm_01': 'rgba(10, 13, 18, 0.1)',
    'shadow-lg_01': 'rgba(10, 13, 18, 0.08)',
    'shadow-3xl_02': 'rgba(10, 13, 18, 0.04)',
    'shadow-md_02': 'rgba(10, 13, 18, 0.06)',
    'shadow-2xl_01': 'rgba(10, 13, 18, 0.18)',
    'shadow-xl_03': 'rgba(10, 13, 18, 0.04)',
    'shadow-skeumorphic-inner-border': 'rgba(10, 13, 18, 0.18)',
    'shadow-xl_01': 'rgba(10, 13, 18, 0.08)',
    'shadow-xs': 'rgba(10, 13, 18, 0.05)',
    'shadow-md_01': 'rgba(10, 13, 18, 0.1)',
    'shadow-sm_02': 'rgba(10, 13, 18, 0.1)',
    'shadow-skeumorphic-inner': 'rgba(10, 13, 18, 0.05)',
    'shadow-2xl_02': 'rgba(10, 13, 18, 0.04)',
    'shadow-3xl_01': 'rgba(10, 13, 18, 0.14)',
    'shadow-lg_02': 'rgba(10, 13, 18, 0.03)',
    'shadow-xl_02': 'rgba(10, 13, 18, 0.03)',
  },
};

type PrimitiveTheme = typeof primitives;
type SemanticReference = { $ref: string };
type ThemePrimitive = string | number;
type ThemeNode = ThemePrimitive | SemanticReference | ThemeObject | ThemeNode[];
type ThemeObject = { [key: string]: ThemeNode };

type ResolveSemanticRefs<T> = T extends SemanticReference
  ? ThemePrimitive
  : T extends readonly (infer U)[]
    ? ResolveSemanticRefs<U>[]
    : T extends object
      ? { [K in keyof T]: ResolveSemanticRefs<T[K]> }
      : T;

export type WorldChessPrimitives = PrimitiveTheme;
export type WorldChessSemanticRefs = typeof semanticRefs;
export type WorldChessSemantic = ResolveSemanticRefs<WorldChessSemanticRefs>;

function deepGet(obj: unknown, pathStr: string): unknown {
  return pathStr
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        typeof acc === 'object' && acc !== null ? acc[key as keyof typeof acc] : undefined,
      obj,
    );
}

function isSemanticReference(node: unknown): node is SemanticReference {
  return (
    typeof node === 'object' && node !== null && '$ref' in node && typeof node.$ref === 'string'
  );
}

function resolveSemantic<T extends ThemeNode>(
  node: T,
  source: PrimitiveTheme,
): ResolveSemanticRefs<T> {
  if (Array.isArray(node)) {
    return node.map((item) => resolveSemantic(item, source)) as ResolveSemanticRefs<T>;
  }

  if (typeof node === 'object' && node !== null) {
    if (isSemanticReference(node) && Object.keys(node).length === 1) {
      const resolved = deepGet(source, node.$ref);

      if (resolved === undefined) {
        throw new Error('Unresolved semantic reference: ' + node.$ref);
      }

      return resolved as ResolveSemanticRefs<T>;
    }

    const out: Record<string, unknown> = {};

    for (const key in node as Record<string, ThemeNode>) {
      out[key] = resolveSemantic((node as Record<string, ThemeNode>)[key], source);
    }

    return out as ResolveSemanticRefs<T>;
  }

  return node as ResolveSemanticRefs<T>;
}

const semantic = resolveSemantic(semanticRefs, primitives);

type ThemeData = {
  primitives: typeof primitives;
  semantic: typeof semantic;
  semanticRefs: typeof semanticRefs;
};

type DotJoin<K extends string, P extends string> = `${K}.${P}`;

type Paths<T> = T extends object
  ? {
      [K in Extract<keyof T, string>]: T[K] extends object ? K | DotJoin<K, Paths<T[K]>> : K;
    }[Extract<keyof T, string>]
  : never;

type PathValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? PathValue<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

export type ThemePath = Paths<ThemeData>;

const themeData: ThemeData = {
  primitives,
  semantic,
  semanticRefs,
};

const theme = {
  ...themeData,
  get<P extends ThemePath>(path: P): PathValue<ThemeData, P> {
    return deepGet(themeData, path) as PathValue<ThemeData, P>;
  },
};

export type WorldChessTheme = typeof theme;
export default theme;
