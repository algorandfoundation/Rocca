/**
 * AC2 controller surface. Entry points for the wallet-side of the AC2
 * protocol (transport pairing + SDK client wiring).
 */

export { createAc2Transport } from './transport';
export type { Ac2TransportSetup, CreateAc2TransportOptions } from './transport';
export { createAc2Client } from './client';
export type { Ac2ClientSetup, CreateAc2ClientOptions } from './client';
export {
  DEFAULT_THID,
  generateThid,
  sendConversationOpen,
  sendConversationClose,
} from './conversations';
export type { ConversationControllerOptions } from './conversations';
export { attachHeartbeatChannel } from './heartbeat';
export type { HeartbeatChannelOptions } from './heartbeat';
export { parseStreamControlFrame, STX } from './stream';
export type { AgentPresence, StreamControlFrame } from './stream';

export type { AC2BaseMessage as Ac2Message } from '@algorandfoundation/ac2-sdk/schema';
