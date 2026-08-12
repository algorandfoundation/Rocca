import type { Key } from '@algorandfoundation/react-native-keystore';
import {
  DOMAIN_MAIN_KEY_SCHEME,
  ensureDomainMainKey,
  findDomainMainKey,
  findSeed,
  importSeed,
  isSeed,
  SEED_KEY_TYPE,
} from '@/lib/passkey-root';

function key(partial: Partial<Key> & Pick<Key, 'id' | 'type'>): Key {
  return partial as Key;
}

/** A seed written before the type was renamed; wallets in the wild have these. */
const seed = key({ id: 'seed-id', type: 'hd-seed' });
const accountRoot = key({
  id: 'bip32-root-id',
  type: 'hd-root-key',
  metadata: { storage: 'bytes', scheme: 'bip32-ed25519', parentKeyId: 'seed-id' },
});
const mainKey = key({
  id: 'dp256-main-id',
  type: 'hd-root-key',
  metadata: { storage: 'bytes', scheme: DOMAIN_MAIN_KEY_SCHEME, parentKeyId: 'seed-id' },
});

describe('findDomainMainKey', () => {
  it('picks the passkey root by scheme, not by type', () => {
    // Both roots are `hd-root-key`, and the account root is listed first — which
    // is how a `find(k => k.type === 'hd-root-key')` lookup used to hand passkeys
    // the wrong parent.
    expect(findDomainMainKey([seed, accountRoot, mainKey])?.id).toBe('dp256-main-id');
  });

  it('does not mistake the account root for the passkey root', () => {
    expect(findDomainMainKey([seed, accountRoot])).toBeUndefined();
  });

  it('does not treat an unlabelled legacy root as the passkey root', () => {
    const unlabelled = key({ id: 'legacy-root', type: 'hd-root-key', metadata: {} });
    expect(findDomainMainKey([unlabelled])).toBeUndefined();
  });
});

describe('importSeed', () => {
  it("hands the bytes to the keystore's own seed import", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const store = {
      importSeed: jest.fn().mockResolvedValue('new-seed-id'),
      import: jest.fn(),
    };

    await expect(importSeed(store, bytes)).resolves.toBe('new-seed-id');
    expect(store.importSeed).toHaveBeenCalledWith(bytes);
    expect(store.import).not.toHaveBeenCalled();
  });

  it('never imports a seed under the deprecated type', async () => {
    // The regression: `hd-seed` is still in `KeyType` and still documented as
    // retained for backward compatibility, but `keystore-core`'s `import`
    // handles only `seed`, `hd-root-key` and `ed25519` — so onboarding and
    // recovery-phrase import both died with `InvalidKeyDataError: import of
    // type hd-seed is not supported`.
    const store = { import: jest.fn().mockResolvedValue('new-seed-id') };

    await expect(importSeed(store, new Uint8Array([1, 2, 3]))).resolves.toBe('new-seed-id');

    const [data] = store.import.mock.calls[0];
    expect(data.type).toBe('seed');
    expect(data.type).not.toBe('hd-seed');
  });

  it('stores the seed bytes as derivation material', async () => {
    const store = { import: jest.fn().mockResolvedValue('new-seed-id') };
    const bytes = new Uint8Array([4, 5, 6]);

    await importSeed(store, bytes);

    expect(store.import).toHaveBeenCalledWith(
      expect.objectContaining({
        algorithm: 'raw',
        extractable: true,
        keyUsages: ['deriveKey', 'deriveBits'],
        privateKey: bytes,
      }),
      'bytes',
    );
  });

  it('writes a seed the wallet then recognises as one', async () => {
    const store = { import: jest.fn().mockResolvedValue('new-seed-id') };

    const id = await importSeed(store, new Uint8Array([7]));
    const written = key({ id, type: store.import.mock.calls[0][0].type });

    expect(isSeed(written)).toBe(true);
    expect(findSeed([accountRoot, written])?.id).toBe(id);
  });
});

describe('isSeed', () => {
  it('accepts both spellings of the seed type', () => {
    expect(isSeed(key({ id: 'new', type: SEED_KEY_TYPE }))).toBe(true);
    expect(isSeed(key({ id: 'legacy', type: 'hd-seed' }))).toBe(true);
  });

  it('rejects a derived key', () => {
    expect(isSeed(accountRoot)).toBe(false);
    expect(isSeed(mainKey)).toBe(false);
  });
});

describe('ensureDomainMainKey', () => {
  it('derives the main key from a seed written under the current type', async () => {
    const store = { generate: jest.fn().mockResolvedValue('new-main-id') };
    const current = key({ id: 'current-seed-id', type: SEED_KEY_TYPE });

    await expect(ensureDomainMainKey(store, [current])).resolves.toBe('new-main-id');
    expect(store.generate).toHaveBeenCalledWith(
      expect.objectContaining({ params: { parentKeyId: 'current-seed-id' } }),
    );
  });

  it('derives the main key from the seed when a wallet predates it', async () => {
    const store = { generate: jest.fn().mockResolvedValue('new-main-id') };

    await expect(ensureDomainMainKey(store, [seed, accountRoot])).resolves.toBe('new-main-id');
    expect(store.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'hd-root-key',
        algorithm: 'P256',
        params: { parentKeyId: 'seed-id' },
      }),
    );
  });

  it('never creates a second main key', async () => {
    const store = { generate: jest.fn() };

    await expect(ensureDomainMainKey(store, [seed, accountRoot, mainKey])).resolves.toBe(
      'dp256-main-id',
    );
    expect(store.generate).not.toHaveBeenCalled();
  });

  it('does nothing when there is no seed to derive from', async () => {
    const store = { generate: jest.fn() };

    await expect(ensureDomainMainKey(store, [accountRoot])).resolves.toBeUndefined();
    expect(store.generate).not.toHaveBeenCalled();
  });
});
