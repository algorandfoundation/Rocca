import type {
	Account,
	AccountStoreExtension,
	AccountStoreState,
} from "@/extensions/accounts";
import type {
	Key,
	KeyStoreExtension,
	KeyStoreState,
	XHDDerivedKeyData,
} from "@algorandfoundation/keystore";
import type { Extension } from "@algorandfoundation/wallet-provider";
import type { Store } from "@tanstack/store";
import type {
	AccountsKeystoreExtension,
	AccountsKeystoreExtensionOptions,
} from "./types.ts";
import {base64} from "@scure/base";

/**
 * Extension that bridges the account store and keystore.
 *
 * It automatically populates the account store with accounts derived from keys
 * in the keystore, providing a sign method that leverages the keystore backend.
 */
export const WithAccountsKeystore: Extension<AccountsKeystoreExtension> = (
	provider: KeyStoreExtension & AccountStoreExtension,
	options: AccountsKeystoreExtensionOptions,
) => {
	// Ensure dependencies are present
	if (!provider.account) {
		throw new Error(
			"AccountsKeystore extension requires WithAccountStore extension to be present on the provider.",
		);
	}
	if (!provider.key) {
		throw new Error(
			"AccountsKeystore extension requires WithKeyStore extension to be present on the provider.",
		);
	}

	const keyStore: Store<KeyStoreState> = options.keystore.store;
	const accountStore: Store<AccountStoreState> = options.accounts.store;
	const { autoPopulate = true } = options.accounts.keystore ?? {};

	/**
	 * Creates an account object for a given key ID and address.
	 */
	const createKeyAccount = (
		keyId: string,
		address: string,
		parentKeyId?: string,
	): Account => ({
		address,
		type: "ed25519",
		assets: [],
		metadata: { keyId, parentKeyId },
		balance: BigInt(0),

		// TODO: Transfer helper
		transfer(amount: bigint, account: Account) {
			console.log(
				`Transferring ${amount} from ${address} to ${account.address}`,
			);
		},
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

	// Initial population if enabled
	if (autoPopulate) {
		console.log("Auto-populating accounts from keystore...");
		const keys = [...((provider.keys as Key[]) ?? [])];
		for (const key of keys) {
			if (
				key.type === "hd-derived-ed25519" &&
				key.publicKey &&
				key.metadata?.context === 0
			) {
				console.log(`Checking key ${key.id}-${key.type}...`);
				const address = base64.encode(key.publicKey);

				// Skip if the account already exists
				if (accountStore.state.accounts.some((a) => a.address === address)) {
					continue;
				}

				provider.account.store.addAccount(
					createKeyAccount(
						key.id,
						address,
						(key as XHDDerivedKeyData)?.metadata?.parentKeyId,
					),
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

			// Remove accounts for removed keys
			removedKeys.forEach((k) => {
				if (k.type === "hd-derived-ed25519" && k.publicKey) {
					const address = base64.encode(k.publicKey);
					const account = accountStore.state.accounts.find((a) => a.address === address);
					if (account && account.metadata?.keyId === k.id) {
						console.log(`Removing account for key ${k.id}-${k.type}...`);
						provider.account.store.removeAccount(address);
					}
				}
			});

			const accounts = [...accountStore.state.accounts] as unknown as Account[];

			// Process only the newly added keys
			addedKeys.forEach((k) => {
				if (k.type === "hd-derived-ed25519" && k.publicKey) {
					console.log(`Checking account for key ${k.id}-${k.type}...`);
					const address = base64.encode(k.publicKey)
					const parentKeyId = (k as XHDDerivedKeyData)?.metadata?.parentKeyId;

					// Skip if the account already exists
					if (
						!accountStore.state.accounts.some((a) => a.address === address) &&
						k.metadata?.context === 0
					) {
						console.log(`Adding account for key ${k.id}-${k.type}...`);
						provider.account.store.addAccount(
							createKeyAccount(k.id, address, parentKeyId),
						);
					}
				}
			});
			if (keys.some((k) => k.type === "hd-derived-ed25519"))
				console.log(
					`Found ${keys.length} keys, ${keys.filter((k) => k.type === "hd-derived-ed25519" && k.metadata?.context === 0).length} HD Account keys`,
				);
			if (accounts.some((a) => a.type === "ed25519"))
				console.log(
					`Found ${accounts.length} ed25519 accounts, ${accounts.filter((a) => a.type === "ed25519").length} others`,
				);
		});
	}

	// This extension doesn't add new API methods, it just bridges existing ones.
	// But it must return an object that matches the combined interface.
	return provider as unknown as AccountsKeystoreExtension;
};
