import Logo from '@/components/Logo';
import { useProvider } from '@/hooks/useProvider';
import { logsStore } from '@/stores/logs';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useStore } from '@tanstack/react-store';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function Index() {
  const { status } = useProvider();
  const logs = useStore(logsStore, (state) => state.logs);
  const lastLog = logs.length > 0 ? logs[0].message : 'Initializing...';

  const config = Constants.expoConfig?.extra?.provider || {
    primaryColor: '#3B82F6',
  };

  /* Create consistent aliases for font family names to avoid issues across platforms and bundlers */
  const [loaded] = useFonts({
    'PP-Right-Grotesk-Tall-Medium': require('../assets/fonts/PP-Right-Grotesk-Tall-Medium.ttf'),
    Gerbera: require('../assets/fonts/Gerbera.ttf'),
    ...MaterialIcons.font,
    ...Ionicons.font,
  });

  if (status === 'loading' || !loaded) {
    return (
      <View style={styles.container}>
        <Logo size={100} style={styles.logo} />
        <ActivityIndicator size="large" color={config.primaryColor} />
        <View style={styles.content}>
          <Text style={styles.text}>{lastLog}</Text>
          <Text style={styles.subtext}>Securing your keys and passkeys</Text>
        </View>
      </View>
    );
  }

  return <Redirect href="/auth/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  logo: {
    marginBottom: 40,
  },
  content: {
    marginTop: 24,
    alignItems: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'center',
  },
  subtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});
