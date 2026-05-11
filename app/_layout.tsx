import HeaderBackButton from '@/components/world-chess/HeaderBackButton';
import { bootstrap } from '@/lib/bootstrap';
import { globalPolyfill, setupNavigatorPolyfill } from '@/lib/polyfill';
import { PreventScreenshotProvider } from '@/providers/PreventScreenshotProvider';
import { ReactNativeProvider, WalletProvider } from '@/providers/ReactNativeProvider';
import { accountsStore } from '@/stores/accounts';
import { keyStoreHooks } from '@/stores/before-after';
import { identitiesStore } from '@/stores/identities';
import { keyStore } from '@/stores/keystore';
import { passkeysStore } from '@/stores/passkeys';
import theme from '@/theme/theme';
import { ReactKeystoreOptions } from '@algorandfoundation/react-native-keystore';
import ReactNativePasskeyAutofill from '@algorandfoundation/react-native-passkey-autofill';
import { useEventListener } from 'expo';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { install } from 'react-native-quick-crypto';
import { registerGlobals } from 'react-native-webrtc';
// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

globalPolyfill();
registerGlobals();
install();

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
    algorand: {
      network: process.env.EXPO_PUBLIC_GENESIS_ID ?? 'mainnet-v1.0',
      algodConfig: {
        token: process.env.EXPO_PUBLIC_ALGOD_TOKEN ?? '',
        server: process.env.EXPO_PUBLIC_ALGOD_SERVER || 'https://mainnet-api.4160.nodely.dev',
        port: process.env.EXPO_PUBLIC_ALGOD_PORT ? Number(process.env.EXPO_PUBLIC_ALGOD_PORT) : 443,
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
    <GestureHandlerRootView>
      <PreventScreenshotProvider>
        <WalletProvider provider={provider}>
          <Stack
            initialRouteName="index"
            screenOptions={{
              headerStyle: { backgroundColor: theme.semantic.bg['app-bg'] },
              headerTintColor: theme.semantic.fg['brand-secondary'],
              headerTitleStyle: {
                color: theme.semantic.fg['high-emphasis'],
                fontFamily: theme.primitives.font.family.header,
                fontSize: theme.primitives.font.size['p-lg'],
              },
              headerTitleAlign: 'center', // Consistent position across Android and iOS
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="auth/login" options={{ headerShown: false }} />
            <Stack.Screen name="dashboard" options={{ headerShown: false }} />
            <Stack.Screen
              name="events"
              options={{ title: 'Events', headerLeft: () => <HeaderBackButton /> }}
            />
            <Stack.Screen
              name="activities"
              options={{ title: 'Activities', headerLeft: () => <HeaderBackButton /> }}
            />
          </Stack>
        </WalletProvider>
      </PreventScreenshotProvider>
    </GestureHandlerRootView>
  );
}
