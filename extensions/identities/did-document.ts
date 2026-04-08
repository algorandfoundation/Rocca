import { base58 } from '@scure/base';
import type { DIDDocument, VerificationMethod, Service, RTCIceServer } from './types';

/**
 * Default ICE servers configuration for WebRTC connections
 */
const defaultIceServers: RTCIceServer[] = [
  {
    urls: 'stun:stun.l.google.com:19302',
  },
  {
    urls: ['turn:turn.example.com:3478', 'turn:turn.example.com:3479'],
    username: 'user',
    credential: 'pass',
  },
];

/**
 * Generate a DID Document for did:key method following W3C JSON-LD spec
 * @param did - The DID identifier (e.g., "did:key:z...")
 * @param publicKey - The raw Ed25519 public key bytes
 * @returns W3C compliant DID Document
 */
export function generateDidDocument(did: string, publicKey: Uint8Array): DIDDocument {
  // Create the multicodec prefix for Ed25519 public key: 0xed
  // The varint encoding of 0xed is [0xed, 0x01]
  const multicodecPrefix = new Uint8Array([0xed, 0x01]);

  // Combine prefix + public key
  const prefixedKey = new Uint8Array(multicodecPrefix.length + publicKey.length);
  prefixedKey.set(multicodecPrefix);
  prefixedKey.set(publicKey, multicodecPrefix.length);

  // Encode to base58btc with 'z' prefix
  const publicKeyMultibase = `z${base58.encode(prefixedKey)}`;

  // The verification method ID is the DID + key reference
  const verificationMethodId = `${did}#${publicKeyMultibase}`;

  return {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1',
    ],
    id: did,
    verificationMethod: [
      {
        id: verificationMethodId,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyMultibase: publicKeyMultibase,
      },
    ],
    authentication: [verificationMethodId],
    assertionMethod: [verificationMethodId],
    service: [
      {
        id: `${did}#webrtc-ice-servers`,
        type: 'WebRTCICECredentials',
        iceServers: defaultIceServers,
      },
    ],
  };
}

/**
 * Generate the did:key identifier from Ed25519 public key using base58btc encoding
 * @param publicKey - The raw Ed25519 public key bytes (32 bytes)
 * @returns The did:key identifier
 */
export function generateDidKey(publicKey: Uint8Array): string {
  // Ed25519 multicodec is 0xed
  // The varint encoding is 0xed01
  const multicodecPrefix = new Uint8Array([0xed, 0x01]);

  // Combine prefix + public key
  const prefixedKey = new Uint8Array(multicodecPrefix.length + publicKey.length);
  prefixedKey.set(multicodecPrefix);
  prefixedKey.set(publicKey, multicodecPrefix.length);

  // Encode to base58btc with 'z' prefix
  return `did:key:z${base58.encode(prefixedKey)}`;
}

// Types are now imported from ./types
