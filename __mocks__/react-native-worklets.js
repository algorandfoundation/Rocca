'use strict';

// Stub for react-native-worklets in Jest — prevents native initialization crash
const mappingCache = new Map();
const serializableMappingCache = {
  has: (val) => mappingCache.has(val),
  set: (val, ref) => mappingCache.set(val, ref),
  get: (val) => mappingCache.get(val),
};

module.exports = {
  makeShareable: (val) => val,
  makeShareableCloneRecursive: (val) => val,
  makeShareableCloneOnUIRecursive: (val) => val,
  isShareableRef: () => false,
  createSerializable: (val) => val,
  serializableMappingCache,
  // deprecated alias
  shareableMappingCache: serializableMappingCache,
  callMicrotasks: () => {},
  getDynamicFeatureFlag: () => false,
  getStaticFeatureFlag: () => false,
  setDynamicFeatureFlag: () => {},
  isWorkletFunction: () => false,
  runOnUI: (fn) => fn,
  runOnJS: (fn) => fn,
  RuntimeKind: { UI: 'UI', JS: 'JS' },
};
