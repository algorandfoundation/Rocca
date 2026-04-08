import { Store } from '@tanstack/react-store';
import type { PasskeyStoreState } from '@/extensions/passkeys/types';
import { createMMKV } from 'react-native-mmkv';

const passKeysLocalStorage = createMMKV({
  id: 'passkeys',
});

// Load initial state from storage
const loadInitialPasskeys = (): PasskeyStoreState => {
  try {
    const stored = passKeysLocalStorage.getString('passkeys');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { passkeys: parsed };
    }
  } catch (error) {
    console.error('Failed to load passkeys from storage:', error);
  }
  return { passkeys: [] };
};

export const passkeysStore = new Store<PasskeyStoreState>(loadInitialPasskeys());

// Subscribe to store changes and save to storage
passkeysStore.subscribe(() => {
  const state = passkeysStore.state;
  try {
    passKeysLocalStorage.set('passkeys', JSON.stringify(state.passkeys));
  } catch (error) {
    console.error('Failed to save passkeys to storage:', error);
  }
});
