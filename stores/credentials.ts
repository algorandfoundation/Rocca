import { Store } from '@tanstack/react-store';
import type { Credential, CredentialStoreState } from '@/extensions/credentials/types';
import { localStorage } from './mmkv-local';

/**
 * MMKV key under which the persistent slice of the credentials store
 * is stashed. Only durable records (`credentials`) are kept — the
 * ephemeral `issuanceSessions` / `verificationSessions` arrays are
 * transient OID4VC state and intentionally NOT persisted.
 */
const CREDENTIALS_KEY = 'credentials';

type SerialisedCredential = Omit<Credential, 'raw'> & {
  /**
   * `Credential.raw` is `string | Uint8Array`. We tag the JSON
   * serialisation so the binary path round-trips losslessly through
   * `JSON.parse` (a raw `Uint8Array` would otherwise serialise to a
   * `{"0":..,"1":..}` object that we couldn't reconstruct).
   */
  raw: { kind: 'string'; value: string } | { kind: 'bytes'; value: number[] };
};

function serialiseCredential(c: Credential): SerialisedCredential {
  const raw: SerialisedCredential['raw'] =
    typeof c.raw === 'string'
      ? { kind: 'string', value: c.raw }
      : { kind: 'bytes', value: Array.from(c.raw) };
  return { ...c, raw };
}

function deserialiseCredential(c: SerialisedCredential): Credential {
  const raw: Credential['raw'] =
    c.raw.kind === 'string' ? c.raw.value : new Uint8Array(c.raw.value);
  return { ...c, raw };
}

function readPersistedCredentials(): Credential[] {
  const raw = localStorage.getString(CREDENTIALS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SerialisedCredential[];
    return Array.isArray(parsed) ? parsed.map(deserialiseCredential) : [];
  } catch (e) {
    console.warn('credentialsStore: dropping corrupt snapshot', e);
    localStorage.remove(CREDENTIALS_KEY);
    return [];
  }
}

/**
 * Base TanStack store for Verifiable Credentials held by the wallet.
 *
 * Tracks the in-wallet credential records as well as ephemeral OID4VC
 * issuance / presentation session state for UI consumers (QR scanners,
 * activity lists, etc.).
 *
 * The `credentials` array is loaded directly from MMKV as the store's
 * initial state; subsequent mutations are mirrored back via a
 * subscription below.
 */
export const credentialsStore = new Store<CredentialStoreState>({
  credentials: readPersistedCredentials(),
  issuanceSessions: [],
  verificationSessions: [],
});

credentialsStore.subscribe(() => {
  try {
    const snapshot = credentialsStore.state.credentials.map(serialiseCredential);
    localStorage.set(CREDENTIALS_KEY, JSON.stringify(snapshot));
  } catch (e) {
    console.warn('credentialsStore: failed to persist snapshot', e);
  }
});
