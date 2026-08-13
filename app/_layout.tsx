import { useEventListener } from 'expo';
import { Stack } from 'expo-router';
import { AppState } from 'react-native';
import { install, subtle } from 'react-native-quick-crypto';
import { keyStore } from '@/stores/keystore';
import { keyStoreHooks, credentialHooks } from '@/stores/before-after';
import { accountsStore } from '@/stores/accounts';
import { identitiesStore } from '@/stores/identities';
import { ReactNativeProvider, WalletProvider } from '@/providers/ReactNativeProvider';
import { passkeysStore } from '@/stores/passkeys';
import { credentialsStore, credentialsDriver, CREDENTIALS_KEY } from '@/stores/credentials';
import { migrationsLedger } from '@/stores/migrations';
import { registerGlobals } from 'react-native-webrtc';
import { globalPolyfill, setupNavigatorPolyfill } from '@/lib/polyfill';
import ReactNativePasskeyAutofill from '@algorandfoundation/react-native-passkey-autofill';
import { bootstrap } from '@/lib/bootstrap';
import { biometricOptions } from '@/lib/auth-options';
import { useMigrations } from '@/hooks/useMigrations';
import { PreventScreenshotProvider } from '@/providers/PreventScreenshotProvider';
import React from 'react';

globalPolyfill();
registerGlobals();
install();

// Exported so `lib/bootstrap.ts` can await `provider.key.store.ready` on the
// same engine instance the app renders with.
export const provider = new ReactNativeProvider(
  {
    id: 'react-native-wallet',
    name: 'React Native Wallet',
  },
  {
    migrations: { ledger: migrationsLedger },
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
    credentials: {
      store: credentialsStore,
      hooks: credentialHooks,
      // The engine persists the durable `credentials` slice through this
      // MMKV adapter (hydration + snapshots); sessions stay ephemeral.
      driver: credentialsDriver,
      storageKey: CREDENTIALS_KEY,
    },
    intermezzo: {
      baseUrl: process.env.EXPO_PUBLIC_INTERMEZZO_BASE_URL ?? 'http://localhost:3000',
    },
    keystore: {
      store: keyStore,
      hooks: keyStoreHooks,
      // React Native has no reliable global `crypto.subtle`, so the host
      // Subtle must be supplied explicitly. `react-native-quick-crypto`'s
      // `subtle` backs the engine's AES-256-GCM at-rest sealing (without it,
      // sealing a new seed throws "Cannot read property 'importKey' of
      // undefined").
      subtle: subtle as unknown as SubtleCrypto,
      // No `shims:` override needed: since keystore-core 1.0.0-canary.2 the
      // default stack routes dp256's 210k-iteration main-key PBKDF2 through
      // the host Subtle above (`react-native-quick-crypto`'s native OpenSSL
      // implementation) — the bundled pure-JS derivation froze the Hermes JS
      // thread for minutes whenever the passkey main key was derived.
      authentication: biometricOptions,
    },
  },
);

setupNavigatorPolyfill();

/**
 * Splash gate for the one-time data migration run: the navigation tree stays
 * unmounted (native splash remains visible) until `provider.migrations.ready`
 * settles, so no screen reads keystore records mid-rewrite. A failed run
 * still releases the gate — the error is logged and the app proceeds with
 * whatever data is on disk.
 */
function RootNavigation() {
  const { pending: migrationsPending, error: migrationsError } = useMigrations();

  React.useEffect(() => {
    if (migrationsError) {
      console.error('Data migrations failed:', migrationsError);
    }
  }, [migrationsError]);

  if (migrationsPending) {
    return null;
  }

  return <Stack />;
}

export default function RootLayout() {
  React.useEffect(() => {
    bootstrap(biometricOptions).catch((e) => console.error('Bootstrap promise error:', e));
  }, []);

  React.useEffect(() => {
    let wasBackgrounded = false;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') {
        wasBackgrounded = true;
        return;
      }
      if (state === 'active' && wasBackgrounded) {
        wasBackgrounded = false;
        bootstrap(biometricOptions, false).catch((e) =>
          console.error('Failed to reload keys after app became active:', e),
        );
      }
    });

    return () => subscription.remove();
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
        <RootNavigation />
      </WalletProvider>
    </PreventScreenshotProvider>
  );
}
