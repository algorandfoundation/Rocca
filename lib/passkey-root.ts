import type { Key, KeyStoreAPI } from '@algorandfoundation/react-native-keystore';

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

/**
 * The record type a mnemonic seed is stored under.
 *
 * `hd-seed` is the older spelling of the same thing. It is still part of
 * `KeyType` and still marked as "retained for backward compatibility", but
 * `keystore-core`'s `import` only handles `seed`, `hd-root-key` and `ed25519`
 * — an `hd-seed` import throws `InvalidKeyDataError: import of type hd-seed is
 * not supported`, which is what broke onboarding and recovery-phrase import.
 * So the wallet writes `seed` and reads either.
 */
export const SEED_KEY_TYPE = 'seed';

/** The record types that hold a mnemonic seed the main key can be derived from. */
const SEED_TYPES = [SEED_KEY_TYPE, 'hd-seed'];

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

/** Whether `key` holds a mnemonic seed, under either spelling of the type. */
export function isSeed(key: Key): boolean {
  return SEED_TYPES.includes(key.type);
}

/**
 * Stores the bytes a recovery phrase expands to, returning the record's id.
 *
 * Both ways into a wallet — generating a phrase during onboarding and typing
 * an existing one in — land here, so they cannot drift apart (or drift back to
 * `hd-seed`; see {@link SEED_KEY_TYPE}).
 *
 * `importSeed` is the keystore's own entry point for exactly this: it writes
 * the record itself, so there is no key type to get wrong, and the React
 * Native engine gives it its own unlock prompt ("Authenticate to import a
 * seed") instead of the generic import wording. It is optional on the API,
 * hence the fall back to a plain typed `import` for a backend that does not
 * implement it.
 */
export function importSeed(
  store: Pick<KeyStoreAPI, 'import' | 'importSeed'>,
  seed: Uint8Array,
): Promise<string> {
  if (store.importSeed) return store.importSeed(seed);

  return store.import(
    {
      type: SEED_KEY_TYPE,
      algorithm: 'raw',
      extractable: true,
      keyUsages: ['deriveKey', 'deriveBits'],
      privateKey: seed,
    },
    'bytes',
  );
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
