import type { ExtensionOptions } from "@algorandfoundation/wallet-provider";
import type { Store } from "@tanstack/store";
import type { HookCollection } from "before-after-hook";

/**
 * Options for the IdentityStore extension.
 */
export interface IdentityStoreOptions extends ExtensionOptions {
	identities: {
		store: Store<IdentityStoreState>;
		hooks: HookCollection<any>;
	};
}

export type IdentityType = "xhd" | "did:key" | string;


/**
 * W3C DID Document structure
 */
export interface DIDDocument {
	"@context": string[];
	id: string;
	verificationMethod: VerificationMethod[];
	authentication: string[];
	assertionMethod: string[];
}

/**
 * Verification Method for DID Document
 */
export interface VerificationMethod {
	id: string;
	type: string;
	controller: string;
	publicKeyMultibase: string;
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
	 * The hooks for identity store operations.
	 */
	hooks: HookCollection<any>;
}
