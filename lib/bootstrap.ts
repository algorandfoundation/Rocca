import { Alert, Platform } from 'react-native';
import {
  AuthenticationOptions,
  createMasterKey,
  MasterKeyNotFoundError,
  readMasterKey,
  storage,
} from '@algorandfoundation/react-native-keystore';
import ReactNativePasskeyAutofill from '@algorandfoundation/react-native-passkey-autofill';
import { keyStore } from '@/stores/keystore';
import { DOMAIN_MAIN_KEY_SCHEME, ensureDomainMainKey, findDomainMainKey } from '@/lib/passkey-root';
import { passkeysStore } from '@/stores/passkeys';
import { addLog } from '@algorandfoundation/log-store';

import { generateId } from '@algorandfoundation/wallet-provider';
import { logsStore } from '@/stores/logs';
import { toUrlSafe } from '@/utils/base64';

type NativeStoredCredential = {
  credentialId: string;
  relyingPartyIdentifier: string;
  userName: string;
  userHandle: string;
  publicKey?: string;
  createdAt?: number;
};

function base64ToBytes(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64'));
}

async function syncNativeStoredPasskeys(logMsg: (message: string, level?: string) => void) {
  const credentials = (await ReactNativePasskeyAutofill.getStoredCredentials().catch(
    (e: unknown) => {
      logMsg(`ReactNativePasskeyAutofill.getStoredCredentials error: ${e}`, 'error');
      return [];
    },
  )) as NativeStoredCredential[];

  logMsg(`Native passkey credentials visible to app: ${credentials.length}`);
  await ReactNativePasskeyAutofill.refreshCredentialIdentities?.().catch((e: unknown) => {
    logMsg(`ReactNativePasskeyAutofill.refreshCredentialIdentities error: ${e}`, 'error');
  });
  const diagnostics = await ReactNativePasskeyAutofill.getDiagnostics().catch((): string[] => []);
  diagnostics.slice(-8).forEach((line: string) => {
    logMsg(`PasskeyAutofill diagnostic: ${line}`);
  });

  if (credentials.length === 0) {
    return;
  }

  passkeysStore.setState((state) => {
    const nativePasskeys = credentials.map((credential) => {
      const id = toUrlSafe(credential.credentialId);
      const createdAt =
        credential.createdAt && credential.createdAt < 10_000_000_000
          ? credential.createdAt * 1000
          : credential.createdAt;

      return {
        id,
        name: credential.relyingPartyIdentifier,
        userHandle: credential.userHandle,
        origin: credential.relyingPartyIdentifier,
        publicKey: credential.publicKey ? base64ToBytes(credential.publicKey) : new Uint8Array(),
        algorithm: 'P256',
        createdAt,
        metadata: {
          keyId: credential.credentialId,
          nativeCredential: true,
          registered: true,
          userName: credential.userName,
        },
      };
    });

    const nativeIds = new Set(nativePasskeys.map((passkey) => passkey.id));
    const retained = state.passkeys.filter((passkey) => !nativeIds.has(passkey.id));
    return {
      ...state,
      passkeys: [...nativePasskeys, ...retained],
    };
  });
}

let activeBootstrap: Promise<void> | null = null;

async function runBootstrap(options?: AuthenticationOptions, showAlert = true) {
  const logMsg = (message: string, level = 'info') => {
    addLog({
      store: logsStore,
      log: {
        id: generateId(),
        level,
        context: 'Bootstrap',
        timestamp: new Date(),
        message,
      },
    });
    if (level === 'error') {
      console.error(`[Bootstrap ERROR] ${message}`);
    } else {
      console.log(`[Bootstrap INFO] ${message}`);
    }
  };

  try {
    keyStore.setState((state) => ({ ...state, status: 'loading' }));

    logMsg('Waiting for keystore to hydrate...');
    // The engine hydrates the reactive `keyStore` from its own persisted
    // metadata records, adopting any record still in the legacy flat layout on
    // the way; the app no longer reconstructs it by hand.
    // Imported lazily: the root layout owns the provider singleton and imports
    // this module, so a static import would close a cycle. By the time
    // bootstrap runs, the layout has been evaluated.
    const { provider } = await import('@/app/_layout');
    await provider.key.store.ready;
    // The Android credential provider runs in its own process and writes
    // straight into the shared keystore storage, so records it added while the
    // app was running are not in the reactive store. `reload()` re-reads them;
    // bootstrap also runs on resume, which is exactly when that matters.
    await provider.key.store.reload().catch((e: unknown) => {
      logMsg(`Keystore reload error: ${e}`, 'error');
    });
    logMsg('Keystore hydrated');

    logMsg('Fetching master key...');
    // `readMasterKey` never creates one; fall back to `createMasterKey` when
    // storage is genuinely empty, mirroring the engine's own read-or-create
    // behaviour so a master key always exists to share with the native side.
    const masterKey = await readMasterKey(options).catch((e: unknown) => {
      if (!(e instanceof MasterKeyNotFoundError) || storage.getAllKeys().length > 0) throw e;
      return createMasterKey(options);
    });
    logMsg('Master key retrieved');

    logMsg('Setting master key in native side...');
    // Raw bytes, not hex: the native bridge takes a byte array so the secret is
    // never materialised as a non-zeroable JS string. A `Buffer` already is a
    // `Uint8Array`, so this hands over the same memory.
    await ReactNativePasskeyAutofill.setMasterKey(masterKey).catch((e) => {
      logMsg(`ReactNativePasskeyAutofill.setMasterKey error: ${e}`, 'error');
    });

    const keys = keyStore.state.keys;
    logMsg(`Found ${keys.length} keys in storage`);

    if (keys.length === 0) {
      logMsg('No keys found, but ensuring master key is ready');

      // Even if no keys, we should still configure intent actions
      await ReactNativePasskeyAutofill.configureIntentActions(
        'co.algorand.passkeyautofill.GET_PASSKEY',
        'co.algorand.passkeyautofill.CREATE_PASSKEY',
      ).catch((e) => {
        logMsg(`ReactNativePasskeyAutofill.configureIntentActions error: ${e}`, 'error');
      });

      await syncNativeStoredPasskeys(logMsg);

      logMsg('No keys found, setting keystore status to idle');
      keyStore.setState((state) => ({ ...state, status: 'idle' }));

      return;
    }

    keys.forEach((k) => {
      const pkType =
        k.publicKey instanceof Uint8Array
          ? 'Uint8Array'
          : Buffer.isBuffer(k.publicKey)
            ? 'Buffer'
            : Array.isArray(k.publicKey)
              ? 'Array'
              : typeof k.publicKey;
      const hasPK = pkType !== 'undefined' && k.publicKey !== null;
      logMsg(
        `  key: id=${k.id}, type=${k.type}, algorithm=${k.algorithm}, hasPublicKey=${hasPK} (${pkType})`,
      );
      if (k.metadata) {
        logMsg(`    metadata: ${JSON.stringify(k.metadata)}`);
      }
    });

    // Passkeys derive from the deterministic-P256 main key, not from the account
    // root. Wallets created before that distinction existed have no main key, so
    // derive one here — the master key is already unlocked at this point, and
    // bootstrap also runs on resume, so the back-fill happens once and sticks.
    let mainKeyId = findDomainMainKey(keys)?.id;
    if (!mainKeyId) {
      mainKeyId = await ensureDomainMainKey(provider.key.store, keys).catch((e: unknown) => {
        logMsg(`Failed to derive the passkey main key: ${e}`, 'error');
        return undefined;
      });
      if (mainKeyId) {
        logMsg(`Derived passkey main key (${DOMAIN_MAIN_KEY_SCHEME}): ${mainKeyId}`);
      }
    }

    // Only fall back to the account root for a wallet with no seed to derive a
    // main key from; credentials already issued against it keep working, because
    // each one records the scheme it was derived with.
    const parentKey = mainKeyId
      ? { id: mainKeyId, scheme: DOMAIN_MAIN_KEY_SCHEME }
      : (() => {
          const legacy =
            keys.find((k) => k.type === 'hd-root-key') ||
            keys.find((k) => k.type === 'xhd-root-key') ||
            keys.find((k) => k.type === 'hd-seed');
          return legacy ? { id: legacy.id, scheme: 'bip32-ed25519' } : undefined;
        })();

    if (parentKey) {
      logMsg(`Setting passkey parent key in native side: ${parentKey.id} (${parentKey.scheme})`);
      await ReactNativePasskeyAutofill.setMainKeyId(parentKey.id).catch((e: unknown) => {
        logMsg(`ReactNativePasskeyAutofill.setMainKeyId error: ${e}`, 'error');
      });
    }

    const isEnabled = await ReactNativePasskeyAutofill.isProviderActive().catch((e: unknown) => {
      logMsg(`ReactNativePasskeyAutofill.isProviderActive error: ${e}`, 'error');
      return false;
    });
    logMsg(`PasskeyAutofill provider isActive: ${isEnabled}`);

    if (!isEnabled && Platform.OS === 'android') {
      logMsg('PasskeyAutofill provider is NOT active. Showing alert.');
      if (showAlert) {
        Alert.alert(
          'Enable Autofill Service',
          'To use passkeys, you need to enable the autofill service for this app in your Android settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: async () => {
                await ReactNativePasskeyAutofill.openProviderSettings();
              },
            },
          ],
        );
      }
    }

    await ReactNativePasskeyAutofill.configureIntentActions(
      'co.algorand.passkeyautofill.GET_PASSKEY',
      'co.algorand.passkeyautofill.CREATE_PASSKEY',
    ).catch((e) => {
      logMsg(`ReactNativePasskeyAutofill.configureIntentActions error: ${e}`, 'error');
    });

    await syncNativeStoredPasskeys(logMsg);

    if (keys.length > 0) {
      logMsg('Setting keystore status to ready');
      keyStore.setState((state) => ({ ...state, status: 'ready' }));
    } else {
      logMsg('No keys found, setting keystore status to idle');
      keyStore.setState((state) => ({ ...state, status: 'idle' }));
    }
  } catch (e) {
    logMsg(`Bootstrap failed: ${e}`, 'error');
    keyStore.setState((state) => ({ ...state, status: 'error' }));
  }
}

/**
 * Bootstraps the app's keystore and native passkey autofill service.
 * This should be called on app start, and after any operation that changes the wallet's keys (e.g., import, create).
 *
 * @param options
 * @param showAlert - Whether to show an alert if the autofill service is not enabled.
 */
export async function bootstrap(options?: AuthenticationOptions, showAlert = true) {
  if (activeBootstrap) {
    return activeBootstrap;
  }

  activeBootstrap = runBootstrap(options, showAlert).finally(() => {
    activeBootstrap = null;
  });
  return activeBootstrap;
}
