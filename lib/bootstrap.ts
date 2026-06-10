import { Alert, Platform } from 'react-native';
import {
  AuthenticationOptions,
  fetchSecret,
  getMasterKey,
  storage,
} from '@algorandfoundation/react-native-keystore';
import {
  initializeKeyStore,
  Key,
  KeyData,
  KeyStoreState,
  setStatus,
} from '@algorandfoundation/keystore';
import { Store } from '@tanstack/store';
import ReactNativePasskeyAutofill from '@algorandfoundation/react-native-passkey-autofill';
import { keyStore } from '@/stores/keystore';
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
    setStatus({
      store: keyStore as unknown as Store<KeyStoreState>,
      status: 'loading',
    });

    const keyIds = storage.getAllKeys();
    logMsg(`Found ${keyIds.length} keys in storage`);

    if (keyIds.length === 0) {
      logMsg('No keys found in MMKV, but ensuring master key is ready');
    }

    logMsg('Fetching master key...');
    const masterKey = await getMasterKey(options);
    logMsg('Master key retrieved');

    logMsg('Setting master key in native side...');
    await ReactNativePasskeyAutofill.setMasterKey(masterKey.toString('hex')).catch((e) => {
      logMsg(`ReactNativePasskeyAutofill.setMasterKey error: ${e}`, 'error');
    });

    if (keyIds.length === 0) {
      initializeKeyStore({
        store: keyStore as unknown as Store<KeyStoreState>,
        keys: [],
      });

      // Even if no keys, we should still configure intent actions
      await ReactNativePasskeyAutofill.configureIntentActions(
        'co.algorand.passkeyautofill.GET_PASSKEY',
        'co.algorand.passkeyautofill.CREATE_PASSKEY',
      ).catch((e) => {
        logMsg(`ReactNativePasskeyAutofill.configureIntentActions error: ${e}`, 'error');
      });

      await syncNativeStoredPasskeys(logMsg);

      logMsg('No keys found, setting keystore status to idle');
      setStatus({
        store: keyStore as unknown as Store<KeyStoreState>,
        status: 'idle',
      });

      return;
    }

    const secrets = await Promise.all(
      keyIds.map(async (keyId) => {
        try {
          // Pass a copy because fetchSecret clears the buffer in its finally block
          return await fetchSecret<KeyData>({
            keyId,
            options: { ...options, masterKey: Buffer.from(masterKey) },
          });
        } catch (e) {
          logMsg(`fetchSecret failed for key ${keyId}: ${e}`, 'error');
          return null;
        }
      }),
    );

    const keys = secrets
      .filter((k) => k !== null)
      .map(({ privateKey: _privateKey, seed: _seed, ...rest }: any) => rest) as Key[];

    logMsg(`Found ${keys.length} keys in storage`);
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

    // Log P256 key details for recovery diagnostics
    const p256Secrets = secrets.filter(
      (s) => s !== null && (s.type === 'hd-derived-p256' || s.type === 'xhd-derived-p256'),
    );
    p256Secrets.forEach((s) => {
      const pkType = s!.privateKey instanceof Uint8Array ? 'Uint8Array' : typeof s!.privateKey;
      logMsg(`  P256 key ${s!.id}: privateKey type=${pkType}, hasPublicKey=${!!s!.publicKey}`);
    });

    initializeKeyStore({
      store: keyStore as unknown as Store<KeyStoreState>,
      keys,
    });

    const hdRootKeySecret = secrets.find(
      (s) => s !== null && (s.type === 'hd-root-key' || s.type === 'xhd-root-key'),
    );
    const hdRootKey =
      keys.find((k) => k.type === 'hd-root-key') ||
      keys.find((k) => k.type === 'xhd-root-key') ||
      keys.find((k) => k.type === 'hd-seed');

    if (hdRootKey) {
      logMsg(`Setting HD root key ID in native side: ${hdRootKey.id}`);
      await ReactNativePasskeyAutofill.setHdRootKeyId(hdRootKey.id).catch((e: unknown) => {
        logMsg(`ReactNativePasskeyAutofill.setHdRootKeyId error: ${e}`, 'error');
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
      setStatus({
        store: keyStore as unknown as Store<KeyStoreState>,
        status: 'ready',
      });
    } else {
      logMsg('No keys found, setting keystore status to idle');
      setStatus({
        store: keyStore as unknown as Store<KeyStoreState>,
        status: 'idle',
      });
    }
  } catch (e) {
    logMsg(`Bootstrap failed: ${e}`, 'error');
    setStatus({
      store: keyStore as unknown as Store<KeyStoreState>,
      status: 'error',
    });
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
