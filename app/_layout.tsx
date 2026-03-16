import { Stack } from "expo-router";
import { install } from 'react-native-quick-crypto'
import { keyStore } from '@/stores/keystore'
import { keyStoreHooks } from '@/stores/before-after'
import { fetchSecret, getMasterKey, storage } from '@algorandfoundation/react-native-keystore'
import { hex } from '@scure/base'
import { initializeKeyStore, Key, KeyData, KeyStoreState, setStatus } from '@algorandfoundation/keystore'
import { Store } from '@tanstack/store'
import { accountsStore } from '@/stores/accounts'
import { ReactNativeProvider, WalletProvider } from '@/providers/ReactNativeProvider'
import {identitiesStore} from "@/stores/identities";
import { passkeysStore } from '@/stores/passkeys'
import {registerGlobals} from "react-native-webrtc";
import { globalPolyfill, setupNavigatorPolyfill } from "@/lib/polyfill";
import ReactNativePasskeyAutofill from "@algorandfoundation/react-native-passkey-autofill";

globalPolyfill()
registerGlobals()
install()


const provider = new ReactNativeProvider(
    {
      id: 'react-native-wallet',
      name: 'React Native Wallet',
    },
    {
      logs: true,
      accounts: {
        store: accountsStore,
        keystore: {
          autoPopulate: true,
        },
      },
      identities: {
        store: identitiesStore,
        keystore: {
          autoPopulate: true,
        }
      },
      passkeys: {
        store: passkeysStore,
        keystore: {
          autoPopulate: true,
        }
      },
      keystore: {
        store: keyStore,
        hooks: keyStoreHooks,
      },
    }
)

setupNavigatorPolyfill(provider)

async function bootstrap() {
  console.log('[DEBUG_LOG] bootstrap starting...')
  setStatus({ store: keyStore as unknown as Store<KeyStoreState>, status: 'loading' })
  console.log('[DEBUG_LOG] status set to loading')
  const masterKey = await getMasterKey()
  console.log('[DEBUG_LOG] masterKey obtained:', !!masterKey)
  if (masterKey) {
    try {
      console.log('[DEBUG_LOG] setting masterKey to ReactNativePasskeyAutofill...')
      await ReactNativePasskeyAutofill.setMasterKey(hex.encode(masterKey))
      console.log('[DEBUG_LOG] masterKey set, configuring intent actions...')
      await ReactNativePasskeyAutofill.configureIntentActions('GET_PASSKEY', 'CREATE_PASSKEY')
      console.log('[DEBUG_LOG] intent actions configured')
    } catch (e) {
      console.error('[DEBUG_LOG] ReactNativePasskeyAutofill initialization error:', e)
    }
  }

  console.log('[DEBUG_LOG] fetching secrets...')
  const mKey = await getMasterKey()
  const secrets = await Promise.all(
    storage.getAllKeys().map(async (keyId) => {
      console.log('[DEBUG_LOG] fetching secret for key:', keyId)
      return fetchSecret<KeyData>({ keyId, masterKey: mKey })
    })
  )
  console.log('[DEBUG_LOG] secrets fetched:', secrets.length)
  const keys = secrets.filter((k) => k !== null).map(({ privateKey, ...rest }: KeyData) => rest) as Key[]
  initializeKeyStore({
    store: keyStore as unknown as Store<KeyStoreState>,
    keys,
  })
  if (keys.length > 0) {
    console.log('[DEBUG_LOG] status set to ready')
    setStatus({ store: keyStore as unknown as Store<KeyStoreState>, status: 'ready' })
  } else {
    console.log('[DEBUG_LOG] status set to idle')
    setStatus({ store: keyStore as unknown as Store<KeyStoreState>, status: 'idle' })
  }
  console.log('[DEBUG_LOG] bootstrap finished')
}

accountsStore.subscribe(() => {
  const account = accountsStore.state.accounts[0]
  if (account?.id) {
    ReactNativePasskeyAutofill.setHdRootKeyId(account.id).catch(e => {
      console.error('[DEBUG_LOG] ReactNativePasskeyAutofill.setHdRootKeyId error:', e)
    })
  }
})

bootstrap()

export default function RootLayout() {
  return (
    <WalletProvider
      provider={provider}
    >
      <Stack />
    </WalletProvider>
  )
}
