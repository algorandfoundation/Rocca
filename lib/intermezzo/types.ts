/**
 * Wire-level types mirroring the public surface of the
 * `intermezzo-fresh` controllers:
 *   - OID4VC issuer/verifier (`src/oid4vc/.../*.controller.ts`)
 *   - Manager identity / DID document endpoints
 *     (`/wallet/manager/identity`)
 *
 * These are intentionally hand-rolled (rather than imported from the
 * NestJS service) to keep this module server-runtime-free so it can
 * be consumed by the React Native wallet.
 *
 * The single shared client lives in {@link ./client} and is consumed
 * by both `@/extensions/intermezzo-credentials` (issuer + verifier)
 * and `@/extensions/intermezzo-identities` (manager identity).
 */

// --- credentials: issuer ---------------------------------------------------

/** Body for `POST /credential/issuer/offers`. */
export interface CreateCredentialOfferRequest {
  credentialConfigurationIds: string[];
  /** Wallet-local `did:key` the credential will be bound to. */
  holderDidKey: string;
  /** Optional claim values / metadata to be embedded at redemption. */
  issuanceMetadata?: Record<string, unknown>;
}

/** Response of `POST /credential/issuer/offers`. */
export interface CredentialOfferResponse {
  id: string;
  credoIssuanceSessionId: string;
  /** `openid-credential-offer://...` URI suitable for QR rendering. */
  credentialOffer: string;
  state: string;
  holderDidKey: string;
}

/** Body for `POST /credential/issuer/configurations/:id`. */
export interface SetCredentialConfigurationRequest {
  format: string;
  cryptographic_binding_methods_supported?: string[];
  credential_signing_alg_values_supported?: string[];
  display?: Record<string, unknown>[];
  [key: string]: unknown;
}

/** A single OID4VCI issuance session as returned by the issuer controller. */
export interface RemoteIssuanceSession {
  id: string;
  state: string;
  credoIssuanceSessionId?: string;
  credentialOffer?: string;
  credentialConfigurationIds?: string[];
  holderDidKey?: string;
  issuanceMetadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

// --- credentials: verifier -------------------------------------------------

/** Body for `POST /credential/verifier/requests`. */
export interface CreatePresentationRequestRequest {
  presentationDefinition: Record<string, unknown>;
}

/** Response of `POST /credential/verifier/requests`. */
export interface PresentationRequestResponse {
  id: string;
  credoVerificationSessionId: string;
  /** `openid4vp://...` authorization request URI for QR rendering. */
  authorizationRequest: string;
  state: string;
}

/** A single OID4VP verification session as returned by the verifier controller. */
export interface RemoteVerificationSession {
  id: string;
  state: string;
  credoVerificationSessionId?: string;
  authorizationRequest?: string;
  presentationDefinition?: Record<string, unknown>;
  verifiedClaims?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

// --- identities: /wallet/manager/identity ---------------------

/** Response of `GET /wallet/manager/identity`. */
export interface ManagerIdentityResponse {
  /** Manager `did:algo:...` (the on-chain identity). */
  did: string;
  [key: string]: unknown;
}

// --- identities: holder DID transactions ---------------------------------
//
// Surface mirrors the `DidController` endpoints documented in the
// intermezzo OpenAPI spec: `POST /v1/did/{create,update}/{transactions,submit}`.
// All four endpoints are credential-gated — callers must present a
// verified device-attestation SD-JWT VC via the
// `x-credential-presentation` header (the bound `did:key` selects the
// per-user `DIDAlgoStorage` contract).
//
// Build endpoints accept an empty / minimal request body and return
// a free-form on-chain plan (atomic txn group for create, groups for
// update). The wallet signs the documented positions (Ed25519 over
// the canonical msgpack bytes) and replays the *exact* response
// shape back to the matching `/submit` endpoint, with `null` at
// every position the wallet did not sign — the host then signs the
// manager positions and broadcasts.

/**
 * Body for `POST /v1/did/create/transactions` — currently empty per
 * `BuildUserContractCreateDto`. The caller is identified entirely
 * via the credential presentation header.
 */
export interface BuildUserContractCreateRequest {
  [key: string]: unknown;
}

/**
 * A single unsigned atomic group returned by either DID build endpoint.
 *
 * - `txnGroup`: canonical group order, base64 msgpack of each
 *   unsigned `Transaction`.
 * - `indexesToSign`: positions the wallet must Ed25519-sign with the
 *   credential-bound `did:key`. Manager positions are filled in at
 *   submit time.
 * - `signers` / `kinds`: parallel diagnostic arrays (e.g. `'user'`,
 *   `'pay'`, `'appl'`). Useful for UIs and logs.
 */
export interface UnsignedAlgorandGroup {
  groupIdB64?: string;
  txnGroup: string[];
  indexesToSign: number[];
  signers?: ('manager' | 'user' | (string & {}))[];
  kinds?: string[];
}

/**
 * Response of `POST /v1/did/create/transactions`. A single 3-txn
 * atomic group `[manager-funder pay, manager pay → user, user
 * applicationCreate]` where the wallet typically signs position 2
 * (its `appl` create), as advertised in `indexesToSign`.
 */
export interface BuildUserContractCreateResponse {
  didKey: string;
  managerAddress: string;
  userAddress: string;
  group: UnsignedAlgorandGroup;
  [key: string]: unknown;
}

/**
 * Body for `POST /v1/did/create/submit` — mirrors
 * `SubmitUserContractCreateDto`: wallet-signed transactions in
 * canonical group order, base64-encoded, with `null` at every
 * position the wallet did not sign.
 */
export interface SubmitUserContractCreateRequest {
  signedTxns: (string | null)[];
}

/**
 * Response of `POST /v1/did/create/submit`. The spec leaves the
 * shape open; the server returns the freshly registered `did:algo`,
 * its app id, the contract address and the create-app txn id.
 */
export interface SubmitUserContractCreateResponse {
  appId?: string;
  appAddress?: string;
  did?: string;
  txId?: string;
  [key: string]: unknown;
}

/**
 * Body for `POST /v1/did/update/transactions` — mirrors
 * `BuildUserDidDocumentUpdateDto`. When `document` is omitted the
 * server uses the canonical wallet-owned document.
 */
export interface BuildUserDidDocumentUpdateRequest {
  /**
   * Replacement DID document. Must be self-owned: its `id` must
   * equal the `did:algo:...` derived from the credential-bound
   * `did:key` and the user's app id.
   */
  document?: Record<string, unknown>;
}

/**
 * A single wallet-signed atomic group, as returned by the build
 * endpoint with the wallet signatures filled in. Mirrors
 * `SignedUserDidUpdateGroupDto`.
 */
export interface SignedUserDidUpdateGroup {
  /**
   * Wallet-signed transactions in canonical group order,
   * base64-encoded. `null` at every position the wallet did not
   * sign — the host fills in manager positions at submit time.
   */
  signedTxns: (string | null)[];
}

/**
 * Response of `POST /v1/did/update/transactions`. The wallet is
 * expected to sign each group's `indexesToSign` positions and
 * round-trip the result into {@link SubmitUserDidDocumentUpdateRequest}.
 */
export interface BuildUserDidDocumentUpdateResponse {
  did: string;
  didKey: string;
  appId: string;
  appAddress: string;
  managerAddress: string;
  userAddress: string;
  oldMbrMicroAlgos?: string;
  newMbrMicroAlgos?: string;
  groups: UnsignedAlgorandGroup[];
  document: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Body for `POST /v1/did/update/submit` — mirrors
 * `SubmitUserDidDocumentUpdateDto`.
 */
export interface SubmitUserDidDocumentUpdateRequest {
  /**
   * The exact DID document supplied to the matching
   * `/did/update/transactions` call (or omit if that call also
   * omitted it). Used by the host to rebuild canonical bytes for
   * validation.
   */
  document?: Record<string, unknown>;
  /**
   * Atomic groups produced by the build endpoint, each now
   * wallet-signed, submitted serially in order.
   */
  groups: SignedUserDidUpdateGroup[];
}

/** Response of `POST /v1/did/update/submit`. */
export interface SubmitUserDidDocumentUpdateResponse {
  /** Confirmed transaction ids — first txn of each broadcast group, in order. */
  txIds?: string[];
  [key: string]: unknown;
}

// --- client config --------------------------------------------------------

/** Configuration accepted by {@link ./client.IntermezzoClient}. */
export interface IntermezzoClientConfig {
  /** Base URL of the intermezzo-fresh deployment, e.g. `https://api.example.com`. */
  baseUrl: string;
  /**
   * Path prefix prepended to every route (intermezzo-fresh mounts
   * its NestJS controllers behind `app.setGlobalPrefix('v1')`).
   * Defaults to `/v1`. Pass `''` to disable.
   */
  basePath?: string;
  /**
   * Returns the manager-JWT used for the `Authorization: Bearer ...`
   * header. Called per request so token rotation is transparent.
   */
  getAuthToken?: () => Promise<string | undefined> | string | undefined;
  /** Optional custom `fetch` implementation (defaults to global `fetch`). */
  fetch?: typeof fetch;
  /** Extra headers merged into every request. */
  defaultHeaders?: Record<string, string>;
}

/**
 * Backwards-compatible alias for {@link IntermezzoClientConfig}.
 * @deprecated use {@link IntermezzoClientConfig}.
 */
export type IntermezzoCredentialsClientConfig = IntermezzoClientConfig;
