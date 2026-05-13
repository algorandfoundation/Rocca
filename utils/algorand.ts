import { sha512_256 } from '@noble/hashes/sha2';
import { base32nopad } from '@scure/base';

/**
 * Decodes an Algorand address into its public key bytes.
 * @param address - The Algorand address string.
 * @returns The decoded public key.
 */
export function decodeAddress(address: string): { publicKey: Uint8Array } {
  // Standard Algorand addresses are 58 characters long.
  // They are base32 encoded bytes of (32-byte public key + 4-byte checksum).
  // Total 36 bytes.
  const decoded = base32nopad.decode(address.toUpperCase());
  if (decoded.length !== 36) {
    throw new Error('Invalid address length');
  }

  const publicKey = decoded.slice(0, 32);
  const checksum = decoded.slice(32);
  const expectedChecksum = sha512_256(publicKey).slice(-4);

  for (let i = 0; i < 4; i++) {
    if (checksum[i] !== expectedChecksum[i]) {
      throw new Error('Invalid checksum');
    }
  }

  return { publicKey: new Uint8Array(publicKey) };
}

/**
 * Shortens an Algorand address for UI display.
 *
 * Example:
 * ellipseAddress(
 *   "6Z5J6YQ2T3X5P4P5N6W2G3M4L7K8J9H1D2F3G4H5J6K7L8M9N0P1Q2R3S4"
 * )
 * => "6Z5J...Q2R3"
 */

export function ellipseAddress(address: string, width = 4): string {
  if (!address || typeof address !== 'string') {
    return '';
  }

  // Algorand addresses are typically 58 chars
  if (address.length <= width * 2) {
    return address;
  }

  return `${address.slice(0, width)}...${address.slice(-width)}`;
}
