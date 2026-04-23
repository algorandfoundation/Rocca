import { Provider } from '@algorandfoundation/wallet-provider';
import { createContext, type ReactNode } from 'react';

import { AlgorandAccount, WithAlgorandAccounts } from '@/extensions/algorand-accounts';
import { Identity, IdentityStoreExtension, WithIdentityStore } from '@/extensions/identities';
import { WithIdentitiesKeystore } from '@/extensions/identities-keystore';
import { Passkey, PasskeyStoreExtension, WithPasskeyStore } from '@/extensions/passkeys';
import { WithPasskeysKeystore } from '@/extensions/passkeys-keystore';
import type { keyStoreHooks } from '@/stores/before-after';
import {
  KeystoreAccount,
  WithAccountsKeystore,
} from '@algorandfoundation/accounts-keystore-extension';
import {
  Account,
  AccountStoreExtension,
  WithAccountStore,
} from '@algorandfoundation/accounts-store';
import type { Key, KeyStoreAPI } from '@algorandfoundation/keystore';
import { WithLogStore, type LogMessage, type LogStoreApi } from '@algorandfoundation/log-store';
import { WithKeyStore } from '@algorandfoundation/react-native-keystore';

export class ReactNativeProvider extends Provider<typeof ReactNativeProvider.EXTENSIONS> {
  static EXTENSIONS = [
    WithLogStore,
    WithKeyStore,
    WithAccountStore,
    WithIdentityStore,
    WithPasskeyStore,
    WithAccountsKeystore,
    WithPasskeysKeystore,
    WithIdentitiesKeystore,
    WithAlgorandAccounts,
  ] as const;

  keys!: Key[];
  accounts!: Account[];
  identities!: Identity[];
  passkeys!: Passkey[];
  logs!: LogMessage[];
  status!: string;

  account!: AccountStoreExtension<Account | KeystoreAccount | AlgorandAccount>['account'];
  identity!: IdentityStoreExtension['identity'];
  passkey!: PasskeyStoreExtension['passkey'];
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
