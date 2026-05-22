import { useEffect, useRef } from 'react';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { resolveFileUriForPdf } from '@/utils/resolve-file-uri';

/**
 * Listens for incoming PDF intents ("Open with Rocca") on **warm starts**
 * (app already running) and navigates to the /sign screen.
 *
 * Cold starts are handled by app/+not-found.tsx so the router doesn't crash.
 */
export function useIncomingPdf(keysLength: number) {
  const router = useRouter();
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (keysLength === 0) return;

    // Handle warm start (app already running, receives a new intent)
    const subscription = Linking.addEventListener('url', async (event) => {
      const url = event.url;
      if (!url) return;

      if (processedRef.current.has(url)) return;
      processedRef.current.add(url);

      const fileUri = await resolveFileUriForPdf(url);
      if (!fileUri) return;

      router.push({
        pathname: '/sign' as any,
        params: { pdfUri: fileUri },
      });
    });

    return () => {
      subscription.remove();
    };
  }, [keysLength, router]);
}
