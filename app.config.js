const { version } = require('./package.json');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const ENV = process.env.APP_ENV || 'debug';

const TESTING_CLEARTEXT_HOSTS = ['5.161.251.230', 'localhost', '127.0.0.1'];

const getDevCleartextHosts = () => {
  const raw = process.env.DEV_CLEARTEXT_HOSTS;
  if (raw === undefined) return TESTING_CLEARTEXT_HOSTS;
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

// Allow clear text hosts on testing distribution
const withDevCleartextException = (config) => {
  if (ENV !== 'testing') return config;

  const hosts = getDevCleartextHosts();
  if (hosts.length === 0) return config;

  const NSC_FILENAME = 'network_security_config';
  const domains = hosts
    .map((h) => `        <domain includeSubdomains="false">${h}</domain>`)
    .join('\n');
  const NSC_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
${domains}
    </domain-config>
</network-security-config>
`;

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res',
        'xml',
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, `${NSC_FILENAME}.xml`), NSC_XML);
      return cfg;
    },
  ]);

  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) {
      app.$ = app.$ || {};
      app.$['android:networkSecurityConfig'] = `@xml/${NSC_FILENAME}`;
    }
    return cfg;
  });

  return config;
};
const PASSKEY_AUTOFILL_SITE = process.env.PASSKEY_AUTOFILL_SITE || 'https://debug.liquidauth.com';

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
      withDevCleartextException,
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
