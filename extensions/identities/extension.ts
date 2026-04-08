import type { Extension } from '@algorandfoundation/wallet-provider';
import { Store } from '@tanstack/store';
import Hook from 'before-after-hook';
import { addIdentity, clearIdentities, getIdentity, removeIdentity } from './store';
import type { Identity, IdentityStoreExtension, IdentityStoreState } from './types';

/**
 * Extension that adds identity management capabilities to a Provider.
 *
 * @param provider - The provider instance being extended.
 * @param options - Configuration options for the extension.
 * @returns The identity store extension.
 */
export const WithIdentityStore: Extension<IdentityStoreExtension> = (provider, options) => {
  const store = options?.identities?.store ?? new Store<IdentityStoreState>({ identities: [] });
  const hooks = options?.identities?.hooks ?? new Hook.Collection<any>();

  return {
    get identities() {
      return store.state.identities;
    },
    identity: {
      store: provider.identity?.store || {
        async addIdentity(identity: Identity) {
          return hooks('add', addIdentity, { store, identity });
        },
        async removeIdentity(address: string) {
          return hooks('remove', removeIdentity, { store, address });
        },
        async getIdentity(address: string) {
          return hooks('get', getIdentity, { store, address });
        },
        async clear() {
          return hooks('clear', clearIdentities, { store });
        },
        hooks,
      },
    },
  } as IdentityStoreExtension;
};
