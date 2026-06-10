import { Store } from '@tanstack/store';
import { LogStoreState } from '@algorandfoundation/log-store';

export const logsStore = new Store<LogStoreState>({
  logs: [],
});
