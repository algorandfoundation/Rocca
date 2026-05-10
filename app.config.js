const { version } = require('./package.json');

const ENV = process.env.APP_ENV || 'debug';

const getBundleIdentifier = () => {
  switch (ENV) {
    case 'development':
      return 'com.anonymous.chess-passport.dev';
    case 'testing':
      return 'com.anonymous.chess-passport.test';
    case 'production':
      return 'com.anonymous.chess-passport';
    case 'debug':
    default:
      return 'com.anonymous.chess-passport.debug';
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
      backgroundColor: '#ffffff',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
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
        'expo-image-picker',
        {
          photosPermission: 'The app accesses your photos to let you share them with your friends.',
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          dark: {
            backgroundColor: '#000000',
          },
        },
      ],
      [
        'expo-build-properties',
        {
          android: {
            compileSdkVersion: 35,
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
        projectId: 'f1e6cb1b-642d-49fa-b276-53b4403f62d6',
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
