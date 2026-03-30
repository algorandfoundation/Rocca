import type {
	Key,
	KeyStoreExtension,
	KeyStoreState,
	XHDDomainP256KeyData,
} from "@algorandfoundation/keystore";
import type {
	Passkey,
	PasskeyStoreExtension,
} from "@/extensions/passkeys";
import type { Extension } from "@algorandfoundation/wallet-provider";
import type { Store } from "@tanstack/store";
import type {
	PasskeysKeystoreExtension,
	PasskeysKeystoreExtensionOptions,
} from "./types";

/**
 * Extension that bridges the passkey store and keystore.
 *
 * It automatically populates the passkey store with passkeys from the keystore.
 */
export const WithPasskeysKeystore: Extension<PasskeysKeystoreExtension> = (
	provider: KeyStoreExtension & PasskeyStoreExtension,
	options: PasskeysKeystoreExtensionOptions,
) => {
	// Ensure dependencies are present
	if (!provider.passkey) {
		throw new Error(
			"PasskeysKeystore extension requires WithPasskeyStore extension to be present on the provider.",
		);
	}
	if (!provider.key) {
		throw new Error(
			"PasskeysKeystore extension requires WithKeyStore extension to be present on the provider.",
		);
	}

	const keyStore: Store<KeyStoreState> = options.keystore.store;
	const { autoPopulate = true } = options.passkeys.keystore ?? {};

	const toUrlSafe = (id: string) => id.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

	// Hook into passkey removal to also remove from keystore
	provider.passkey.store.hooks.before("remove", async ({ id }) => {
		const foundKey = (keyStore.state.keys as Key[]).find((k) => toUrlSafe(k.id) === id);
		if (foundKey) {
			try {
				await provider.key.store.remove(foundKey.id);
			} catch (error) {
				console.error(`Failed to remove key ${foundKey.id} from keystore:`, error);
			}
		}
	});

	const keys = [...((keyStore.state.keys as Key[]) ?? [])];

	/**
	 * Creates a passkey object from a keystore key.
	 */
	const createPasskeyFromKey = (key: XHDDomainP256KeyData): Passkey => {
		if (!key.publicKey) {
			throw new Error(`Key ${key.id} is missing public key`);
		}
		return {
			id: toUrlSafe(key.id),
			name: key.metadata.origin || "Unnamed Passkey",
			publicKey: key.publicKey,
			algorithm: key.algorithm || "ES256",
			createdAt: key.metadata.createdAt || Date.now(),
			metadata: {
				...key.metadata,
				keyId: key.id,
				registered: key.metadata.registered ?? false,
			},
		};
	};

	// Initial population if enabled
	if (autoPopulate) {
		let isProcessing = false;
		let nextKeys: Key[] | null = null;

		const processUpdates = (newKeys: Key[]) => {
			if (isProcessing) {
				nextKeys = newKeys;
				return;
			}
			isProcessing = true;
			nextKeys = null;

			// Find added keys
			const addedKeys = newKeys.filter(
				(newKey) => !keys.some((existingKey) => existingKey.id === newKey.id),
			);

			// Find removed keys
			const removedKeys = keys.filter(
				(existingKey) => !newKeys.some((newKey) => newKey.id === existingKey.id),
			);

			// Find updated keys
			const updatedKeys = newKeys.filter((nk) => {
				const existing = keys.find(k => k.id === nk.id);
				return existing && JSON.stringify(existing.metadata) !== JSON.stringify(nk.metadata);
			});

			if (addedKeys.length === 0 && removedKeys.length === 0 && updatedKeys.length === 0) {
				isProcessing = false;

				return;
			}

			// Update the local cache of keys
			keys.length = 0;
			newKeys.forEach(k => keys.push(k));

			// Remove passkeys for removed keys
			removedKeys.forEach((k) => {
				if (k.type === "hd-derived-passkey" || k.type === "xhd-derived-p256" || k.type === "hd-derived-p256") {
					provider.passkey.store.removePasskey(toUrlSafe(k.id));
				}
			});

			// Add passkeys for added keys
			for (const k of addedKeys) {
				if (k.type === "hd-derived-passkey" || k.type === "xhd-derived-p256" || k.type === "hd-derived-p256") {
					provider.passkey.store.addPasskey(
						createPasskeyFromKey(k as XHDDomainP256KeyData),
					);
				}
			}

			// Refresh passkeys for updated keys
			for (const k of updatedKeys) {
				if (k.type === "hd-derived-passkey" || k.type === "xhd-derived-p256" || k.type === "hd-derived-p256") {
					provider.passkey.store.addPasskey(
						createPasskeyFromKey(k as XHDDomainP256KeyData),
					);
				}
			}

			isProcessing = false;

			if (nextKeys) {
				const k = nextKeys;
				nextKeys = null;
				processUpdates(k);
			}
		};

		processUpdates(keyStore.state.keys as unknown as Key[]);

		keyStore.subscribe((state) => {
			if (state.status !== 'ready' && state.status !== 'idle') return;
			processUpdates(state.keys as unknown as Key[]);
		});
	}

	return provider as unknown as PasskeysKeystoreExtension;
};
