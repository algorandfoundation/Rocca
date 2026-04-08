import type { Account, AccountStoreState } from '@/extensions/accounts';
import { Store } from '@tanstack/react-store';
import { KeystoreAccount } from '@/extensions/accounts-keystore';

export const accountsStore = new Store<AccountStoreState<Account | KeystoreAccount>>({
  accounts: [],
});
