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
			metadata: {
				...key.metadata,
				keyId: key.id,
			},
		};
	};

	// Initial population if enabled
	if (autoPopulate) {
		const keys = [...((provider.keys as Key[]) ?? [])];
		for (const key of keys) {
			if (key.type === "hd-derived-passkey" || key.type === "xhd-derived-p256") {
				provider.passkey.store.addPasskey(
					createPasskeyFromKey(key as XHDDomainP256KeyData),
				);
			}
		}

		const processUpdates = (newKeys: Key[]) => {
			// Find keys that are in newKeys but not in our local keys list
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

			// Remove passkeys for removed keys
			removedKeys.forEach((k) => {
				if (k.type === "hd-derived-passkey" || k.type === "xhd-derived-p256") {
					provider.passkey.store.removePasskey(k.id);
				}
			});

			// Add passkeys for added keys
			for (const k of addedKeys) {
				if (k.type === "hd-derived-passkey" || k.type === "xhd-derived-p256") {
					provider.passkey.store.addPasskey(
						createPasskeyFromKey(k as XHDDomainP256KeyData),
					);
				}
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
