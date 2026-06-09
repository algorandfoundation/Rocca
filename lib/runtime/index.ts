/**
 * Process-wide runtime hooks for the controller app: crypto polyfill
 * installer, global polyfills, and the screenshot-block manager.
 */

// `install-crypto` is a side-effect module imported by `app/_layout.tsx`
// as the very first line; it is NOT re-exported here to keep the
// import-order invariant explicit at the entry point.
export { globalPolyfill, setupNavigatorPolyfill } from './polyfill';
export { screenshotManager } from './screenshot-manager';
