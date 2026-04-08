import type { Account, AccountStoreExtension, AccountStoreState } from '@/extensions/accounts';
import type {
  Key,
  KeyStoreExtension,
  KeyStoreState,
  XHDDerivedKeyData,
} from '@algorandfoundation/keystore';
import { encodeAddress } from '@algorandfoundation/keystore';
import type { Extension } from '@algorandfoundation/wallet-provider';
import type { Store } from '@tanstack/store';
import type {
  AccountsKeystoreExtension,
  AccountsKeystoreExtensionOptions,
  KeystoreAccount,
} from './types.ts';
import { base64 } from '@scure/base';

export function isKeystoreAccount(account: Account): account is KeystoreAccount {
  return account.type === 'keystore-account';
}

/**
 * Extension that bridges the account store and keystore.
 *
 * It automatically populates the account store with accounts derived from keys
 * in the keystore, providing a sign method that leverages the keystore backend.
 */
export const WithAccountsKeystore: Extension<AccountsKeystoreExtension> = (
  provider: KeyStoreExtension & AccountStoreExtension<KeystoreAccount>,
  options: AccountsKeystoreExtensionOptions,
) => {
  // Ensure dependencies are present
  if (!provider.account) {
    throw new Error(
      'AccountsKeystore extension requires WithAccountStore extension to be present on the provider.',
    );
  }
  if (!provider.key) {
    throw new Error(
      'AccountsKeystore extension requires WithKeyStore extension to be present on the provider.',
    );
  }

  const keyStore: Store<KeyStoreState> = options.keystore.store;
  const accountStore: Store<AccountStoreState<KeystoreAccount>> = options.accounts.store;
  const { autoPopulate = true } = options.accounts.keystore ?? {};

  const keys: Key[] = [];

  /**
   * Creates an account object for a given key ID and address.
   */
  const createKeyAccount = (
    keyId: string,
    address: string,
    parentKeyId?: string,
  ): KeystoreAccount => ({
    address,
    type: 'keystore-account',
    assets: [],
    metadata: { keyId, parentKeyId },
    balance: BigInt(0),
    // TODO: TransactionSigners
    sign: async (txns: Uint8Array[]) => {
      // Sign each transaction using the keystore
      const signedTxns: Uint8Array[] = [];
      for (const txn of txns) {
        const signed = await provider.key.store.sign(keyId, txn);
        signedTxns.push(signed);
      }
      return signedTxns;
    },
  });

  // Initial population if enabled
  if (autoPopulate) {
    let isProcessing = false;
    let nextKeys: Key[] | null = null;

    const processUpdates = async (newKeys: Key[]) => {
      console.log(
        `[AccountsKeystore] processUpdates called with ${newKeys.length} keys. Current status: ${keyStore.state.status}`,
      );
      if (isProcessing) {
        console.log('[AccountsKeystore] already processing, queueing next update');
        nextKeys = newKeys;
        return;
      }
      isProcessing = true;
      try {
        nextKeys = null;

        // Find added keys
        const addedKeys = newKeys.filter(
          (newKey) => !keys.some((existingKey) => existingKey.id === newKey.id),
        );

        // Find removed keys
        const removedKeys = keys.filter(
          (existingKey) => !newKeys.some((newKey) => newKey.id === existingKey.id),
        );

        console.log(
          `[AccountsKeystore] processUpdates: ${newKeys.length} total, ${addedKeys.length} added, ${removedKeys.length} removed`,
        );

        if (addedKeys.length === 0 && removedKeys.length === 0) {
          console.log('[AccountsKeystore] No changes to process');
          return;
        }

        // Update the local cache of keys BEFORE processing to ensure consistency
        keys.length = 0;
        newKeys.forEach((k) => keys.push(k));

        // Remove accounts for removed keys
        for (const k of removedKeys) {
          if (k.type === 'hd-derived-ed25519' && k.publicKey) {
            const address = encodeAddress(k.publicKey);
            const account = accountStore.state.accounts.find((a) => a.address === address);
            if (account && account.metadata?.keyId === k.id) {
              console.log(`Removing account for key ${k.id}-${k.type}...`);
              await provider.account.store.removeAccount(address);
            }
          }
        }

        // Process only the newly added keys
        for (const k of addedKeys) {
          if (k.type === 'hd-derived-ed25519' && k.publicKey) {
            console.log(`Checking account for key ${k.id}-${k.type}...`);
            const address = encodeAddress(k.publicKey);
            const parentKeyId = (k as XHDDerivedKeyData)?.metadata?.parentKeyId;

            // Skip if the account already exists
            if (
              !accountStore.state.accounts.some((a) => a.address === address) &&
              k.metadata?.context === 0
            ) {
              console.log(`Adding account for key ${k.id}-${k.type}...`);
              await provider.account.store.addAccount(createKeyAccount(k.id, address, parentKeyId));
            }
          }
        }
      } finally {
        isProcessing = false;
        if (nextKeys) {
          const k = nextKeys;
          nextKeys = null;
          await processUpdates(k);
        }
      }
    };

    processUpdates(keyStore.state.keys as unknown as Key[]);

    keyStore.subscribe((state) => {
      console.log(
        `[AccountsKeystore] Keystore subscriber fired. Status: ${state.status}, Keys: ${state.keys.length}`,
      );
      if (state.status !== 'ready' && state.status !== 'idle') {
        console.log(`[AccountsKeystore] Ignoring status: ${state.status}`);
        return;
      }
      processUpdates(state.keys as unknown as Key[]);
    });
  }

  // This extension doesn't add new API methods, it just bridges existing ones.
  // But it must return an object that matches the combined interface.
  return provider as unknown as AccountsKeystoreExtension;
};
