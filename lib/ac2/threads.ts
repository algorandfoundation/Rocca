/**
 * `@algorandfoundation/ac2-threads` — multi-conversation control plane for AC2.
 *
 * A single AC2 connection (one paired wallet / `requestId`) can host *several*
 * independent conversations multiplexed over the same DataChannel. This
 * package defines the two control-plane messages the controller sends to
 * manage those conversations, layered on top of the AC2 SDK's DIDComm v2
 * envelope (`AC2BaseMessage`):
 *
 *   - `ac2/ConversationOpen`  — open (or switch focus to) a conversation
 *     thread. The agent treats it as the *active* thread, so subsequent
 *     untagged plain-text chat frames route to it.
 *   - `ac2/ConversationClose` — close a conversation thread. If it was the
 *     active thread, the agent reverts to the `default` thread.
 *
 * The conversation is identified by the envelope `thid` (mirrored in the
 * body). These types intentionally live *outside* the core AC2 SDK so the
 * normative five-message protocol surface stays minimal; the SDK validator is
 * forward-compatible and treats these as (warning-only) extension types.
 */

import type { AC2BaseMessage } from '@algorandfoundation/ac2-sdk/schema';
import { generateMessageId } from '@algorandfoundation/ac2-sdk/protocol';

// ─── Message Type Constants ───────────────────────────────────────────────────

export const AC2ThreadMessageTypes = {
  CONVERSATION_OPEN: 'ac2/ConversationOpen',
  CONVERSATION_CLOSE: 'ac2/ConversationClose',
} as const;

export type AC2ThreadMessageType =
  (typeof AC2ThreadMessageTypes)[keyof typeof AC2ThreadMessageTypes];

// ─── Body Types ───────────────────────────────────────────────────────────────

/**
 * Body for `ac2/ConversationOpen` (controller → agent). Opens / switches focus
 * to the conversation identified by `thid`.
 */
export interface ConversationOpenBody {
  /** Stable conversation/thread id this connection should make active. */
  thid: string;
  /** Optional human-facing title for the conversation. */
  title?: string;
}

/**
 * Body for `ac2/ConversationClose` (controller → agent). Closes the
 * conversation identified by `thid`.
 */
export interface ConversationCloseBody {
  /** Conversation/thread id to close. */
  thid: string;
}

// ─── Typed Messages ────────────────────────────────────────────────────────

export interface AC2ConversationOpen extends AC2BaseMessage {
  type: 'ac2/ConversationOpen';
  body: ConversationOpenBody;
}

export interface AC2ConversationClose extends AC2BaseMessage {
  type: 'ac2/ConversationClose';
  body: ConversationCloseBody;
}

export type AC2ThreadMessage = AC2ConversationOpen | AC2ConversationClose;

// ─── Builder Arguments ──────────────────────────────────────────────────────

/**
 * Arguments for {@link buildConversationOpen}.
 *
 * Conversation control messages are *originated* by the controller (not
 * threaded onto a prior request), so the caller supplies `from`, `to`, and the
 * conversation `thid` directly. The envelope's `thid` is set to the
 * conversation id so the agent can correlate the control message with the
 * thread it governs.
 */
export interface BuildConversationOpenArgs {
  /** DID of the controller opening the conversation. */
  from: string;
  /** DID(s) of the agent(s) that should receive the control message. */
  to: string | readonly string[];
  /** Stable conversation/thread id to open / make active. */
  thid: string;
  /** Optional human-facing title for the conversation. */
  title?: string;
  /** Override the generated message id. */
  id?: string;
  /** Override the default `created_time` (Unix seconds). */
  created_time?: number;
  /** Optional `expires_time` (Unix seconds). */
  expires_time?: number;
}

/** Arguments for {@link buildConversationClose}. Envelope defaults match {@link BuildConversationOpenArgs}. */
export interface BuildConversationCloseArgs {
  /** DID of the controller closing the conversation. */
  from: string;
  /** DID(s) of the agent(s) that should receive the control message. */
  to: string | readonly string[];
  /** Conversation/thread id to close. */
  thid: string;
  /** Override the generated message id. */
  id?: string;
  /** Override the default `created_time` (Unix seconds). */
  created_time?: number;
  /** Optional `expires_time` (Unix seconds). */
  expires_time?: number;
}

// ─── Builders ─────────────────────────────────────────────────────────────────

function toRecipients(to: string | readonly string[]): string[] {
  return Array.isArray(to) ? [...to] : [to as string];
}

/**
 * Build an `ac2/ConversationOpen` control message that opens (or switches
 * focus to) the conversation `args.thid`. The agent treats this thread as the
 * active one for subsequent untagged chat frames over the same connection.
 */
export function buildConversationOpen(args: BuildConversationOpenArgs): AC2ConversationOpen {
  const body: ConversationOpenBody = { thid: args.thid };
  if (args.title !== undefined) body.title = args.title;
  const message: AC2ConversationOpen = {
    id: args.id ?? generateMessageId(),
    type: 'ac2/ConversationOpen',
    from: args.from,
    to: toRecipients(args.to),
    created_time: args.created_time ?? Math.floor(Date.now() / 1000),
    thid: args.thid,
    body,
  };
  if (args.expires_time !== undefined) message.expires_time = args.expires_time;
  return message;
}

/**
 * Build an `ac2/ConversationClose` control message that closes the
 * conversation `args.thid`. If it was the active thread, the agent reverts to
 * the `default` thread.
 */
export function buildConversationClose(args: BuildConversationCloseArgs): AC2ConversationClose {
  const message: AC2ConversationClose = {
    id: args.id ?? generateMessageId(),
    type: 'ac2/ConversationClose',
    from: args.from,
    to: toRecipients(args.to),
    created_time: args.created_time ?? Math.floor(Date.now() / 1000),
    thid: args.thid,
    body: { thid: args.thid },
  };
  if (args.expires_time !== undefined) message.expires_time = args.expires_time;
  return message;
}

// ─── Type Guards ────────────────────────────────────────────────────────────

/** Narrow an arbitrary AC2 envelope to an `ac2/ConversationOpen`. */
export function isConversationOpen(msg: { type?: unknown }): msg is AC2ConversationOpen {
  return msg?.type === AC2ThreadMessageTypes.CONVERSATION_OPEN;
}

/** Narrow an arbitrary AC2 envelope to an `ac2/ConversationClose`. */
export function isConversationClose(msg: { type?: unknown }): msg is AC2ConversationClose {
  return msg?.type === AC2ThreadMessageTypes.CONVERSATION_CLOSE;
}

/** True for either conversation control message type. */
export function isThreadControlMessage(msg: { type?: unknown }): msg is AC2ThreadMessage {
  return isConversationOpen(msg) || isConversationClose(msg);
}

/**
 * Extract the conversation `thid` from a conversation control message,
 * preferring the body's `thid` and falling back to the envelope `thid`.
 * Returns `undefined` when neither is a non-empty string.
 */
export function conversationThid(msg: {
  thid?: unknown;
  body?: { thid?: unknown };
}): string | undefined {
  const bodyThid = msg?.body?.thid;
  if (typeof bodyThid === 'string' && bodyThid.length > 0) return bodyThid;
  const envThid = msg?.thid;
  if (typeof envThid === 'string' && envThid.length > 0) return envThid;
  return undefined;
}
