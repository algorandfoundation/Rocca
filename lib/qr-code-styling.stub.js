// Stub for `qr-code-styling`, a browser-only peer dependency of
// `@algorandfoundation/liquid-client`. The library only uses it inside
// `generateQRCode()`, which we never call from the React Native app
// (QR rendering is handled natively). Metro statically resolves every
// `import()` call, so we redirect it here to keep the bundle building.
module.exports = class QRCodeStyling {
  constructor() {
    throw new Error(
      '[qr-code-styling stub] qr-code-styling is not available in React Native. ' +
        'Do not call generateQRCode() from @algorandfoundation/liquid-client on mobile.',
    );
  }
};
module.exports.default = module.exports;
