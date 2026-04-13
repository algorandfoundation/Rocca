import { CredentialProviderService } from '@/lib/credentialProvider';
import { accountStoreHooks } from '@/lib/hooks/accounts-store-hooks';
import { globalPolyfill, setupNavigatorPolyfill } from '@/lib/polyfill';
import { PreventScreenshotProvider } from '@/providers/PreventScreenshotProvider';
import { ReactNativeProvider, WalletProvider } from '@/providers/ReactNativeProvider';
import { accountsStore } from '@/stores/accounts';
import { keyStoreHooks } from '@/stores/before-after';
import { identitiesStore } from '@/stores/identities';
import { keyStore } from '@/stores/keystore';
import { passkeysStore } from '@/stores/passkeys';
import {
  initializeKeyStore,
  Key,
  KeyData,
  KeyStoreState,
  setStatus,
} from '@algorandfoundation/keystore';
import { fetchSecret, getMasterKey, storage } from '@algorandfoundation/react-native-keystore';
import ReactNativePasskeyAutofill from '@algorandfoundation/react-native-passkey-autofill';
import { Store } from '@tanstack/store';
import { useEventListener } from 'expo';
import { Stack } from 'expo-router';
import React from 'react';
import { Alert, Platform } from 'react-native';
import { install } from 'react-native-quick-crypto';
import { registerGlobals } from 'react-native-webrtc';

globalPolyfill();
registerGlobals();
install();

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
      hooks: accountStoreHooks,
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
    },
  },
);

setupNavigatorPolyfill();

async function bootstrap() {
  try {
    setStatus({ store: keyStore as unknown as Store<KeyStoreState>, status: 'loading' });
    const masterKey = await getMasterKey();

    // Set master key in native side BEFORE reloading
    await ReactNativePasskeyAutofill.setMasterKey(masterKey.toString('hex'));

    const secrets = await Promise.all(
      storage.getAllKeys().map(async (keyId) => {
        try {
          return await fetchSecret<KeyData>({ keyId, masterKey: await getMasterKey() });
        } catch (e) {
          console.error(`fetchSecret failed for key ${keyId}:`, e);
          return null;
        }
      }),
    );

    const keys = secrets
      .filter((k) => k !== null)
      .map(({ privateKey, ...rest }: KeyData) => rest) as Key[];

    initializeKeyStore({
      store: keyStore as unknown as Store<KeyStoreState>,
      keys,
    });

    const hdRootKey = keys.find(
      (k) => k.type === 'hd-root-key' || k.type === 'xhd-root-key' || k.type === 'hd-seed',
    );

    if (hdRootKey) {
      await ReactNativePasskeyAutofill.setHdRootKeyId(hdRootKey.id);
    }

    const isEnabled = await CredentialProviderService.isEnabledCredentialProviderService();
    console.log('CredentialProviderService isEnabled:', isEnabled);
    if (!isEnabled && Platform.OS === 'android') {
      Alert.alert(
        'Enable Autofill Service',
        'To use passkeys, you need to enable the autofill service for this app in your Android settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: async () => {
              await CredentialProviderService.showCredentialProviderSettings();
            },
          },
        ],
      );
    }

    await ReactNativePasskeyAutofill.configureIntentActions(
      'co.algorand.passkeyautofill.GET_PASSKEY',
      'co.algorand.passkeyautofill.CREATE_PASSKEY',
    ).catch((e) => {
      console.error('ReactNativePasskeyAutofill.configureIntentActions error:', e);
    });

    if (keys.length > 0) {
      setStatus({ store: keyStore as unknown as Store<KeyStoreState>, status: 'ready' });
    } else {
      setStatus({ store: keyStore as unknown as Store<KeyStoreState>, status: 'idle' });
    }
  } catch (e) {
    console.error('Bootstrap failed:', e);
    setStatus({ store: keyStore as unknown as Store<KeyStoreState>, status: 'idle' });
  }
}

bootstrap().catch((e) => console.error('Bootstrap promise error:', e));

export default function RootLayout() {
  useEventListener(ReactNativePasskeyAutofill, 'onPasskeyAdded', (event) => {
    console.log('Passkey added via autofill:', event);
    if (event.success) {
      bootstrap().catch((e) => console.error('Failed to reload keys after passkey added:', e));
    }
  });

  useEventListener(ReactNativePasskeyAutofill, 'onPasskeyAuthenticated', (event) => {
    console.log('Passkey authenticated via autofill:', event);
    if (event.success) {
      bootstrap().catch((e) =>
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
