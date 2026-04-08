import { Store } from '@tanstack/react-store';
import { IdentityStoreState } from '@/extensions/identities';

export const identitiesStore = new Store<IdentityStoreState>({
  identities: [],
});
