import { Store } from '@tanstack/react-store';
import { createMMKV } from 'react-native-mmkv';

export interface Message {
  id: string;
  text: string;
  sender: 'me' | 'peer';
  timestamp: number;
  address: string;
  origin: string;
  requestId: string;
  /**
   * Message kind. `'text'` (default) is a normal chat bubble. `'tool'` is a
   * durable record of one tool/exec step the agent ran during a turn, rendered
   * as a distinct "tool card" (with the command + output) rather than a chat
   * bubble. Legacy messages persisted before tool cards carry no `kind` and are
   * treated as `'text'`.
   */
  kind?: 'text' | 'tool';
  /** Tool name for a `kind: 'tool'` card (e.g. `exec`, `write`). */
  tool?: string;
  /** The command/invocation the agent ran, when the runtime surfaces it. */
  command?: string;
  /** The (possibly truncated) tool output/result text. */
  output?: string;
  /**
   * Conversation/thread id this message belongs to. A single connection can
   * multiplex several conversations (see `ac2/ConversationOpen`); messages are
   * scoped to the active thread when they are stored. Legacy messages persisted
   * before multi-conversation support carry no `thid` and are treated as the
   * `'default'` thread by readers.
   */
  thid?: string;
}

export interface MessagesState {
  messages: Message[];
}

const messagesLocalStorage = createMMKV({
  id: 'messages',
});

// Load initial state from storage
const loadInitialMessages = (): MessagesState => {
  try {
    const stored = messagesLocalStorage.getString('messages');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { messages: parsed };
    }
  } catch (error) {
    console.error('Failed to load messages from storage:', error);
  }
  return { messages: [] };
};

export const messagesStore = new Store<MessagesState>(loadInitialMessages());

// Subscribe to store changes and save to storage
messagesStore.subscribe(() => {
  const state = messagesStore.state;
  try {
    messagesLocalStorage.set('messages', JSON.stringify(state.messages));
  } catch (error) {
    console.error('Failed to save messages to storage:', error);
  }
});

export function addMessage(message: Omit<Message, 'id' | 'timestamp'>) {
  messagesStore.setState((state) => ({
    ...state,
    messages: [
      ...state.messages,
      {
        ...message,
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
      },
    ],
  }));
}

/**
 * Upsert a durable tool-activity card on a conversation thread, keyed by the
 * agent-supplied `toolId`. Tool/exec steps stream their output incrementally:
 * the agent re-emits the same `toolId` repeatedly as the command produces
 * output and on completion, so we *update* an existing card in place (merging
 * the newly-supplied fields) rather than appending a new bubble each time —
 * the user watches the command's output grow live in a single card. The first
 * frame for a `toolId` appends a new card; later frames refresh it.
 */
export function addToolActivity(activity: {
  toolId: string;
  address: string;
  origin: string;
  requestId: string;
  thid: string;
  tool?: string;
  command?: string;
  output?: string;
}) {
  messagesStore.setState((state) => {
    const id = `tool-${activity.requestId}-${activity.toolId}`;
    const existingIndex = state.messages.findIndex((m) => m.id === id);
    if (existingIndex !== -1) {
      // Refresh the existing card in place: only overwrite fields the new
      // frame actually carries, so a streamed output-only update doesn't drop
      // the command captured by the opening frame.
      const messages = [...state.messages];
      const prev = messages[existingIndex];
      messages[existingIndex] = {
        ...prev,
        ...(activity.tool ? { tool: activity.tool } : {}),
        ...(activity.command ? { command: activity.command } : {}),
        ...(activity.output !== undefined ? { output: activity.output } : {}),
      };
      return { ...state, messages };
    }
    const card: Message = {
      id,
      text: '',
      sender: 'peer',
      timestamp: Date.now(),
      address: activity.address,
      origin: activity.origin,
      requestId: activity.requestId,
      thid: activity.thid,
      kind: 'tool',
      ...(activity.tool ? { tool: activity.tool } : {}),
      ...(activity.command ? { command: activity.command } : {}),
      ...(activity.output !== undefined ? { output: activity.output } : {}),
    };
    return { ...state, messages: [...state.messages, card] };
  });
}

/**
 * Replace the locally-stored history for a single conversation thread with the
 * agent-supplied history, restoring a conversation the wallet may not have
 * stored locally (new device, cleared store). Idempotent: existing messages
 * for `(address, origin, requestId, thid)` are removed first, so replaying the
 * same history never duplicates messages.
 */
export function setThreadHistory(
  address: string,
  origin: string,
  requestId: string,
  thid: string,
  history: {
    role: 'user' | 'assistant' | 'tool';
    text: string;
    at?: number;
    // Tool-card fields, present only for `role: 'tool'` entries.
    toolId?: string;
    tool?: string;
    command?: string;
    output?: string;
  }[],
) {
  messagesStore.setState((state) => {
    // When the replayed history itself carries tool cards (a fresh device /
    // cleared store recovering everything from the agent), we replace the whole
    // thread — chat *and* tool cards. Otherwise the agent only sent chat text,
    // so we must keep any tool cards already collected live on this device,
    // since wiping them would drop exec activity the replay can't restore.
    const historyHasTools = history.some((h) => h.role === 'tool');
    const retained = state.messages.filter(
      (m) =>
        (!historyHasTools && m.kind === 'tool') ||
        m.address !== address ||
        m.origin !== origin ||
        m.requestId !== requestId ||
        (m.thid ?? 'default') !== thid,
    );
    const restored: Message[] = history.map((h, index) => {
      if (h.role === 'tool') {
        // Re-derive the same stable id `addToolActivity` uses so a restored
        // card and a later live frame for the same step coalesce instead of
        // duplicating.
        const toolId = h.toolId ?? `restored-${index}`;
        return {
          id: `tool-${requestId}-${toolId}`,
          text: '',
          sender: 'peer',
          timestamp: typeof h.at === 'number' ? h.at : Date.now() + index,
          address,
          origin,
          requestId,
          thid,
          kind: 'tool',
          ...(h.tool ? { tool: h.tool } : {}),
          ...(h.command ? { command: h.command } : {}),
          ...(h.output !== undefined ? { output: h.output } : {}),
        };
      }
      return {
        id: `restored-${requestId}-${thid}-${index}`,
        text: h.text,
        sender: h.role === 'user' ? 'me' : 'peer',
        timestamp: typeof h.at === 'number' ? h.at : Date.now() + index,
        address,
        origin,
        requestId,
        thid,
      };
    });
    return { ...state, messages: [...retained, ...restored] };
  });
}

export function clearMessages(address: string, origin: string, requestId: string) {
  messagesStore.setState((state) => ({
    ...state,
    messages: state.messages.filter(
      (m) => m.address !== address || m.origin !== origin || m.requestId !== requestId,
    ),
  }));
}

/**
 * Removes every chat message belonging to a connection, regardless of the
 * local address. Used when forgetting a persisted connection.
 */
export function clearMessagesByConnection(origin: string, requestId: string) {
  messagesStore.setState((state) => ({
    ...state,
    messages: state.messages.filter((m) => m.origin !== origin || m.requestId !== requestId),
  }));
}
