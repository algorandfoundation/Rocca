import type { ReactKeystoreOptions } from '@algorandfoundation/react-native-keystore';

/**
 * App-wide authentication policy for every keystore operation that touches key
 * material.
 *
 * Shared rather than inlined at the call site because the engine (configured in
 * `app/_layout.tsx`) is not the only caller: the passkey flows in
 * `hooks/useConnection.ts` read the master key directly, and a call that omits
 * these options gets the platform default prompt and no reuse window.
 */
export const biometricOptions: ReactKeystoreOptions['keystore']['authentication'] = {
  biometrics: true,
  prompt: 'Authenticate to access your wallet',
  // The keystore no longer caches the unlocked master key in JS, so without a
  // reuse window every material-touching call (bootstrap, then each sign)
  // prompts again. 30s is long enough to cover a bootstrap + a signing flow and
  // is enforced by the OS, not by us. Requires the bundled
  // `patches/react-native-keychain+10.0.0.patch`; on Android the value is baked
  // into the Keychain item when it is created, so an already-installed app
  // keeps its previous window until that item is recreated.
  authenticationValidityDuration: 30,
};
