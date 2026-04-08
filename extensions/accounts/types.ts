import type { ExtensionOptions } from '@algorandfoundation/wallet-provider';
import type { Store } from '@tanstack/store';
import type { HookCollection } from 'before-after-hook';

/**
 * Options for the AccountStore extension.
 */
export interface AccountStoreOptions<T> extends ExtensionOptions {
  accounts: {
    store: Store<AccountStoreState<T>>;
    hooks: HookCollection<any>;
  };
}

export type AccountType = 'ed25519' | 'lsig' | 'falcon' | string;

export interface AccountAsset {
  id: string;
  name: string;
  type: string;
  balance: bigint;
  metadata: Record<string, any>;
}

/**
 * Represents an account that can sign transactions.
 */
export interface Account {
  /**
   * The public address of the account.
   */
  address: string;

  /**
   *
   */
  balance: bigint;

  /**
   *
   */
  assets: AccountAsset[];

  /**
   * Type of account
   */
  type: AccountType;

  /**
   * Subclass via the metadata
   */
  metadata?: Record<string, any>;
}

/**
 * The state of the account store.
 */
export interface AccountStoreState<T> {
  /**
   * The list of accounts in the store.
   */
  accounts: T[];
}

/**
 * Represents an account store interface for managing accounts.
 */
export interface AccountStoreExtension<T> extends AccountStoreState<T> {
  /**
   * An object that represents additional functionality provided by this extension.
   */
  account: {
    store: AccountStoreApi<T>;
  };
}

/**
 * Interface representing an AccountStore extension API.
 */
export interface AccountStoreApi<T> {
  /**
   * Adds an account to the store.
   *
   * @param account - The account to add.
   * @returns The added account.
   */
  addAccount: (account: T) => Promise<T>;
  /**
   * Removes an account from the store by its address.
   *
   * @param address - The address of the account to remove.
   * @returns A promise that resolves when the account is removed.
   */
  removeAccount: (address: string) => Promise<void>;
  /**
   * Retrieves an account from the store by its address.
   *
   * @param address - The address of the account to retrieve.
   * @returns The account if found, otherwise undefined.
   */
  getAccount: (address: string) => Promise<T | undefined>;
  /**
   * Clears all accounts from the store.
   *
   * @returns A promise that resolves when the store is cleared.
   */
  clear: () => Promise<void>;
  /**
   * The hooks for account store operations.
   */
  hooks: HookCollection<any>;
}
