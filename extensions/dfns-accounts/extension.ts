import type {
  Account,
  AccountStoreExtension,
  AccountStoreState,
} from '@algorandfoundation/accounts-store';
import type { LogStoreApi, LogStoreExtension } from '@algorandfoundation/log-store';
import type { Extension } from '@algorandfoundation/wallet-provider';
import type { Store } from '@tanstack/store';
import { toHex } from '../dfns-keystore/extension';
import type { DfnsKeystoreExtension, DfnsSignatureRequestBody } from '../dfns-keystore/types';
import { DfnsWalletsClient } from './client';
import { addDfnsAccount, removeDfnsAccount } from './store';
import {
  DFNS_ACCOUNT_TYPE,
  type DfnsAccount,
  type DfnsAccountsExtensionOptions,
  type DfnsWallet,
} from './types';

/**
 * Type guard for DFNS-backed accounts.
 */
export function isDfnsAccount(account: Account): account is DfnsAccount {
  return account.type === DFNS_ACCOUNT_TYPE;
}

/**
 * Extension that adds DFNS-backed accounts to a Provider's accounts store.
 *
 * Signing is delegated to the `dfns-keystore` extension (`provider.key.dfns`),
 * which must be installed on the provider beforehand. The end user's Personal
 * Access Token (PAT) is sourced from `options.key.dfns.pat`.
 *
 * Requires both {@link AccountStoreExtension `WithAccountStore`} and
 * {@link DfnsKeystoreExtension `WithDfnsKeystore`} to be installed on the
 * provider beforehand.
 *
 * See:
 * - https://docs.dfns.co/openapi.yaml
 * - https://docs.dfns.co/api-reference/auth/personal-access-tokens
 */
export const WithDfnsAccounts: Extension<unknown> = (
  provider: AccountStoreExtension<DfnsAccount> & DfnsKeystoreExtension & Partial<LogStoreExtension>,
  options: DfnsAccountsExtensionOptions,
) => {
  if (!provider.account) {
    throw new Error(
      '[dfns-accounts] WithDfnsAccounts requires WithAccountStore to be present on the provider.',
    );
  }
  if (!provider.key?.dfns) {
    throw new Error(
      '[dfns-accounts] WithDfnsAccounts requires WithDfnsKeystore to be present on the provider.',
    );
  }
  if (!options?.accounts?.dfns) {
    throw new Error('[dfns-accounts] Missing `accounts.dfns` configuration.');
  }
  if (!options?.key?.dfns) {
    throw new Error('[dfns-accounts] Missing `key.dfns` configuration.');
  }

  const log: LogStoreApi | undefined = provider.log;
  const accountsConfig = options.accounts.dfns;
  const keystoreConfig = options.key.dfns;
  const { autoPopulate = true, signatureKind, buildSignatureRequest } = accountsConfig;

  const accountStore: Store<AccountStoreState<DfnsAccount>> = options.accounts.store;
  const dfnsKey = provider.key.dfns;
  const client = new DfnsWalletsClient({
    pat: keystoreConfig.pat,
    baseUrl: keystoreConfig.baseUrl,
    appId: keystoreConfig.appId,
    fetch: accountsConfig.fetch ?? keystoreConfig.fetch,
  });

  /**
   * Builds a {@link DfnsAccount} for the given DFNS wallet, wiring its `sign`
   * method to `provider.key.dfns.sign(...)`.
   */
  const toAccount = (wallet: DfnsWallet): DfnsAccount => {
    const account: DfnsAccount = {
      address: wallet.address,
      type: DFNS_ACCOUNT_TYPE,
      assets: [],
      balance: BigInt(0),
      metadata: {
        walletId: wallet.id,
        keyId: wallet.signingKey.id,
        network: wallet.network,
        scheme: wallet.signingKey.scheme,
        curve: wallet.signingKey.curve,
        publicKey: wallet.signingKey.publicKey,
        status: wallet.status,
        name: wallet.name,
        tags: wallet.tags,
      },
      sign: async (txns: Uint8Array[]): Promise<Uint8Array[]> => {
        const signed: Uint8Array[] = [];
        for (const txn of txns) {
          if (buildSignatureRequest) {
            const body: DfnsSignatureRequestBody = await buildSignatureRequest(txn, account);
            signed.push(await dfnsKey.sign({ keyId: wallet.signingKey.id, data: txn, body }));
          } else {
            signed.push(
              await dfnsKey.sign({
                keyId: wallet.signingKey.id,
                data: txn,
                kind: signatureKind,
                network: wallet.network,
              }),
            );
          }
        }
        return signed;
      },
    };
    return account;
  };

  /**
   * Pulls the current list of DFNS wallets and reconciles them with the
   * account store: adds new wallets, removes wallets that disappeared, and
   * refreshes metadata for everything else.
   */
  const refresh = async (): Promise<DfnsAccount[]> => {
    log?.info('[dfns-accounts] Refreshing DFNS wallets...');
    const wallets = await client.listAllWallets();
    const nextAccounts = wallets.map(toAccount);
    const nextAddresses = new Set(nextAccounts.map((a) => a.address));

    // Remove DFNS-managed accounts that are no longer reported.
    for (const existing of accountStore.state.accounts) {
      if (isDfnsAccount(existing) && !nextAddresses.has(existing.address)) {
        log?.info(`[dfns-accounts] Removing stale DFNS account ${existing.address}`);
        removeDfnsAccount({ store: accountStore, address: existing.address });
      }
    }

    // Upsert each wallet as a DFNS account.
    for (const account of nextAccounts) {
      addDfnsAccount({ store: accountStore, account });
    }

    log?.info(`[dfns-accounts] Synced ${nextAccounts.length} DFNS wallet(s).`);
    return nextAccounts;
  };

  if (autoPopulate) {
    refresh().catch((err) => {
      log?.error?.(`[dfns-accounts] Auto-populate failed: ${(err as Error).message}`);
    });
  }

  return {
    dfns: {
      /** The wallets-scoped DFNS API client. */
      client,
      /** Re-sync DFNS wallets into the account store on demand. */
      refresh,
      /** Type guard for DFNS-backed accounts. */
      isDfnsAccount,
    },
  };
};

// Re-export hex helper for convenience to existing consumers.
export { toHex };
