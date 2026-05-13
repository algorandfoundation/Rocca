import type { AlgoClientConfig } from '@algorandfoundation/algokit-utils/types/network-client';
import type algosdk from 'algosdk';
import Constants from 'expo-constants';

import { parseAlgodUrl } from './algod';

/**
 * Algorand Indexer client.
 *
 * The plain algod node does not expose a transaction-history search API;
 * the companion Indexer service does (AlgoKit LocalNet ships one on
 * `:8980`). Activities in the dashboard are sourced from the indexer's
 * `lookupAccountTransactions` endpoint, exposed via algokit-utils'
 * `ClientManager` so we get an algosdk `Indexer` instance with
 * automatic retries and typed (`indexerModels`) responses.
 */

export interface IndexerConfig {
  url: string;
  token: string;
}

const DEFAULT_INDEXER_URL = 'http://localhost:8980';
const DEFAULT_INDEXER_TOKEN = 'a'.repeat(64);

/**
 * Resolve the indexer config from Expo `extra.indexer` (populated from
 * `EXPO_PUBLIC_INDEXER_URL` / `EXPO_PUBLIC_INDEXER_TOKEN`). Returns
 * `null` when the URL is explicitly cleared (empty string), letting
 * callers short-circuit and disable the on-chain Activities feed.
 */
export function resolveIndexerConfig(): IndexerConfig | null {
  const extra = Constants.expoConfig?.extra as
    | { indexer?: { url?: unknown; token?: unknown } }
    | undefined;
  const rawUrl = extra?.indexer?.url;
  // An explicit empty string disables the indexer integration.
  if (rawUrl === '') return null;
  const url = typeof rawUrl === 'string' && rawUrl.length > 0 ? rawUrl : DEFAULT_INDEXER_URL;
  const token =
    typeof extra?.indexer?.token === 'string' && (extra.indexer.token as string).length > 0
      ? (extra.indexer.token as string)
      : DEFAULT_INDEXER_TOKEN;
  return { url, token };
}

/**
 * Build the granular `AlgoClientConfig` (`{ server, port, token }`)
 * consumed by `ClientManager` / `AlgorandClient.fromConfig({ indexerConfig })`,
 * derived from the single `EXPO_PUBLIC_INDEXER_URL` + `_TOKEN` pair.
 * Returns `null` when the indexer integration is disabled.
 */
export function resolveIndexerClientConfig(
  config: IndexerConfig | null = resolveIndexerConfig(),
): AlgoClientConfig | null {
  if (!config) return null;
  const { server, port } = parseAlgodUrl(config.url);
  return { server, port, token: config.token };
}

/**
 * Fetch the transaction history for an Algorand address from the
 * indexer via `indexer.lookupAccountTransactions(address)`.
 *
 * @param indexer The algosdk `Indexer` client to query against. Pass
 *   `null` / `undefined` when the indexer integration is disabled —
 *   the call short-circuits to an empty typed response so consumers
 *   don't need to branch.
 * @param address Algorand public address (base32) to query.
 * @param options.limit Max number of txns to return (indexer default 100).
 */
export async function getAccountTransactions(
  indexer: algosdk.Indexer | null | undefined,
  address: string,
  options: { limit?: number } = {},
): Promise<algosdk.indexerModels.TransactionsResponse> {
  if (!indexer) {
    // Match the typed response shape so consumers don't need to branch.
    return {
      currentRound: 0n,
      transactions: [],
    } as unknown as algosdk.indexerModels.TransactionsResponse;
  }
  let request = indexer.lookupAccountTransactions(address);
  if (options.limit != null) request = request.limit(options.limit);
  return await request.do();
}
