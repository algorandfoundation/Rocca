import type { IdentityStoreApi, IdentityStoreOptions } from '@/extensions/identities';
import type { KeyStoreOptions } from '@algorandfoundation/keystore';

/**
 * Options for the IdentitiesKeystore extension.
 */
export interface IdentitiesKeystoreExtensionOptions extends KeyStoreOptions, IdentityStoreOptions {
  identities: IdentityStoreOptions['identities'] & {
    keystore?: {
      /**
       * Automatically populate the identity store from the keystore.
       * @default true
       */
      autoPopulate?: boolean;
    };
  };
}

/**
 * Interface representing the IdentitiesKeystore extension.
 */
export interface IdentitiesKeystoreExtension {
  identity: {
    store: IdentityStoreApi;
  };
}
