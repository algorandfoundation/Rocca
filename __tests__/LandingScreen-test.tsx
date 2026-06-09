import React from 'react';
import { render } from '@testing-library/react-native';
import LandingScreen from '../app/landing';

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
        accentColor: '#10B981',
        welcomeMessage: 'Your identity, connected.',
        showAccounts: true,
        showPasskeys: true,
        showIdentities: true,
        showConnections: true,
      },
    },
  },
}));

// Mock useProvider hook
jest.mock('@/hooks/useProvider', () => ({
  useProvider: () => ({
    key: { store: { clear: jest.fn() } },
    identity: { store: { clear: jest.fn() } },
    account: { store: { clear: jest.fn() } },
    passkey: { store: { clear: jest.fn() } },
    identities: [{ did: 'did:key:z6Mkh...' }],
    accounts: [{ address: 'ADDR123...', balance: 100 }],
    passkeys: [],
    sessions: [],
  }),
}));

// Mock MaterialIcons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

describe('<LandingScreen />', () => {
  it('renders the core landing actions', () => {
    const { getByText } = render(<LandingScreen />);

    expect(getByText('Pair')).toBeTruthy();
    expect(getByText('Diagnostics')).toBeTruthy();
    expect(getByText('Reset Wallet')).toBeTruthy();
  });
});
