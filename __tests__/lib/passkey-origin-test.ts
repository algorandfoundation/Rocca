import { matchesOrigin, passkeyOrigin } from '@/lib/passkey-origin';

describe('passkeyOrigin', () => {
  it('reads the origin a keystore-built passkey carries in its metadata', () => {
    expect(passkeyOrigin({ metadata: { origin: 'example.com' } })).toBe('example.com');
  });

  it('reads the origin a natively synced passkey carries at the top level', () => {
    // The native credential list reports the relying party as a field of its
    // own; a `metadata.origin`-only reader saw these as passkeys for no site.
    expect(passkeyOrigin({ origin: 'example.com', metadata: { nativeCredential: true } })).toBe(
      'example.com',
    );
  });

  it('is undefined when neither place records a site', () => {
    expect(passkeyOrigin({ metadata: { nativeCredential: true } })).toBeUndefined();
    expect(passkeyOrigin({})).toBeUndefined();
  });

  it('treats an empty origin as absent', () => {
    expect(passkeyOrigin({ origin: '', metadata: { origin: '' } })).toBeUndefined();
  });
});

describe('matchesOrigin', () => {
  it('matches a natively synced passkey against the requesting site', () => {
    // The regression: this returned false, so every connection attempt fell
    // through to attestation and asked to create a passkey again.
    expect(matchesOrigin({ origin: 'example.com' }, 'https://example.com')).toBe(true);
  });

  it('matches a keystore-built passkey against the requesting site', () => {
    expect(matchesOrigin({ metadata: { origin: 'https://example.com' } }, 'example.com')).toBe(
      true,
    );
  });

  it('compares by host, ignoring scheme and path', () => {
    expect(
      matchesOrigin({ origin: 'https://example.com/auth' }, 'http://example.com/callback'),
    ).toBe(true);
  });

  it('does not match a different host', () => {
    expect(matchesOrigin({ origin: 'example.com' }, 'https://evil.example.org')).toBe(false);
  });

  it('does not match a port-qualified origin against the bare host', () => {
    expect(matchesOrigin({ origin: 'example.com' }, 'https://example.com:8080')).toBe(false);
  });

  it('compares non-URL origins verbatim', () => {
    const apkKeyHash = 'android:apk-key-hash:abc';
    expect(matchesOrigin({ origin: apkKeyHash }, apkKeyHash)).toBe(true);
    expect(matchesOrigin({ origin: apkKeyHash }, 'android:apk-key-hash:def')).toBe(false);
  });

  it('never matches a passkey with no recorded site', () => {
    expect(matchesOrigin({ metadata: {} }, 'https://example.com')).toBe(false);
  });
});
