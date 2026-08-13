import { Store } from '@tanstack/react-store';
import type {
  CredentialKeyValueStore,
  CredentialStoreState,
} from '@algorandfoundation/credentials';
import { localStorage } from './mmkv-local';

/**
 * MMKV key under which the persistent slice of the credentials store
 * is stashed. Only durable records (`credentials`) are kept — the
 * ephemeral `issuanceSessions` / `verificationSessions` arrays are
 * transient OID4VC state and intentionally NOT persisted.
 */
export const CREDENTIALS_KEY = 'credentials';

/**
 * Base TanStack store for Verifiable Credentials held by the wallet.
 *
 * Tracks the in-wallet credential records as well as ephemeral OID4VC
 * issuance / presentation session state for UI consumers (QR scanners,
 * activity lists, etc.).
 *
 * Hydration and persistence are owned by the credential store engine
 * (`@algorandfoundation/credentials`), which reads/writes MMKV through
 * the {@link credentialsDriver} passed via provider options.
 */
export const credentialsStore = new Store<CredentialStoreState>({
  credentials: [],
  issuanceSessions: [],
  verificationSessions: [],
});

/**
 * Two-line MMKV adapter for the engine's `CredentialKeyValueStore`
 * persistence seam. The engine handles snapshot (de)serialisation —
 * including tagged `raw` handling so `Uint8Array` payloads round-trip.
 */
export const credentialsDriver: CredentialKeyValueStore = {
  get: (key) => localStorage.getString(key),
  set: (key, value) => localStorage.set(key, value),
};
