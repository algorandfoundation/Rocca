/**
 * Wallet keystore surface. Owns master-key bootstrap, credential-provider
 * autofill wiring, and crypto helpers for the AC2 controller app.
 */

export { bootstrap } from './bootstrap';
export { CredentialProviderService } from './credential-provider';
export { encryptData, decryptData } from './crypto';
