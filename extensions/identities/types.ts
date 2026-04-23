import type { ExtensionOptions } from '@algorandfoundation/wallet-provider';
import type { Store } from '@tanstack/store';
import type { HookCollection } from 'before-after-hook';

/**
 * Options for the IdentityStore extension.
 */
export interface IdentityStoreOptions extends ExtensionOptions {
  identities: {
    store: Store<IdentityStoreState>;
    hooks: HookCollection<any>;
  };
}

export type IdentityType = 'xhd' | 'did:key' | string;

/**
 * W3C DID Document structure
 */
export interface DIDDocument {
  '@context': string[];
  id: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  assertionMethod: string[];
  service: Service[];
}

/**
 * Verification Method for DID Document
 */
export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase: string;
  metadata?: Record<string, any>;
}

/**
 * RTCIceServer configuration compatible with WebRTC RTCConfiguration.iceServers
 * See: https://udn.realityripple.com/docs/Web/API/RTCIceServer
 */
export interface RTCIceServer {
  /**
   * STUN or TURN server URLs - can be a single URL string or array of URLs
   * Examples: "stun:stun.example.com" or ["stun:stun1.example.com", "stun:stun2.example.com"]
   */
  urls: string | string[];
  /**
   * Username for TURN server authentication (optional)
   */
  username?: string;
  /**
   * Credential (password) for TURN server authentication (optional)
   */
  credential?: string;
}

/**
 * Service endpoint for DID Document (e.g., STUN/TURN servers)
 * Contains iceServers array compatible with WebRTC RTCPeerConnection
 * See: https://udn.realityripple.com/docs/Web/API/RTCConfiguration/iceServers
 */
export interface Service {
  id: string;
  type: string;
  /**
   * WebRTC compatible iceServers configuration
   */
  iceServers?: RTCIceServer[];
  /**
   * Passkey specific details (for type: "PasskeyService")
   */
  passkeys?: {
    id: string;
    keyId?: string;
    origin: string;
    userHandle: string;
    count: number;
  }[];
  /**
   * Any other service-specific properties
   */
  [key: string]: any;
}

/**
 * Represents an identity that can sign transactions.
 */
export interface Identity {
  /**
   * The public address of the identity (e.g. DID:key).
   */
  address: string;

  /**
   * The DID:key format if available.
   */
  did?: string;

  /**
   * The W3C DID Document.
   */
  didDocument?: DIDDocument;

  /**
   * Type of identity
   */
  type: IdentityType;
  /**
   * A method to sign a transaction or a set of transactions.
   *
   * @param txns - The transactions to sign.
   * @returns The signed transactions.
   */
  sign?: (txns: Uint8Array[]) => Promise<Uint8Array[]>;

  /**
   * Subclass via the metadata
   */
  metadata?: Record<string, any>;
}

/**
 * The state of the identity store.
 */
export interface IdentityStoreState {
  /**
   * The list of identities in the store.
   */
  identities: Identity[];
}

/**
 * Represents an identity store interface for managing identities.
 */
export interface IdentityStoreExtension extends IdentityStoreState {
  /**
   * An object that represents additional functionality provided by this extension.
   */
  identity: {
    store: IdentityStoreApi;
  };
}

/**
 * Interface representing an IdentityStore extension API.
 */
export interface IdentityStoreApi {
  /**
   * Adds an identity to the store.
   *
   * @param identity - The identity to add.
   * @returns The added identity.
   */
  addIdentity: (identity: Identity) => Promise<Identity>;
  /**
   * Removes an identity from the store by its address.
   *
   * @param address - The address of the identity to remove.
   * @returns A promise that resolves when the identity is removed.
   */
  removeIdentity: (address: string) => Promise<void>;
  /**
   * Retrieves an identity from the store by its address.
   *
   * @param address - The address of the identity to retrieve.
   * @returns The identity if found, otherwise undefined.
   */
  getIdentity: (address: string) => Promise<Identity | undefined>;
  /**
   * Clears all identities from the store.
   *
   * @returns A promise that resolves when the store is cleared.
   */
  clear: () => Promise<void>;
  /**
   * Updates the DID Document of an existing identity.
   *
   * @param address - The address of the identity to update.
   * @param didDocument - The new DID Document to set.
   * @returns The updated identity if found, otherwise undefined.
   */
  updateDidDocument: (address: string, didDocument: DIDDocument) => Promise<Identity | undefined>;
  /**
   * The hooks for identity store operations.
   */
  hooks: HookCollection<any>;
}
