import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as bip39 from '@scure/bip39';
import OnboardingScreen from '../app/onboarding';

// Stable router spies across renders
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
  }),
  usePathname: () => '/onboarding',
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

// Stable key/account/identity/passkey store spies (names must start with
// `mock` so they can be referenced from `jest.mock` factories, which are
// hoisted above regular variable declarations).
const ACCOUNT_KEY_ID = 'hd-derived-ed25519-id';
const mockKeyStore = {
  clear: jest.fn().mockResolvedValue(undefined),
  import: jest.fn().mockResolvedValue('seed-id'),
  generate: jest.fn().mockImplementation(async ({ type }: { type: string }) => `${type}-id`),
  sign: jest.fn().mockResolvedValue(new Uint8Array(64)),
};
const mockAccountStore = { clear: jest.fn().mockResolvedValue(undefined) };
const mockIdentityStore = { clear: jest.fn().mockResolvedValue(undefined) };
const mockPasskeyStore = { clear: jest.fn().mockResolvedValue(undefined) };

// Mock useProvider hook
jest.mock('@/hooks/useProvider', () => ({
  useProvider: () => ({
    keys: [],
    key: { store: mockKeyStore },
    account: { store: mockAccountStore },
    identity: { store: mockIdentityStore },
    passkey: { store: mockPasskeyStore },
    identities: [],
    accounts: [],
    provider: {
      keystore: {
        generateKey: jest.fn().mockResolvedValue({ id: 'key1' }),
      },
    },
  }),
}));

// Mock the underlying keystore singleton used by `handleLink` to look up the
// freshly generated account key record (and read its raw public key bytes).
jest.mock('@/stores/keystore', () => ({
  keyStore: {
    state: {
      keys: [
        {
          id: 'hd-derived-ed25519-id',
          publicKey: new Uint8Array(32),
        },
      ],
    },
  },
}));

// Mock the chess-gateway client. The auto-link path inside `OnboardingScreen`
// calls `getChallenge` and `postLinkResponse`; the rest of the methods are
// referenced by the sign-in UI which we don't exercise here but still need
// to be defined so import-time evaluation doesn't throw.
//
// NOTE: mock factories are hoisted by jest, so we define the inner jest.fn()
// instances inside the factory itself; out-of-scope const refs would not yet
// be initialised when the factory runs.
jest.mock('@/lib/chess-gateway', () => ({
  chessGateway: {
    getSession: jest.fn().mockResolvedValue({
      authenticated: true,
      user: { email: 'e@x' },
      verification: null,
      player: { id: 'p1' },
    }),
    sendOtp: jest.fn().mockResolvedValue({}),
    verifyOtp: jest.fn().mockResolvedValue({}),
    signInSocial: jest.fn().mockResolvedValue({ url: 'https://example.com/oauth' }),
    getChallenge: jest.fn().mockResolvedValue({ challenge: 'test-challenge' }),
    postLinkResponse: jest.fn().mockResolvedValue({}),
  },
}));
// Resolve the mocked module after the factory has run so we can spy on the
// inner jest.fn() instances and reset them between tests.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { chessGateway: mockedChessGateway } = require('@/lib/chess-gateway') as {
  chessGateway: {
    getChallenge: jest.Mock;
    postLinkResponse: jest.Mock;
  };
};
const mockGetChallenge = mockedChessGateway.getChallenge;
const mockPostLinkResponse = mockedChessGateway.postLinkResponse;

// Mock the `useSession` react-query hook to bypass the QueryClientProvider
// requirement and immediately report an authenticated session with a player.
// The component's auto-link effect kicks in as soon as both `session` and
// `recoveryPhrase` are populated, which transitions onboarding to the
// `backup` step.
const SESSION_PAYLOAD = {
  authenticated: true,
  user: { email: 'e@x' },
  verification: null,
  player: { id: 'p1' },
};
jest.mock('@/hooks/useSession', () => ({
  useSession: () => ({
    data: SESSION_PAYLOAD,
    refetch: jest.fn().mockResolvedValue({ data: SESSION_PAYLOAD }),
  }),
  sessionQueryKey: ['chess-gateway', 'session'],
  useInvalidateSession: () => jest.fn(),
}));

// Mock bip39 - generate a full 24-word phrase since indices 3, 7, 15, 21 are
// required for verification.
const MOCK_PHRASE =
  'apple banana cherry date elderberry fig grape honeydew iceberg jackfruit kiwi lemon ' +
  'mango nectarine orange papaya quince raspberry strawberry tangerine ugli vanilla watermelon xigua';
jest.mock('@scure/bip39', () => ({
  generateMnemonic: jest.fn().mockReturnValue(MOCK_PHRASE),
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

// Mock bootstrap
jest.mock('@/lib/bootstrap', () => ({
  bootstrap: jest.fn().mockResolvedValue(undefined),
}));

// Mock MaterialIcons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons',
}));

const PHRASE_WORDS = MOCK_PHRASE.split(' ');
const VERIFY_INDICES = [3, 7, 15, 21];

/**
 * Render the screen and wait for the auto-link effect to transition the UI
 * from the initial `signin` step to the `backup` step, where the recovery
 * phrase backup actions are visible.
 */
async function renderAndWaitForBackup() {
  const utils = render(<OnboardingScreen />);
  await utils.findByText('Verify Recovery Phrase');
  return utils;
}

async function advanceToVerifyStep(utils: ReturnType<typeof render>) {
  fireEvent.press(await utils.findByText('Verify Recovery Phrase'));
  await utils.findByText(
    'Enter the requested words from your phrase to confirm you have a correct backup.',
  );
}

describe('<OnboardingScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // `clearAllMocks` also wipes mockReturnValue set at module scope; restore.
    (bip39.generateMnemonic as jest.Mock).mockReturnValue(MOCK_PHRASE);
    (bip39.mnemonicToSeed as jest.Mock).mockResolvedValue(new Uint8Array(64));
    mockKeyStore.clear.mockResolvedValue(undefined);
    mockKeyStore.import.mockResolvedValue('seed-id');
    mockKeyStore.generate.mockImplementation(async ({ type }: { type: string }) => `${type}-id`);
    mockKeyStore.sign.mockResolvedValue(new Uint8Array(64));
    mockAccountStore.clear.mockResolvedValue(undefined);
    mockIdentityStore.clear.mockResolvedValue(undefined);
    mockPasskeyStore.clear.mockResolvedValue(undefined);
    mockGetChallenge.mockResolvedValue({ challenge: 'test-challenge' });
    mockPostLinkResponse.mockResolvedValue({});
  });

  it('auto-links the wallet when an authenticated session with a player is present', async () => {
    await renderAndWaitForBackup();

    // All stores must be cleared prior to importing the new seed
    await waitFor(() => {
      expect(mockKeyStore.clear).toHaveBeenCalledTimes(1);
      expect(mockAccountStore.clear).toHaveBeenCalledTimes(1);
      expect(mockIdentityStore.clear).toHaveBeenCalledTimes(1);
      expect(mockPasskeyStore.clear).toHaveBeenCalledTimes(1);
    });

    // Seed import + HD key derivation chain runs
    await waitFor(() => {
      expect(mockKeyStore.import).toHaveBeenCalledTimes(1);
      // hd-root-key -> ed25519 account -> ed25519 identity
      expect(mockKeyStore.generate).toHaveBeenCalledTimes(3);
    });

    // The gateway link handshake also runs
    await waitFor(() => {
      expect(mockGetChallenge).toHaveBeenCalledTimes(1);
      expect(mockPostLinkResponse).toHaveBeenCalledWith(
        expect.objectContaining({ integrityToken: expect.any(String) }),
      );
    });
  });

  it('transitions to the verify step when pressing "Verify Recovery Phrase"', async () => {
    const utils = await renderAndWaitForBackup();
    await advanceToVerifyStep(utils);
    expect(utils.getByText('Check Words')).toBeTruthy();
  });

  it('shows a Verification Failed alert when entered words are incorrect', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const utils = await renderAndWaitForBackup();
    await advanceToVerifyStep(utils);

    const { getAllByPlaceholderText, getByText } = utils;

    // Fill all verification inputs with wrong values
    for (const idx of VERIFY_INDICES) {
      const input = getAllByPlaceholderText(`Word #${idx + 1}`)[0];
      fireEvent.changeText(input, 'wrong');
    }

    await act(async () => {
      fireEvent.press(getByText('Check Words'));
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Verification Failed',
      expect.stringContaining("don't match your recovery phrase"),
      expect.any(Array),
    );
    // Verification did not succeed -> no navigation to /landing
    expect(mockReplace).not.toHaveBeenCalledWith('/landing');

    alertSpy.mockRestore();
  });

  it('navigates to /landing after correct verification', async () => {
    const utils = await renderAndWaitForBackup();
    await advanceToVerifyStep(utils);

    const { getAllByPlaceholderText, getByText } = utils;

    // Enter the correct words for every requested index. Mix casing /
    // whitespace to confirm the verification is tolerant to it (this is the
    // exact bug path where verification previously did not work).
    VERIFY_INDICES.forEach((idx, i) => {
      const input = getAllByPlaceholderText(`Word #${idx + 1}`)[0];
      const raw = PHRASE_WORDS[idx];
      const value = i % 2 === 0 ? `  ${raw.toUpperCase()} ` : raw;
      fireEvent.changeText(input, value);
    });

    await act(async () => {
      fireEvent.press(getByText('Check Words'));
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/landing');
    });
  });

  it('allows skipping the backup via "Do it later"', async () => {
    const utils = await renderAndWaitForBackup();
    await act(async () => {
      fireEvent.press(utils.getByText('Do it later'));
    });
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/landing');
    });
  });
});
