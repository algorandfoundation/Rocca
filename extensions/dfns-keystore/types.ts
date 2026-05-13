import type { ExtensionOptions } from '@algorandfoundation/wallet-provider';

/**
 * Cryptographic scheme of a DFNS signing key.
 *
 * See: https://docs.dfns.co/api-reference/keys
 */
export type DfnsSigningKeyScheme = 'ECDSA' | 'EdDSA' | 'Schnorr' | string;

/**
 * Elliptic curve used by a DFNS signing key.
 */
export type DfnsSigningKeyCurve = 'secp256k1' | 'ed25519' | 'stark' | string;

/**
 * Status of a DFNS key.
 */
export type DfnsKeyStatus = 'Active' | 'Archived' | string;

/**
 * Raw shape of a DFNS Key returned by the DFNS API.
 *
 * See: https://docs.dfns.co/api-reference/keys/list-keys
 */
export interface DfnsKey {
  id: string;
  scheme: DfnsSigningKeyScheme;
  curve: DfnsSigningKeyCurve;
  publicKey: string;
  status: DfnsKeyStatus;
  name?: string;
  dateCreated?: string;
  custodial?: boolean;
  tags?: string[];
  [key: string]: unknown;
}

/**
 * Response shape for `GET /keys`.
 */
export interface DfnsListKeysResponse {
  items: DfnsKey[];
  nextPageToken?: string;
}

/**
 * The kind of signature payload to send to DFNS.
 *
 * See: https://docs.dfns.co/api-reference/keys/generate-signature
 */
export type DfnsSignatureKind =
  | 'Hash'
  | 'Message'
  | 'Transaction'
  | 'Eip191'
  | 'Eip712'
  | 'Psbt'
  | 'Bip322'
  | string;

/**
 * The body for `POST /keys/{keyId}/signatures`.
 */
export interface DfnsSignatureRequestBody {
  kind: DfnsSignatureKind;
  /** Hex-encoded hash, present when kind === 'Hash'. */
  hash?: string;
  /** Hex-encoded message, present when kind === 'Message'. */
  message?: string;
  /** Optional target network when the key is multi-chain. */
  network?: string;
  /** Allow forward-compatible fields (transaction, typedData, etc.). */
  [key: string]: unknown;
}

/**
 * The response shape for `POST /keys/{keyId}/signatures`.
 */
export interface DfnsSignatureResponse {
  id: string;
  status: 'Pending' | 'Executing' | 'Signed' | 'Confirmed' | 'Failed' | string;
  signature?: {
    r?: string;
    s?: string;
    recid?: number;
    encoded?: string;
  };
  signedData?: string;
  [key: string]: unknown;
}

/**
 * Per-extension configuration for `WithDfnsKeystore`.
 */
export interface DfnsKeystoreConfig {
  /**
   * The end user's DFNS Personal Access Token (PAT).
   *
   * Used as the `Authorization: Bearer <pat>` header on every DFNS API call.
   *
   * See: https://docs.dfns.co/api-reference/auth/personal-access-tokens
   */
  pat: string;
  /**
   * Base URL of the DFNS API. Defaults to `https://api.dfns.io`.
   */
  baseUrl?: string;
  /**
   * Optional DFNS application id, sent as the `X-DFNS-APPID` header when provided.
   */
  appId?: string;
  /**
   * Optional fetch implementation. Defaults to the global `fetch`.
   */
  fetch?: typeof fetch;
  /**
   * Optional default kind to use for signature requests. Defaults to `'Hash'`.
   */
  signatureKind?: DfnsSignatureKind;
}

/**
 * Options for the `WithDfnsKeystore` extension.
 *
 * The DFNS keystore configuration is namespaced under `key.dfns` to match the
 * `provider.key.dfns` namespace exposed by the extension.
 */
export interface DfnsKeystoreOptions extends ExtensionOptions {
  key: {
    dfns: DfnsKeystoreConfig;
  };
}

/**
 * Parameters for `provider.key.dfns.sign(...)`.
 */
export interface DfnsSignParams {
  /** The DFNS signing key id to use. */
  keyId: string;
  /** The raw transaction bytes to sign. */
  data: Uint8Array;
  /** Optional override for the signature kind. Defaults to the extension's `signatureKind`. */
  kind?: DfnsSignatureKind;
  /** Optional target network when the key is multi-chain. */
  network?: string;
  /** Optional override body, forwarded verbatim to DFNS. */
  body?: DfnsSignatureRequestBody;
}

/**
 * The API exposed by `WithDfnsKeystore` under `provider.key.dfns`.
 */
export interface DfnsKeystoreApi {
  /**
   * Performs a `POST /keys/{keyId}/signatures` and returns the raw response.
   */
  generateSignature: (
    keyId: string,
    body: DfnsSignatureRequestBody,
  ) => Promise<DfnsSignatureResponse>;
  /**
   * Signs a single transaction with the given DFNS key and returns the raw
   * signature bytes (decoded from `signature.encoded` / `signedData` / `r||s`).
   */
  sign: (params: DfnsSignParams) => Promise<Uint8Array>;
  /**
   * Lists all DFNS keys, transparently following pagination.
   *
   * See: https://docs.dfns.co/api-reference/keys/list-keys
   */
  listAllKeys: (pageSize?: number) => Promise<DfnsKey[]>;
}

/**
 * The provider shape contributed by `WithDfnsKeystore`.
 */
export interface DfnsKeystoreExtension {
  key: {
    dfns: DfnsKeystoreApi;
  };
}
