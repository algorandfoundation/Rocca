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
 * @param additionalKeys - Optional additional keys to include (e.g., account keys)
 * @param additionalServices - Optional additional services to include
 * @returns W3C compliant DID Document
 */
export function generateDidDocument(
  did: string,
  publicKey: Uint8Array,
  additionalKeys: {
    id: string;
    publicKey: Uint8Array;
    type?: string;
    algorithm?: string;
    metadata?: Record<string, any>;
  }[] = [],
  additionalServices: Service[] = [],
  mainKeyMetadata?: Record<string, any>,
  mainKeyId?: string,
): DIDDocument {
  // Multicodec prefixes
  // Ed25519 (0xed) -> [0xed, 0x01]
  // P-256 (0x1200) -> [0x80, 0x24] (varint encoding of 0x1200 is 0x80 0x24)
  // Wait, P-256 multicodec is 0x1200. Varint of 0x1200:
  // 0x1200 = 4608
  // 4608 = 0x24 * 128 + 0x00
  // So [0x80, 0x24] is correct.
  const ED25519_PREFIX = new Uint8Array([0xed, 0x01]);
  const P256_PREFIX = new Uint8Array([0x80, 0x24]);
  const createVerificationMethod = (
    id: string,
    keyBytes: Uint8Array,
    type: string = 'Ed25519VerificationKey2020',
    algorithm?: string,
    metadata?: Record<string, any>,
  ): VerificationMethod => {
    let prefix = ED25519_PREFIX;
    let methodType = type;

    if (algorithm === 'ES256' || algorithm === 'P256' || type === 'JsonWebKey2020') {
      prefix = P256_PREFIX;
      methodType = 'JsonWebKey2020';
    }

    if (!keyBytes || keyBytes.length === undefined) {
      throw new Error(`Invalid keyBytes for id ${id}: ${keyBytes ? typeof keyBytes : 'undefined'}`);
    }
    const prefixedKey = new Uint8Array(prefix.length + keyBytes.length);
    prefixedKey.set(prefix);
    prefixedKey.set(keyBytes, prefix.length);
    const publicKeyMultibase = `z${base58.encode(prefixedKey)}`;

    let finalId = id;
    if (!id.includes('#') && mainKeyId && id === did) {
      finalId = `${id}#${mainKeyId}`;
    }

    return {
      id: finalId,
      type: methodType,
      controller: did,
      publicKeyMultibase,
      metadata,
    };
  };

  const mainMethod = createVerificationMethod(
    did,
    publicKey,
    'Ed25519VerificationKey2020',
    'EdDSA',
    mainKeyMetadata,
  );
  const verificationMethod: VerificationMethod[] = [mainMethod];
  const authentication: string[] = [mainMethod.id];
  const assertionMethod: string[] = [mainMethod.id];

  additionalKeys.forEach((key) => {
    const method = createVerificationMethod(
      key.id,
      key.publicKey,
      key.type,
      key.algorithm,
      key.metadata,
    );
    verificationMethod.push(method);
  });

  const service: Service[] = [
    {
      id: `${did}#webrtc-ice-servers`,
      type: 'WebRTCICECredentials',
      iceServers: defaultIceServers,
    },
    ...additionalServices,
  ];

  return {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/ed25519-2020/v1',
    ],
    id: did,
    verificationMethod,
    authentication,
    assertionMethod,
    service,
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
