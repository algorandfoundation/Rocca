const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The @algorandfoundation credentials/intermezzo packages are consumed via
// local `file:` links (npm symlinks them into node_modules) while they are
// verified end-to-end before publishing. Metro follows the symlinks to their
// real paths in the sibling repos, so those repos must be watched and their
// node_modules trees must be resolvable.
const workspaceRoot = path.resolve(__dirname, '..');
config.watchFolders = [
  ...(config.watchFolders ?? []),
  path.join(workspaceRoot, 'wallet-provider-extensions'),
  path.join(workspaceRoot, 'intermezzo-client-js'),
];
config.resolver.nodeModulesPaths = [
  ...(config.resolver.nodeModulesPaths ?? []),
  path.join(__dirname, 'node_modules'),
  path.join(workspaceRoot, 'wallet-provider-extensions', 'node_modules'),
];

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
