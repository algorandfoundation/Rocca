import { Account, AccountAsset, AccountStoreState } from '@/extensions/accounts';
import { getAlgorandBalances } from '@/lib/algorand';
import { encodeAddress, Key, KeyStoreState } from '@algorandfoundation/keystore';
import { base64 } from '@scure/base';
import { Store } from '@tanstack/react-store';
import {
  AlgorandAccount,
  AlgorandAccountsExtension,
  AlgorandAccountsExtensionOptions,
} from './types';

export function isAlgorandAccount(account: Account): account is AlgorandAccount {
  return account.type === 'algorand-account';
}

export const WithAlgorandAccounts = (provider: any, options: AlgorandAccountsExtensionOptions) => {
  // Ensure dependencies are present
  if (!provider.account) {
    throw new Error(
      'AlgorandAccounts extension requires WithAccountStore extension to be present on the provider.',
    );
  }
  if (!provider.key) {
    throw new Error(
      'AlgorandAccounts extension requires WithKeyStore extension to be present on the provider.',
    );
  }

  // Get the store from the options
  const accountsStore: Store<AccountStoreState<Account>> = options.accounts.store;
  // Get the keystore from the options
  const keyStore: Store<KeyStoreState> = options.keystore.store;
  // clone of keystore at starting point prior to execution
  const keys = [...((keyStore.state.keys as Key[]) ?? [])];

  let isProcessing = false;
  let nextKeys: Key[] | null = null;

  const processUpdates = async (newKeys: Key[]) => {
    if (isProcessing) {
      nextKeys = newKeys;
      return;
    }

    isProcessing = true;
    nextKeys = null;

    // Find added keys
    const addedKeys = newKeys.filter(
      (newKey) => !keys.some((existingKey) => existingKey.id === newKey.id),
    );

    if (addedKeys.length === 0) {
      isProcessing = false;
      return;
    }

    // Update the local cache of keys
    keys.length = 0;
    newKeys.forEach((k) => keys.push(k));

    // Add passkeys for added keys
    addedKeys.forEach(async (k) => {
      if (k.type === 'hd-derived-ed25519' && k.publicKey) {
        const address = base64.encode(k.publicKey);

        const alreadyExists = accountsStore.state.accounts.some(
          (account) => account.address === address,
        );
        console.log(
          `Checking algorand account balances for key ${k.id}-${k.type}... alreadyExists: ${alreadyExists} ${address}`,
        );

        const algorandAddress = encodeAddress(k.publicKey);
        let r: { balance: bigint; assets?: AccountAsset[] };

        // lookup accounts balances, assets
        try {
          r = await getAlgorandBalances(algorandAddress);
        } catch (error) {
          console.error('Failed to fetch algorand balances for address:', algorandAddress, error);
          return;
        }

        const { balance, assets } = r;

        // add new account to store
        accountsStore.setState((prevState) => ({
          accounts: [
            ...prevState.accounts,
            {
              type: 'algorand-account',
              address: address,
              balance,
              assets: assets ?? [],
              metadata: {},
              sign: async (_txns: Uint8Array[]) => {
                return [];
              },
            },
          ],
        }));

        console.info('Added algorand account with balance and assets:', address);
      }
    });

    isProcessing = false;

    if (nextKeys) {
      const k = nextKeys;
      nextKeys = null;
      processUpdates(k);
    }
  };

  keyStore.subscribe((state) => {
    if (state.status !== 'ready' && state.status !== 'idle') return;
    setTimeout(() => {
      processUpdates(state.keys as unknown as Key[]);
    }, 0);
  });

  return provider as unknown as AlgorandAccountsExtension;
};
