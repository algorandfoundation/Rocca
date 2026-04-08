import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import OnboardingScreen from '../app/onboarding';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock expo-constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      provider: {
        name: 'Rocca',
        primaryColor: '#3B82F6',
        secondaryColor: '#E1EFFF',
      },
    },
  },
}));

// Mock useProvider hook
jest.mock('@/hooks/useProvider', () => ({
  useProvider: () => ({
    keys: [],
    key: null,
    identity: null,
    account: null,
    identities: [],
    accounts: [],
    provider: {
      keystore: {
        generateKey: jest.fn().mockResolvedValue({ id: 'key1' }),
      },
    },
  }),
}));

// Mock bip39
jest.mock('@scure/bip39', () => ({
  generateMnemonic: jest
    .fn()
    .mockReturnValue(
      'apple banana cherry date elderberry fig grape honeydew iceberg jackfruit kiwi lemon',
    ),
  mnemonicToSeed: jest.fn().mockResolvedValue(new Uint8Array(64)),
  wordlist: { english: [] },
}));

// Mock react-native-passkey-autofill
jest.mock('@algorandfoundation/react-native-passkey-autofill', () => ({
  setHdRootKeyId: jest.fn().mockResolvedValue(undefined),
  setMasterKey: jest.fn().mockResolvedValue(undefined),
}));

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock MaterialIcons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

describe('<OnboardingScreen />', () => {
  it('renders welcome step initially', () => {
    const { getByText } = render(<OnboardingScreen />);

    expect(getByText('Welcome to Rocca')).toBeTruthy();
    expect(getByText('Create Wallet')).toBeTruthy();
  });

  it('transitions to generate step when clicking Create Wallet', async () => {
    const { getByText, findByText } = render(<OnboardingScreen />);

    fireEvent.press(getByText('Create Wallet'));

    expect(await findByText('Secure Your Identity.')).toBeTruthy();
    expect(await findByText('View Secret')).toBeTruthy();
  });

  it('shows the recovery phrase after generation', async () => {
    const { getByText, findByText } = render(<OnboardingScreen />);

    fireEvent.press(getByText('Create Wallet'));

    // Wait for the transition and then press "View Secret"
    const revealButton = await findByText('View Secret');
    fireEvent.press(revealButton);

    // Now it should show "Verify Recovery Phrase"
    expect(await findByText('Verify Recovery Phrase')).toBeTruthy();
  });
});
