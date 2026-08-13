module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|expo-router|@scure/.*|@noble/.*|react-native-reanimated|react-native-nitro-modules|@algorandfoundation/.*|before-after-hook)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Workspace-internal transitive deps of the `file:`-linked meta/bridge
    // packages. npm does not install dependencies of external `file:` links,
    // so these never land in this project's node_modules — resolve them from
    // the sibling repos directly (temporary until the packages are published;
    // the blanket rule below then covers them like everything else).
    '^@algorandfoundation/identities-store$':
      '<rootDir>/../wallet-provider-extensions/identities/store',
    '^@algorandfoundation/identities-extension$':
      '<rootDir>/../wallet-provider-extensions/identities/extension',
    '^@algorandfoundation/identities-keystore-extension$':
      '<rootDir>/../wallet-provider-extensions/identities/keystore-extension',
    '^@algorandfoundation/credentials-core$':
      '<rootDir>/../wallet-provider-extensions/credentials/core',
    '^@algorandfoundation/credentials-web$':
      '<rootDir>/../wallet-provider-extensions/credentials/web',
    '^@algorandfoundation/react-native-credentials$':
      '<rootDir>/../wallet-provider-extensions/credentials/react-native',
    '^@algorandfoundation/intermezzo-client$': '<rootDir>/../intermezzo-client-js',
    '^@algorandfoundation/(.*)$': '<rootDir>/node_modules/@algorandfoundation/$1',
    // Babel injects runtime helper requires while transforming the local
    // `file:`-linked @algorandfoundation packages; their real paths live
    // outside this project tree, so resolve the helpers from our own copy.
    '^@babel/runtime/(.*)$': '<rootDir>/node_modules/@babel/runtime/$1',
    // Same story for the shared runtime deps the linked packages import:
    // resolve them from this project so jest transforms them (and the app
    // and the linked extensions share a single module instance).
    '^before-after-hook$': '<rootDir>/node_modules/before-after-hook',
    '^@tanstack/store$': '<rootDir>/node_modules/@tanstack/store',
    '^@scure/base$': '<rootDir>/node_modules/@scure/base',
    '^@noble/hashes/(.*)$': '<rootDir>/node_modules/@noble/hashes/$1',
  },
};
