// MUST be first: installs `global.crypto` before any `@noble/hashes` import
// is evaluated. See `lib/runtime/install-crypto.ts`.
import { bootstrap } from '@/lib/keystore/bootstrap';
import '@/lib/runtime/install-crypto';
import { globalPolyfill, setupNavigatorPolyfill } from '@/lib/runtime/polyfill';
import { PreventScreenshotProvider } from '@/providers/PreventScreenshotProvider';
import { ReactNativeProvider, WalletProvider } from '@/providers/ReactNativeProvider';
import { accountsStore } from '@/stores/accounts';
import { keyStoreHooks } from '@/stores/before-after';
import { identitiesStore } from '@/stores/identities';
import { keyStore } from '@/stores/keystore';
import { passkeysStore } from '@/stores/passkeys';
import { ReactKeystoreOptions } from '@algorandfoundation/react-native-keystore';
import ReactNativePasskeyAutofill from '@algorandfoundation/react-native-passkey-autofill';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useEventListener } from 'expo';
import { Stack } from 'expo-router';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerGlobals } from 'react-native-webrtc';

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
            <Stack>
              <Stack.Screen
                name="terms"
                options={{
                  presentation: 'modal',
                  title: 'Terms & Conditions',
                }}
              />
            </Stack>
          </PreventScreenshotProvider>
        </BottomSheetModalProvider>
      </WalletProvider>
    </GestureHandlerRootView>
  );
}
