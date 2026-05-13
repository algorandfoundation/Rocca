import {
  createSubscriberWithWatchlist,
  getAlgorandBalances,
} from '@/extensions/algorand-accounts/algorand';
import { ChessGatewayClient } from '@/lib/chess-gateway';
import { decodeAddress } from '@/utils/algorand';
import { Account, AccountAsset, AccountStoreState } from '@algorandfoundation/accounts-store';
import { AlgorandClient } from '@algorandfoundation/algokit-utils';
import { base64 } from '@scure/base';
import { Store } from '@tanstack/store';
import {
  IntermezzoAccount,
  IntermezzoAccountApi,
  IntermezzoAccountExtension,
  IntermezzoAccountExtensionOptions,
} from './types';

/**
 * Type-guard for the `intermezzo-account` Account variant.
 */
export function isIntermezzoAccount(account: Account): account is IntermezzoAccount {
  return account.type === 'intermezzo-account';
}

/**
 * Provider extension that mirrors `WithAlgorandAccounts` but tracks a single
 * remote, gateway-managed (Intermezzo) Algorand account whose private key is
 * held in the vault rather than the device keystore. The remote address is
 * obtained on-demand via `options.intermezzo.resolveAddress`, and a balance
 * subscriber is started against the node so the account-store stays live.
 */
export const WithIntermezzoAccount = (
  provider: any,
  options: IntermezzoAccountExtensionOptions,
) => {
  if (!provider.account) {
    throw new Error(
      'IntermezzoAccount extension requires WithAccountStore extension to be present on the provider.',
    );
  }

  const algorandClient = AlgorandClient.fromConfig({
    algodConfig: options.algorand.algodConfig,
    indexerConfig: options.algorand.indexerConfig,
  });

  // Surface the algod / indexer clients on the provider if no earlier
  // Algorand-aware extension already did so. Hooks/screens can then
  // reuse them via `useProvider().algorand.{algod,indexer}` instead of
  // re-resolving env config.
  if (!provider.algorand) {
    provider.algorand = {
      algod: algorandClient.client.algod,
      indexer: algorandClient.client.indexerIfPresent ?? null,
    };
  }

  const accountsStore: Store<AccountStoreState<Account>> = options.accounts.store;

  // Accept either a pre-built ChessGatewayClient or a `gatewayUrl`. The
  // resolver is the same regardless of how the client was obtained.
  const gateway: ChessGatewayClient =
    options.intermezzo.client ??
    new ChessGatewayClient({ baseUrl: options.intermezzo.gatewayUrl! });

  const resolveAddress = async (): Promise<string | null> => {
    try {
      const session = await gateway.getSession();
      const userId = session?.player?.user_id;
      if (!userId) return null;
      const info = await gateway.getUser(userId);
      return info.public_address ?? null;
    } catch (error) {
      console.warn('Failed to resolve intermezzo remote address:', error);
      return null;
    }
  };

  let currentAddress: string | null = null;
  let containedSubscriber: ReturnType<typeof createSubscriberWithWatchlist> | null = null;
  let isProcessing = false;
  let pendingRefresh = false;

  const stopSubscriber = (reason: string) => {
    if (containedSubscriber) {
      containedSubscriber.subscriber.stop(reason);
      containedSubscriber = null;
    }
  };

  const removeCurrentAccount = () => {
    if (!currentAddress) return;
    const existing = accountsStore.state.accounts.find(
      (a) => a.address === currentAddress && a.type === 'intermezzo-account',
    );
    if (existing) {
      provider.account.store.removeAccount(currentAddress);
    }
    currentAddress = null;
  };

  const applyAddress = async (algorandAddress: string) => {
    // Convert standard Algorand address → base64(public key) to match the
    // convention used by the account-store (see `WithAlgorandAccounts`).
    const { publicKey } = decodeAddress(algorandAddress);
    const address = base64.encode(publicKey);

    let r: { balance: bigint; assets?: AccountAsset[] };
    try {
      r = await getAlgorandBalances(algorandClient, algorandAddress);
    } catch (error) {
      console.error(
        'Failed to fetch algorand balances for intermezzo address:',
        algorandAddress,
        error,
      );
      return;
    }

    const { balance, assets } = r;

    // If the same remote address is already tracked, just refresh balances.
    if (currentAddress && currentAddress !== address) {
      stopSubscriber('intermezzo address changed');
      removeCurrentAccount();
    }

    const existing = accountsStore.state.accounts.find(
      (a) => a.address === address && a.type === 'intermezzo-account',
    );

    if (!existing) {
      console.log(`Adding intermezzo account ${algorandAddress}...`);
      provider.account.store.addAccount({
        type: 'intermezzo-account' as const,
        address,
        balance,
        assets: assets ?? [],
        metadata: { remote: true, source: 'intermezzo' },
      } as IntermezzoAccount);
    } else {
      // Update existing account with fresh balances.
      accountsStore.setState((state) => ({
        ...state,
        accounts: state.accounts.map((a) =>
          a.address === address && a.type === 'intermezzo-account'
            ? { ...a, balance, assets: assets ?? [] }
            : a,
        ),
      }));
    }

    currentAddress = address;

    // Restart subscriber for the new/refreshed address.
    stopSubscriber('refreshing intermezzo subscriber');
    containedSubscriber = createSubscriberWithWatchlist(
      algorandClient,
      [algorandAddress],
      (changedAddress: string, assetId: bigint, amount: bigint) => {
        console.debug(
          `Balance change detected for intermezzo address: ${changedAddress}, assetId: ${assetId}, amount: ${amount}, refetching full balances...`,
        );
        // Re-fetch the full balance/asset state from algod rather than
        // applying deltas locally. This handles asset opt-ins, missing
        // assets in the cached entry, and keeps the account-store in sync
        // even if multiple changes land in the same round.
        getAlgorandBalances(algorandClient, changedAddress)
          .then(({ balance: nextBalance, assets: nextAssets }) => {
            accountsStore.setState((state) => ({
              ...state,
              accounts: state.accounts.map((a) =>
                a.type === 'intermezzo-account' && a.address === address
                  ? { ...a, balance: nextBalance, assets: nextAssets ?? [] }
                  : a,
              ),
            }));
          })
          .catch((error) => {
            console.error(
              'Failed to refresh intermezzo balances after change:',
              changedAddress,
              error,
            );
          });
      },
    );
    containedSubscriber.subscriber.start();
    console.log('Intermezzo subscriber started for address:', algorandAddress);
  };

  const refresh: IntermezzoAccountApi['refresh'] = async () => {
    if (isProcessing) {
      pendingRefresh = true;
      return;
    }
    isProcessing = true;
    pendingRefresh = false;
    try {
      const resolved = await resolveAddress();
      if (!resolved) {
        stopSubscriber('no intermezzo address resolved');
        removeCurrentAccount();
        return;
      }
      await applyAddress(resolved);
    } catch (error) {
      console.error('Failed to refresh intermezzo account:', error);
    } finally {
      isProcessing = false;
      if (pendingRefresh) {
        // Coalesce concurrent refreshes triggered during processing.
        refresh().catch((e) => console.error('Intermezzo refresh re-entry failed:', e));
      }
    }
  };

  provider.intermezzo = {
    refresh,
    getAddress: () => currentAddress,
  } satisfies IntermezzoAccountApi;

  // Best-effort initial resolution; failures are logged inside `refresh`.
  setImmediate(() => {
    refresh().catch((e) => console.error('Initial intermezzo refresh failed:', e));
  });

  return provider as unknown as IntermezzoAccountExtension;
};
