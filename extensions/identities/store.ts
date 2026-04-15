import type { Store } from '@tanstack/store';
import type { Identity, IdentityStoreState, DIDDocument } from './types.ts';

/**
 * Adds an identity to the store.
 *
 * @param params - The add parameters.
 * @param params.store - The TanStack store instance for {@link IdentityStoreState}.
 * @param params.identity - The {@link Identity} to add.
 * @returns The added {@link Identity}.
 */
export function addIdentity({
  store,
  identity,
}: {
  store: Store<IdentityStoreState>;
  identity: Identity;
}): Identity {
  store.setState((state) => {
    const filtered = state.identities.filter((i) => i.address !== identity.address);
    return {
      ...state,
      identities: [identity, ...filtered],
    };
  });
  return identity;
}

/**
 * Updates the DID Document of an existing identity in the store.
 *
 * @param params - The update parameters.
 * @param params.store - The TanStack store instance for {@link IdentityStoreState}.
 * @param params.address - The address of the identity to update.
 * @param params.didDocument - The new {@link DIDDocument} to set.
 * @returns The updated {@link Identity} if found, otherwise undefined.
 */
export function updateIdentityDidDocument({
  store,
  address,
  didDocument,
}: {
  store: Store<IdentityStoreState>;
  address: string;
  didDocument: DIDDocument;
}): Identity | undefined {
  let updatedIdentity: Identity | undefined;

  store.setState((state) => {
    const identities = state.identities.map((identity) => {
      if (identity.address === address) {
        updatedIdentity = { ...identity, didDocument };
        return updatedIdentity;
      }
      return identity;
    });

    return {
      ...state,
      identities,
    };
  });

  return updatedIdentity;
}

/**
 * Removes an identity from the store by its address.
 *
 * @param params - The removal parameters.
 * @param params.store - The TanStack store instance for {@link IdentityStoreState}.
 * @param params.address - The address of the identity to remove.
 */
export function removeIdentity({
  store,
  address,
}: {
  store: Store<IdentityStoreState>;
  address: string;
}): void {
  store.setState((state) => {
    return {
      ...state,
      identities: state.identities.filter((identity) => identity.address !== address),
    };
  });
}

/**
 * Retrieves an identity from the store by its address.
 *
 * @param params - The retrieval parameters.
 * @param params.store - The TanStack store instance for {@link IdentityStoreState}.
 * @param params.address - The address of the identity to retrieve.
 * @returns The {@link Identity} if found, otherwise undefined.
 */
export function getIdentity({
  store,
  address,
}: {
  store: Store<IdentityStoreState>;
  address: string;
}): Identity | undefined {
  return store.state.identities.find((identity) => identity.address === address);
}

/**
 * Clears all identities from the store.
 *
 * @param params - The store parameters.
 * @param params.store - The TanStack store instance for {@link IdentityStoreState}.
 */
export function clearIdentities({ store }: { store: Store<IdentityStoreState> }): void {
  store.setState((state) => {
    return {
      ...state,
      identities: [],
    };
  });
}
