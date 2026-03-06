import type {
	Identity,
	IdentityStoreExtension,
	IdentityStoreState,
} from "@/extensions/identities";
import type {
	Key,
	KeyStoreExtension,
	KeyStoreState,
} from "@algorandfoundation/keystore";
import type { Extension } from "@algorandfoundation/wallet-provider";
import type { Store } from "@tanstack/store";
import type {
	IdentitiesKeystoreExtension,
	IdentitiesKeystoreExtensionOptions,
} from "./types.ts";
import { generateDidKey, generateDidDocument, type DIDDocument } from "@/extensions/identities/did-document";
import { localStorage } from "@/stores/mmkv-local";

const DID_DOCUMENT_KEY_PREFIX = "did:document:";

/**
 * Save DID Document to MMKV storage
 */
function saveDidDocument(did: string, document: DIDDocument): void {
	const key = `${DID_DOCUMENT_KEY_PREFIX}${did}`;
	localStorage.set(key, JSON.stringify(document));
}

/**
 * Load DID Document from MMKV storage
 */
function loadDidDocument(did: string): DIDDocument | null {
	const key = `${DID_DOCUMENT_KEY_PREFIX}${did}`;
	const json = localStorage.getString(key);
	if (json) {
		try {
			return JSON.parse(json) as DIDDocument;
		} catch (e) {
			console.error("Failed to parse DID Document from storage:", e);
			return null;
		}
	}
	return null;
}

/**
 * Remove DID Document from MMKV storage
 */
function removeDidDocument(did: string): void {
	const key = `${DID_DOCUMENT_KEY_PREFIX}${did}`;
	localStorage.remove(key);
}

/**
 * Extension that bridges the identity store and keystore.
 *
 * It automatically populates the identity store with identities derived from keys
 * in the keystore with context 1, providing a sign method that leverages the keystore backend.
 */
export const WithIdentitiesKeystore: Extension<IdentitiesKeystoreExtension> = (
	provider: KeyStoreExtension & IdentityStoreExtension,
	options: IdentitiesKeystoreExtensionOptions,
) => {
	// Ensure dependencies are present
	if (!provider.identity) {
		throw new Error(
			"IdentitiesKeystore extension requires WithIdentityStore extension to be present on the provider.",
		);
	}
	if (!provider.key) {
		throw new Error(
			"IdentitiesKeystore extension requires WithKeyStore extension to be present on the provider.",
		);
	}

	const keyStore: Store<KeyStoreState> = options.keystore.store;
	const identityStore: Store<IdentityStoreState> = options.identities.store;
	const { autoPopulate = true } = options.identities.keystore ?? {};

	/**
	 * Creates an identity object for a given key ID and address.
	 */
	const createKeyIdentity = (
		keyId: string,
		address: string,
		did: string,
		publicKey: Uint8Array,
	): Identity => {
		// Generate the DID Document
		const didDocument = generateDidDocument(did, publicKey);
		
		// Save to MMKV storage
		saveDidDocument(did, didDocument);

		return {
			address,
			did,
			didDocument,
			type: "did:key",
			metadata: { keyId },

			// TODO: TransactionSigners
			sign: async (txns: Uint8Array[]) => {
				// Sign each transaction using the keystore
				const signedTxns: Uint8Array[] = [];
				for (const txn of txns) {
					const signed = await provider.key.store.sign(keyId, txn);
					signedTxns.push(signed);
				}
				return signedTxns;
			},
		};
	};

	// Initial population if enabled
	if (autoPopulate) {
		console.log("Auto-populating identities from keystore...");
		const keys = [...((provider.keys as Key[]) ?? [])];
		for (const key of keys) {
			if (
				key.type === "hd-derived-ed25519" &&
				key.publicKey &&
				key.metadata?.context === 1
			) {
				console.log(`Checking key ${key.id}-${key.type} for identity...`);
				const did = generateDidKey(key.publicKey);
				const address = did;

				// Skip if the identity already exists
				if (identityStore.state.identities.some((i) => i.address === address)) {
					continue;
				}

				provider.identity.store.addIdentity(
					createKeyIdentity(key.id, address, did, key.publicKey),
				);
			}
		}

		keyStore.subscribe((state) => {
			const newKeys = (state as unknown as KeyStoreState).keys;

			// Find added keys
			const addedKeys = newKeys.filter(
				(newKey) => !keys.some((existingKey) => existingKey.id === newKey.id),
			);

			// Find removed keys
			const removedKeys = keys.filter(
				(existingKey) => !newKeys.some((newKey) => newKey.id === existingKey.id),
			);

			if (addedKeys.length === 0 && removedKeys.length === 0) return;

			// Update the local cache of keys
			addedKeys.forEach((k) => {
				keys.push(k);
			});
			removedKeys.forEach((k) => {
				const index = keys.findIndex((existingKey) => existingKey.id === k.id);
				if (index !== -1) {
					keys.splice(index, 1);
				}
			});

			// Remove identities for removed keys
			removedKeys.forEach((k) => {
				if (k.type === "hd-derived-ed25519" && k.publicKey) {
					const address = generateDidKey(k.publicKey);
					const identity = identityStore.state.identities.find((i) => i.address === address);
					if (identity && identity.metadata?.keyId === k.id) {
						console.log(`Removing identity for key ${k.id}-${k.type}...`);
						// Remove DID Document from storage
						if (identity.did) {
							removeDidDocument(identity.did);
						}
						provider.identity.store.removeIdentity(address);
					}
				}
			});

			// Process only the newly added keys
			addedKeys.forEach((k) => {
				if (k.type === "hd-derived-ed25519" && k.publicKey && k.metadata?.context === 1) {
					console.log(`Checking identity for key ${k.id}-${k.type}...`);
					const did = generateDidKey(k.publicKey);
					const address = did;

					// Skip if the identity already exists
					if (!identityStore.state.identities.some((i) => i.address === address)) {
						console.log(`Adding identity for key ${k.id}-${k.type}...`);
						provider.identity.store.addIdentity(
							createKeyIdentity(k.id, address, did, k.publicKey),
						);
					}
				}
			});
		});
	}

	return provider as unknown as IdentitiesKeystoreExtension;
};
