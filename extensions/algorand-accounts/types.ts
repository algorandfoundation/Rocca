import { AccountStoreOptions, AccountStoreState } from '@/extensions/accounts';
import { KeystoreAccount } from '@/extensions/accounts-keystore';
import { KeyStoreOptions } from '@algorandfoundation/keystore';
import type { Extension, ExtensionOptions } from '@algorandfoundation/wallet-provider';
import { Store } from '@tanstack/store';
import { HookCollection } from 'before-after-hook';

export interface AlgorandAccountsExtensionOptions
  extends ExtensionOptions, KeyStoreOptions, AccountStoreOptions<KeystoreAccount> {
  // algorand?: {
  //   // Placeholder for any Algorand-specific configuration options (e.g., algod client settings)
  // };
  accounts: {
    store: Store<AccountStoreState<KeystoreAccount>>;
    hooks: HookCollection<any>;
  };
}

export type AlgorandAccountsExtension = Extension;

export interface AlgorandAccount extends Omit<KeystoreAccount, 'type'> {
  type: 'algorand-account';
}
