import { base58 } from '@scure/base';
import { fromUrlSafe } from '@/utils/base64';
import type { Identity, IdentityStoreExtension, IdentityStoreState } from '@/extensions/identities';
import type { PasskeyStoreExtension } from '@/extensions/passkeys';
import { encodeAddress } from '@algorandfoundation/keystore';
import { decodeAddress } from '@/utils/algorand';
import { toBase64URL } from '@algorandfoundation/liquid-client';
import type { Key, KeyStoreExtension, KeyStoreState } from '@algorandfoundation/keystore';
import type { Extension } from '@algorandfoundation/wallet-provider';
import type { Store } from '@tanstack/store';
import type { IdentitiesKeystoreExtension, IdentitiesKeystoreExtensionOptions } from './types.ts';
import { generateDidKey, generateDidDocument } from '@/extensions/identities/did-document';
import type { DIDDocument, Service } from '@/extensions/identities/types';
import { localStorage } from '@/stores/mmkv-local';

const DID_DOCUMENT_KEY_PREFIX = 'did:document:';

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
      console.error('Failed to parse DID Document from storage:', e);
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
  provider: KeyStoreExtension & IdentityStoreExtension & Partial<PasskeyStoreExtension>,
  options: IdentitiesKeystoreExtensionOptions,
) => {
  // Ensure dependencies are present
  if (!provider.identity) {
    throw new Error(
      'IdentitiesKeystore extension requires WithIdentityStore extension to be present on the provider.',
    );
  }
  if (!provider.key) {
    throw new Error(
      'IdentitiesKeystore extension requires WithKeyStore extension to be present on the provider.',
    );
  }

  const keyStore: Store<KeyStoreState> = options.keystore.store;
  const identityStore: Store<IdentityStoreState> = options.identities.store;
  const { autoPopulate = true } = options.identities.keystore ?? {};

  /**
   * Recreates the keystore state (derived keys) based on the provided DID Document.
   */
  const restoreFromDidDocument = async (doc: DIDDocument) => {
    console.log(
      `Starting restoration from DID document with ${doc.verificationMethod.length} methods...`,
    );
    const getLatestKeys = () => (keyStore.state.keys as unknown as Key[]) ?? [];
    const rootKey = getLatestKeys().find((k) => k.type === 'hd-root-key');

    if (!rootKey) {
      throw new Error('No root key found in keystore. Recovery phrase must be imported first.');
    }

    // 1. Verify that the root key matches the backup document by re-deriving an account key
    const verificationVm = doc.verificationMethod.find(
      (vm) =>
        vm.metadata &&
        vm.metadata.context === 0 &&
        (vm.metadata.type === 'hd-derived-ed25519' || !vm.metadata.type),
    );

    console.log(`Verification VM found: ${verificationVm ? verificationVm.id : 'none'}`);

    if (verificationVm) {
      console.log('Verifying backup against current root key using account key...');
      try {
        const keyId = await provider.key.store.generate({
          type: verificationVm.metadata?.type || 'hd-derived-ed25519',
          algorithm: 'EdDSA',
          extractable: true,
          keyUsages: ['sign', 'verify'],
          params: {
            ...verificationVm.metadata,
            parentKeyId: rootKey.id,
          },
        });

        const decoded = base58.decode(verificationVm.publicKeyMultibase.slice(1));
        const expectedPublicKey = decoded.slice(2); // Remove multicodec prefix [0xed, 0x01]

        const generatedKey = (keyStore.state.keys as unknown as Key[]).find((k) => k.id === keyId);
        if (generatedKey?.publicKey) {
          const actualPublicKey = generatedKey.publicKey;
          const matches =
            actualPublicKey.length === expectedPublicKey.length &&
            actualPublicKey.every((v, i) => v === expectedPublicKey[i]);

          if (!matches) {
            console.error("Verification failed: Public keys don't match.");
            throw new Error(
              'The recovery phrase does not match the backup file. Verification failed.',
            );
          }
          console.log('Backup verification successful.');
        }
      } catch (e: any) {
        console.error('Backup verification error:', e);
        throw e;
      }
    } else {
      console.warn(
        'No account key found in backup document to verify root key. Proceeding anyway.',
      );
    }

    const processedDerivations = new Set<string>();

    const restoreKey = async (id: string, metadata: any) => {
      if (!metadata || (metadata.context === undefined && metadata.origin === undefined)) {
        console.log(`Skipping key without valid metadata: ${id}`);
        return;
      }

      const { context, account, index, derivation, origin, userHandle, counter, type } = metadata;

      const keyType = type || 'hd-derived-ed25519';
      const algorithm =
        keyType === 'xhd-derived-p256' || keyType === 'hd-derived-p256' ? 'P256' : 'EdDSA';

      // Extract the ID from the VM fragment if it exists, otherwise use the ID as is
      const keyId = id.includes('#') ? id.split('#').pop() : id;

      if (!keyId) {
        console.warn(`Skipping key without ID: ${id}`);
        return;
      }

      // Create a unique key for this derivation to avoid processing duplicates in the backup
      const derivationKey = JSON.stringify({
        keyType,
        context,
        account,
        index,
        derivation,
        origin,
        userHandle,
        counter,
      });
      if (processedDerivations.has(derivationKey)) return;
      processedDerivations.add(derivationKey);

      // Check if this key already exists by checking derivation params in metadata
      const currentKeys = getLatestKeys();
      const exists = currentKeys.some(
        (k) =>
          k.id === keyId ||
          (k.type === keyType &&
            k.metadata?.context === context &&
            k.metadata?.account === account &&
            k.metadata?.index === index &&
            k.metadata?.derivation === derivation &&
            k.metadata?.origin === origin &&
            k.metadata?.userHandle === userHandle &&
            k.metadata?.counter === counter),
      );

      // Check if userHandle is an Algorand address and convert to Base64URL bytes if so
      let processedUserHandle = userHandle;
      if (typeof userHandle === 'string' && userHandle.length === 58) {
        try {
          // If it's a valid address, convert to bytes and then to Base64URL
          const bytes = decodeAddress(userHandle).publicKey;
          processedUserHandle = toBase64URL(bytes);
          console.log(`Converted userHandle address to Base64URL: ${processedUserHandle}`);
        } catch (e) {
          // Not an address, keep as is
        }
      }

      if (!exists) {
        console.log(
          `Restoring derived key: id=${keyId}, type=${keyType}, context=${context}, account=${account}, index=${index}, origin=${origin}...`,
        );
        try {
          // Use generate with the explicit ID
          await provider.key.store.generate({
            type: keyType,
            algorithm,
            extractable: true,
            keyUsages: ['sign', 'verify'],
            params: {
              ...metadata,
              userHandle: processedUserHandle,
              id: keyId,
              parentKeyId: rootKey.id,
            },
          });
        } catch (e) {
          console.error(`Failed to restore key ${derivationKey}:`, e);
          // Continue with other keys even if one fails
        }
      } else {
        console.log(
          `Key already exists, skipping: id=${keyId}, type=${keyType}, context=${context}, account=${account}, index=${index}`,
        );
      }
    };

    // 2. Sort and restore from verification methods (accounts and primary identities)
    const sortedMethods = [...doc.verificationMethod].sort((a, b) => {
      const contextA = a.metadata?.context;
      const contextB = b.metadata?.context;
      if (contextA === 1 && contextB !== 1) return 1;
      if (contextA !== 1 && contextB === 1) return -1;
      return 0;
    });

    for (const vm of sortedMethods) {
      console.log(`Processing VM: ${vm.id}, hasMetadata=${!!vm.metadata}`);
      await restoreKey(vm.id, vm.metadata);
    }

    // 3. Restore from passkey service
    const passkeyService = doc.service?.find((s) => s.type === 'PasskeyService');
    if (passkeyService && passkeyService.passkeys) {
      console.log(`Restoring ${passkeyService.passkeys.length} passkeys from PasskeyService...`);
      for (const pk of passkeyService.passkeys) {
        if (pk.id) {
          console.log(`Processing Passkey from service: ${pk.id}`);
          // Use the original keyId if available, otherwise convert from URL-safe
          const originalKeyId = pk.keyId || fromUrlSafe(pk.id);
          // Synthesize metadata from simplified fields for restoration
          await restoreKey(originalKeyId, {
            ...pk,
            counter: pk.count,
            type: 'hd-derived-p256', // Assume P256 for passkeys in PasskeyService
          });
        }
      }
    }

    console.log('Backup restoration complete.');
  };

  // Augment the identity store with restore capabilities
  (provider.identity.store as any).restoreFromDidDocument = restoreFromDidDocument;

  const keys: Key[] = [];

  /**
   * Creates an identity object for a given key ID and address.
   */
  const createKeyIdentity = (
    keyId: string,
    address: string,
    did: string,
    publicKey: Uint8Array,
  ): Identity => {
    const currentKey = keys.find((rk) => rk.id === keyId);
    // Find additional keys (e.g. context 0 which is account key)
    const additionalKeys: {
      id: string;
      publicKey: Uint8Array;
      type: string;
      algorithm?: string;
      metadata?: Record<string, any>;
    }[] = keys
      .filter(
        (k) =>
          k.type === 'hd-derived-ed25519' &&
          k.publicKey &&
          k.metadata?.parentKeyId === currentKey?.metadata?.parentKeyId &&
          k.id !== keyId,
      )
      .map((k) => ({
        id: `${did}#${k.id}`,
        publicKey: k.publicKey!,
        type: 'Ed25519VerificationKey2020',
        metadata: k.metadata,
      }));

    // Add passkeys if available
    const additionalServices: Service[] = [];
    if (provider.passkeys) {
      const passkeyDetails: {
        id: string;
        keyId?: string;
        origin: string;
        userHandle: string;
        count: number;
      }[] = [];

      provider.passkeys.forEach((p) => {
        passkeyDetails.push({
          id: p.id,
          keyId: p.metadata?.keyId || '',
          origin: p.metadata?.origin || '',
          userHandle: p.metadata?.userHandle || '',
          count: p.metadata?.count !== undefined ? p.metadata.count : p.metadata?.counter || 0,
        });
      });

      if (passkeyDetails.length > 0) {
        additionalServices.push({
          id: `${did}#passkeys`,
          type: 'PasskeyService',
          passkeys: passkeyDetails,
        });
      }
    }

    // Generate the DID Document
    const didDocument = generateDidDocument(
      did,
      publicKey,
      additionalKeys,
      additionalServices,
      currentKey?.metadata,
      keyId,
    );

    // Save to MMKV storage
    saveDidDocument(did, didDocument);

    return {
      address,
      did,
      didDocument,
      type: 'did:key',
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
    let isProcessing = false;
    let nextKeys: Key[] | null = null;

    let lastPasskeyIds = '';
    if (provider.passkeys) {
      lastPasskeyIds = JSON.stringify(provider.passkeys.map((p) => p.id).sort());
    }

    const processUpdates = async (newKeys: Key[]) => {
      console.log(
        `[IdentitiesKeystore] processUpdates called with ${newKeys.length} keys. Current status: ${keyStore.state.status}`,
      );
      if (isProcessing) {
        console.log('[IdentitiesKeystore] already processing, queueing next update');
        nextKeys = newKeys;
        return;
      }
      isProcessing = true;
      try {
        nextKeys = null;

        // Find added keys
        const addedKeys = newKeys.filter(
          (newKey) => !keys.some((existingKey) => existingKey.id === newKey.id),
        );

        // Find removed keys
        const removedKeys = keys.filter(
          (existingKey) => !newKeys.some((newKey) => newKey.id === existingKey.id),
        );

        // Find updated keys (including metadata or passkey related changes)
        const updatedKeys = newKeys.filter((nk) => {
          const existing = keys.find((k) => k.id === nk.id);
          if (!existing) return false;

          // Check if metadata changed
          if (JSON.stringify(existing.metadata) !== JSON.stringify(nk.metadata)) return true;

          // For primary identities, check if related keys (passkeys) changed
          if (nk.type === 'hd-derived-ed25519' && nk.metadata?.context === 1) {
            let currentPasskeyIds = '';
            if (provider.passkeys) {
              currentPasskeyIds = JSON.stringify(provider.passkeys.map((p) => p.id).sort());
            }

            if (currentPasskeyIds !== lastPasskeyIds) {
              return true;
            }
          }

          return false;
        });

        console.log(
          `[IdentitiesKeystore] processUpdates: ${newKeys.length} total, ${addedKeys.length} added, ${removedKeys.length} removed, ${updatedKeys.length} updated`,
        );

        if (addedKeys.length === 0 && removedKeys.length === 0 && updatedKeys.length === 0) {
          console.log('[IdentitiesKeystore] No changes to process');
          return;
        }

        // Update lastPasskeyIds after we decided there are updates to process
        if (provider.passkeys) {
          lastPasskeyIds = JSON.stringify(provider.passkeys.map((p) => p.id).sort());
        }

        // Update the local cache of keys BEFORE processing to ensure consistency
        keys.length = 0;
        newKeys.forEach((k) => keys.push(k));

        // Remove identities for removed keys
        for (const k of removedKeys) {
          if (k.type === 'hd-derived-ed25519' && k.publicKey) {
            const address = generateDidKey(k.publicKey);
            const identity = identityStore.state.identities.find((i) => i.address === address);
            if (identity && identity.metadata?.keyId === k.id) {
              console.log(`Removing identity for key ${k.id}-${k.type}...`);
              // Remove DID Document from storage
              if (identity.did) {
                removeDidDocument(identity.did);
              }
              await provider.identity.store.removeIdentity(address);
            }
          }
        }

        // Process only the newly added keys
        for (const k of addedKeys) {
          if (k.type === 'hd-derived-ed25519' && k.publicKey && k.metadata?.context === 1) {
            console.log(`Checking identity for key ${k.id}-${k.type}...`);
            const did = generateDidKey(k.publicKey);
            const address = did;

            // Skip if the identity already exists
            if (!identityStore.state.identities.some((i) => i.address === address)) {
              console.log(`Adding identity for key ${k.id}-${k.type}...`);
              await provider.identity.store.addIdentity(
                createKeyIdentity(k.id, address, did, k.publicKey),
              );
            }
          }
        }

        // Process updated keys (to refresh DID documents when passkeys change)
        for (const k of updatedKeys) {
          if (k.type === 'hd-derived-ed25519' && k.publicKey && k.metadata?.context === 1) {
            console.log(`Updating identity for key ${k.id}-${k.type}...`);
            const did = generateDidKey(k.publicKey);
            const address = did;

            const identity = identityStore.state.identities.find((i) => i.address === address);
            if (identity) {
              const newIdentity = createKeyIdentity(k.id, address, did, k.publicKey);
              await provider.identity.store.updateDidDocument(address, newIdentity.didDocument!);
            }
          }
        }
      } finally {
        isProcessing = false;
        if (nextKeys) {
          const k = nextKeys;
          nextKeys = null;
          await processUpdates(k);
        }
      }
    };

    processUpdates(keyStore.state.keys as unknown as Key[]);

    keyStore.subscribe((state) => {
      console.log(
        `[IdentitiesKeystore] Keystore subscriber fired. Status: ${state.status}, Keys: ${state.keys.length}`,
      );
      if (state.status !== 'ready' && state.status !== 'idle') {
        console.log(`[IdentitiesKeystore] Ignoring status: ${state.status}`);
        return;
      }
      processUpdates(state.keys as unknown as Key[]);
    });
  }

  return provider as unknown as IdentitiesKeystoreExtension;
};
