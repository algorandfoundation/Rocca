import {
  ADDRESS_CONTEXT,
  bip44Path,
  deriveContextKey,
  IDENTITY_CONTEXT,
  PEIKERT_DERIVATION,
} from '@/lib/hd-keys';

describe('bip44Path', () => {
  // These two strings decide which addresses a recovery phrase produces, so
  // they are pinned rather than recomputed: they are the paths
  // `xhd-wallet-api` builds for the two contexts, and every wallet created
  // before the keystore rewrite sits on them.
  it('puts accounts under the Algorand coin type', () => {
    expect(bip44Path({ context: ADDRESS_CONTEXT })).toBe("m/44'/283'/0'/0/0");
  });

  it('puts identities under coin type 0', () => {
    expect(bip44Path({ context: IDENTITY_CONTEXT })).toBe("m/44'/0'/0'/0/0");
  });

  it('places the account and index in their own segments', () => {
    expect(bip44Path({ context: ADDRESS_CONTEXT, account: 2, index: 5 })).toBe("m/44'/283'/2'/0/5");
  });

  it('rejects a context it has no coin type for', () => {
    expect(() => bip44Path({ context: 7 })).toThrow('Unknown key context: 7');
  });
});

describe('deriveContextKey', () => {
  it('derives from the root instead of generating', async () => {
    // The regression: `generate({ type: 'hd-derived-ed25519', algorithm:
    // 'EdDSA' })` no longer derives anything. The engine routes every type it
    // does not mint itself to the host WebCrypto, so the call reached React
    // Native's `subtle.generateKey({ name: 'EdDSA' })` and threw
    // "'subtle.generateKey()' is not implemented for EdDSA".
    const store = {
      deriveFromSeed: jest.fn().mockResolvedValue('account-id'),
      generate: jest.fn(),
    };

    await expect(deriveContextKey(store, 'root-id', { context: ADDRESS_CONTEXT })).resolves.toBe(
      'account-id',
    );
    expect(store.generate).not.toHaveBeenCalled();
    expect(store.deriveFromSeed).toHaveBeenCalledWith(
      'root-id',
      "m/44'/283'/0'/0/0",
      expect.anything(),
    );
  });

  it('records the slot the readers match on', async () => {
    const store = { deriveFromSeed: jest.fn().mockResolvedValue('identity-id') };

    await deriveContextKey(store, 'root-id', { context: IDENTITY_CONTEXT, account: 1, index: 3 });

    expect(store.deriveFromSeed).toHaveBeenCalledWith(
      'root-id',
      "m/44'/0'/1'/0/3",
      expect.objectContaining({
        algorithm: 'EdDSA',
        metadata: { context: IDENTITY_CONTEXT, account: 1, index: 3, derivation: 9 },
      }),
    );
  });

  it('defaults the slot to the first key of the first account', async () => {
    const store = { deriveFromSeed: jest.fn().mockResolvedValue('account-id') };

    await deriveContextKey(store, 'root-id', { context: ADDRESS_CONTEXT });

    const [, , options] = store.deriveFromSeed.mock.calls[0];
    expect(options.metadata).toEqual({
      context: ADDRESS_CONTEXT,
      account: 0,
      index: 0,
      derivation: PEIKERT_DERIVATION,
    });
  });

  it('refuses a keystore that cannot derive rather than falling back', () => {
    // A `generate` fallback is exactly what was broken, so there is none: a
    // backend without `deriveFromSeed` has to say so loudly.
    const store = { deriveFromSeed: undefined, generate: jest.fn() };

    expect(() => deriveContextKey(store, 'root-id', { context: ADDRESS_CONTEXT })).toThrow(
      'deriveFromSeed is not implemented',
    );
    expect(store.generate).not.toHaveBeenCalled();
  });
});
