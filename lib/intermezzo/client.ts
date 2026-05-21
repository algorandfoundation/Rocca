import type {
  BuildUserContractCreateRequest,
  BuildUserContractCreateResponse,
  BuildUserDidDocumentUpdateRequest,
  BuildUserDidDocumentUpdateResponse,
  CreateCredentialOfferRequest,
  CreatePresentationRequestRequest,
  CredentialOfferResponse,
  IntermezzoClientConfig,
  ManagerIdentityResponse,
  PresentationRequestResponse,
  RemoteIssuanceSession,
  RemoteVerificationSession,
  SetCredentialConfigurationRequest,
  SubmitUserContractCreateRequest,
  SubmitUserContractCreateResponse,
  SubmitUserDidDocumentUpdateRequest,
  SubmitUserDidDocumentUpdateResponse,
} from './types';

/**
 * Per-request options for credential-gated `DidController`
 * endpoints. The compact SD-JWT VC presentation proves possession
 * of the device-attestation credential and is forwarded as the
 * `x-credential-presentation` header (apiKey scheme in the spec).
 */
export interface CredentialPresentationOptions {
  /** Compact SD-JWT VC presentation. */
  credentialPresentation: string;
}

/**
 * Thin typed REST client for the intermezzo-fresh service.
 *
 * Covers three controller surfaces, all routed under the same base URL:
 *   - `Oid4vcIssuerController`   (`/credential/issuer/*`)
 *   - `Oid4vcVerifierController` (`/credential/verifier/*`)
 *   - Manager identity           (`/wallet/manager/identity`)
 *
 * The Credo protocol endpoints (token / credential / authorization /
 * authorization-request) are mounted by the server outside this
 * controller surface — the wallet talks to those directly using the
 * URIs returned by {@link IntermezzoClient.createOffer} and
 * {@link IntermezzoClient.createPresentationRequest}.
 *
 * This client is intentionally split out of the extension packages so
 * that both `@/extensions/intermezzo-credentials` (issuer/verifier)
 * and `@/extensions/intermezzo-identities` (link + DID document) can
 * share a single instance.
 */
export class IntermezzoClient {
  private readonly baseUrl: string;
  private readonly basePath: string;
  private readonly getAuthToken?: IntermezzoClientConfig['getAuthToken'];
  private readonly fetchImpl: typeof fetch;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: IntermezzoClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/u, '');
    const rawBasePath = config.basePath ?? '/v1';
    this.basePath = rawBasePath === '' ? '' : `/${rawBasePath.replace(/^\/+|\/+$/gu, '')}`;
    this.getAuthToken = config.getAuthToken;
    this.fetchImpl = config.fetch ?? globalThis.fetch.bind(globalThis);
    this.defaultHeaders = config.defaultHeaders ?? {};
  }

  // --- issuer ---------------------------------------------------------------

  /** `GET /credential/issuer/configurations` */
  listCredentialConfigurations(): Promise<Record<string, unknown>> {
    return this.request('GET', '/credential/issuer/configurations');
  }

  /** `POST /credential/issuer/configurations/:id` */
  setCredentialConfiguration(
    id: string,
    config: SetCredentialConfigurationRequest,
  ): Promise<{ success: boolean }> {
    return this.request(
      'POST',
      `/credential/issuer/configurations/${encodeURIComponent(id)}`,
      config,
    );
  }

  /** `DELETE /credential/issuer/configurations/:id` */
  removeCredentialConfiguration(id: string): Promise<{ success: boolean }> {
    return this.request('DELETE', `/credential/issuer/configurations/${encodeURIComponent(id)}`);
  }

  /** `POST /credential/issuer/offers` */
  createOffer(body: CreateCredentialOfferRequest): Promise<CredentialOfferResponse> {
    return this.request('POST', '/credential/issuer/offers', body);
  }

  /** `GET /credential/issuer/sessions` */
  listIssuanceSessions(): Promise<RemoteIssuanceSession[]> {
    return this.request('GET', '/credential/issuer/sessions');
  }

  /** `GET /credential/issuer/sessions/:id` */
  getIssuanceSession(id: string): Promise<RemoteIssuanceSession> {
    return this.request('GET', `/credential/issuer/sessions/${encodeURIComponent(id)}`);
  }

  // --- verifier -------------------------------------------------------------

  /** `POST /credential/verifier/requests` */
  createPresentationRequest(
    body: CreatePresentationRequestRequest,
  ): Promise<PresentationRequestResponse> {
    return this.request('POST', '/credential/verifier/requests', body);
  }

  /** `GET /credential/verifier/sessions` */
  listVerificationSessions(): Promise<RemoteVerificationSession[]> {
    return this.request('GET', '/credential/verifier/sessions');
  }

  /** `GET /credential/verifier/sessions/:id` */
  getVerificationSession(id: string): Promise<RemoteVerificationSession> {
    return this.request('GET', `/credential/verifier/sessions/${encodeURIComponent(id)}`);
  }

  // --- manager identity ----------------------------------------------------

  /**
   * `GET /wallet/manager/identity` — returns the manager's
   * `did:algo:...`. Requires a manager JWT via `getAuthToken`.
   */
  getManagerIdentity(): Promise<ManagerIdentityResponse> {
    return this.request('GET', '/wallet/manager/identity');
  }

  /**
   * `POST /wallet/manager/identity` — deploys the manager's
   * `did:algo:...` (idempotent, 201 on first call, 409 thereafter).
   * Returns `undefined` on 409. Requires a manager JWT.
   */
  async deployManagerIdentity(): Promise<ManagerIdentityResponse | undefined> {
    try {
      return await this.request<ManagerIdentityResponse>('POST', '/wallet/manager/identity', {});
    } catch (error) {
      if (error instanceof IntermezzoHttpError && error.status === 409) return undefined;
      throw error;
    }
  }

  // --- holder DID transactions ---------------------------------------------
  //
  // All four endpoints are credential-gated: callers MUST pass a
  // compact SD-JWT VC presentation of the device-attestation
  // credential via {@link CredentialPresentationOptions.credentialPresentation}.
  // It is forwarded as the `x-credential-presentation` header (apiKey
  // scheme in the spec). The manager JWT (`Authorization: Bearer`)
  // is still required and is sourced from `getAuthToken` as usual.

  /**
   * `POST /v1/did/create/transactions` — returns an atomic txn group
   * the wallet must partially sign to deploy a caller-owned
   * `did:algo:...` contract. Typically a 3-txn group where only
   * position 2 (the `applicationCreate`) is wallet-signed.
   */
  buildUserContractCreate(
    opts: CredentialPresentationOptions,
    body: BuildUserContractCreateRequest = {},
  ): Promise<BuildUserContractCreateResponse> {
    return this.request('POST', '/did/create/transactions', body, {
      credentialPresentation: opts.credentialPresentation,
    });
  }

  /**
   * `POST /v1/did/create/submit` — broadcasts the wallet-signed
   * `applicationCreate` group, persists the new app id, and returns
   * the freshly-registered `did:algo:...`.
   */
  submitUserContractCreate(
    body: SubmitUserContractCreateRequest,
    opts: CredentialPresentationOptions,
  ): Promise<SubmitUserContractCreateResponse> {
    return this.request('POST', '/did/create/submit', body, {
      credentialPresentation: opts.credentialPresentation,
    });
  }

  /**
   * `POST /v1/did/update/transactions` — returns the set of atomic
   * groups needed to publish a new DID document for the caller-owned
   * `did:algo:...`. The manager-role MBR `pay` is pre-signed by
   * Vault Transit; app-call positions are returned unsigned for the
   * wallet to Ed25519-sign.
   */
  buildUserDidDocumentUpdate(
    opts: CredentialPresentationOptions,
    body: BuildUserDidDocumentUpdateRequest = {},
  ): Promise<BuildUserDidDocumentUpdateResponse> {
    return this.request('POST', '/did/update/transactions', body, {
      credentialPresentation: opts.credentialPresentation,
    });
  }

  /**
   * `POST /v1/did/update/submit` — submits the wallet-signed atomic
   * groups returned by {@link buildUserDidDocumentUpdate} to algod,
   * in execution order.
   */
  submitUserDidDocumentUpdate(
    body: SubmitUserDidDocumentUpdateRequest,
    opts: CredentialPresentationOptions,
  ): Promise<SubmitUserDidDocumentUpdateResponse> {
    return this.request('POST', '/did/update/submit', body, {
      credentialPresentation: opts.credentialPresentation,
    });
  }

  // --- internals ------------------------------------------------------------

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraAuth?: { credentialPresentation?: string },
  ): Promise<T> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...this.defaultHeaders,
    };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const token = (await this.getAuthToken?.()) ?? undefined;
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (extraAuth?.credentialPresentation) {
      headers['x-credential-presentation'] = extraAuth.credentialPresentation;
    }

    const response = await this.fetchImpl(`${this.baseUrl}${this.basePath}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new IntermezzoHttpError(
        `${method} ${path} → ${response.status} ${response.statusText}${text ? `: ${text}` : ''}`,
        response.status,
      );
    }

    if (response.status === 204) return undefined as T;
    const ct = response.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) return undefined as T;
    return (await response.json()) as T;
  }
}

/** Error thrown by {@link IntermezzoClient} on non-2xx responses. */
export class IntermezzoHttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'IntermezzoHttpError';
  }
}

/**
 * Backwards-compatible alias for {@link IntermezzoClient}.
 * @deprecated use {@link IntermezzoClient}.
 */
export const IntermezzoCredentialsClient = IntermezzoClient;
export type IntermezzoCredentialsClient = IntermezzoClient;
