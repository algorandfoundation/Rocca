import { Store } from '@tanstack/react-store';
import { KeyStoreState } from '@algorandfoundation/react-native-keystore';

export const keyStore = new Store<KeyStoreState>({
  keys: [],
  status: 'loading',
});
