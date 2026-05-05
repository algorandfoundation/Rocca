import Button from '@/components/button';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';

import GridOverlay from '@/components/world-chess/grid-overlay';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import theme from '../../features/world-chess/theme/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root}>
      {/* Grid overlay background - behind content */}
      <View style={styles.overlayContainer} pointerEvents="none">
        <GridOverlay width={screenWidth} height={screenHeight} />
      </View>
      {/* Content on top */}
      <View style={styles.container}>
        <View style={{ alignItems: 'center', gap: theme.primitives.spacing['4'] }}>
          <Image
            source={require('../../assets/images/logos/world-chess-logo-vertical.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.logoSubtitle}>------ Official Player Vault -----</Text>
        </View>
        <View style={styles.buttonSection}>
          <Button
            label="Continue with Google"
            variant="secondary"
            onPress={() => {
              router.push('/dashboard');
            }}
          />
          <View style={{ height: theme.primitives.spacing['12'] }} />
          <Button label="Sign in with Passkey" variant="primary" onPress={() => {}} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.semantic.bg['app-bg'] as string,
    overflow: 'hidden',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    zIndex: 0,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.primitives.spacing['24'],
    paddingBottom: theme.primitives.spacing['32'],
    zIndex: 1,
  },
  logo: {
    width: 240,
    height: 200,
    marginBottom: -theme.primitives.spacing['8'],
  },
  title: {
    color: theme.semantic.fg['high-emphasis'] as string,
    fontFamily: theme.primitives.font.family.header,
    fontWeight: 'bold',
    fontSize: theme.primitives.font.size['h4'],
    textAlign: 'center',
    letterSpacing: 1.5,
    marginBottom: theme.primitives.spacing['8'],
  },
  body: {
    color: theme.semantic.fg['high-emphasis'] as string,
    fontFamily: theme.primitives.font.family.p,
    fontSize: theme.primitives.font.size['p-md'],
    textAlign: 'center',
    marginBottom: theme.primitives.spacing['24'],
  },
  logoSubtitle: {
    color: theme.semantic.fg['high-emphasis'] as string,
    fontFamily: theme.primitives.font.family.header,
    fontSize: theme.primitives.font.size['h6'],
    textAlign: 'center',
  },
  buttonSection: {
    width: '100%',
    marginBottom: screenHeight * 0.08,
  },
});
