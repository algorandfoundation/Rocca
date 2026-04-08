import type { Store } from '@tanstack/store';
import type { AccountStoreState } from './types.ts';

/**
 * Adds an account to the store.
 *
 * @param params - The add parameters.
 * @param params.store - The TanStack store instance for {@link AccountStoreState}.
 * @param params.account - The {@link Account} to add.
 * @returns The added {@link Account}.
 */
export function addAccount<T>({
  store,
  account,
}: {
  store: Store<AccountStoreState<T>>;
  account: T;
}): T {
  store.setState((state: AccountStoreState<T>) => {
    return {
      ...state,
      accounts: [account, ...state.accounts],
    };
  });
  return account;
}

/**
 * Removes an account from the store by its address.
 *
 * @param params - The removal parameters.
 * @param params.store - The TanStack store instance for {@link AccountStoreState}.
 * @param params.address - The address of the account to remove.
 */
export function removeAccount<T>({
  store,
  address,
}: {
  store: Store<AccountStoreState<T>>;
  address: string;
}): void {
  store.setState((state: AccountStoreState<T>) => {
    return {
      ...state,
      accounts: state.accounts.filter((account) => (account as any).address !== address),
    };
  });
}

/**
 * Retrieves an account from the store by its address.
 *
 * @param params - The retrieval parameters.
 * @param params.store - The TanStack store instance for {@link AccountStoreState}.
 * @param params.address - The address of the account to retrieve.
 * @returns The {@link Account} if found, otherwise undefined.
 */
export function getAccount<T>({
  store,
  address,
}: {
  store: Store<AccountStoreState<T>>;
  address: string;
}): T | undefined {
  return store.state.accounts.find((account) => (account as any).address === address);
}

/**
 * Clears all accounts from the store.
 *
 * @param params - The store parameters.
 * @param params.store - The TanStack store instance for {@link AccountStoreState}.
 */
export function clearAccounts<T>({ store }: { store: Store<AccountStoreState<T>> }): void {
  store.setState((state: AccountStoreState<T>) => {
    return {
      ...state,
      accounts: [],
    };
  });
}
