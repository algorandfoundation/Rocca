// The provider import chain reaches the native keystore engine; stub the
// native primitives so the module graph evaluates under Jest.
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: () => undefined,
    set: () => {},
    remove: () => {},
    getAllKeys: () => [],
    getBoolean: () => undefined,
  }),
}));
jest.mock('react-native-keychain', () => ({}));
jest.mock('@algorandfoundation/react-native-passkey-autofill', () => ({
  __esModule: true,
  default: {},
}));
jest.mock('react-native-quick-crypto', () => ({
  install: () => {},
  subtle: {},
  randomBytes: () => new Uint8Array(32),
}));

import { WithMigrations } from '@algorandfoundation/provider-migrations';
import { ReactNativeProvider } from '@/providers/ReactNativeProvider';

describe('ReactNativeProvider extensions', () => {
  it('registers WithMigrations first, so later extensions can register revisions', () => {
    // Registration order matters: the keystore extension registers its
    // migration revisions during its own registration, which silently no-ops
    // unless WithMigrations has installed the registry already.
    expect(ReactNativeProvider.EXTENSIONS[0]).toBe(WithMigrations);
  });
});
