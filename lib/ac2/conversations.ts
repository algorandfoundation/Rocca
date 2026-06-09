/**
 * Multi-conversation control plane for the AC2 controller. Builds and sends
 * `ac2/ConversationOpen` / `ac2/ConversationClose` envelopes through an
 * `Ac2Client` so the agent routes plain-text chat to the right thread.
 */

import { Ac2Client } from '@algorandfoundation/ac2-sdk';
import { buildConversationClose, buildConversationOpen } from './threads';

/** Default thread id when no explicit conversation has been opened. */
export const DEFAULT_THID = 'default';

export interface ConversationControllerOptions {
  /** Live AC2 client (may be null before the DataChannel is open). */
  getClient: () => Ac2Client | null;
  /** Live wallet address (DID source). */
  getAddress: () => string | null;
}

/** Generate a fresh, locally-unique conversation thread id. */
export function generateThid(): string {
  return `thread-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Send `ac2/ConversationOpen` for `thid` if the client is connected and the
 * address is known. Errors are swallowed (logged) so UI flow continues.
 */
export function sendConversationOpen(
  opts: ConversationControllerOptions,
  thid: string,
  title?: string,
): void {
  const client = opts.getClient();
  const address = opts.getAddress();
  if (!client || !address) return;
  try {
    client.send(
      buildConversationOpen({
        from: `did:key:${address}`,
        to: 'did:ac2:agent',
        thid,
        ...(title !== undefined ? { title } : {}),
      }),
    );
  } catch (err) {
    console.warn('[AC2] failed to send ConversationOpen:', err);
  }
}

/** Send `ac2/ConversationClose` for `thid`. Errors are swallowed. */
export function sendConversationClose(opts: ConversationControllerOptions, thid: string): void {
  const client = opts.getClient();
  const address = opts.getAddress();
  if (!client || !address) return;
  try {
    client.send(
      buildConversationClose({
        from: `did:key:${address}`,
        to: 'did:ac2:agent',
        thid,
      }),
    );
  } catch (err) {
    console.warn('[AC2] failed to send ConversationClose:', err);
  }
}
