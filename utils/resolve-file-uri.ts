import * as FileSystem from 'expo-file-system/legacy';

/**
 * Convert an incoming file URI (content:// or file://) into a safe file://
 * path in the app's cache directory, suitable for react-native-pdf.
 *
 * Returns null if the URI cannot be handled.
 */
export async function resolveFileUriForPdf(originalUri: string): Promise<string | null> {
  if (originalUri.startsWith('rocca://') || originalUri.startsWith('exp+rocca://')) {
    return null;
  }

  let fileUri = originalUri;

  // Android content:// URIs must be copied to a real filesystem path
  if (fileUri.startsWith('content://')) {
    const timestamp = Date.now();
    const cacheUri = `${FileSystem.cacheDirectory}shared-${timestamp}.pdf`;
    try {
      await FileSystem.copyAsync({
        from: fileUri,
        to: cacheUri,
      });
      fileUri = cacheUri;
    } catch (error) {
      console.error('[resolveFileUriForPdf] Failed to copy content:// URI to cache:', error);
      return null;
    }
  }

  if (!fileUri.startsWith('file://')) {
    console.warn('[resolveFileUriForPdf] Unsupported URI scheme:', fileUri);
    return null;
  }

  return fileUri;
}
