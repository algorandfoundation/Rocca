import React, { useReducer, useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePathname, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Logo from '../components/Logo';
import SeedPhrase from '../components/SeedPhrase';

import { wordlist } from '@scure/bip39/wordlists/english.js';
import * as bip39 from '@scure/bip39';
import { useProvider } from '@/hooks/useProvider';
import { useSession } from '@/hooks/useSession';
import { keyStore } from '@/stores/keystore';
import { mnemonicToSeed } from '@scure/bip39';
import { bootstrap } from '@/lib/bootstrap';
import { chessGateway } from '@/lib/chess-gateway';
import { PreventScreenshot } from '@/components/PreventScreenshot';
import * as DocumentPicker from 'expo-document-picker';
import * as WebBrowser from 'expo-web-browser';
import { encodeAddress } from '@algorandfoundation/keystore';

// Extract provider configuration from expo-constants
const config = Constants.expoConfig?.extra?.provider || {
  name: 'Rocca',
  primaryColor: '#3B82F6',
  secondaryColor: '#E1EFFF',
};

type OnboardingStep = 'welcome' | 'signin' | 'generate' | 'backup' | 'verify' | 'complete';

interface State {
  step: OnboardingStep;
  recoveryPhrase: string[] | null;
  testInput: { [key: number]: string };
  email: string;
  otp: string;
  isOtpSent: boolean;
  isLoading: boolean;
}

type Action =
  | { type: 'SET_PHRASE'; phrase: string[] }
  | { type: 'SHOW_PHRASE' }
  | { type: 'VERIFY_START'; indices: number[] }
  | { type: 'VERIFY'; input: { [key: number]: string } }
  | { type: 'VERIFY_SUCCESS' }
  | { type: 'SIGNIN_START' }
  | { type: 'OTP_SENT' }
  | { type: 'SIGNIN_SUCCESS' }
  | { type: 'SET_EMAIL'; email: string }
  | { type: 'SET_OTP'; otp: string }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'RESET' };

const initialState: State = {
  step: 'signin',
  recoveryPhrase: null,
  testInput: {},
  email: '',
  otp: '',
  isOtpSent: false,
  isLoading: false,
};

function onboardingReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_PHRASE':
      return { ...state, recoveryPhrase: action.phrase };
    case 'SHOW_PHRASE':
      return { ...state, step: 'backup' };
    case 'VERIFY_START':
      return {
        ...state,
        step: 'verify',
        testInput: Object.fromEntries(action.indices.map((idx) => [idx, ''])),
      };
    case 'VERIFY':
      return { ...state, testInput: action.input };
    case 'VERIFY_SUCCESS':
      return {
        ...state,
        step: 'complete',
      };
    case 'SIGNIN_START':
      return { ...state, step: 'signin' };
    case 'OTP_SENT':
      return { ...state, isOtpSent: true, isLoading: false };
    case 'SIGNIN_SUCCESS':
      return { ...state, step: 'backup', isLoading: false };
    case 'SET_EMAIL':
      return { ...state, email: action.email };
    case 'SET_OTP':
      return { ...state, otp: action.otp };
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

function getIndicatorStep(step: OnboardingStep) {
  if (step === 'welcome') return 1;
  if (step === 'signin') return 1;
  if (step === 'generate') return 2;
  if (step === 'backup') return 2;
  if (step === 'verify') return 3;
  if (step === 'complete') return 3;
  return 0;
}

function getSecurityMessage(step: OnboardingStep) {
  switch (step) {
    case 'signin':
      return 'Please sign in with your email or Google account to continue.';
    case 'generate':
    case 'backup':
      return 'Write down these 24 words in order and store them in a safe offline place. Do not take a screenshot.';
    case 'verify':
      return 'Enter the requested words from your phrase to confirm you have a correct backup.';
    default:
      return 'Your recovery phrase is the only way to recover your wallet. Keep it secret and never share it.';
  }
}

export default function OnboardingScreen() {
  // UI Elements
  const { primaryColor, secondaryColor, name } = config;
  const scrollViewRef = useRef<ScrollView>(null);
  const [showImportOptions, setShowImportOptions] = useState(false);

  // Expo Router for Navigation
  const router = useRouter();
  // Provider Context, used to hold global states and interfaces
  const { keys, key, account, identity, passkey } = useProvider();
  // State reducer
  const [{ step, recoveryPhrase, testInput, email, otp, isOtpSent, isLoading }, dispatch] =
    useReducer(onboardingReducer, initialState);

  // Session state from the chess-gateway, fetched via react-query.
  const { data: session, refetch: refetchSession } = useSession();
  const autoLinkedRef = useRef(false);

  // Generate the wallet upfront so we always have a recovery phrase ready to
  // link, regardless of whether the user is already authenticated.
  useEffect(() => {
    if (!recoveryPhrase) {
      const phrase = bip39.generateMnemonic(wordlist, 256).split(' ');
      dispatch({ type: 'SET_PHRASE', phrase });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the gateway reports an authenticated session, skip sign-in and link
  // the freshly generated wallet directly. Guarded by `autoLinkedRef` so the
  // effect can't re-trigger on session refetches.
  useEffect(() => {
    if (autoLinkedRef.current) return;
    if (!session?.authenticated) return;
    if (!recoveryPhrase) return;
    if (!session.player) {
      autoLinkedRef.current = true;
      console.warn('[onboarding] authenticated session has no player', session);
      Alert.alert(
        'Account not registered',
        `The signed-in account (${session.user?.email ?? 'unknown'}) is not registered in our accounts store. Please contact support or sign in with a registered account.`,
      );
      return;
    }
    autoLinkedRef.current = true;
    console.log('[onboarding] already authenticated with player, skipping sign-in');
    handleLink(recoveryPhrase).catch((error) =>
      console.error('[onboarding] auto handleLink error', error),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, recoveryPhrase]);

  // After authentication succeeds, confirm with the gateway that the verified
  // user has a matching player in the accounts store. Refetches the cached
  // session via react-query so subsequent reads stay in sync. If the player
  // is missing, fail loudly instead of proceeding to wallet linking.
  const ensureRegisteredPlayer = async (): Promise<boolean> => {
    try {
      const { data: fresh } = await refetchSession();
      if (!fresh?.authenticated) {
        Alert.alert(
          'Not authenticated',
          'The gateway did not return an authenticated session. Please try signing in again.',
        );
        dispatch({ type: 'SET_LOADING', loading: false });
        return false;
      }
      if (!fresh.player) {
        console.warn('[onboarding] ensureRegisteredPlayer no player', fresh);
        Alert.alert(
          'Account not registered',
          `The signed-in account (${fresh.user?.email ?? 'unknown'}) is not registered in our accounts store.`,
        );
        dispatch({ type: 'SET_LOADING', loading: false });
        return false;
      }
      return true;
    } catch (error: any) {
      console.error('[onboarding] ensureRegisteredPlayer error', error);
      Alert.alert('Network error', `Unable to verify account: ${error?.message ?? String(error)}`);
      dispatch({ type: 'SET_LOADING', loading: false });
      return false;
    }
  };
  const handleSendOtp = async () => {
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      await chessGateway.sendOtp(email);
      dispatch({ type: 'OTP_SENT' });
    } catch (error: any) {
      console.error('[onboarding] handleSendOtp error', error);
      Alert.alert('Error', error?.message ?? String(error));
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  };

  const handleVerifyOtp = async () => {
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      await chessGateway.verifyOtp(email, otp);
      if (!(await ensureRegisteredPlayer())) return;
      await handleLink();
    } catch (error: any) {
      console.error('[onboarding] handleVerifyOtp error', error);
      Alert.alert('Error', error?.message ?? String(error));
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const data = await chessGateway.signInSocial('google', 'rocca://onboarding');
      const authUrl = data?.url;
      if (!authUrl) {
        Alert.alert('Google Sign-In failed', 'Gateway did not return an OAuth URL');
        return;
      }
      console.log('[onboarding] handleGoogleSignIn -> opening', authUrl);
      const result = await WebBrowser.openAuthSessionAsync(authUrl, 'rocca://onboarding');
      console.log('[onboarding] handleGoogleSignIn result', result);
      if (result.type === 'success') {
        if (!(await ensureRegisteredPlayer())) return;
        await handleLink();
      }
    } catch (error: any) {
      console.error('[onboarding] handleGoogleSignIn error', error);
      Alert.alert('Google Sign-In failed', error?.message ?? String(error));
    }
  };

  const handleLink = async (overridePhrase?: string[]) => {
    dispatch({ type: 'SET_LOADING', loading: true });
    try {
      const phrase = overridePhrase ?? recoveryPhrase;
      if (!phrase) {
        throw new Error('Recovery phrase not generated');
      }
      const seed = await mnemonicToSeed(phrase.join(' '));

      // Clear existing keys and data to prevent duplication
      await key.store.clear();
      await account.store.clear();
      await identity.store.clear();
      await passkey.store.clear();

      // Import to the keystore
      const seedId = await key.store.import(
        {
          type: 'hd-seed',
          algorithm: 'raw',
          extractable: true,
          keyUsages: ['deriveKey', 'deriveBits'],
          privateKey: seed,
        },
        'bytes',
      );

      // Generate HD Root Key
      const rootKeyId = await key.store.generate({
        type: 'hd-root-key',
        algorithm: 'raw',
        extractable: true,
        keyUsages: ['deriveKey', 'deriveBits'],
        params: {
          parentKeyId: seedId,
        },
      });

      // Generate Ed25519 Account Key
      const accountParams = {
        parentKeyId: rootKeyId,
        context: 0,
        account: 0,
        index: 0,
        derivation: 9,
      };
      const accountKeyId = await key.store.generate({
        type: 'hd-derived-ed25519',
        algorithm: 'EdDSA',
        extractable: true,
        keyUsages: ['sign', 'verify'],
        params: {
          ...accountParams,
        },
      });

      // Generate Ed25519 Identity Key
      const identityParams = {
        parentKeyId: rootKeyId,
        context: 1,
        account: 0,
        index: 0,
        derivation: 9,
      };
      await key.store.generate({
        type: 'hd-derived-ed25519',
        algorithm: 'EdDSA',
        extractable: true,
        keyUsages: ['sign', 'verify'],
        params: {
          ...identityParams,
        },
      });

      // Look up the generated key in the keystore to obtain the raw public key bytes.
      // `key.store.generate` returns a keyId string; the key record (with `publicKey`)
      // lives in the keystore state. We read it from the underlying store directly so
      // that we see the freshly generated entry (the React-hydrated `keys` snapshot
      // may be stale within this callback).
      const accountKeyRecord = (keyStore.state.keys as any[]).find((k) => k.id === accountKeyId);
      if (!accountKeyRecord?.publicKey) {
        throw new Error(`Generated account key ${accountKeyId} not found in keystore`);
      }
      const algorandAddress = encodeAddress(accountKeyRecord.publicKey);
      console.log('[onboarding] handleLink algorandAddress', algorandAddress);

      const { challenge } = await chessGateway.getChallenge(algorandAddress);
      console.log('[onboarding] handleLink challenge received, length', challenge?.length);

      // Sign the challenge with the account key. The gateway DTO
      // (`LinkResponseDto`) does not currently accept the signature directly;
      // it expects `walletAddress` (+ optional `integrityToken` / `attestationObject`
      // / `keyId`). We compute it here for future use / parity with native flows.
      const signature = await key.store.sign(accountKeyId, Buffer.from(challenge));
      console.log(
        '[onboarding] handleLink signature(base64) length',
        Buffer.from(signature).toString('base64').length,
      );

      await chessGateway.postLinkResponse({
        walletAddress: algorandAddress,
        integrityToken: 'dummy-token',
      });

      // Bootstrap to ensure native side is updated
      await bootstrap(undefined, false);

      dispatch({ type: 'SET_PHRASE', phrase });
      dispatch({ type: 'SIGNIN_SUCCESS' });
    } catch (error: any) {
      console.error('[onboarding] handleLink error', error);
      Alert.alert('Failed to link wallet', error?.message ?? String(error));
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  };

  const pathname = usePathname();

  useEffect(() => {
    // Only auto-navigate to landing if we are on the welcome step AND this is the active route
    // This prevents interrupting the /import flow which is pushed on top of this screen.
    if (keys.length > 0 && step === 'welcome' && pathname === '/onboarding') {
      router.replace('/landing');
    }
  }, [keys, step, pathname, router]);

  // Helpers for state
  const currentIndicatorStep = getIndicatorStep(step);
  const securityMessage = getSecurityMessage(step);
  const isBackupVerified = step === 'complete';
  const isPhraseVisible = step === 'backup';
  const showTest = step === 'verify';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerIndicator}>
        {/* Step Indicator */}
        {currentIndicatorStep > 0 && (
          <View style={styles.stepIndicator}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  currentIndicatorStep === s && [
                    styles.stepDotActive,
                    { backgroundColor: primaryColor },
                  ],
                  currentIndicatorStep > s && [
                    styles.stepDotCompleted,
                    { backgroundColor: secondaryColor },
                  ],
                ]}
              />
            ))}
            <Text style={styles.stepText}>Step {currentIndicatorStep} of 3</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        {step === 'signin' ? (
          <View style={styles.onboardingContainer}>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <Text style={styles.title}>Sign In</Text>
              </View>

              <View style={styles.illustrationContainer}>
                <Logo size={100} />
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>Connect Your Account</Text>
                <Animated.View entering={FadeIn.duration(400)} style={styles.securityWarning}>
                  <MaterialIcons name="info" size={20} color={primaryColor} />
                  <Text style={styles.securityWarningText}>{securityMessage}</Text>
                </Animated.View>
              </View>

              <View style={{ gap: 16 }}>
                {!isOtpSent ? (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Email Address"
                      value={email}
                      onChangeText={(text) => dispatch({ type: 'SET_EMAIL', email: text })}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={[styles.primaryButton, { backgroundColor: primaryColor }]}
                      onPress={handleSendOtp}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Send OTP</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter OTP"
                      value={otp}
                      onChangeText={(text) => dispatch({ type: 'SET_OTP', otp: text })}
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity
                      style={[styles.primaryButton, { backgroundColor: primaryColor }]}
                      onPress={handleVerifyOtp}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.primaryButtonText}>Verify OTP</Text>
                      )}
                    </TouchableOpacity>
                  </>
                )}

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={[
                    styles.secondaryButton,
                    { flexDirection: 'row', gap: 10, marginBottom: 12 },
                  ]}
                  onPress={handleGoogleSignIn}
                >
                  <MaterialIcons name="login" size={24} color={primaryColor} />
                  <Text style={[styles.secondaryButtonText, { color: primaryColor }]}>
                    Continue with Google
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryButton, { flexDirection: 'row', gap: 10 }]}
                  onPress={() => setShowImportOptions(true)}
                >
                  <MaterialIcons name="file-download" size={24} color={primaryColor} />
                  <Text style={[styles.secondaryButtonText, { color: primaryColor }]}>
                    Import Existing Wallet
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            {/* Import Options Modal */}
            <Modal
              visible={showImportOptions}
              transparent={true}
              animationType="fade"
              onRequestClose={() => setShowImportOptions(false)}
            >
              <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowImportOptions(false)}
              >
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Import Options</Text>

                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => {
                      setShowImportOptions(false);
                      router.push('/import');
                    }}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: secondaryColor }]}>
                      <MaterialIcons name="text-fields" size={24} color={primaryColor} />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionLabel}>Recovery Phrase</Text>
                      <Text style={styles.optionSubLabel}>
                        Import using your 24-word secret phrase
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={async () => {
                      setShowImportOptions(false);
                      try {
                        const result = await DocumentPicker.getDocumentAsync({
                          type: 'application/json',
                          copyToCacheDirectory: true,
                        });

                        if (result.canceled) return;

                        const file = result.assets[0];
                        // Just navigate to import with the backup URI
                        router.push({
                          pathname: '/import',
                          params: { backupUri: file.uri },
                        });
                      } catch (error) {
                        Alert.alert(
                          'Error',
                          error instanceof Error ? error.message : 'Unknown error',
                        );
                      }
                    }}
                  >
                    <View style={[styles.optionIcon, { backgroundColor: '#ECFDF5' }]}>
                      <MaterialIcons name="backup" size={24} color="#10B981" />
                    </View>
                    <View style={styles.optionTextContainer}>
                      <Text style={styles.optionLabel}>Restore from Backup</Text>
                      <Text style={styles.optionSubLabel}>
                        Recover from a previously exported file
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={24} color="#CBD5E1" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setShowImportOptions(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
          </View>
        ) : (
          /* Step 2: Secure Your Identity (Generating, Backup, Verify) */
          <View style={styles.onboardingContainer}>
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.header}>
                <Text style={styles.title}>Secure Your Identity.</Text>
              </View>

              <View style={styles.illustrationContainer}>
                <Logo size={100} />
              </View>

              <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>
                  {isBackupVerified ? 'Identity Secured!' : 'Secure Your Recovery Phrase'}
                </Text>

                {isBackupVerified ? (
                  <Animated.View entering={FadeIn.duration(400)} style={styles.successAnimation}>
                    <View style={[styles.successCircle, { backgroundColor: primaryColor }]}>
                      <MaterialIcons name="check" size={60} color="#FFFFFF" />
                    </View>
                  </Animated.View>
                ) : (
                  <Animated.View
                    key={step}
                    entering={FadeIn.duration(400)}
                    exiting={FadeOut.duration(400)}
                    style={styles.securityWarning}
                  >
                    <MaterialIcons name="security" size={20} color={primaryColor} />
                    <Text style={styles.securityWarningText}>{securityMessage}</Text>
                  </Animated.View>
                )}
              </View>

              {!isBackupVerified && (
                <PreventScreenshot enabled={isPhraseVisible}>
                  <SeedPhrase
                    recoveryPhrase={recoveryPhrase || []}
                    showSeed={isPhraseVisible}
                    validateWords={showTest ? testInput : null}
                    onInputChange={(index, text) =>
                      dispatch({ type: 'VERIFY', input: { ...testInput, [index]: text } })
                    }
                    primaryColor={primaryColor}
                  />
                </PreventScreenshot>
              )}
            </ScrollView>

            {!isBackupVerified && (
              <View style={styles.buttonContainer}>
                {(() => {
                  switch (step) {
                    case 'generate':
                      return (
                        <>
                          <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => dispatch({ type: 'RESET' })}
                          >
                            <Text style={[styles.secondaryButtonText, { color: primaryColor }]}>
                              Go Back
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: primaryColor }]}
                            onPress={() => dispatch({ type: 'SHOW_PHRASE' })}
                          >
                            <Text style={styles.primaryButtonText}>View Secret</Text>
                          </TouchableOpacity>
                        </>
                      );
                    case 'backup':
                      return (
                        <>
                          <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: primaryColor }]}
                            onPress={() => {
                              // TODO: randomize
                              const indices = [3, 7, 15, 21];
                              dispatch({ type: 'VERIFY_START', indices });
                            }}
                          >
                            <Text style={styles.primaryButtonText}>Verify Recovery Phrase</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => {
                              dispatch({ type: 'VERIFY_SUCCESS' });
                              router.replace('/landing');
                            }}
                          >
                            <Text style={[styles.secondaryButtonText, { color: primaryColor }]}>
                              Do it later
                            </Text>
                          </TouchableOpacity>
                        </>
                      );
                    case 'verify':
                      return (
                        <>
                          <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={() => dispatch({ type: 'RESET' })}
                          >
                            <Text style={[styles.secondaryButtonText, { color: primaryColor }]}>
                              Reset Onboarding
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: primaryColor }]}
                            onPress={async () => {
                              const isCorrect = Object.entries(testInput).every(
                                ([index, value]) =>
                                  value.toLowerCase().trim() === recoveryPhrase?.[Number(index)],
                              );
                              if (isCorrect) {
                                dispatch({ type: 'VERIFY_SUCCESS' });
                                router.replace('/landing');
                              } else {
                                Alert.alert(
                                  'Verification Failed',
                                  "The words you entered don't match your recovery phrase. Would you like to try again or start over?",
                                  [
                                    { text: 'Try Again', style: 'cancel' },
                                    {
                                      text: 'Start Over',
                                      onPress: () => dispatch({ type: 'RESET' }),
                                      style: 'destructive',
                                    },
                                  ],
                                );
                              }
                            }}
                          >
                            <Text style={styles.primaryButtonText}>Check Words</Text>
                          </TouchableOpacity>
                        </>
                      );
                    default:
                      return (
                        <TouchableOpacity
                          style={[styles.primaryButton, { backgroundColor: primaryColor }]}
                          onPress={() => router.replace('/landing')}
                        >
                          <Text style={styles.primaryButtonText}>Complete onboarding</Text>
                        </TouchableOpacity>
                      );
                  }
                })()}
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F7FF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  headerIndicator: {
    paddingTop: 4,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  stepDotActive: {
    width: 24,
  },
  stepDotCompleted: {
    backgroundColor: '#93C5FD',
  },
  stepText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
    flex: 1,
  },
  welcomeContainer: {
    flex: 1,
  },
  welcomeHeader: {
    alignItems: 'center',
    marginTop: 10,
  },
  logoContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  onboardingContainer: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 20,
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
    minHeight: 150,
  },
  onboardingGraphic: {
    width: '100%',
    height: 250,
  },
  infoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 12,
  },
  successAnimation: {
    marginVertical: 20,
    alignItems: 'center',
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  securityWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    marginTop: 5,
    gap: 10,
  },
  securityWarningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 20,
    paddingBottom: 10,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  optionSubLabel: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  modalCancelButton: {
    marginTop: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
});
