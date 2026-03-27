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

	// Hook into passkey removal to also remove from keystore
	provider.passkey.store.hooks.before("remove", async ({ id }) => {
		const keyExists = (keyStore.state.keys as Key[]).some((k) => k.id === id);
		if (keyExists) {
			try {
				await provider.key.store.remove(id);
			} catch (error) {
				console.error(`Failed to remove key ${id} from keystore:`, error);
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
			id: key.id,
			name: key.metadata.origin || "Unnamed Passkey",
			publicKey: key.publicKey,
			algorithm: key.algorithm || "ES256",
			createdAt: Date.now(),
			metadata: {
				...key.metadata,
				keyId: key.id,
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

			if (addedKeys.length === 0 && removedKeys.length === 0) {
				isProcessing = false;

				return;
			}

			// Update the local cache of keys
			keys.length = 0;
			newKeys.forEach(k => keys.push(k));

			// Remove passkeys for removed keys
			removedKeys.forEach((k) => {
				if (k.type === "hd-derived-passkey" || k.type === "xhd-derived-p256" || k.type === "hd-derived-p256") {
					provider.passkey.store.removePasskey(k.id);
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

			isProcessing = false;

		};

		processUpdates(keyStore.state.keys as unknown as Key[]);

		keyStore.subscribe((state) => {
			if (state.status !== 'ready' && state.status !== 'idle') return;
			setTimeout(() => {
				processUpdates(state.keys as unknown as Key[]);
			}, 0);
		});
	}

	return provider as unknown as PasskeysKeystoreExtension;
};
