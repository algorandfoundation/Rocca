import { Account, AccountStoreOptions, AccountStoreState } from '@/extensions/accounts';
import { KeystoreAccount } from '@/extensions/accounts-keystore';
import { AlgoConfig } from '@algorandfoundation/algokit-utils/types/network-client';
import { KeyStoreOptions } from '@algorandfoundation/keystore';
import type { Extension, ExtensionOptions } from '@algorandfoundation/wallet-provider';
import { Store } from '@tanstack/store';
import { HookCollection } from 'before-after-hook';

export interface AlgorandAccountsExtensionOptions
  extends ExtensionOptions, KeyStoreOptions, AccountStoreOptions<Account> {
  algorand: {
    algoConfig: AlgoConfig;
    hooks?: HookCollection<any>;
  };
  accounts: {
    store: Store<AccountStoreState<KeystoreAccount>>;
    hooks: HookCollection<any>;
  };
}

export type AlgorandAccountsExtension = Extension;

/**
 * Represents an Algorand Account
 */
export interface AlgorandAccount extends Account {
  type: 'algorand-account';
  /**
   * A method to sign a transaction or a set of transactions.
   *
   * @param txns - The transactions to sign.
   * @returns The signed transactions.
   */
  sign: (txns: Uint8Array[]) => Promise<Uint8Array[]>;
}
