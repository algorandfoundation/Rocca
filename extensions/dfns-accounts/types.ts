import type { Account, AccountStoreOptions } from '@algorandfoundation/accounts-store';
import type { ExtensionOptions } from '@algorandfoundation/wallet-provider';
import type {
  DfnsKeystoreOptions,
  DfnsSignatureKind,
  DfnsSignatureRequestBody,
  DfnsSigningKeyCurve,
  DfnsSigningKeyScheme,
} from '../dfns-keystore/types';

/**
 * The DFNS account type discriminator.
 */
export const DFNS_ACCOUNT_TYPE = 'dfns-account' as const;

/**
 * Status of a DFNS wallet.
 */
export type DfnsWalletStatus = 'Active' | 'Archived' | string;

/**
 * The signing key associated with a DFNS wallet (as embedded in the wallet
 * payload returned by `GET /wallets`).
 */
export interface DfnsWalletSigningKey {
  id: string;
  scheme: DfnsSigningKeyScheme;
  curve: DfnsSigningKeyCurve;
  publicKey: string;
}

/**
 * The raw shape of a DFNS Wallet returned by the DFNS API.
 *
 * See: https://docs.dfns.co/api-reference/wallets/list-wallets
 */
export interface DfnsWallet {
  id: string;
  network: string;
  address: string;
  name?: string;
  signingKey: DfnsWalletSigningKey;
  status: DfnsWalletStatus;
  dateCreated: string;
  custodial?: boolean;
  tags?: string[];
}

/**
 * Response shape for `GET /wallets`.
 */
export interface DfnsListWalletsResponse {
  items: DfnsWallet[];
  nextPageToken?: string;
}

/**
 * Represents a DFNS-backed account inside the accounts store.
 *
 * The signing material lives in DFNS — this extension only references it
 * through the wallet id and signing key id stored on `metadata`. All signing
 * goes through the `dfns-keystore` extension (`provider.key.dfns.sign`).
 */
export interface DfnsAccount extends Account {
  type: typeof DFNS_ACCOUNT_TYPE;
  metadata: {
    /** The DFNS wallet id. */
    walletId: string;
    /** The DFNS signing key id used to produce signatures. */
    keyId: string;
    /** The DFNS-reported network (e.g. "Ethereum", "AlgorandTestnet"). */
    network: string;
    /** The signing key scheme/curve reported by DFNS. */
    scheme: DfnsSigningKeyScheme;
    curve: DfnsSigningKeyCurve;
    /** The hex-encoded public key reported by DFNS. */
    publicKey: string;
    /** Wallet status as reported by DFNS. */
    status: DfnsWalletStatus;
    /** Optional human-readable wallet name. */
    name?: string;
    /** Optional DFNS tags. */
    tags?: string[];
  };
  /**
   * Signs each transaction by delegating to `provider.key.dfns.sign(...)`.
   *
   * Note: change-inducing DFNS endpoints require User Action Signing in
   * addition to the bearer PAT. When User Action Signing is not configured,
   * this method will reject with a descriptive error surfaced from the DFNS
   * API.
   */
  sign: (txns: Uint8Array[]) => Promise<Uint8Array[]>;
}

/**
 * Per-extension configuration for `WithDfnsAccounts`.
 *
 * Note: DFNS authentication (PAT, baseUrl, appId, fetch, default signature
 * kind) is configured on `WithDfnsKeystore` under `options.key.dfns` — this
 * extension only carries wallet/account-level options.
 */
export interface DfnsAccountsConfig {
  /**
   * Whether to automatically populate the account store with DFNS wallets when
   * the extension is initialized. Defaults to `true`.
   */
  autoPopulate?: boolean;
  /**
   * Optional fetch implementation used for the `/wallets` endpoint. Defaults
   * to the global `fetch`.
   */
  fetch?: typeof fetch;
  /**
   * Optional kind override for signature requests built by this extension.
   * Defaults to the keystore extension's `signatureKind` (or `'Hash'`).
   */
  signatureKind?: DfnsSignatureKind;
  /**
   * Optional callback to map a transaction byte array into a DFNS signature
   * request body. Overrides `signatureKind` when provided. The resulting body
   * is forwarded to `provider.key.dfns.sign({ keyId, body })`.
   */
  buildSignatureRequest?: (
    txn: Uint8Array,
    account: DfnsAccount,
  ) => DfnsSignatureRequestBody | Promise<DfnsSignatureRequestBody>;
}

/**
 * Options for the `WithDfnsAccounts` extension.
 *
 * Composes `AccountStoreOptions` (for the account store) and
 * `DfnsKeystoreOptions` (for the PAT under `key.dfns`).
 */
export interface DfnsAccountsExtensionOptions
  extends ExtensionOptions, AccountStoreOptions<DfnsAccount>, DfnsKeystoreOptions {
  accounts: AccountStoreOptions<DfnsAccount>['accounts'] & {
    dfns: DfnsAccountsConfig;
  };
}
