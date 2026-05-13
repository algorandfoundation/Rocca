import type { AlgorandProviderOptions } from '@/extensions/algorand-accounts/types';
import { ChessGatewayClient } from '@/lib/chess-gateway';
import {
  Account,
  AccountStoreOptions,
  AccountStoreState,
} from '@algorandfoundation/accounts-store';
import type { Extension, ExtensionOptions } from '@algorandfoundation/wallet-provider';
import { Store } from '@tanstack/store';
import { HookCollection } from 'before-after-hook';

/**
 * Configures how the extension talks to the chess-gateway. Either pass an
 * existing `ChessGatewayClient` (`client`) so the extension reuses the app's
 * singleton and its event bus, or pass a `gatewayUrl` and the extension will
 * construct its own internal client. Exactly one of the two must be provided.
 */
export type IntermezzoGatewayOptions =
  | { client: ChessGatewayClient; gatewayUrl?: never }
  | { client?: never; gatewayUrl: string };

export interface IntermezzoAccountExtensionOptions
  extends ExtensionOptions, AccountStoreOptions<Account> {
  algorand: AlgorandProviderOptions;
  accounts: {
    store: Store<AccountStoreState<Account>>;
    hooks: HookCollection<any>;
  };
  /**
   * Either a pre-built `ChessGatewayClient` to reuse, or a `gatewayUrl` from
   * which the extension will build its own. The remote address is then
   * resolved internally via `getSession() → getUser(player.user_id)`.
   */
  intermezzo: IntermezzoGatewayOptions;
}

/**
 * Public API surface added to the provider by `WithIntermezzoAccount`.
 */
export interface IntermezzoAccountApi {
  /**
   * Re-resolves the remote address via `options.intermezzo.resolveAddress`
   * and synchronises the account-store + on-chain subscriber. Safe to call
   * multiple times (e.g. after sign-in / sign-out).
   */
  refresh: () => Promise<void>;
  /** Returns the currently tracked remote address, if any. */
  getAddress: () => string | null;
}

export type IntermezzoAccountExtension = Extension & {
  intermezzo: IntermezzoAccountApi;
};

/**
 * Represents a remote (gateway / Intermezzo-vault managed) Algorand account.
 * Unlike `AlgorandAccount`, signing is performed server-side and is not
 * available locally, so no `sign` function is exposed.
 */
export interface IntermezzoAccount extends Account {
  type: 'intermezzo-account';
}
