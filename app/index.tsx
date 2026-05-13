import { useProvider } from '@/hooks/useProvider';
import { useSession } from '@/hooks/useSession';
import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';

export default function Index() {
  const { status } = useProvider();
  const {
    isAuthenticated,
    isLoading: isSessionLoading,
    isFetched: isSessionFetched,
  } = useSession();

  /* Create consistent aliases for font family names to avoid issues across platforms and bundlers */
  const [loaded] = useFonts({
    'PP-Right-Grotesk-Tall-Medium': require('../assets/fonts/PP-Right-Grotesk-Tall-Medium.ttf'),
    Gerbera: require('../assets/fonts/Gerbera.ttf'),
    ...MaterialIcons.font,
    ...Ionicons.font,
    ...Feather.font,
  });

  // Wait for fonts, provider, and the initial session probe to resolve before
  // deciding where to send the user. `isFetched` flips true on both success
  // and error, so a failing gateway still releases the splash (treated as
  // unauthenticated).
  const isReady = status !== 'loading' && loaded && (isSessionFetched || !isSessionLoading);

  React.useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null; // Don't render anything, keep splash visible
  }

  return <Redirect href={isAuthenticated ? '/dashboard' : '/auth/login'} />;
}
