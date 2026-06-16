const { version } = require('./package.json');

const ENV = process.env.APP_ENV || 'debug';

const getBundleIdentifier = () => {
  switch (ENV) {
    case 'development':
      return 'com.anonymous.ac2.dev';
    case 'testing':
      return 'com.anonymous.ac2.test';
    case 'production':
      return 'com.anonymous.ac2';
    case 'debug':
    default:
      return 'com.anonymous.ac2';
  }
};

const getAppName = () => {
  switch (ENV) {
    case 'development':
      return 'AC2 Dev';
    case 'testing':
      return 'AC2 Test';
    case 'production':
      return 'AC2';
    case 'debug':
    default:
      return 'AC2 Debug';
  }
};

module.exports = {
  expo: {
    name: getAppName(),
    slug: 'ac2',
    version: version,
    orientation: 'portrait',
    scheme: 'ac2',
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
        'expo-font',
        {
          fonts: [
            './assets/fonts/PlusJakartaSans-VariableFont_wght.ttf',
            './assets/fonts/PlusJakartaSans-Italic-VariableFont_wght.ttf',
          ],
        },
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 578,
          resizeMode: 'contain',
          backgroundColor: '#1a73e8',
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
            gradleProperties: {
              'org.gradle.jvmargs':
                '-Xmx4096m -XX:MaxMetaspaceSize=1g -XX:+UseG1GC -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8',
            },
          },
        },
      ],
      '@config-plugins/react-native-webrtc',
      [
        '@algorandfoundation/react-native-passkey-autofill',
        {
          site: 'https://debug.liquidauth.com',
          label: 'AC2-Controller',
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      provider: {
        name: 'AC2-Controller',
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
        projectId: '1e66ec3b-f687-4617-a003-8491937c55c2',
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
