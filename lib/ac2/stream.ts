/**
 * STX-prefixed control-frame parser for the `ac2-stream` side channel.
 * Decodes the finalizer-driven live-preview protocol (preview / finalize /
 * discard / conversations / tool / history) the agent sends.
 */

/** STX byte that prefixes every control frame on the stream channel. */
export const STX = 0x02;

export type AgentPresence = 'thinking' | 'tool' | 'typing' | null;

export type StreamControlFrame =
  | {
      t: 'preview';
      thid?: string;
      phase?: 'thinking' | 'tool' | 'typing';
      detail?: string;
      text?: string;
    }
  | { t: 'finalize'; thid?: string; text?: string }
  | { t: 'discard'; thid?: string }
  | { t: 'conversations'; threads?: Array<{ thid: string; title?: string; updatedAt?: number }> }
  | { t: 'tool'; thid?: string; id?: string; name?: string; command?: string; output?: string }
  | { t: 'history'; thid?: string; messages?: any[] }
  | { t: string; [k: string]: unknown };

/**
 * Parse a raw DataChannel string as a control frame. Returns `null` if `raw`
 * is not a control frame (no STX prefix) and `undefined` if it parsed but
 * the payload was malformed JSON (still a control frame, swallowed).
 */
export function parseStreamControlFrame(raw: string): StreamControlFrame | null | undefined {
  if (typeof raw !== 'string' || raw.charCodeAt(0) !== STX) return null;
  try {
    return JSON.parse(raw.slice(1)) as StreamControlFrame;
  } catch {
    return undefined;
  }
}
