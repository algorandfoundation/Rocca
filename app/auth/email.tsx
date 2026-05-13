import Button from '@/components/world-chess/Button';
import { chessGateway } from '@/lib/chess-gateway';
import theme from '@/theme/theme';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setLoading] = useState(false);

  const isValid = EMAIL_REGEX.test(email.trim());

  const handleSendOtp = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      const trimmed = email.trim();
      await chessGateway.sendOtp(trimmed);
      router.push({ pathname: '/auth/otp', params: { email: trimmed } });
    } catch (error: any) {
      console.error('[auth/email] sendOtp error', error);
      Alert.alert('Failed to send code', error?.message ?? String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>
          <View style={styles.heading}>
            <Text style={styles.title}>Sign in with Email</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we&apos;ll send you a one-time verification code.
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={theme.semantic.fg.placeholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              editable={!isLoading}
              returnKeyType="send"
              onSubmitEditing={handleSendOtp}
            />
          </View>
        </View>

        <View style={styles.footer}>
          {isLoading ? (
            <ActivityIndicator color={theme.semantic.fg['brand-primary']} />
          ) : (
            <Button label="Send verification code" onPress={handleSendOtp} disabled={!isValid} />
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
  field: {
    gap: theme.primitives.spacing['8'],
  },
  label: {
    color: theme.semantic.fg.label,
    fontFamily: theme.primitives.font.family.label,
    fontSize: theme.primitives.font.size['p-sm'],
  },
  input: {
    backgroundColor: theme.semantic.bg['surface-1'],
    borderWidth: 1,
    borderColor: theme.semantic.stroke['low-emphasis'],
    borderRadius: theme.primitives.radius['6'],
    paddingHorizontal: theme.primitives.spacing['16'],
    paddingVertical: theme.primitives.spacing['12'],
    color: theme.semantic.fg['high-emphasis'],
    fontFamily: theme.primitives.font.family.p,
    fontSize: theme.primitives.font.size['p-lg'],
  },
  footer: {
    paddingHorizontal: theme.primitives.spacing['16'],
    paddingBottom: theme.primitives.spacing['24'],
    gap: theme.primitives.spacing['12'],
  },
});
