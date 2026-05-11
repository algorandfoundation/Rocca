import Button from '@/components/world-chess/Button';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';

import { ChessCheckerboard } from '@/components/world-chess/Checkerboard';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import theme from '../../theme/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const LoginScreenLogo = () => {
  return (
    <View style={{ alignItems: 'center', gap: theme.primitives.spacing['4'] }}>
      <Image
        source={require('../../assets/images/logos/world-chess-logo-vertical.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <View style={styles.logoSubtitleRow}>
        <View style={styles.logoSubtitleLine} />
        <Text style={styles.logoSubtitleText}>Official Player Vault</Text>
        <View style={styles.logoSubtitleLine} />
      </View>
    </View>
  );
};

export default function LoginScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root}>
      {/* Hero section with checkerboard background */}
      <View style={styles.heroSection}>
        <View
          style={{ position: 'absolute', width: '100%', height: screenHeight * 0.5, top: 0 }}
          pointerEvents="box-none"
        >
          <ChessCheckerboard
            height={screenHeight * 0.5}
            squareSize={50}
            lightOpacity={0.22}
            darkOpacity={0.12}
            style={styles.checkerboardFill}
          />
        </View>
        <View style={styles.logoSection}>
          <LoginScreenLogo />
        </View>
      </View>
      {/* Buttons section */}
      <View style={styles.buttonsSection}>
        <Button
          label="Continue with Email"
          variant="secondary"
          onPress={() => {
            router.push('/auth/email');
          }}
        />
        <Button
          label="Continue with Google"
          variant="secondary"
          onPress={() => {
            router.navigate('/dashboard');
          }}
        />
        <Button
          label="Sign in with Passkey"
          variant="primary"
          onPress={() => {
            alert('Not yet implemented');
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.semantic.bg['app-bg'],
  },
  heroSection: {
    flex: 3,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkerboardFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  checkerboard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
  },
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: theme.primitives.spacing['16'],
    paddingBottom: theme.primitives.spacing['24'],
  },
  buttonsSection: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: theme.primitives.spacing['16'],
    paddingBottom: theme.primitives.spacing['24'],
    gap: theme.primitives.spacing['12'],
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: screenWidth * 0.6,
    height: screenHeight * 0.2,
  },
  logoSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.primitives.spacing['4'],
    marginTop: theme.primitives.spacing['4'],
  },
  logoSubtitleLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.semantic.stroke['low-emphasis'],
    minWidth: 24,
    maxWidth: 32,
  },
  logoSubtitleText: {
    color: theme.semantic.fg['high-emphasis'],
    fontSize: theme.primitives.font.size.h6,
    fontFamily: theme.primitives.font.family.header,
    marginHorizontal: theme.primitives.spacing['4'],
  },
  buttonsContainer: {
    gap: theme.primitives.spacing['12'],
    width: '100%',
  },
});
