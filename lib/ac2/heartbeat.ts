/**
 * Wiring for the dedicated `ac2-heartbeat` DataChannel. Inbound frames
 * count as peer liveness; the channel is out-of-band relative to the
 * AC2 control plane (`ac2-v1`) so keepalive never collides with framing.
 */

export interface HeartbeatChannelOptions {
  /** Called on every inbound heartbeat frame. */
  onPing: () => void;
}

/**
 * Attach handlers to a discovered `ac2-heartbeat` DataChannel. Returns the
 * channel for caller-side ref storage.
 */
export function attachHeartbeatChannel(
  channel: RTCDataChannel,
  opts: HeartbeatChannelOptions,
): RTCDataChannel {
  channel.onmessage = () => {
    opts.onPing();
  };
  channel.onopen = () => console.log('Heartbeat channel opened');
  channel.onclose = () => console.log('Heartbeat channel closed');
  return channel;
}
