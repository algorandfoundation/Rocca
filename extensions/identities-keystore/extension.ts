import type {
	Identity,
	IdentityStoreExtension,
	IdentityStoreState,
} from "@/extensions/identities";
import type {
	Key,
	KeyStoreExtension,
	KeyStoreState,
	XHDDerivedKeyData,
} from "@algorandfoundation/keystore";
import type { Extension } from "@algorandfoundation/wallet-provider";
import type { Store } from "@tanstack/store";
import type {
	IdentitiesKeystoreExtension,
	IdentitiesKeystoreExtensionOptions,
} from "./types.ts";
import {base64} from "@scure/base";

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
	): Identity => ({
		address,
		did,
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
	});

	const getDidKey = (publicKey: Uint8Array): string => {
		// Simple DID:key implementation for ed25519 (multicodec 0xed)
		// Prefix with 0xed01 (varint for 0xed is 0xed01)
		const prefix = new Uint8Array([0xed, 0x01]);
		const didBytes = new Uint8Array(prefix.length + publicKey.length);
		didBytes.set(prefix);
		didBytes.set(publicKey, prefix.length);
		return `did:key:z${base64.encode(didBytes)}`; // z is for base58btc, but here we use base64 for simplicity as per previous pattern or should we use base58?
		// The previous issue used base64.encode(key.publicKey) for algorand address (which is actually not correct for algorand but it's what was requested/implemented)
		// Let's stick to base64 for now as it seems to be the project's utility.
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
				const did = getDidKey(key.publicKey);
				const address = did; // Using DID as address for now

				// Skip if the identity already exists
				if (identityStore.state.identities.some((i) => i.address === address)) {
					continue;
				}

				provider.identity.store.addIdentity(
					createKeyIdentity(key.id, address, did),
				);
			}
		}

		keyStore.subscribe((state) => {
			const newKeys = (state as unknown as KeyStoreState).keys;

			// Find the difference between keys and newKeys
			const addedKeys = newKeys.filter(
				(newKey) => !keys.some((existingKey) => existingKey.id === newKey.id),
			);

			if (addedKeys.length === 0) return;

			addedKeys.forEach((k) => {
				keys.push(k);
			});

			// Process only the newly added keys
			addedKeys.forEach((k) => {
				if (k.type === "hd-derived-ed25519" && k.publicKey && k.metadata?.context === 1) {
					console.log(`Checking identity for key ${k.id}-${k.type}...`);
					const did = getDidKey(k.publicKey);
					const address = did;

					// Skip if the identity already exists
					if (!identityStore.state.identities.some((i) => i.address === address)) {
						console.log(`Adding identity for key ${k.id}-${k.type}...`);
						provider.identity.store.addIdentity(
							createKeyIdentity(k.id, address, did),
						);
					}
				}
			});
		});

		provider.identity.store.hooks.before("clear", async () => {
			const keys = provider.keys.filter((k) => k.type === "hd-derived-ed25519" && k.metadata?.context === 1);
			for (const k of keys) {
				await provider.key.store.remove(k.id);
			}
		});
	}

	return provider as unknown as IdentitiesKeystoreExtension;
};
