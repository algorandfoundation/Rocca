import { createContext, type ReactNode } from 'react';
import { Provider } from '@algorandfoundation/wallet-provider';

import { WithKeyStore } from '@algorandfoundation/react-native-keystore';
import { Account, AccountStoreExtension, WithAccountStore } from '@/extensions/accounts';
import { Identity, IdentityStoreApi, WithIdentityStore } from '@/extensions/identities';
import { WithPasskeyStore, Passkey, PasskeyStoreApi } from '@/extensions/passkeys';
import type { KeyStoreAPI, Key } from '@algorandfoundation/keystore';
import { type LogMessage, WithLogStore, type LogStoreApi } from '@algorandfoundation/log-store';
import type { keyStoreHooks } from '@/stores/before-after';
import { KeystoreAccount, WithAccountsKeystore } from '@/extensions/accounts-keystore';
import { WithIdentitiesKeystore } from '@/extensions/identities-keystore';
import { WithPasskeysKeystore } from '@/extensions/passkeys-keystore';

export class ReactNativeProvider extends Provider<typeof ReactNativeProvider.EXTENSIONS> {
  static EXTENSIONS = [
    WithLogStore,
    WithKeyStore,
    WithAccountStore,
    WithIdentityStore,
    WithPasskeyStore,
    WithAccountsKeystore,
    WithIdentitiesKeystore,
    WithPasskeysKeystore,
  ] as const;

  keys!: Key[];
  accounts!: Account[];
  identities!: Identity[];
  passkeys!: Passkey[];
  logs!: LogMessage[];
  status!: string;

  account!: AccountStoreExtension<Account | KeystoreAccount>['account'];
  identity!: {
    store: IdentityStoreApi;
  };
  passkey!: {
    store: PasskeyStoreApi;
  };
  // The generic Keystore Interface
  key!: {
    store: KeyStoreAPI & { clear: () => Promise<void>; hooks: typeof keyStoreHooks };
  };
  log!: LogStoreApi;
}

export const WalletProviderContext = createContext<null | ReactNativeProvider>(null);

export interface WalletProviderProps {
  children: ReactNode;
  provider: ReactNativeProvider;
}
export function WalletProvider({ children, provider }: WalletProviderProps) {
  return (
    <WalletProviderContext.Provider value={provider}>{children}</WalletProviderContext.Provider>
  );
}
