// MUST be first: installs `global.crypto` before any `@noble/hashes` import
// is evaluated. See `lib/runtime/install-crypto.ts`.
import '@/lib/runtime/install-crypto';
import { useEventListener } from 'expo';
import { Stack } from 'expo-router';
import { keyStore } from '@/stores/keystore';
import { keyStoreHooks } from '@/stores/before-after';
import { accountsStore } from '@/stores/accounts';
import { identitiesStore } from '@/stores/identities';
import { ReactNativeProvider, WalletProvider } from '@/providers/ReactNativeProvider';
import { passkeysStore } from '@/stores/passkeys';
import { registerGlobals } from 'react-native-webrtc';
import { globalPolyfill, setupNavigatorPolyfill } from '@/lib/runtime/polyfill';
import ReactNativePasskeyAutofill from '@algorandfoundation/react-native-passkey-autofill';
import { bootstrap } from '@/lib/keystore/bootstrap';
import { PreventScreenshotProvider } from '@/providers/PreventScreenshotProvider';
import React from 'react';
import { ReactKeystoreOptions } from '@algorandfoundation/react-native-keystore';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

globalPolyfill();
registerGlobals();

const biometricOptions: ReactKeystoreOptions['keystore']['authentication'] = {
  biometrics: true,
  prompt: 'Authenticate to access your wallet',
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
    <GestureHandlerRootView>
      <WalletProvider provider={provider}>
        <BottomSheetModalProvider>
          <PreventScreenshotProvider>
            <Stack />
          </PreventScreenshotProvider>
        </BottomSheetModalProvider>
      </WalletProvider>
    </GestureHandlerRootView>
  );
}
