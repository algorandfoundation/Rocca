import { Store } from '@tanstack/react-store';
import type { IdentityStoreState } from '@algorandfoundation/identities-store';
import { localStorage } from './mmkv-local';

/**
 * MMKV key under which the per-identity metadata sidecar is stored.
 *
 * Identities themselves are NOT persisted as full objects — the
 * keystore extension rebuilds them from the on-device key material at
 * startup, attaching a non-serialisable `sign` callback. We persist
 * only the JSON-safe `metadata` field (keyed by address) and merge it
 * back into each identity once the keystore extension has populated
 * the store.
 */
const IDENTITIES_METADATA_KEY = 'identities-metadata';

type AnchorMetadata = {
  /**
   * Snapshot of the DID document that was anchored on-chain. Used by
   * the UI to detect whether the live local document has diverged
   * from the chain version (in which case an `update` flow is
   * required) or matches it (no further action needed).
   */
  didDocument?: unknown;
  /** Resulting `did:algo:...` identifier when known. */
  didAlgo?: string;
  /** Wall-clock millis of the successful anchor. */
  anchoredAt: number;
  /** Free-form server response artifacts (txIds, group, ...). */
  [key: string]: unknown;
};

type PersistedIdentityMetadata = {
  anchor?: AnchorMetadata;
  [key: string]: unknown;
};

type IdentityMetadataMap = Record<string, PersistedIdentityMetadata>;

function readIdentityMetadataMap(): IdentityMetadataMap {
  const raw = localStorage.getString(IDENTITIES_METADATA_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as IdentityMetadataMap) : {};
  } catch (e) {
    console.warn('identitiesStore: dropping corrupt metadata snapshot', e);
    localStorage.remove(IDENTITIES_METADATA_KEY);
    return {};
  }
}

function writeIdentityMetadataMap(map: IdentityMetadataMap): void {
  try {
    localStorage.set(IDENTITIES_METADATA_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('identitiesStore: failed to persist metadata snapshot', e);
  }
}

export const identitiesStore = new Store<IdentityStoreState>({
  identities: [],
});

/**
 * Subscribe to the identities store and stash each identity's
 * `metadata` field in MMKV under `IDENTITIES_METADATA_KEY` as a
 * sidecar map keyed by `address`. This complements
 * {@link mergePersistedIdentityMetadata} which is called by the
 * provider once the keystore extension has finished populating the
 * live identities.
 */
let mergeReentryGuard = false;

identitiesStore.subscribe(() => {
  // Re-attach persisted metadata (e.g. `anchor`) onto identities
  // freshly populated by the keystore extension. The merge is
  // idempotent — it only calls `setState` when the merged result
  // actually differs from the current state — and the
  // `mergeReentryGuard` prevents the subsequent write-back
  // subscription run from re-entering merge.
  if (!mergeReentryGuard) {
    mergeReentryGuard = true;
    try {
      mergePersistedIdentityMetadata();
    } finally {
      mergeReentryGuard = false;
    }
  }

  // Persist the per-address metadata sidecar.
  const map: IdentityMetadataMap = {};
  for (const id of identitiesStore.state.identities) {
    if (id.metadata && Object.keys(id.metadata).length > 0) {
      map[id.address] = id.metadata as PersistedIdentityMetadata;
    }
  }
  writeIdentityMetadataMap(map);
});

/**
 * Merge the persisted per-address metadata sidecar back into the live
 * identities. Called after the keystore extension populates the
 * store; safe to call repeatedly (no-op when the merged result
 * equals the current state).
 */
export function mergePersistedIdentityMetadata(): void {
  const map = readIdentityMetadataMap();
  if (Object.keys(map).length === 0) return;
  let changed = false;
  const next = identitiesStore.state.identities.map((id) => {
    const persisted = map[id.address];
    if (!persisted) return id;
    const merged = { ...id.metadata, ...persisted };
    if (JSON.stringify(merged) === JSON.stringify(id.metadata ?? {})) {
      return id;
    }
    changed = true;
    return { ...id, metadata: merged };
  });
  if (changed) {
    identitiesStore.setState((prev) => ({ ...prev, identities: next }));
  }
}

export type { AnchorMetadata, PersistedIdentityMetadata };
