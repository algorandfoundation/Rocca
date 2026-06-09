/**
 * AC2 SDK client wiring. Wraps a `RTCDataChannel` with the SDK's
 * transport adapter, constructs an `Ac2Client`, and mirrors inbound
 * envelopes into the `ac2MessagesStore`.
 */

import { addAc2Message } from '@/stores/ac2Messages';
import { Ac2Client } from '@algorandfoundation/ac2-sdk';
import { rtcDataChannelTransport } from '@algorandfoundation/ac2-sdk/transport';
import type { AC2BaseMessage as Ac2Message } from '@algorandfoundation/ac2-sdk/schema';

export interface CreateAc2ClientOptions {
  datachannel: RTCDataChannel;
  origin: string;
  requestId: string;
  /** Live wallet address (may be null before signaling completes). */
  getAddress: () => string | null;
  /** Live active thread id used to scope inbound envelopes. */
  getActiveThid: () => string;
  onRawMessage: (raw: string) => void;
  onOpen: () => void;
  onClose: () => void;
  onError?: (err: Error) => void;
  /** Called on every inbound AC2 envelope after the store mirror runs. */
  onInboundEnvelope?: (envelope: Ac2Message) => void;
}

export interface Ac2ClientSetup {
  client: Ac2Client;
}

/**
 * Build the AC2 client bound to `datachannel` and mirror inbound envelopes
 * into `ac2MessagesStore`.
 */
export function createAc2Client(opts: CreateAc2ClientOptions): Ac2ClientSetup {
  const {
    datachannel,
    origin,
    requestId,
    getAddress,
    getActiveThid,
    onRawMessage,
    onOpen,
    onClose,
    onError,
    onInboundEnvelope,
  } = opts;

  // React Native's `RTCDataChannel` structurally satisfies the SDK's
  // `RtcDataChannelLike` but the DOM lib types differ; cast bridges that.
  const ac2Transport = rtcDataChannelTransport(
    datachannel as unknown as Parameters<typeof rtcDataChannelTransport>[0],
  );

  const client = new Ac2Client(ac2Transport);

  ac2Transport.onMessage((envelope: Ac2Message) => {
    addAc2Message({
      origin,
      requestId,
      address: getAddress() ?? '',
      direction: 'inbound',
      thid: getActiveThid(),
      envelope,
    });
    onInboundEnvelope?.(envelope);
  });

  ac2Transport.onRawMessage?.(onRawMessage);
  ac2Transport.onOpen(onOpen);
  ac2Transport.onClose(onClose);
  ac2Transport.onError((e: Error) => {
    if (onError) onError(e);
    else console.warn('[AC2] client error:', e.message);
  });

  return { client };
}
