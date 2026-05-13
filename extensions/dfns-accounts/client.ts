import type { DfnsKeystoreConfig } from '../dfns-keystore/types';
import { DEFAULT_DFNS_BASE_URL } from '../dfns-keystore/client';
import type { DfnsListWalletsResponse, DfnsWallet } from './types';

/**
 * Subset of {@link DfnsKeystoreConfig} required to call the DFNS `/wallets`
 * endpoint. The PAT is sourced from the DFNS keystore configuration so that
 * both extensions share a single source of truth.
 */
export type DfnsWalletsClientConfig = Pick<
  DfnsKeystoreConfig,
  'pat' | 'baseUrl' | 'appId' | 'fetch'
>;

/**
 * A small, dependency-free DFNS API client backed by a Personal Access Token,
 * scoped to the `/wallets` endpoint required by this extension. Signing and
 * other key-level operations live in `dfns-keystore`.
 */
export class DfnsWalletsClient {
  private readonly baseUrl: string;
  private readonly pat: string;
  private readonly appId?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: DfnsWalletsClientConfig) {
    if (!config.pat) {
      throw new Error('[dfns-accounts] A Personal Access Token (pat) is required.');
    }
    this.pat = config.pat;
    this.baseUrl = (config.baseUrl ?? DEFAULT_DFNS_BASE_URL).replace(/\/+$/, '');
    this.appId = config.appId;
    this.fetchImpl = config.fetch ?? globalThis.fetch;
    if (typeof this.fetchImpl !== 'function') {
      throw new Error('[dfns-accounts] No fetch implementation available.');
    }
  }

  /**
   * Builds the common request headers, including the bearer PAT.
   */
  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${this.pat}`,
    };
    if (this.appId) {
      headers['X-DFNS-APPID'] = this.appId;
    }
    return headers;
  }

  /**
   * Performs a JSON GET request and surfaces DFNS API errors with a descriptive
   * message.
   */
  private async get<T>(
    path: string,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    const response = await this.fetchImpl(url.toString(), {
      method: 'GET',
      headers: this.headers(),
    });

    if (!response.ok) {
      let detail = '';
      try {
        detail = await response.text();
      } catch {
        // ignore
      }
      throw new Error(
        `[dfns-accounts] GET ${path} failed: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  /**
   * Lists wallets, transparently following `nextPageToken` pagination.
   *
   * See: https://docs.dfns.co/api-reference/wallets/list-wallets
   */
  async listAllWallets(pageSize = 100): Promise<DfnsWallet[]> {
    const items: DfnsWallet[] = [];
    let paginationToken: string | undefined;
    do {
      const page = await this.get<DfnsListWalletsResponse>('/wallets', {
        limit: pageSize,
        paginationToken,
      });
      items.push(...(page.items ?? []));
      paginationToken = page.nextPageToken;
    } while (paginationToken);
    return items;
  }
}
