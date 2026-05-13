import { createContext, type ReactNode } from 'react';
import { Provider } from '@algorandfoundation/wallet-provider';

import { WithKeyStore } from '@algorandfoundation/react-native-keystore';
import {
  Account,
  AccountStoreExtension,
  WithAccountStore,
} from '@algorandfoundation/accounts-store';
import {
  Identity,
  IdentityStoreApi,
  IdentityStoreExtension,
  WithIdentityStore,
} from '@/extensions/identities';
import {
  Passkey,
  PasskeyStoreApi,
  PasskeyStoreExtension,
  WithPasskeyStore,
} from '@/extensions/passkeys';
import type { KeyStoreAPI, Key } from '@algorandfoundation/keystore';
import { type LogMessage, WithLogStore, type LogStoreApi } from '@algorandfoundation/log-store';
import type { keyStoreHooks } from '@/stores/before-after';
import {
  KeystoreAccount,
  WithAccountsKeystore,
} from '@algorandfoundation/accounts-keystore-extension';
import { WithIdentitiesKeystore } from '@/extensions/identities-keystore';
import { WithPasskeysKeystore } from '@/extensions/passkeys-keystore';
import { WithDfnsKeystore, type DfnsKeystoreApi } from '@/extensions/dfns-keystore';
import { type DfnsAccount, WithDfnsAccounts } from '@/extensions/dfns-accounts';

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
    WithDfnsKeystore,
    WithDfnsAccounts,
  ] as const;

  keys!: Key[];
  accounts!: Account[];
  identities!: Identity[];
  passkeys!: Passkey[];
  logs!: LogMessage[];
  status!: string;

  account!: AccountStoreExtension<Account | KeystoreAccount | DfnsAccount>['account'];
  identity!: IdentityStoreExtension['identity'];
  passkey!: PasskeyStoreExtension['passkey'];
  // The generic Keystore Interface, augmented with DFNS under `key.dfns`.
  key!: {
    store: KeyStoreAPI & { clear: () => Promise<void>; hooks: typeof keyStoreHooks };
    dfns: DfnsKeystoreApi;
  };
  /**
   * The DFNS accounts namespace contributed by `WithDfnsAccounts`.
   * Exposes the wallets client, a manual refresh, and a type guard.
   */
  dfns!: ReturnType<typeof WithDfnsAccounts> extends { dfns: infer T } ? T : never;
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
