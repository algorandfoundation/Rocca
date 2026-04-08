import type {
  Account,
  AccountStoreExtension,
  AccountStoreOptions,
  AccountStoreState,
} from '../accounts/types';
import type { KeyStoreExtension, KeyStoreOptions } from '@algorandfoundation/keystore';
import type { ExtensionOptions } from '@algorandfoundation/wallet-provider';
import type { Store } from '@tanstack/store';
import type { HookCollection } from 'before-after-hook';

/**
 * Represents an account that is backed by the keystore for signing.
 */
export interface KeystoreAccount extends Account {
  type: 'keystore-account';
  /**
   * A method to sign a transaction or a set of transactions.
   *
   * @param txns - The transactions to sign.
   * @returns The signed transactions.
   */
  sign: (txns: Uint8Array[]) => Promise<Uint8Array[]>;
}

/**
 * Options for the AccountsKeystore extension.
 */
export interface AccountsKeystoreExtensionOptions
  extends ExtensionOptions, AccountStoreOptions<KeystoreAccount>, KeyStoreOptions {
  accounts: {
    store: Store<AccountStoreState<KeystoreAccount>>;
    hooks: HookCollection<any>;
    keystore: {
      /**
       * Whether to automatically add accounts for all compatible keys in the keystore.
       * Defaults to true.
       */
      autoPopulate?: boolean;
    };
  };
}

/**
 * The interface exposed by the Accounts Keystore Extension.
 *
 * This extension bridges the Accounts Store and the Keystore,
 * providing accounts that are backed by the keystore for signing.
 */
export interface AccountsKeystoreExtension
  extends AccountStoreExtension<KeystoreAccount>, KeyStoreExtension {
  account: AccountStoreExtension<KeystoreAccount>['account'] & {
    keystore: {
      autoPopulate: boolean;
    };
  };
}
