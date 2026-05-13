import {
  addAccount as addAccountBase,
  clearAccounts as clearAccountsBase,
  getAccount as getAccountBase,
  removeAccount as removeAccountBase,
  type AccountStoreState,
} from '@algorandfoundation/accounts-store';
import type { Store } from '@tanstack/store';
import type { DfnsAccount } from './types';

/**
 * Adds a {@link DfnsAccount} to the store, replacing any existing entry
 * that shares the same `address`.
 */
export function addDfnsAccount({
  store,
  account,
}: {
  store: Store<AccountStoreState<DfnsAccount>>;
  account: DfnsAccount;
}): DfnsAccount {
  removeAccountBase<DfnsAccount>({ store, address: account.address });
  return addAccountBase<DfnsAccount>({ store, account });
}

/**
 * Removes a {@link DfnsAccount} from the store by address.
 */
export function removeDfnsAccount({
  store,
  address,
}: {
  store: Store<AccountStoreState<DfnsAccount>>;
  address: string;
}): void {
  removeAccountBase<DfnsAccount>({ store, address });
}

/**
 * Retrieves a {@link DfnsAccount} from the store by address.
 */
export function getDfnsAccount({
  store,
  address,
}: {
  store: Store<AccountStoreState<DfnsAccount>>;
  address: string;
}): DfnsAccount | undefined {
  return getAccountBase<DfnsAccount>({ store, address });
}

/**
 * Clears all DFNS accounts from the store.
 */
export function clearDfnsAccounts({
  store,
}: {
  store: Store<AccountStoreState<DfnsAccount>>;
}): void {
  clearAccountsBase<DfnsAccount>({ store });
}
