const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to handle Rocca specific fixes not covered by upstream.
 */

const withRoccaResolutionStrategy = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const buildGradlePath = path.join(projectRoot, 'android/build.gradle');

      if (fs.existsSync(buildGradlePath)) {
        let content = fs.readFileSync(buildGradlePath, 'utf8');

        // Find allprojects block and repositories inside it
        const allProjectsMatch = content.match(/allprojects\s*\{[\s\S]*?\n}/);
        if (allProjectsMatch) {
          let allprojectsContent = allProjectsMatch[0];

          // 1. Add flatDir for local AARs if not already present in ALLPROJECTS
          const aarPath =
            'node_modules/@algorandfoundation/react-native-passkey-autofill/android/libs';
          if (!allprojectsContent.includes('dP256Android-release')) {
            const flatDirBlock = `
        flatDir {
            dirs "\${rootProject.projectDir}/../${aarPath}"
        }`;
            // Correctly target repositories INSIDE allprojects
            allprojectsContent = allprojectsContent.replace(
              /repositories\s*\{/,
              `repositories {\n${flatDirBlock}`,
            );
          }

          // 2. Add resolutionStrategy for BC and MMKV if not already present
          const resolutionStrategy = `
    configurations.all {
      resolutionStrategy {
        force 'org.bouncycastle:bcprov-jdk18on:1.78.1'
        force 'org.bouncycastle:bcpkix-jdk18on:1.78.1'
        force 'org.bouncycastle:bcutil-jdk18on:1.78.1'
        force 'io.github.zhongwuzw:mmkv:2.3.0'

        dependencySubstitution {
            substitute(module("org.bouncycastle:bcprov-jdk15to18")).using(module("org.bouncycastle:bcprov-jdk18on:1.78.1"))
            substitute(module("org.bouncycastle:bcutil-jdk15to18")).using(module("org.bouncycastle:bcutil-jdk18on:1.78.1"))
            substitute(module("org.bouncycastle:bcpkix-jdk15to18")).using(module("org.bouncycastle:bcpkix-jdk18on:1.78.1"))
            substitute(module("com.tencent:mmkv")).using(module("io.github.zhongwuzw:mmkv:2.3.0"))
        }
      }
    }
`;

          if (!allprojectsContent.includes('io.github.zhongwuzw:mmkv')) {
            // Inject resolutionStrategy BEFORE the LAST closing brace of allprojects
            const lastBraceIndex = allprojectsContent.lastIndexOf('}');
            if (lastBraceIndex !== -1) {
              allprojectsContent =
                allprojectsContent.substring(0, lastBraceIndex) +
                resolutionStrategy +
                allprojectsContent.substring(lastBraceIndex);
            }
          }

          content = content.replace(allProjectsMatch[0], allprojectsContent);
        }

        fs.writeFileSync(buildGradlePath, content);
      }
      return config;
    },
  ]);
};

const withPackagingOptions = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const appBuildGradlePath = path.join(projectRoot, 'android/app/build.gradle');

      if (fs.existsSync(appBuildGradlePath)) {
        let content = fs.readFileSync(appBuildGradlePath, 'utf8');
        const packagingItems = `
    packaging {
        pickFirst 'META-INF/versions/9/OSGI-INF/MANIFEST.MF'
        pickFirst '**/libmmkv.so'
        pickFirst '**/libmmkv.a'
        exclude 'META-INF/LICENSE*'
        exclude 'META-INF/NOTICE*'
        exclude 'META-INF/DEPENDENCIES'
    }
`;

        if (!content.includes("pickFirst 'META-INF/versions/9/OSGI-INF/MANIFEST.MF'")) {
          // Inject at the beginning of the android block
          content = content.replace(/android\s*\{/, `android {\n${packagingItems}`);
          fs.writeFileSync(appBuildGradlePath, content);
        }
      }
      return config;
    },
  ]);
};

const withMMKVProguard = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const proguardPath = path.join(projectRoot, 'android/app/proguard-rules.pro');

      if (fs.existsSync(proguardPath)) {
        let content = fs.readFileSync(proguardPath, 'utf8');
        const mmkvRules = `
# MMKV
-keep class com.tencent.mmkv.** { *; }
-keep interface com.tencent.mmkv.** { *; }
-keep class io.github.zhongwuzw.mmkv.** { *; }
-keep interface io.github.zhongwuzw.mmkv.** { *; }
-keep class com.tencent.mmkv.MMKV { *; }
-keepclassmembers class com.tencent.mmkv.MMKV {
    native <methods>;
}
-keep class io.github.zhongwuzw.mmkv.MMKV { *; }
-keepclassmembers class io.github.zhongwuzw.mmkv.MMKV {
    native <methods>;
}
-keep class com.tencent.mmkv.MMKVHandler { *; }
-keep class com.tencent.mmkv.MMKVLogLevel { *; }
-keep class com.tencent.mmkv.MMKV$LibLoader { *; }
-keep class io.github.zhongwuzw.mmkv.MMKVHandler { *; }
-keep class io.github.zhongwuzw.mmkv.MMKVLogLevel { *; }
-keep class io.github.zhongwuzw.mmkv.MMKV$LibLoader { *; }
`;
        if (!content.includes('io.github.zhongwuzw.mmkv')) {
          content += mmkvRules;
          fs.writeFileSync(proguardPath, content);
        }
      }
      return config;
    },
  ]);
};

module.exports = (config) => {
  config = withRoccaResolutionStrategy(config);
  config = withPackagingOptions(config);
  config = withMMKVProguard(config);
  return config;
};
