import { AlgorandAccount } from '@/extensions/algorand-accounts/types';
import { KeystoreAccount } from '@algorandfoundation/accounts-keystore-extension';
import type { Account, AccountStoreState } from '@algorandfoundation/accounts-store';
import { Store } from '@tanstack/react-store';

export const accountsStore = new Store<
  AccountStoreState<Account | KeystoreAccount | AlgorandAccount>
>({
  accounts: [],
});
