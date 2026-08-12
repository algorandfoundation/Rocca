import type { KeyStoreAPI } from '@algorandfoundation/react-native-keystore';

/**
 * The account context: the Algorand addresses the wallet spends from.
 *
 * A "context" is the second segment of the BIP44 path the XHD engine derives
 * along (see {@link bip44Path}) and it is recorded on the derived key as
 * `metadata.context`, which is how the accounts and identities extensions tell
 * the two apart when they populate their stores.
 */
export const ADDRESS_CONTEXT = 0;

/** The identity context: the key a wallet's DID and its credentials hang off. */
export const IDENTITY_CONTEXT = 1;

/**
 * The BIP44 coin type each context derives under, per SLIP-0044 and
 * `xhd-wallet-api`'s `GetBIP44PathFromContext`. Addresses use Algorand's own
 * coin type; identities deliberately sit under coin type 0 so an identity key
 * can never collide with a spending key.
 */
const COIN_TYPES: Record<number, number> = {
  [ADDRESS_CONTEXT]: 283,
  [IDENTITY_CONTEXT]: 0,
};

/**
 * The BIP32-Ed25519 derivation variant this wallet has always used: Peikert's,
 * which zeroes 9 bits of each derived `zL`. It is `deriveFromSeed`'s default
 * (only `mode: 'standard'` selects Khovratovich's), and it is carried on the
 * record as `metadata.derivation` — DID-document backups round-trip that value
 * and the identities extension matches on it, so it has to keep its old shape.
 */
export const PEIKERT_DERIVATION = 9;

/** Which child of the account root a key is: `m/44'/<coin>'/<account>'/0/<index>`. */
export interface DerivationSlot {
  /** {@link ADDRESS_CONTEXT} or {@link IDENTITY_CONTEXT}. */
  context: number;
  /** BIP44 account number. Defaults to 0. */
  account?: number;
  /** Key index within the account. Defaults to 0. */
  index?: number;
}

/** The BIP44 path a {@link DerivationSlot} names. */
export function bip44Path({ context, account = 0, index = 0 }: DerivationSlot): string {
  const coinType = COIN_TYPES[context];
  if (coinType === undefined) {
    throw new Error(`Unknown key context: ${context}`);
  }
  return `m/44'/${coinType}'/${account}'/0/${index}`;
}

/**
 * Derives an account or identity key from the wallet's BIP32-Ed25519 root.
 *
 * `deriveFromSeed` is the only way to mint one. `generate` used to accept a
 * `hd-derived-ed25519` type with the slot in `params`, but the engine now
 * routes anything it does not recognise to the host WebCrypto — so that call
 * reached React Native's `subtle.generateKey({ name: 'EdDSA' })` and died with
 * `'subtle.generateKey()' is not implemented for EdDSA. Unrecognized algorithm
 * name`. `generate` mints fresh keys; derived children come from the seed.
 *
 * The engine writes the record itself (type `hd-derived-ed25519`, algorithm
 * `EdDSA`, no stored material — the scalar is re-derived from the unlocked root
 * at sign time), so the only thing left to state is the slot. It is passed both
 * ways: as the path, which is what actually decides the key, and as metadata,
 * which is what every reader — the accounts and identities extensions, and DID
 * backups — matches on.
 */
export function deriveContextKey(
  store: Pick<KeyStoreAPI, 'deriveFromSeed'>,
  rootKeyId: string,
  slot: DerivationSlot,
): Promise<string> {
  if (!store.deriveFromSeed) {
    throw new Error('This keystore cannot derive HD keys: deriveFromSeed is not implemented');
  }

  const { context, account = 0, index = 0 } = slot;
  return store.deriveFromSeed(rootKeyId, bip44Path(slot), {
    algorithm: 'EdDSA',
    metadata: { context, account, index, derivation: PEIKERT_DERIVATION },
  });
}
