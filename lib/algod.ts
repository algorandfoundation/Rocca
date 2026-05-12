import type { AlgoClientConfig } from '@algorandfoundation/algokit-utils/types/network-client';
import Constants from 'expo-constants';

/**
 * Algorand node configuration resolved from Expo `extra.algod`. Populated
 * from the `EXPO_PUBLIC_ALGOD_URL` / `EXPO_PUBLIC_ALGOD_TOKEN` env vars
 * via `app.config.js`.
 *
 * The default token is AlgoKit LocalNet's well-known dev token
 * (`"a".repeat(64)`), so this also works against a vanilla
 * `algokit localnet start` running on `http://localhost:4001`.
 */
export interface AlgodConfig {
  url: string;
  token: string;
}

const DEFAULT_ALGOD_URL = 'http://localhost:4001';
const DEFAULT_ALGOD_TOKEN = 'a'.repeat(64);

export function resolveAlgodConfig(): AlgodConfig {
  const extra = Constants.expoConfig?.extra as
    | { algod?: { url?: unknown; token?: unknown } }
    | undefined;
  const url =
    typeof extra?.algod?.url === 'string' && extra.algod.url.length > 0
      ? (extra.algod.url as string)
      : DEFAULT_ALGOD_URL;
  const token =
    typeof extra?.algod?.token === 'string' && extra.algod.token.length > 0
      ? (extra.algod.token as string)
      : DEFAULT_ALGOD_TOKEN;
  return { url, token };
}

/**
 * Split a URL like `https://localnet.shore-tech.net:8443` into the
 * granular `{ server, port }` pair expected by AlgoKit / algosdk
 * clients. The `server` keeps its scheme but drops any explicit port,
 * and `port` defaults to the scheme's standard port (443 for https,
 * 80 for http) when the URL doesn't carry one.
 */
export function parseAlgodUrl(url: string): { server: string; port: number } {
  const parsed = new URL(url);
  const isHttps = parsed.protocol === 'https:';
  const port = parsed.port ? Number(parsed.port) : isHttps ? 443 : 80;
  // Preserve the pathname (some hosted nodes live under a sub-path).
  const pathname =
    parsed.pathname && parsed.pathname !== '/' ? parsed.pathname.replace(/\/$/, '') : '';
  const server = `${parsed.protocol}//${parsed.hostname}${pathname}`;
  return { server, port };
}

/**
 * Build the granular `AlgoClientConfig` (`{ server, port, token }`)
 * consumed by `WithAlgorandAccounts` / `AlgorandClient.fromConfig`,
 * derived from the single `EXPO_PUBLIC_ALGOD_URL` + `_TOKEN` pair.
 */
export function resolveAlgodClientConfig(
  config: AlgodConfig = resolveAlgodConfig(),
): AlgoClientConfig {
  const { server, port } = parseAlgodUrl(config.url);
  return { server, port, token: config.token };
}
