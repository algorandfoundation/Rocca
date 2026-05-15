import { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { resolveFileUriForPdf } from '@/utils/resolve-file-uri';
import { useProvider } from '@/hooks/useProvider';

/**
 * Catch-all route that handles PDF file-intent cold starts.
 *
 * When the app is opened via "Open With" from a file manager while fully
 * closed, Expo Router sees the file URI as a route path and hits this
 * screen. We intercept it, resolve the URI (copy content:// to cache),
 * and redirect to /sign with the safe file:// path.
 *
 * The initial URL is captured ONCE into a ref so that re-renders (when
 * keys load) don't re-call Linking.getInitialURL() — which would return
 * null because Android already consumed the intent.
 */
export default function NotFound() {
  const router = useRouter();
  const { keys, status } = useProvider();
  const [resolved, setResolved] = useState(false);
  const initialUrlRef = useRef<string | null>(null);
  const processedRef = useRef(false);

  // Capture the initial URL immediately so we never lose it on re-renders
  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      initialUrlRef.current = url;
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (processedRef.current) return;
      if (status === 'loading') return;

      processedRef.current = true;
      const url = initialUrlRef.current;
      console.log('[NotFound] Initial URL:', url);

      const fileUri = url ? await resolveFileUriForPdf(url) : null;
      console.log('[NotFound] Resolved fileUri:', fileUri);

      if (cancelled) return;

      if (fileUri) {
        // If user isn't onboarded yet, send them to landing (which will
        // redirect to onboarding automatically). We'll ignore the intent.
        if (keys.length === 0) {
          console.log('[NotFound] User not onboarded, redirecting to landing');
          router.replace('/landing' as any);
        } else {
          router.replace({
            pathname: '/sign' as any,
            params: { pdfUri: fileUri },
          });
        }
      } else {
        // Not a file intent — just a normal 404 or deep link we don't handle
        router.replace('/landing' as any);
      }
      if (!cancelled) setResolved(true);
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [status, keys.length, router]);

  if (!resolved || status === 'loading') {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#F8FAFC',
        }}
      >
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return null;
}
