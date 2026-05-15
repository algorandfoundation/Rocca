/**
 * DID public-key helpers.
 *
 * These utilities extract and format the raw Ed25519 public key from a
 * did:key identifier so it can be displayed in a GPG-style fingerprint.
 */

import { base58 } from '@scure/base';

/**
 * Decode the raw Ed25519 public key bytes from a did:key multibase string.
 *
 * Accepts either the full DID (`did:key:z...`) or the publicKeyMultibase
 * (`z...`).  The 'z' prefix signals base58btc.  The 0xed01 multicodec
 * prefix is stripped.
 */
export function decodeDidPublicKey(input: string): Uint8Array | null {
  if (!input) return null;
  const mb = input.startsWith('did:key:') ? input.slice(8) : input;
  if (!mb || !mb.startsWith('z')) return null;
  try {
    const decoded = base58.decode(mb.slice(1));
    if (decoded.length < 34) return null;
    return decoded.slice(2);
  } catch {
    return null;
  }
}

/** GPG-style formatter: groups of 4 hex chars, space separated (uppercase). */
export function toGpgFormat(hex: string): string {
  const groups = hex.match(/.{1,4}/g);
  return groups ? groups.join(' ') : hex;
}

/** Hex encode with uppercase letters. */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/** GPG-style fingerprint: groups of 4 chars, space separated. */
export function formatFingerprint(hex: string): string {
  return toGpgFormat(hex);
}

/**
 * Extract the raw Ed25519 public key as a hex string.
 *
 * Returns uppercase hex like:
 *   "CFD3E4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6C7D8E9F0A1B2"
 *
 * Or null if the DID is not a did:key or cannot be decoded.
 */
export function getPublicKeyHex(publicKeyMultibase: string | undefined): string | null {
  const raw = decodeDidPublicKey(publicKeyMultibase || '');
  if (!raw) return null;
  return toHex(raw);
}

/**
 * Extract the public-key fingerprint from a did:key multibase string.
 *
 * Returns a GPG-style string like:
 *   "CFD3 E4E5 F6A7 B8C9 D0E1 F2A3 B4C5 D6E7"
 *
 * Or null if the DID is not a did:key or cannot be decoded.
 */
export function getPublicKeyFingerprint(publicKeyMultibase: string | undefined): string | null {
  const hex = getPublicKeyHex(publicKeyMultibase);
  if (!hex) return null;
  return formatFingerprint(hex);
}
