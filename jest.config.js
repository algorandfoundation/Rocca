module.exports = {
  preset: 'jest-expo',
  resolver: 'react-native-worklets/jest/resolver',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  testPathIgnorePatterns: [
    '<rootDir>/packages/ac2-sdk/tests/',
    '<rootDir>/packages/ac2-open-claw-reference/',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm|((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|expo-router|@scure/.*|@noble/.*|react-native-reanimated|react-native-nitro-modules|@algorandfoundation/.*|before-after-hook))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@algorandfoundation/(.*)$': '<rootDir>/node_modules/@algorandfoundation/$1',
    '^react-native-worklets$': '<rootDir>/node_modules/react-native-worklets/lib/module/mock.js',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
};
