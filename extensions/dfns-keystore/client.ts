import type {
  DfnsKeystoreConfig,
  DfnsListKeysResponse,
  DfnsKey,
  DfnsSignatureRequestBody,
  DfnsSignatureResponse,
} from './types';

/**
 * Default DFNS API base URL.
 *
 * See: https://docs.dfns.co/api-reference
 */
export const DEFAULT_DFNS_BASE_URL = 'https://api.dfns.io';

/**
 * A small, dependency-free DFNS API client backed by a Personal Access Token.
 *
 * This client is intentionally narrow: it only exposes the endpoints required
 * by the DFNS keystore extension (`/keys` and `/keys/{keyId}/signatures`).
 * Wallet-level concerns live in the `dfns-accounts` extension.
 */
export class DfnsKeysClient {
  private readonly baseUrl: string;
  private readonly pat: string;
  private readonly appId?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: DfnsKeystoreConfig) {
    if (!config.pat) {
      throw new Error('[dfns-keystore] A Personal Access Token (pat) is required.');
    }
    this.pat = config.pat;
    this.baseUrl = (config.baseUrl ?? DEFAULT_DFNS_BASE_URL).replace(/\/+$/, '');
    this.appId = config.appId;
    this.fetchImpl = config.fetch ?? globalThis.fetch;
    if (typeof this.fetchImpl !== 'function') {
      throw new Error('[dfns-keystore] No fetch implementation available.');
    }
  }

  /**
   * Builds the common request headers, including the bearer PAT.
   */
  private headers(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${this.pat}`,
      ...extra,
    };
    if (this.appId) {
      headers['X-DFNS-APPID'] = this.appId;
    }
    return headers;
  }

  /**
   * Performs a JSON request and surfaces DFNS API errors with a descriptive message.
   */
  async request<T>(
    method: string,
    path: string,
    init: { query?: Record<string, string | number | undefined>; body?: unknown } = {},
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`);
    if (init.query) {
      for (const [k, v] of Object.entries(init.query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    const hasBody = init.body !== undefined;
    const response = await this.fetchImpl(url.toString(), {
      method,
      headers: this.headers(hasBody ? { 'Content-Type': 'application/json' } : undefined),
      body: hasBody ? JSON.stringify(init.body) : undefined,
    });

    if (!response.ok) {
      let detail = '';
      try {
        detail = await response.text();
      } catch {
        // ignore
      }
      throw new Error(
        `[dfns-keystore] ${method} ${path} failed: ${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  /**
   * Lists all DFNS keys, transparently following `nextPageToken` pagination.
   *
   * See: https://docs.dfns.co/api-reference/keys/list-keys
   */
  async listAllKeys(pageSize = 100): Promise<DfnsKey[]> {
    const items: DfnsKey[] = [];
    let paginationToken: string | undefined;
    do {
      const page = await this.request<DfnsListKeysResponse>('GET', '/keys', {
        query: { limit: pageSize, paginationToken },
      });
      items.push(...(page.items ?? []));
      paginationToken = page.nextPageToken;
    } while (paginationToken);
    return items;
  }

  /**
   * Requests a signature from a DFNS key.
   *
   * See: https://docs.dfns.co/api-reference/keys/generate-signature
   */
  generateSignature(keyId: string, body: DfnsSignatureRequestBody): Promise<DfnsSignatureResponse> {
    return this.request<DfnsSignatureResponse>('POST', `/keys/${keyId}/signatures`, { body });
  }
}
