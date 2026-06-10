const { version } = require('./package.json');

const ENV = process.env.APP_ENV || 'debug';
const PASSKEY_AUTOFILL_SITE = process.env.PASSKEY_AUTOFILL_SITE || 'https://fido.shore-tech.net';

const getAssociatedDomain = (site) => {
  try {
    return new URL(site).host;
  } catch {
    return site.replace(/^https?:\/\//, '').split('/')[0];
  }
};

const getBundleIdentifier = () => {
  switch (ENV) {
    case 'development':
      return 'com.anonymous.rocca.dev';
    case 'testing':
      return 'com.anonymous.rocca.test';
    case 'production':
      return 'com.anonymous.rocca';
    case 'debug':
    default:
      return 'com.anonymous.rocca';
  }
};

const getAppName = () => {
  switch (ENV) {
    case 'development':
      return 'Rocca Dev';
    case 'testing':
      return 'Rocca Test';
    case 'production':
      return 'Rocca';
    case 'debug':
    default:
      return 'Rocca Debug';
  }
};

const PASSKEY_AUTOFILL_LABEL = `${getAppName()} Wallet`;

console.log(`Building ${getAppName()} v${version} for ${ENV}...`);

module.exports = {
  expo: {
    name: getAppName(),
    slug: 'rocca',
    version: version,
    orientation: 'portrait',
    scheme: 'rocca',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: getBundleIdentifier(),
      associatedDomains: [`webcredentials:${getAssociatedDomain(PASSKEY_AUTOFILL_SITE)}`],
      infoPlist: {
        NSFaceIDUsageDescription: 'Rocca uses Face ID to unlock your wallet keys.',
      },
      entitlements: {
        'com.apple.developer.authentication-services.autofill-credential-provider': true,
      },
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
            buildArchs: ['arm64-v8a'],
          },
        },
      ],
      '@config-plugins/react-native-webrtc',
      [
        '@algorandfoundation/react-native-passkey-autofill',
        {
          site: PASSKEY_AUTOFILL_SITE,
          label: PASSKEY_AUTOFILL_LABEL,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      provider: {
        name: 'Rocca',
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
      passkeyAutofill: {
        site: PASSKEY_AUTOFILL_SITE,
        label: PASSKEY_AUTOFILL_LABEL,
        associatedDomain: getAssociatedDomain(PASSKEY_AUTOFILL_SITE),
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
