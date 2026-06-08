/**
 * Typed store for AC2 protocol messages (the signing trio and any other
 * `Ac2Message` the wallet observes on a DataChannel).
 *
 * Kept separate from the free-text chat store (`./messages.ts`) so the
 * protocol surface stays unambiguous: anything that flows through here is
 * a DIDComm v2 envelope validated by `@ac2/ac2-sdk`, never user-typed
 * text. The chat screen renders both stores in one timeline.
 */

import type { Ac2Message } from '@ac2/ac2-sdk';
import { Store } from '@tanstack/react-store';
import { createMMKV } from 'react-native-mmkv';

export type Ac2Direction = 'inbound' | 'outbound';

export interface Ac2MessageEntry {
  /** Local id for list rendering; not part of the wire envelope. */
  id: string;
  /** Local receive/send timestamp (ms). */
  receivedAt: number;
  /** Connection scoping — mirrors `messages.ts`. */
  origin: string;
  requestId: string;
  /** Local controller address (when known), used for filtering. */
  address: string;
  direction: Ac2Direction;
  /** The validated DIDComm v2 envelope. */
  envelope: Ac2Message;
}

export interface Ac2MessagesState {
  messages: Ac2MessageEntry[];
}

const ac2LocalStorage = createMMKV({ id: 'ac2-messages' });

const loadInitial = (): Ac2MessagesState => {
  try {
    const stored = ac2LocalStorage.getString('messages');
    if (stored) return { messages: JSON.parse(stored) };
  } catch (error) {
    console.error('Failed to load ac2 messages from storage:', error);
  }
  return { messages: [] };
};

export const ac2MessagesStore = new Store<Ac2MessagesState>(loadInitial());

ac2MessagesStore.subscribe(() => {
  try {
    ac2LocalStorage.set('messages', JSON.stringify(ac2MessagesStore.state.messages));
  } catch (error) {
    console.error('Failed to save ac2 messages to storage:', error);
  }
});

export function addAc2Message(entry: Omit<Ac2MessageEntry, 'id' | 'receivedAt'>) {
  ac2MessagesStore.setState((state) => ({
    ...state,
    messages: [
      ...state.messages,
      {
        ...entry,
        id: Math.random().toString(36).slice(2, 10),
        receivedAt: Date.now(),
      },
    ],
  }));
}

export function clearAc2Messages(address: string, origin: string, requestId: string) {
  ac2MessagesStore.setState((state) => ({
    ...state,
    messages: state.messages.filter(
      (m) => m.address !== address || m.origin !== origin || m.requestId !== requestId,
    ),
  }));
}
