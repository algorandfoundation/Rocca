/**
 * Liquid Auth + WebRTC pairing for the AC2 controller. Negotiates the
 * `ac2-v1` / `ac2-stream` / `ac2-heartbeat` DataChannels that the AC2
 * SDK and the controller UI consume.
 */

import { SignalClient } from '@algorandfoundation/liquid-client';

/** Default ICE config for the Liquid Auth signaling pair. */
const DEFAULT_ICE_SERVERS = [
  {
    urls: ['stun:geo.turn.algonode.xyz:80', 'stun:global.turn.nodely.io:443'],
  },
  {
    urls: [
      'turn:geo.turn.algonode.xyz:80?transport=tcp',
      'turns:global.turn.nodely.io:443?transport=tcp',
    ],
    username: 'liquid-auth',
    credential: 'sqmcP4MiTKMT4TGEDSk9jgHY',
  },
];

/** DataChannel labels requested on the peer (AC2 spec mandated). */
const DEFAULT_DATA_CHANNELS = {
  'ac2-v1': { ordered: true },
  'ac2-stream': { ordered: true },
  'ac2-heartbeat': { ordered: true },
};

export interface Ac2TransportSetup {
  /** Active Liquid Auth `SignalClient` (already authenticated). */
  client: SignalClient;
  /** The control plane DataChannel (`ac2-v1`). */
  datachannel: RTCDataChannel;
}

export interface CreateAc2TransportOptions {
  requestId: string;
  signalClient: SignalClient;
  /** Called for each negotiated side-channel (`ac2-stream`, `ac2-heartbeat`). */
  onSideChannel: (channel: RTCDataChannel) => void;
}

/**
 * Open the AC2 control plane DataChannel against an already-authenticated
 * `SignalClient`. Side-channels (`ac2-stream`, `ac2-heartbeat`) are
 * surfaced via `onSideChannel`.
 */
export async function createAc2Transport(
  opts: CreateAc2TransportOptions,
): Promise<Ac2TransportSetup> {
  const { requestId, signalClient, onSideChannel } = opts;

  signalClient.on('data-channel', (channel: RTCDataChannel) => {
    if (channel.label === 'ac2-v1') return; // owned by datachannel below
    onSideChannel(channel);
  });

  const datachannel = await signalClient.peer(
    requestId,
    'answer',
    {
      iceServers: DEFAULT_ICE_SERVERS,
    },
    {
      dataChannels: DEFAULT_DATA_CHANNELS,
    },
  );

  return { client: signalClient, datachannel };
}
