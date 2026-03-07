const { withMainApplication, withMainActivity, withDangerousMod, withAndroidManifest, withStringsXml } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to move custom Android modifications into the build process.
 */

const withAndroidCookieModule = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const packagePath = 'com/anonymous/rocca'; // Replace with dynamic package if needed
      const targetDir = path.join(projectRoot, 'android/app/src/main/java', packagePath);

      // Ensure the directory exists
      fs.mkdirSync(targetDir, { recursive: true });

      // Copy CookieModule.kt and CookiePackage.kt if they exist in a source folder
      // For simplicity, we'll assume they are kept in a local 'plugins/android' folder or we define them here.
      // Since they are small, we can also just write them directly.

      const cookieModuleContent = `package com.anonymous.rocca

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import android.webkit.CookieManager

class CookieModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String {
        return "CookieModule"
    }

    @ReactMethod
    fun getCookie(url: String, promise: Promise) {
        try {
            val cookieManager = CookieManager.getInstance()
            val cookie = cookieManager.getCookie(url)
            promise.resolve(cookie)
        } catch (e: Exception) {
            promise.reject("E_COOKIE_MANAGER", e.message)
        }
    }

    @ReactMethod
    fun setCookie(url: String, cookie: String, promise: Promise) {
        try {
            val cookieManager = CookieManager.getInstance()
            cookieManager.setCookie(url, cookie)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("E_COOKIE_MANAGER", e.message)
        }
    }
}
`;

      const cookiePackageContent = `package com.anonymous.rocca

import android.view.View
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import java.util.Collections

class CookiePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(CookieModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
`;

      fs.writeFileSync(path.join(targetDir, 'CookieModule.kt'), cookieModuleContent);
      fs.writeFileSync(path.join(targetDir, 'CookiePackage.kt'), cookiePackageContent);

      return config;
    },
  ]);
};

const withAndroidMainApplicationMod = (config) => {
  return withMainApplication(config, (config) => {
    let content = config.modResults.contents;

    // Add imports
    const imports = [
      'import android.webkit.CookieManager',
      'import com.facebook.react.modules.network.OkHttpClientProvider',
      'import com.facebook.react.modules.network.ForwardingCookieHandler',
      'import com.facebook.react.modules.network.ReactCookieJarContainer',
      'import okhttp3.Interceptor',
      'import okhttp3.JavaNetCookieJar',
      'import java.net.CookieHandler',
      'import android.os.Build'
    ];

    imports.forEach(imp => {
      if (!content.includes(imp)) {
        content = content.replace(/package .*\n/, (match) => `${match}${imp}\n`);
      }
    });

    // Fix imports to use local BuildConfig
    content = content.replace('import com.facebook.react.BuildConfig', 'import com.anonymous.rocca.BuildConfig');

    // Register CookiePackage
    if (!content.includes('add(CookiePackage())')) {
        content = content.replace(
            /PackageList\(this\)\.packages\.apply \{/,
            `PackageList(this).packages.apply {\n              add(CookiePackage())`
        );
    }

    // Add OkHttpClient customization in onCreate
    const okHttpClientCode = `
    CookieManager.getInstance().setAcceptCookie(true)
    CookieManager.setAcceptFileSchemeCookies(true)

    OkHttpClientProvider.setOkHttpClientFactory {
      val userAgent = "\${BuildConfig.APPLICATION_ID}/\${BuildConfig.VERSION_NAME} " +
          "(Android \${Build.VERSION.RELEASE}; \${Build.MODEL}; \${Build.BRAND})"

      val cookieHandler = ForwardingCookieHandler()
      CookieHandler.setDefault(cookieHandler)

      val cookieJarContainer = ReactCookieJarContainer()
      cookieJarContainer.setCookieJar(JavaNetCookieJar(cookieHandler))

      OkHttpClientProvider.createClientBuilder()
        .cookieJar(cookieJarContainer)
        .addInterceptor(Interceptor { chain ->
          val request = chain.request().newBuilder().header("User-Agent", userAgent).build()
          chain.proceed(request)
        })
        .build()
    }
`;

    if (!content.includes('OkHttpClientProvider.setOkHttpClientFactory')) {
      content = content.replace(
        /super\.onCreate\(\)/,
        `super.onCreate()${okHttpClientCode}`
      );
    }

    config.modResults.contents = content;
    return config;
  });
};

const withAndroidPasskeyConfig = (config) => {
  config = withAndroidManifest(config, (config) => {
    const mainActivity = config.modResults.manifest.application?.[0]?.activity?.find(
      (activity) => activity['$']['android:name'] === '.MainActivity'
    );

    if (mainActivity) {
      if (!mainActivity['meta-data']) {
        mainActivity['meta-data'] = [];
      }
      
      const hasAssetLinks = mainActivity['meta-data'].some(
        (meta) => meta['$']['android:name'] === 'asset_statements'
      );

      if (!hasAssetLinks) {
        mainActivity['meta-data'].push({
          $: {
            'android:name': 'asset_statements',
            'android:resource': '@string/asset_statements',
          },
        });
      }
    }

    // Ensure android:usesCleartextTraffic="true" for development/internal testing if needed
    // or specifically for communicating with non-https local dev servers if any.
    // However, it's generally better to stick with defaults unless requested.
    // But since this is a common "missing" edit for some WebRTC/SignalClient setups:
    if (config.modResults.manifest.application?.[0]) {
      config.modResults.manifest.application[0]['$']['android:usesCleartextTraffic'] = 'true';
    }

    return config;
  });

  config = withStringsXml(config, (config) => {
    const assetStatements = JSON.stringify([
      {
        relation: ["delegate_permission/common.handle_all_urls", "delegate_permission/common.get_login_creds"],
        target: {
          namespace: "android_app",
          package_name: "com.anonymous.rocca",
          sha256_cert_fingerprints: ["*"] // In production this should be the actual fingerprint
        }
      }
    ]);

    const strings = config.modResults.resources.string || [];
    if (!strings.some(s => s['$'].name === 'asset_statements')) {
      strings.push({
        $: { name: 'asset_statements', translatable: 'false' },
        _: assetStatements
      });
      config.modResults.resources.string = strings;
    }

    return config;
  });

  return config;
};

module.exports = (config) => {
  config = withAndroidCookieModule(config);
  config = withAndroidMainApplicationMod(config);
  config = withAndroidPasskeyConfig(config);
  return config;
};
