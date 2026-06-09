/**
 * AC2 responder envelope builders. Pure wrappers around the SDK's
 * `buildKeyResponse` / `buildSigningResponse` / `buildSigningRejected`
 * that the wallet UI uses to answer `SigningRequest` / `KeyRequest`.
 */

import { Buffer } from 'buffer';
import {
  buildKeyResponse,
  buildSigningRejected,
  buildSigningResponse,
} from '@algorandfoundation/ac2-sdk/protocol';
import type {
  AC2KeyRequest as KeyRequestMessage,
  AC2KeyResponse as KeyResponseMessage,
  AC2SigningRejected as SigningRejectedMessage,
  AC2SigningRequest as SigningRequestMessage,
  AC2SigningResponse as SigningResponseMessage,
} from '@algorandfoundation/ac2-sdk/schema';

/** Base64-encode a `Uint8Array`. */
export function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64');
}

export interface ApproveSigningArgs {
  request: SigningRequestMessage;
  signature: Uint8Array;
  publicKey: Uint8Array;
  address: string;
}

/** Build an approved `ac2/SigningResponse` envelope for `request`. */
export function buildApprovedSigning(args: ApproveSigningArgs): SigningResponseMessage {
  return buildSigningResponse({
    request: args.request,
    body: {
      signature: toBase64(args.signature),
      public_key: toBase64(args.publicKey),
      address: args.address,
      key_type: args.request.body.key_type ?? 'account',
    },
  });
}

/** Build an `ac2/SigningRejected` envelope for `request`. */
export function buildRejectedSigning(
  request: SigningRequestMessage,
  reason = 'User declined the signing request.',
): SigningRejectedMessage {
  return buildSigningRejected({ request, reason });
}

export interface ApproveKeyArgs {
  request: KeyRequestMessage;
  /** Wallet address that owns the channel — bound to `KeyResponse.from`. */
  controllerAddress: string;
  /** Freshly-issued Ed25519 public key (32 bytes). */
  publicKey: Uint8Array;
  /** Private material handed to the agent. */
  privateKey: Uint8Array;
}

/** Build an approved `ac2/KeyResponse` envelope granting the agent an identity. */
export function buildApprovedKey(args: ApproveKeyArgs): KeyResponseMessage {
  const { request, controllerAddress, publicKey, privateKey } = args;
  return buildKeyResponse({
    request,
    // Bind `from` to the connected account — the bootstrap `KeyRequest.to`
    // is a wildcard placeholder, so we must override it explicitly.
    from: `did:key:${controllerAddress}`,
    body: {
      status: 'approved',
      key_type: request.body.key_type ?? 'ed25519',
      material: toBase64(privateKey),
      public_key: toBase64(publicKey),
      ...(request.body.derivation_path !== undefined
        ? { derivation_path: request.body.derivation_path }
        : {}),
    },
  });
}

/** Build a rejected `ac2/KeyResponse` envelope. */
export function buildRejectedKey(
  request: KeyRequestMessage,
  controllerAddress: string | null,
  reason = 'User declined to grant an identity key.',
): KeyResponseMessage {
  return buildKeyResponse({
    request,
    ...(controllerAddress ? { from: `did:key:${controllerAddress}` } : {}),
    body: {
      status: 'rejected',
      key_type: request.body.key_type ?? 'ed25519',
      // Schema requires these even on rejection; agent branches on `status`.
      material: 'rejected',
      public_key: 'rejected',
      reason,
    },
  });
}
