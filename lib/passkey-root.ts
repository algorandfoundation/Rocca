import type { Key, KeyStoreAPI } from '@algorandfoundation/keystore-core';

/**
 * The root of the passkey hierarchy: the deterministic-P256 **main key**
 * (PBKDF2-HMAC-SHA512 over the seed record's bytes, 64 bytes of material).
 *
 * Both roots this wallet holds are records of type `hd-root-key`, and the only
 * thing telling them apart is `metadata.scheme`:
 *
 * - `bip32-ed25519` — the extended account root, parent of every `hd-derived-ed25519`
 *   account/identity key. It was also the passkey parent for as long as it was
 *   the only root a wallet exposed.
 * - `pbkdf2-p256` (this one) — the root the deterministic-P256 contract is
 *   actually defined against; `deriveDomainKey` in `keystore-core` refuses any
 *   other parent.
 *
 * So a lookup by `type` alone returns whichever root happens to come first,
 * which is exactly how passkeys ended up hanging off the account root.
 */
export const DOMAIN_MAIN_KEY_SCHEME = 'pbkdf2-p256';

/** The record types that hold a mnemonic seed the main key can be derived from. */
const SEED_TYPES = ['seed', 'hd-seed'];

/** The wallet's deterministic-P256 main key, if it has one. */
export function findDomainMainKey(keys: Key[]): Key | undefined {
  return keys.find(
    (k) => k.type === 'hd-root-key' && k.metadata?.scheme === DOMAIN_MAIN_KEY_SCHEME,
  );
}

/** The seed record the main key is (or would be) derived from. */
export function findSeed(keys: Key[]): Key | undefined {
  return keys.find((k) => SEED_TYPES.includes(k.type));
}

/**
 * Derives the main key from `parentKeyId` and persists it.
 *
 * `algorithm: 'P256'` is what routes the call to the deterministic-P256
 * generator (`generateDP256Main`); it stamps `scheme: 'pbkdf2-p256'` onto the
 * record itself, which is what every reader — including the native passkey
 * provider — identifies the root by.
 */
export function generateDomainMainKey(
  store: Pick<KeyStoreAPI, 'generate'>,
  parentKeyId: string,
): Promise<string> {
  return store.generate({
    type: 'hd-root-key',
    algorithm: 'P256',
    extractable: false,
    keyUsages: ['deriveBits', 'deriveKey'],
    params: { parentKeyId },
  });
}

/**
 * The id of the wallet's main key, deriving it first if this wallet predates it.
 *
 * Idempotent: wallets created before the passkey hierarchy moved off the account
 * root have a seed and a BIP32 root but no main key, and they must gain one
 * without a wipe-and-restore. Returns `undefined` when there is nothing to
 * derive from, leaving the caller on the legacy root.
 */
export async function ensureDomainMainKey(
  store: Pick<KeyStoreAPI, 'generate'>,
  keys: Key[],
): Promise<string | undefined> {
  const existing = findDomainMainKey(keys);
  if (existing) return existing.id;

  const seed = findSeed(keys);
  if (!seed) return undefined;

  return generateDomainMainKey(store, seed.id);
}
