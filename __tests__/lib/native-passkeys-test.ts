import type { Passkey } from '@/extensions/passkeys';
import { mergeNativePasskeys, type NativeStoredCredential } from '@/lib/native-passkeys';
import { matchesOrigin } from '@/lib/passkey-origin';

const CREDENTIAL_ID = 'a+b/c==';
const URL_SAFE_ID = 'a-b_c';

function nativeCredential(partial: Partial<NativeStoredCredential> = {}): NativeStoredCredential {
  return {
    credentialId: CREDENTIAL_ID,
    relyingPartyIdentifier: 'example.com',
    userName: 'ALICE',
    userHandle: 'ALICE',
    ...partial,
  };
}

/** A passkey as `WithPasskeysKeystore` builds it from a `k/<id>` record. */
function keystorePasskey(): Passkey {
  return {
    id: URL_SAFE_ID,
    name: 'ALICE@example.com',
    userHandle: 'ALICE',
    origin: 'example.com',
    publicKey: new Uint8Array([1, 2, 3]),
    algorithm: 'P256',
    createdAt: 1_700_000_000_000,
    metadata: {
      keyId: CREDENTIAL_ID,
      origin: 'example.com',
      userHandle: 'ALICE',
      scheme: 'pbkdf2-p256',
      registered: true,
      type: 'hd-derived-p256',
    },
  };
}

describe('mergeNativePasskeys', () => {
  it('records the origin in metadata as well as at the top level', () => {
    // Without `metadata.origin` the connection flow saw a passkey belonging to
    // no site, always created a new one, and the deterministic credential id
    // kept overwriting the single stored record.
    const [passkey] = mergeNativePasskeys([], [nativeCredential()]);

    expect(passkey.origin).toBe('example.com');
    expect(passkey.metadata?.origin).toBe('example.com');
    expect(matchesOrigin(passkey, 'https://example.com')).toBe(true);
  });

  it('keys passkeys by the url-safe credential id', () => {
    expect(mergeNativePasskeys([], [nativeCredential()])[0].id).toBe(URL_SAFE_ID);
  });

  it('merges onto the keystore-built record instead of replacing it', () => {
    // This sync runs again on every resume and every autofill event; replacing
    // used to strip the keystore's metadata each time the app came back from
    // the system passkey UI.
    const merged = mergeNativePasskeys([keystorePasskey()], [nativeCredential()]);

    expect(merged).toHaveLength(1);
    expect(merged[0].metadata).toMatchObject({
      keyId: CREDENTIAL_ID,
      origin: 'example.com',
      scheme: 'pbkdf2-p256',
      type: 'hd-derived-p256',
      registered: true,
      nativeCredential: true,
      userName: 'ALICE',
    });
    expect(merged[0].name).toBe('ALICE@example.com');
  });

  it('keeps the known public key when the native list reports none', () => {
    const merged = mergeNativePasskeys(
      [keystorePasskey()],
      [nativeCredential({ publicKey: undefined })],
    );

    expect(merged[0].publicKey).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('decodes the native public key when it is reported', () => {
    const merged = mergeNativePasskeys(
      [],
      [nativeCredential({ publicKey: Buffer.from([4, 5, 6]).toString('base64') })],
    );

    expect(merged[0].publicKey).toEqual(new Uint8Array([4, 5, 6]));
  });

  it('does not resurrect a registration the app has not made yet', () => {
    const pending = keystorePasskey();
    pending.metadata!.registered = false;

    expect(mergeNativePasskeys([pending], [nativeCredential()])[0].metadata?.registered).toBe(
      false,
    );
  });

  it('normalises a seconds-based createdAt to milliseconds', () => {
    const merged = mergeNativePasskeys([], [nativeCredential({ createdAt: 1_700_000_000 })]);

    expect(merged[0].createdAt).toBe(1_700_000_000_000);
  });

  it('leaves a millisecond createdAt alone', () => {
    const merged = mergeNativePasskeys([], [nativeCredential({ createdAt: 1_700_000_000_000 })]);

    expect(merged[0].createdAt).toBe(1_700_000_000_000);
  });

  it('retains passkeys the native provider does not report', () => {
    const other: Passkey = { ...keystorePasskey(), id: 'other', origin: 'other.example' };

    const merged = mergeNativePasskeys([other], [nativeCredential()]);

    expect(merged.map((passkey) => passkey.id)).toEqual([URL_SAFE_ID, 'other']);
  });
});
