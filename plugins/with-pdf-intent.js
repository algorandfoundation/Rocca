const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

/**
 * Adds PDF intent filters to MainActivity in AndroidManifest.xml
 */
function addAndroidPdfIntents(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    const mainActivity = manifest.manifest.application?.[0]?.activity?.find(
      (activity) =>
        activity.$?.['android:name'] === '.MainActivity' ||
        activity.$?.['android:name'] === 'com.anonymous.rocca.MainActivity',
    );

    if (!mainActivity) {
      console.warn('[with-pdf-intent] MainActivity not found in AndroidManifest.xml');
      return config;
    }

    if (!mainActivity['intent-filter']) {
      mainActivity['intent-filter'] = [];
    }

    // Strict filter: application/pdf MIME type
    mainActivity['intent-filter'].push({
      $: {},
      action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
      category: [
        { $: { 'android:name': 'android.intent.category.DEFAULT' } },
        { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
      ],
      data: [
        { $: { 'android:mimeType': 'application/pdf' } },
        { $: { 'android:scheme': 'content' } },
        { $: { 'android:scheme': 'file' } },
      ],
    });

    // Broad fallback: any .pdf file via content:// or file://
    mainActivity['intent-filter'].push({
      $: {},
      action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
      category: [
        { $: { 'android:name': 'android.intent.category.DEFAULT' } },
        { $: { 'android:name': 'android.intent.category.BROWSABLE' } },
      ],
      data: [
        { $: { 'android:scheme': 'content' } },
        { $: { 'android:scheme': 'file' } },
        { $: { 'android:mimeType': '*/*' } },
        { $: { 'android:pathPattern': '.*\\.pdf' } },
        { $: { 'android:pathPattern': '.*\\..*\\.pdf' } },
        { $: { 'android:pathPattern': '.*\\..*\\..*\\.pdf' } },
      ],
    });

    return config;
  });
}

/**
 * Adds CFBundleDocumentTypes to Info.plist for PDF support on iOS
 */
function addIosPdfSupport(config) {
  return withInfoPlist(config, (config) => {
    const plist = config.modResults;

    if (!plist.CFBundleDocumentTypes) {
      plist.CFBundleDocumentTypes = [];
    }

    const alreadyHasPdf = plist.CFBundleDocumentTypes.some(
      (type) =>
        type.LSItemContentTypes?.includes('com.adobe.pdf') ||
        type.CFBundleTypeName === 'PDF Document',
    );

    if (!alreadyHasPdf) {
      plist.CFBundleDocumentTypes.push({
        CFBundleTypeName: 'PDF Document',
        LSItemContentTypes: ['com.adobe.pdf'],
        CFBundleTypeRole: 'Viewer',
        LSHandlerRank: 'Alternate',
      });
    }

    return config;
  });
}

/**
 * Expo config plugin to register Rocca as a PDF viewer app.
 */
module.exports = function withPdfIntent(config) {
  config = addAndroidPdfIntents(config);
  config = addIosPdfSupport(config);
  return config;
};
