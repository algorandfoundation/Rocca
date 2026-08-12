import type { Passkey } from '@/extensions/passkeys';

/** The parts of a {@link Passkey} that can carry the site it belongs to. */
type PasskeyOriginFields = Pick<Passkey, 'origin' | 'metadata'>;

/**
 * The site a passkey belongs to, wherever it happens to be recorded.
 *
 * Two writers populate the passkey store and they do not agree on where the
 * origin lives:
 *
 * - `WithPasskeysKeystore` builds a passkey out of a keystore key and copies
 *   the key's metadata verbatim, so the origin arrives as `metadata.origin`.
 * - `syncNativeStoredPasskeys` (`lib/bootstrap.ts`) lists the credentials the
 *   native provider holds, where the relying party is a top-level field.
 *
 * A reader that only knows one of the two silently treats half the store as
 * passkeys for no site at all — which is how the connection flow ended up
 * registering a brand new passkey on every attempt while the deterministic
 * credential id kept overwriting the single stored record.
 */
export function passkeyOrigin(passkey: PasskeyOriginFields): string | undefined {
  const origin = passkey.metadata?.origin ?? passkey.origin;
  return typeof origin === 'string' && origin.length > 0 ? origin : undefined;
}

/**
 * The host an origin refers to, falling back to the raw value for anything
 * that is not a URL (the native provider stores bare RP ids such as
 * `example.com`, and `android:apk-key-hash:<...>` when a caller has no RP id).
 */
function originHost(origin: string): string {
  if (!origin.includes('://')) return origin;
  try {
    return new URL(origin).host;
  } catch {
    return origin;
  }
}

/**
 * Whether `passkey` can be reused for `origin`.
 *
 * Compared by host so a passkey recorded as a bare RP id matches a request
 * that names the full origin, and vice versa.
 */
export function matchesOrigin(passkey: PasskeyOriginFields, origin: string): boolean {
  const stored = passkeyOrigin(passkey);
  if (!stored) return false;
  return originHost(stored) === originHost(origin);
}
