import Button from '@/components/world-chess/Button';
import { useInvalidateSession } from '@/hooks/useSession';
import { chessGateway } from '@/lib/chess-gateway';
import theme from '@/theme/theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const OTP_LENGTH = 6;
const OTP_DIGITS_REGEX = /^[0-9]+$/;

export default function OtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = (params.email ?? '').toString();
  const invalidateSession = useInvalidateSession();

  const [otp, setOtp] = useState('');
  const [isVerifying, setVerifying] = useState(false);
  const [isResending, setResending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 0);
    return () => clearTimeout(timer);
  }, []);

  const isComplete = otp.length === OTP_LENGTH && OTP_DIGITS_REGEX.test(otp);

  const handleChangeOtp = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(digits);
  };

  const handleVerify = async () => {
    if (!isComplete || !email) return;
    setVerifying(true);
    try {
      await chessGateway.verifyOtp(email, otp);
      await invalidateSession();
      router.replace('/dashboard');
    } catch (error: any) {
      console.error('[auth/otp] verifyOtp error', error);
      Alert.alert('Invalid code', error?.message ?? String(error));
      setOtp('');
      inputRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email || isResending) return;
    setResending(true);
    try {
      await chessGateway.sendOtp(email);
      Alert.alert('Code sent', `A new verification code has been sent to ${email}.`);
    } catch (error: any) {
      console.error('[auth/otp] resend error', error);
      Alert.alert('Failed to resend code', error?.message ?? String(error));
    } finally {
      setResending(false);
    }
  };

  const cells = Array.from({ length: OTP_LENGTH }, (_, idx) => otp[idx] ?? '');

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          <View style={styles.heading}>
            <Text style={styles.title}>Enter verification code</Text>
            <Text style={styles.subtitle}>
              We sent a {OTP_LENGTH}-digit code to{' '}
              <Text style={styles.emailEmphasis}>{email || 'your email'}</Text>.
            </Text>
          </View>

          <View style={styles.otpWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.hiddenInput}
              value={otp}
              onChangeText={handleChangeOtp}
              keyboardType="number-pad"
              inputMode="numeric"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              maxLength={OTP_LENGTH}
              editable={!isVerifying}
              returnKeyType="done"
              onSubmitEditing={handleVerify}
              caretHidden
            />
            <View style={styles.cellsRow} pointerEvents="none">
              {cells.map((digit, idx) => {
                const isFocused = idx === Math.min(otp.length, OTP_LENGTH - 1);
                return (
                  <View
                    key={idx}
                    style={[
                      styles.cell,
                      digit ? styles.cellFilled : null,
                      isFocused && otp.length < OTP_LENGTH ? styles.cellFocused : null,
                    ]}
                  >
                    <Text style={styles.cellText}>{digit}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.resendRow}>
            {isResending ? (
              <ActivityIndicator color={theme.semantic.fg['brand-primary']} />
            ) : (
              <Button
                label="Resend code"
                variant="link"
                size="small"
                onPress={handleResend}
                disabled={!email}
              />
            )}
          </View>
        </View>

        <View style={styles.footer}>
          {isVerifying ? (
            <ActivityIndicator color={theme.semantic.fg['brand-primary']} />
          ) : (
            <Button label="Verify" onPress={handleVerify} disabled={!isComplete} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.semantic.bg['app-bg'],
  },
  flex: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: theme.primitives.spacing['16'],
    paddingTop: theme.primitives.spacing['24'],
    gap: theme.primitives.spacing['32'],
  },
  heading: {
    gap: theme.primitives.spacing['8'],
  },
  title: {
    color: theme.semantic.fg['high-emphasis'],
    fontFamily: theme.primitives.font.family.header,
    fontSize: theme.primitives.font.size.h4,
  },
  subtitle: {
    color: theme.semantic.fg['medium-emphasis'],
    fontFamily: theme.primitives.font.family.p,
    fontSize: theme.primitives.font.size['p-md'],
    lineHeight: theme.primitives.font['line-height']['p-md'],
  },
  emailEmphasis: {
    color: theme.semantic.fg['high-emphasis'],
  },
  otpWrapper: {
    position: 'relative',
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    zIndex: 1,
  },
  cellsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.primitives.spacing['8'],
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 56,
    borderRadius: theme.primitives.radius['6'],
    borderWidth: 1,
    borderColor: theme.semantic.stroke['low-emphasis'],
    backgroundColor: theme.semantic.bg['surface-1'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    borderColor: theme.semantic.stroke['medium-emphasis'],
  },
  cellFocused: {
    borderColor: theme.semantic.stroke['brand-primary'],
  },
  cellText: {
    color: theme.semantic.fg['high-emphasis'],
    fontFamily: theme.primitives.font.family.header,
    fontSize: theme.primitives.font.size.h4,
  },
  resendRow: {
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: theme.primitives.spacing['16'],
    paddingBottom: theme.primitives.spacing['24'],
    gap: theme.primitives.spacing['12'],
  },
});
