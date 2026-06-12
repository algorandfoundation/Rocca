import type { Identity, DIDDocument } from '@algorandfoundation/identities-store';

/**
 * Anchor metadata recorded by
 * `provider.identity.intermezzo.anchorIdentity` on success. Mirrors
 * the shape persisted by `@/stores/identities` (kept in sync via the
 * MMKV sidecar).
 */
export interface IdentityAnchor {
  /** Snapshot of the DID document at the time of anchoring. */
  didDocument?: DIDDocument;
  /** Resulting `did:algo:...` identifier when known. */
  didAlgo?: string;
  /** Wall-clock millis of the successful anchor. */
  anchoredAt: number;
  [key: string]: unknown;
}

/**
 * Extracts the anchor metadata from an identity, if present.
 */
export function getIdentityAnchor(identity: Identity | undefined): IdentityAnchor | undefined {
  const anchor = identity?.metadata?.anchor;
  if (!anchor || typeof anchor !== 'object') return undefined;
  return anchor as IdentityAnchor;
}

/**
 * Returns `true` when the identity has been anchored AND its live
 * local DID document deep-equals the snapshot that was anchored on
 * chain. The UI uses this to hide the "Anchor on-chain" CTA when no
 * action is required.
 *
 * Comparison is deliberately string-based (canonical JSON) rather
 * than reference-based, because the DID document is reconstructed
 * from the keystore on every cold start and won't share references
 * with the persisted snapshot.
 */
export function isAnchorUpToDate(identity: Identity | undefined): boolean {
  const anchor = getIdentityAnchor(identity);
  if (!anchor) return false;
  if (!identity?.didDocument) return false;
  if (!anchor.didDocument) return false;
  try {
    return JSON.stringify(identity.didDocument) === JSON.stringify(anchor.didDocument);
  } catch {
    return false;
  }
}

/**
 * Returns `true` when the user should be offered an "Anchor on-chain"
 * action for this identity — either because no anchor exists yet, or
 * because the local DID document has diverged from the snapshot that
 * was anchored.
 */
export function needsAnchor(identity: Identity | undefined): boolean {
  return !isAnchorUpToDate(identity);
}
