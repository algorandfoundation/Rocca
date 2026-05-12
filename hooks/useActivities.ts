import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useStore } from '@tanstack/react-store';
import type algosdk from 'algosdk';
import type { Activity } from '@/components/world-chess/ActivityTabs';
import { chessGateway, type GatewayUserInfo } from '@/lib/chess-gateway';
import { getAccountTransactions } from '@/lib/indexer';
import { useProvider } from '@/hooks/useProvider';
import { useSession } from '@/hooks/useSession';
import { accountsStore } from '@/stores/accounts';

const LOG = '[useActivities]';

/**
 * Result shape stored in react-query for the activities feed. We keep
 * both the typed `algosdk.indexerModels.TransactionsResponse` and the
 * resolved `public_address` so consumers can show diagnostics (e.g.
 * "no address linked yet") without re-running the gateway lookup.
 */
interface AccountTxQueryData {
  address: string | undefined;
  response: algosdk.indexerModels.TransactionsResponse | null;
}

/**
 * Query key for the user's on-chain transaction history. Keyed by the
 * session-resolved user id so refetches scoped to a session never leak
 * between accounts. The actual `public_address` is resolved inside the
 * query function and stored in the cached data for diagnostics.
 */
export const activitiesQueryKey = (userId: string | undefined) =>
  ['indexer', 'account-transactions', userId ?? 'anonymous'] as const;

/**
 * Format a unix-second timestamp returned by the indexer into a short
 * local-date string. Falls back to a placeholder when the round-time
 * is missing (e.g. very recent txns prior to indexer ingestion).
 */
function formatRoundTime(roundTime: number | bigint | undefined): string {
  if (roundTime == null) return 'Pending';
  const ms = typeof roundTime === 'bigint' ? Number(roundTime) * 1000 : roundTime * 1000;
  if (!Number.isFinite(ms)) return 'Pending';
  return new Date(ms).toLocaleString();
}

/**
 * Project the "amount" displayed on the Activity row from an asset-transfer
 * transaction. Payments and non-axfer types are filtered out upstream by
 * `isDisplayableTransaction`, so this only needs to handle axfer.
 *
 * The indexer SDK returns `amount` as `bigint`; we narrow to `number`
 * for the UI (asset amounts are well within JS-safe-integer range for
 * any realistic Chess Rewards balance).
 */
function transactionPoints(txn: algosdk.indexerModels.Transaction): number {
  const amount = txn.assetTransferTransaction?.amount;
  if (amount == null) return 0;
  return Number(amount);
}

/**
 * Only surface asset-transfer transactions with a non-zero amount.
 * Payment (ALGO) transactions and zero-amount opt-ins / clawback-zero
 * txns are hidden from the Activities feed per design.
 */
function isDisplayableTransaction(txn: algosdk.indexerModels.Transaction): boolean {
  if (txn.txType !== 'axfer') return false;
  const amount = txn.assetTransferTransaction?.amount;
  return amount != null && amount > 0n;
}

/**
 * Map an indexer transaction to the `Activity` row consumed by
 * `ActivityTabs` / `ActivityItem`. Per design, every token-related
 * activity is surfaced as "Chess Rewards" regardless of the asset's
 * actual name.
 */
function transactionToActivity(txn: algosdk.indexerModels.Transaction): Activity {
  return {
    id: txn.id ?? '',
    title: 'Chess Rewards',
    datetime: formatRoundTime(txn.roundTime),
    points: transactionPoints(txn),
  };
}

export type UseActivitiesResult = UseQueryResult<AccountTxQueryData | null> & {
  /** Indexer txns projected onto the dashboard's `Activity` shape. */
  activities: Activity[];
  /** Resolved Algorand address the query ran against (if any). */
  address: string | undefined;
  /** True when the indexer integration is disabled via config. */
  indexerDisabled: boolean;
  /** True when the session has no linked player yet (gateway `player.user_id` missing). */
  missingPlayer: boolean;
};

/**
 * Hook that fetches the authenticated user's Algorand transaction
 * history and projects each entry onto the dashboard's `Activity` row.
 *
 * Flow:
 * 1. Resolve the session `player.user_id` via `useSession` (the
 *    gateway's vault player id, which is what `/v1/wallet/users/:id`
 *    expects — *not* the better-auth `session.user.id`).
 * 2. Ask the gateway (`getUser`) for the user's vault-managed
 *    `public_address`.
 * 3. Query the indexer for that address' transactions.
 * 4. Map each transaction → `{ id, title: 'Chess Rewards', datetime,
 *    points }`.
 *
 * Diagnostics: every step logs a `[useActivities]` message on
 * failure so the empty Activities feed can be debugged from the device
 * console / Metro logs. The hook also exposes `error`, `address`,
 * `indexerDisabled`, and `missingPlayer` so the UI can render a hint
 * instead of silently showing an empty list.
 */
export function useActivities(): UseActivitiesResult {
  const session = useSession();
  const userId = session.data?.player?.user_id;
  // Read the shared indexer client off the provider (attached by the
  // Algorand-aware extensions when `indexerConfig` is configured). When
  // it's `null` the query is disabled below.
  const provider = useProvider();
  const indexer: algosdk.Indexer | null = provider.algorand?.indexer ?? null;
  const indexerEnabled = indexer !== null;
  const queryClient = useQueryClient();

  // Subscribe to the intermezzo account so balance-change events pushed
  // by `WithIntermezzoAccount`'s subscriber re-render this hook and
  // invalidate the indexer query (which is otherwise keyed only by
  // `userId` and would never refetch on its own).
  const intermezzo = useStore(accountsStore, (state) =>
    state.accounts.find((a) => a.type === 'intermezzo-account'),
  );
  const intermezzoBalance = intermezzo?.balance;
  const intermezzoAssetsSig = Array.isArray(intermezzo?.assets)
    ? intermezzo!.assets.map((a) => `${a.id}:${a.balance}`).join(',')
    : '';

  useEffect(() => {
    if (!userId) return;
    // The intermezzo subscriber has just updated balance/assets — force
    // the indexer query to refetch so the Activities list reflects the
    // newly landed asset transfers.
    queryClient.invalidateQueries({
      queryKey: activitiesQueryKey(userId),
    });
  }, [queryClient, userId, intermezzoBalance, intermezzoAssetsSig]);

  const query = useQuery<AccountTxQueryData | null>({
    queryKey: activitiesQueryKey(userId),
    queryFn: async () => {
      if (!userId) {
        console.warn(`${LOG} no player.user_id on session — query skipped`);
        return null;
      }
      let user: GatewayUserInfo;
      try {
        user = await chessGateway.getUser(userId);
      } catch (e) {
        console.error(`${LOG} chessGateway.getUser(${userId}) failed`, e);
        throw e;
      }
      const address = user?.public_address;
      if (!address) {
        console.warn(`${LOG} gateway returned no public_address`, user);
        return { address: undefined, response: null };
      }
      try {
        const response = await getAccountTransactions(indexer, address, { limit: 50 });
        const count = Array.isArray(response?.transactions) ? response.transactions.length : 0;
        console.log(`${LOG} fetched ${count} txn(s) for ${address}`);
        return { address, response };
      } catch (e) {
        console.error(`${LOG} indexer fetch failed for ${address}`, e);
        throw e;
      }
    },
    enabled: !!userId && indexerEnabled,
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });

  const txns = query.data?.response?.transactions;
  const activities: Activity[] = Array.isArray(txns)
    ? txns.filter(isDisplayableTransaction).map(transactionToActivity)
    : [];

  return {
    ...query,
    activities,
    address: query.data?.address,
    indexerDisabled: !indexerEnabled,
    missingPlayer: !userId && !!session.data,
  };
}
