import { ed25519 } from '@noble/curves/ed25519.js';

test('ed25519 API shape', () => {
  expect(typeof ed25519).toBe('object');
  expect(typeof ed25519.sign).toBe('function');
  expect(typeof ed25519.verify).toBe('function');
  expect(typeof ed25519.getPublicKey).toBe('function');
  expect(typeof ed25519.keygen).toBe('function');
});
