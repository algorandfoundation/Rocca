import { useProvider } from '@/hooks/useProvider';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFonts } from 'expo-font';
import { Redirect } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';

export default function Index() {
  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-Regular': require('../assets/fonts/PlusJakartaSans-VariableFont_wght.ttf'),
    'PlusJakartaSans-Medium': require('../assets/fonts/PlusJakartaSans-VariableFont_wght.ttf'),
    'PlusJakartaSans-SemiBold': require('../assets/fonts/PlusJakartaSans-VariableFont_wght.ttf'),
    'PlusJakartaSans-Bold': require('../assets/fonts/PlusJakartaSans-VariableFont_wght.ttf'),
    'PlusJakartaSans-Italic': require('../assets/fonts/PlusJakartaSans-Italic-VariableFont_wght.ttf'),
    ...MaterialIcons.font,
    ...FontAwesome6.font,
  });
  const { keys, status } = useProvider();

  React.useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  if (!fontsLoaded || status === 'loading') {
    return null;
  }

  if (keys.length > 0) return <Redirect href="/landing" />;
  return <Redirect href="/onboarding" />;
}
