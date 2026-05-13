const { version } = require('./package.json');

const ENV = process.env.APP_ENV || 'debug';

const getBundleIdentifier = () => {
  switch (ENV) {
    case 'development':
      return 'com.anonymous.chesspassport.dev';
    case 'testing':
      return 'com.anonymous.chesspassport.test';
    case 'production':
      return 'com.anonymous.chesspassport';
    case 'debug':
    default:
      return 'com.anonymous.chesspassport.debug';
  }
};

const getAppName = () => {
  switch (ENV) {
    case 'development':
      return 'Chess Passport Dev';
    case 'testing':
      return 'Chess Passport Test';
    case 'production':
      return 'Chess Passport';
    case 'debug':
    default:
      return 'Chess Passport Debug';
  }
};

module.exports = {
  expo: {
    name: getAppName(),
    slug: 'chess-passport',
    version: version,
    orientation: 'portrait',
    scheme: 'chess-passport',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: getBundleIdentifier(),
    },
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#000000',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: getBundleIdentifier(),
      allowBackup: false,
    },
    web: {
      output: 'static',
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-font',
        {
          fonts: ['./assets/fonts/PP-Right-Grotesk-Tall-Medium.ttf', './assets/fonts/Gerbera.ttf'],
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'The app accesses your photos to let you share them with your friends.',
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#000000',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 36,
          },
        },
      ],
      '@config-plugins/react-native-webrtc',
      [
        '@algorandfoundation/react-native-passkey-autofill',
        {
          site: 'https://fido.shore-tech.net',
          label: 'Rocca Wallet',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      gateway: {
        // When unset, the client derives the gateway URL from the Expo dev
        // server's host (same machine Metro is served from) and port 3000,
        // so `expo start` / `expo run` over LAN or tunnel works without a
        // hardcoded IP. Override with EXPO_PUBLIC_GATEWAY_URL when needed.
        url: process.env.EXPO_PUBLIC_GATEWAY_URL || null,
        port: process.env.EXPO_PUBLIC_GATEWAY_PORT
          ? Number(process.env.EXPO_PUBLIC_GATEWAY_PORT)
          : 3000,
        // Pre-minted gateway JWT (issued out-of-band against the
        // pre-assigned UserRole). The app uses it directly as the
        // bearer token for authenticated calls (e.g.
        // `GET /v1/wallet/users/:user_id/`); no `/v1/auth/sign-in/`
        // round-trip is performed at startup.
        userSecretToken: process.env.EXPO_PUBLIC_GATEWAY_USER_SECRET_TOKEN || null,
      },
      algod: {
        // Algorand node endpoint. Defaults to AlgoKit LocalNet's algod
        // address; override with EXPO_PUBLIC_ALGOD_URL to point at a
        // remote LocalNet (e.g. https://localnet.shore-tech.net).
        url: process.env.EXPO_PUBLIC_ALGOD_URL || 'http://localhost:4001',
        // AlgoKit LocalNet uses the well-known "A" * 64 token by default.
        token: process.env.EXPO_PUBLIC_ALGOD_TOKEN || 'a'.repeat(64),
      },
      indexer: {
        // Algorand Indexer endpoint. Used to fetch the transaction
        // history rendered as the user's "Activities". Defaults to
        // AlgoKit LocalNet's indexer; set EXPO_PUBLIC_INDEXER_URL to ''
        // (or unset it) to disable the on-chain feed.
        url:
          process.env.EXPO_PUBLIC_INDEXER_URL !== undefined
            ? process.env.EXPO_PUBLIC_INDEXER_URL
            : 'http://localhost:8980',
        token: process.env.EXPO_PUBLIC_INDEXER_TOKEN || 'a'.repeat(64),
      },
      provider: {
        name: 'Chess Passport',
        primaryColor: '#3B82F6',
        secondaryColor: '#E1EFFF',
        accentColor: '#10B981',
        welcomeMessage: 'Your identity, connected.',
        logo: '',
        showAccounts: true,
        showPasskeys: true,
        showIdentities: true,
        showConnections: true,
      },
      router: {},
      eas: {
        projectId: '4a9f2713-f0ed-40f1-afb9-44cc5342fc3b',
      },
    },
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://u.expo.dev/f1e6cb1b-642d-49fa-b276-53b4403f62d6',
    },
  },
};
