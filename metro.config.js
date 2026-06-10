const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const qrCodeStylingStub = path.resolve(__dirname, 'lib/qr-code-styling.stub.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'crypto' || moduleName === 'node:crypto') {
    // when importing crypto, resolve to react-native-quick-crypto
    return context.resolveRequest(context, 'react-native-quick-crypto', platform);
  }

  if (moduleName === 'qr-code-styling') {
    // `qr-code-styling` is a browser-only optional peer dep of
    // `@algorandfoundation/liquid-client` used by `generateQRCode()`.
    // Metro statically resolves dynamic imports, so we redirect to a stub
    // module to keep the React Native bundle building.
    return {
      type: 'sourceFile',
      filePath: qrCodeStylingStub,
    };
  }

  // socket.io ships an ESM build (`build/esm/*`) that Metro picks via the
  // package `exports` `import` condition. Those ESM files use bare relative
  // imports like `./is-binary.js` that Metro's ESM resolver fails to find
  // in the React Native bundler context. Force the CJS entry for the whole
  // socket.io stack — it's the same code, just CommonJS.
  if (
    moduleName === 'socket.io-client' ||
    moduleName === 'socket.io-parser' ||
    moduleName === 'engine.io-client' ||
    moduleName === 'engine.io-parser'
  ) {
    return {
      type: 'sourceFile',
      filePath: path.join(__dirname, 'node_modules', moduleName, 'build', 'cjs', 'index.js'),
    };
  }

  // otherwise chain to the standard Metro resolver.
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
