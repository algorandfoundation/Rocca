import { useProvider } from '@/hooks/useProvider';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';

export default function Index() {
  const { status } = useProvider();

  /* Create consistent aliases for font family names to avoid issues across platforms and bundlers */
  const [loaded] = useFonts({
    'PP-Right-Grotesk-Tall-Medium': require('../assets/fonts/PP-Right-Grotesk-Tall-Medium.ttf'),
    Gerbera: require('../assets/fonts/Gerbera.ttf'),
    ...MaterialIcons.font,
    ...Ionicons.font,
  });

  const isReady = status !== 'loading' && loaded;

  React.useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return null; // Don't render anything, keep splash visible
  }

  return <Redirect href="/auth/login" />;
}
