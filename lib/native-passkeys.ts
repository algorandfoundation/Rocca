import type { Passkey } from '@/extensions/passkeys';
import { toUrlSafe } from '@/utils/base64';

/** A credential as reported by `ReactNativePasskeyAutofill.getStoredCredentials()`. */
export type NativeStoredCredential = {
  credentialId: string;
  relyingPartyIdentifier: string;
  userName: string;
  userHandle: string;
  publicKey?: string;
  createdAt?: number;
};

function base64ToBytes(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64'));
}

/** Native `createdAt` values have been written in both seconds and milliseconds. */
function toMillis(createdAt: number | undefined): number | undefined {
  if (createdAt === undefined) return undefined;
  return createdAt < 10_000_000_000 ? createdAt * 1000 : createdAt;
}

/**
 * Folds the credentials the native provider holds into the passkey store's
 * current contents.
 *
 * The native list and the keystore describe the same credentials from two
 * sides: `WithPasskeysKeystore` builds a passkey out of the `k/<id>` metadata
 * record (carrying `keyId`, the derivation `scheme`, whether the relying party
 * has it registered), while the native provider knows the relying party and
 * the user name it displays in the system sheet. Neither is a superset of the
 * other, so a matching id is **merged** rather than replaced — this sync runs
 * on every launch, every resume and every autofill event, and replacing used
 * to strip the keystore's fields (including `metadata.origin`, the field the
 * connection flow matches a site against) on the way back from the system
 * passkey UI. That is what made the app ask to create a passkey every time
 * while the deterministic credential id kept rewriting the one stored record.
 *
 * @param existing - The passkeys currently in the store.
 * @param credentials - What `getStoredCredentials()` reported.
 * @returns The merged list: every native credential first, then the passkeys
 *   the native provider did not report (e.g. iOS-only or not yet synced).
 */
export function mergeNativePasskeys(
  existing: Passkey[],
  credentials: NativeStoredCredential[],
): Passkey[] {
  const existingById = new Map(existing.map((passkey) => [passkey.id, passkey]));

  const nativePasskeys = credentials.map((credential): Passkey => {
    const id = toUrlSafe(credential.credentialId);
    const current = existingById.get(id);
    const origin = credential.relyingPartyIdentifier || current?.origin;
    const userHandle = credential.userHandle || current?.userHandle;

    return {
      ...current,
      id,
      name: current?.name ?? credential.relyingPartyIdentifier,
      userHandle,
      origin,
      publicKey: credential.publicKey
        ? base64ToBytes(credential.publicKey)
        : (current?.publicKey ?? new Uint8Array()),
      algorithm: current?.algorithm ?? 'P256',
      createdAt: toMillis(credential.createdAt) ?? current?.createdAt,
      metadata: {
        ...current?.metadata,
        keyId: current?.metadata?.keyId ?? credential.credentialId,
        // Recorded in `metadata` as well as at the top level: a keystore-built
        // passkey keeps its origin there, and readers look it up through
        // `lib/passkey-origin.ts` rather than guessing which writer produced
        // the record.
        origin,
        userHandle,
        nativeCredential: true,
        registered: current?.metadata?.registered ?? true,
        userName: credential.userName ?? current?.metadata?.userName,
      },
    };
  });

  const nativeIds = new Set(nativePasskeys.map((passkey) => passkey.id));
  const retained = existing.filter((passkey) => !nativeIds.has(passkey.id));

  return [...nativePasskeys, ...retained];
}
