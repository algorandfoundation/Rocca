/**
 * Approve / reject hook for AC2 `SigningRequest` and `KeyRequest` envelopes.
 * Wraps `lib/ac2/responders.ts` with the wallet's keystore (signing material)
 * and `stores/agentIdentities.ts` (persisting granted agent identities).
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import {
  buildApprovedKey,
  buildApprovedSigning,
  buildRejectedKey,
  buildRejectedSigning,
} from '@/lib/ac2/responders';
import type {
  AC2KeyRequest as KeyRequestMessage,
  AC2SigningRequest as SigningRequestMessage,
} from '@algorandfoundation/ac2-sdk/schema';
import { Buffer } from 'buffer';
import { recordAgentIdentity } from '@/stores/agentIdentities';
import { keyStore } from '@/stores/keystore';
import { useProvider } from '@/hooks/useProvider';
import { decodeAddress } from '@/utils/algorand';

export interface Ac2RespondersOptions {
  /** Active wallet address (`did:key:<address>`). */
  address: string | null;
  /** Send an AC2 envelope over the active channel. */
  sendAc2: (envelope: any) => void;
  /** Connection scoping for the agent-identity record. */
  origin: string;
  requestId: string;
}

export interface Ac2Responders {
  approveSigning: (request: SigningRequestMessage) => Promise<void>;
  rejectSigning: (request: SigningRequestMessage) => void;
  approveKey: (request: KeyRequestMessage) => Promise<void>;
  rejectKey: (request: KeyRequestMessage) => void;
}

/** Build the four responders bound to the current connection state. */
export function useAc2Responders(opts: Ac2RespondersOptions): Ac2Responders {
  const { address, sendAc2, origin, requestId } = opts;
  const { key } = useProvider();

  const approveSigning = useCallback(
    async (request: SigningRequestMessage) => {
      try {
        if (!address) throw new Error('No active address');
        const publicKey = decodeAddress(address).publicKey;
        const matchedKey = keyStore.state.keys.find(
          (k) =>
            k.publicKey &&
            k.publicKey.length === publicKey.length &&
            k.publicKey.every((v, i) => v === publicKey[i]),
        );
        if (!matchedKey || !matchedKey.publicKey) {
          throw new Error('No matching key for active address');
        }
        const payload = new Uint8Array(Buffer.from(request.body.payload, 'base64'));
        const signature: Uint8Array = await key.store.sign(matchedKey.id, payload);
        sendAc2(
          buildApprovedSigning({
            request,
            signature,
            publicKey: new Uint8Array(matchedKey.publicKey),
            address,
          }),
        );
      } catch (err) {
        console.error('Failed to approve signing request', err);
        Alert.alert('Signing failed', err instanceof Error ? err.message : String(err));
      }
    },
    [address, key, sendAc2],
  );

  const rejectSigning = useCallback(
    (request: SigningRequestMessage) => {
      try {
        sendAc2(buildRejectedSigning(request));
      } catch (err) {
        console.error('Failed to reject signing request', err);
        Alert.alert('Reject failed', err instanceof Error ? err.message : String(err));
      }
    },
    [sendAc2],
  );

  const approveKey = useCallback(
    async (request: KeyRequestMessage) => {
      try {
        if (!address) throw new Error('No active address');
        // Mint a fresh BIP39 seed → Ed25519 identity key through the keystore.
        const seedId = await key.store.generate({
          type: 'seed',
          algorithm: 'raw',
          extractable: true,
          keyUsages: ['deriveKey', 'deriveBits'],
        });
        const identityKeyId = await key.store.generate({
          type: 'ed25519',
          algorithm: 'EdDSA',
          extractable: true,
          keyUsages: ['sign', 'verify'],
          params: { parentKeyId: seedId },
        });
        const identityKey = await key.store.export(identityKeyId);
        if (!identityKey.publicKey || !identityKey.privateKey) {
          throw new Error('Failed to generate agent identity keypair');
        }
        const publicKey = new Uint8Array(identityKey.publicKey);
        const privateKey = new Uint8Array(identityKey.privateKey);
        sendAc2(
          buildApprovedKey({
            request,
            controllerAddress: address,
            publicKey,
            privateKey,
          }),
        );
        const publicKeyB64 = Buffer.from(publicKey).toString('base64');
        // Record the granted agent identity SEPARATELY from the user's keys.
        recordAgentIdentity({
          keyId: identityKeyId,
          publicKey: publicKeyB64,
          agentDid: `did:key:${publicKeyB64}`,
          controllerDid: `did:key:${address}`,
          origin,
          requestId,
        });
      } catch (err) {
        console.error('Failed to approve key request', err);
        Alert.alert('Identity grant failed', err instanceof Error ? err.message : String(err));
      }
    },
    [address, key, sendAc2, origin, requestId],
  );

  const rejectKey = useCallback(
    (request: KeyRequestMessage) => {
      try {
        sendAc2(buildRejectedKey(request, address));
      } catch (err) {
        console.error('Failed to reject key request', err);
        Alert.alert('Reject failed', err instanceof Error ? err.message : String(err));
      }
    },
    [address, sendAc2],
  );

  return { approveSigning, rejectSigning, approveKey, rejectKey };
}
