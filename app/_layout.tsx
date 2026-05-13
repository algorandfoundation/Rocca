import { useEventListener } from 'expo';
import { Stack } from 'expo-router';
import { install } from 'react-native-quick-crypto';
import { keyStore } from '@/stores/keystore';
import { keyStoreHooks } from '@/stores/before-after';
import { accountsStore } from '@/stores/accounts';
import { ReactNativeProvider, WalletProvider } from '@/providers/ReactNativeProvider';
import { identitiesStore } from '@/stores/identities';
import { passkeysStore } from '@/stores/passkeys';
import { registerGlobals } from 'react-native-webrtc';
import { globalPolyfill, setupNavigatorPolyfill } from '@/lib/polyfill';
import ReactNativePasskeyAutofill from '@algorandfoundation/react-native-passkey-autofill';
import { bootstrap } from '@/lib/bootstrap';
import { PreventScreenshotProvider } from '@/providers/PreventScreenshotProvider';
import React from 'react';
import { ReactKeystoreOptions } from '@algorandfoundation/react-native-keystore';
import Constants from 'expo-constants';

globalPolyfill();
registerGlobals();
install();

const biometricOptions: ReactKeystoreOptions['keystore']['authentication'] = {
  biometrics: true,
  prompt: 'Authenticate to access your wallet',
};

const dfnsConfig = (Constants.expoConfig?.extra?.dfns ?? {}) as {
  pat?: string;
  baseUrl?: string;
  appId?: string;
};

const provider = new ReactNativeProvider(
  {
    id: 'react-native-wallet',
    name: 'React Native Wallet',
  },
  {
    logs: true,
    accounts: {
      store: accountsStore,
      keystore: {
        autoPopulate: true,
      },
      dfns: {
        // Auto-populate the account store with DFNS wallets only when a PAT
        // has been configured. Without a PAT the DFNS API would 401 on every
        // call, so we keep the extension dormant.
        autoPopulate: !!dfnsConfig.pat,
      },
    },
    identities: {
      store: identitiesStore,
      keystore: {
        autoPopulate: true,
      },
    },
    passkeys: {
      store: passkeysStore,
      keystore: {
        autoPopulate: true,
      },
    },
    keystore: {
      store: keyStore,
      hooks: keyStoreHooks,
      authentication: biometricOptions,
    },
    // DFNS keystore configuration. The PAT is sourced from `app.config.js`
    // `extra.dfns.pat` (which reads `DFNS_PAT` at build/start time).
    key: {
      dfns: {
        pat: dfnsConfig.pat ?? '',
        baseUrl: dfnsConfig.baseUrl,
        appId: dfnsConfig.appId || undefined,
      },
    },
  },
);

setupNavigatorPolyfill();

export default function RootLayout() {
  React.useEffect(() => {
    bootstrap(biometricOptions).catch((e) => console.error('Bootstrap promise error:', e));
  }, []);

  useEventListener(ReactNativePasskeyAutofill, 'onPasskeyAdded', (event) => {
    console.log('Passkey added via autofill:', event);
    if (event.success) {
      bootstrap(biometricOptions).catch((e) =>
        console.error('Failed to reload keys after passkey added:', e),
      );
    }
  });

  useEventListener(ReactNativePasskeyAutofill, 'onPasskeyAuthenticated', (event) => {
    console.log('Passkey authenticated via autofill:', event);
    if (event.success) {
      bootstrap(biometricOptions).catch((e) =>
        console.error('Failed to reload keys after passkey authenticated:', e),
      );
    }
  });

  return (
    <PreventScreenshotProvider>
      <WalletProvider provider={provider}>
        <Stack />
      </WalletProvider>
    </PreventScreenshotProvider>
  );
}
