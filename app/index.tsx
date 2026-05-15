import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { useStore } from '@tanstack/react-store';
import { logsStore } from '@/stores/logs';
import Logo from '@/components/Logo';
import { useProvider } from '@/hooks/useProvider';
import { resolveFileUriForPdf } from '@/utils/resolve-file-uri';

/**
 * Index screen handles the app cold-start intent check.
 * It captures Linking.getInitialURL() immediately on mount (before the native
 * layer consumes it), then processes the URL once the keystore is ready.
 */
export default function Index() {
  const { keys, status } = useProvider();
  const router = useRouter();
  const logs = useStore(logsStore, (state) => state.logs);
  const lastLog = logs.length > 0 ? logs[0].message : 'Initializing...';
  const [resolved, setResolved] = useState(false);
  const initialUrlRef = useRef<string | null>(null);
  const processedRef = useRef(false);

  const config = Constants.expoConfig?.extra?.provider || {
    primaryColor: '#3B82F6',
  };

  // Capture the initial URL immediately before any other code can consume it
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      initialUrlRef.current = url;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function handleColdStart() {
      if (processedRef.current) return;
      if (status === 'loading') return;

      processedRef.current = true;
      const url = initialUrlRef.current;
      console.log('[Index] cold start url:', url);

      if (!url) {
        if (!cancelled) setResolved(true);
        return;
      }

      const fileUri = await resolveFileUriForPdf(url);
      console.log('[Index] resolved fileUri:', fileUri);

      if (fileUri && keys.length > 0 && !cancelled) {
        setResolved(true);
        router.replace({ pathname: '/sign' as any, params: { pdfUri: fileUri } });
        return;
      }

      if (!cancelled) setResolved(true);
    }

    handleColdStart();
    return () => {
      cancelled = true;
    };
  }, [status, keys.length, router]);

  if (status === 'loading' || !resolved) {
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

  if (keys.length > 0) return <Redirect href="/landing" />;
  return <Redirect href="/onboarding" />;
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
