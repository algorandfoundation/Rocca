import { sha512_256 } from '@noble/hashes/sha512';
import { base32 } from '@scure/base';

export function encodeAddress(publicKey: Uint8Array): string {
  const checksum = sha512_256(publicKey).slice(-4);
  return base32
    .encode(new Uint8Array([...publicKey, ...checksum]))
    .replace(/=+$/, '')
    .toUpperCase();
}
