import type { Key } from '@algorandfoundation/keystore-core';
import { DOMAIN_MAIN_KEY_SCHEME, ensureDomainMainKey, findDomainMainKey } from '@/lib/passkey-root';

function key(partial: Partial<Key> & Pick<Key, 'id' | 'type'>): Key {
  return partial as Key;
}

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

describe('ensureDomainMainKey', () => {
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
