import { Passkey } from "react-native-passkey";
import { fromBase64Url, toBase64URL } from "@algorandfoundation/liquid-client";
import { ReactNativeProvider } from "@/providers/ReactNativeProvider";

function toUint8Array(buf: BufferSource): Uint8Array {
  if (buf instanceof Uint8Array) return buf;
  if (buf instanceof ArrayBuffer) return new Uint8Array(buf);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

function parseClientDataJSON(clientDataJSON: ArrayBuffer): { origin: string, challenge: string, type: string } {
  const jsonStr = new TextDecoder().decode(clientDataJSON);
  return JSON.parse(jsonStr);
}

function parseAuthenticatorData(authData: ArrayBuffer): { rpIdHash: Uint8Array, flags: number, counter: number } {
  const data = new Uint8Array(authData);
  const rpIdHash = data.slice(0, 32);
  const flags = data[32];
  const counter = (data[33] << 24) | (data[34] << 16) | (data[35] << 8) | data[36];
  return { rpIdHash, flags, counter };
}

function formatOrigin(rpId?: string): string {
  if (!rpId) return "";
  if (rpId.startsWith('http://') || rpId.startsWith('https://')) {
    return rpId;
  }
  return `https://${rpId}`;
}

function toArrayBuffer(base64url: string): ArrayBuffer {
  const buf = fromBase64Url(base64url).buffer;
  if (typeof SharedArrayBuffer !== 'undefined' && buf instanceof SharedArrayBuffer) {
    const newBuf = new ArrayBuffer(buf.byteLength);
    new Uint8Array(newBuf).set(new Uint8Array(buf));
    return newBuf;
  }
  return buf as ArrayBuffer;
}

export function globalPolyfill() {

// Global unhandled promise rejection handler to catch "Unable to activate keep awake" errors
// This is an intermittent issue with expo-keep-awake that can occur during system transitions
// or when system dialogs (like passkeys) are active.
  if (typeof ErrorUtils !== 'undefined') {
    const originalErrorHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
      const errorMessage = error?.message || (typeof error === 'string' ? error : '');
      if (errorMessage.includes('Unable to activate keep awake')) {
        console.warn('[KEEP-AWAKE ERROR CAUGHT]:', errorMessage);
        return;
      }
      // Check for nested errors in CodedError
      if (error?.cause?.message?.includes('Unable to activate keep awake')) {
        console.warn('[KEEP-AWAKE CAUSE ERROR CAUGHT]:', error.cause.message);
        return;
      }
      originalErrorHandler(error, isFatal);
    });
  }

// React Native doesn't have a standard window.onunhandledrejection but we can still
// try to catch them by overriding how they are handled if possible.
// For Hermes, promise rejections that bubble up will eventually hit the global error handler.

// @ts-ignore
  if (global?.HermesInternal?.hasPromise?.()) {
    // @ts-ignore
    const originalRejectionHandler = global.HermesInternal.getUnhandledPromiseRejectionHandler?.();
    // @ts-ignore
    global.HermesInternal.setUnhandledPromiseRejectionHandler?.((id: number, error: any) => {
      // If it's a CodedError from Expo, it might have the message in a different property or nested
      const errorMessage = error?.message || (typeof error === 'string' ? error : '');
      if (errorMessage.includes('Unable to activate keep awake')) {
        console.warn('[KEEP-AWAKE PROMISE REJECTION CAUGHT]:', errorMessage);
        return;
      }
      if (originalRejectionHandler) {
        originalRejectionHandler(id, error);
      }
    });
  }
}

export function setupNavigatorPolyfill(provider: ReactNativeProvider) {
  // @ts-ignore
  if (!global.AuthenticatorAssertionResponse) {
    // @ts-ignore
    global.AuthenticatorAssertionResponse = function () { };
    // @ts-ignore
    global.AuthenticatorAssertionResponse.prototype.authenticatorData = null;
    // @ts-ignore
    global.AuthenticatorAssertionResponse.prototype.signature = null;
    // @ts-ignore
    global.AuthenticatorAssertionResponse.prototype.userHandle = null;
    // @ts-ignore
    global.AuthenticatorAssertionResponse.prototype.clientExtensionResults = null;
  }
  // @ts-ignore
  if (!global.AuthenticatorAttestationResponse) {
    // @ts-ignore
    global.AuthenticatorAttestationResponse = function () { };
    // @ts-ignore
    global.AuthenticatorAttestationResponse.prototype.attestationObject = null;
    // @ts-ignore
    global.AuthenticatorAttestationResponse.prototype.clientExtensionResults = null;
  }

  // We are monkey-patching the globals for consistency
  if (!global.navigator) {
    // @ts-expect-error, we are overriding this on purpose
    global.navigator = {};
  }

  // @ts-expect-error, we are overriding this on purpose
  global.navigator.credentials = {
    async get(obj: { publicKey?: PublicKeyCredentialRequestOptions }) {
      const publicKey = obj?.publicKey;
      if (!publicKey) return null;
      const request = {
        ...publicKey,
        challenge: typeof publicKey.challenge === 'string' ? publicKey.challenge : toBase64URL(toUint8Array(publicKey.challenge)),
        allowCredentials: publicKey.allowCredentials?.map((cred) => ({
          ...cred,
          id: typeof cred.id === 'string' ? cred.id : toBase64URL(toUint8Array(cred.id)),
        })),
      };
      try {
        const result = await Passkey.get(request as any);
        if (!result) return null;

        const clientDataJSON = toArrayBuffer(result.response.clientDataJSON);
        const authData = toArrayBuffer(result.response.authenticatorData);
        const parsedClientData = parseClientDataJSON(clientDataJSON);
        const parsedAuthData = parseAuthenticatorData(authData);

        if (typeof await provider.passkey.store.getPasskey(result.id) === "undefined") {
          await provider.passkey.store.addPasskey({
            algorithm: "ES256",
            name: "Passkey",
            publicKey: new Uint8Array(0),
            id: result.id,
            createdAt: Date.now(),
            metadata: {
              origin: formatOrigin(request.rpId || (parsedClientData.origin?.startsWith('android:apk-key-hash') ? "" : parsedClientData.origin)),
              userHandle: result.response.userHandle ? toUint8Array(toArrayBuffer(result.response.userHandle)) : null,
              challenge: parsedClientData.challenge,
              rpIdHash: toBase64URL(parsedAuthData.rpIdHash),
              counter: parsedAuthData.counter,
              flags: parsedAuthData.flags,
            },
          });
        }
        return {
          id: result.id,
          rawId: toArrayBuffer(result.id),
          response: {
            clientDataJSON,
            authenticatorData: authData,
            signature: toArrayBuffer(result.response.signature),
            userHandle: result.response.userHandle ? toArrayBuffer(result.response.userHandle) : null,
            clientExtensionResults: result.clientExtensionResults || {},
          },
          authenticatorAttachment: result.authenticatorAttachment,
          type: result.type,
          getClientExtensionResults: () => result.clientExtensionResults || {},
        };
      } catch (error) {
        throw error;
      }
    },
    async create(obj: { publicKey?: PublicKeyCredentialCreationOptions }) {
      const publicKey = obj?.publicKey;
      if (!publicKey) return null;
      const request = {
        ...publicKey,
        challenge: typeof publicKey.challenge === 'string' ? publicKey.challenge : toBase64URL(toUint8Array(publicKey.challenge)),
        user: {
          ...publicKey.user,
          id: typeof publicKey.user.id === 'string' ? publicKey.user.id : toBase64URL(toUint8Array(publicKey.user.id)),
        },
        excludeCredentials: publicKey.excludeCredentials?.map((cred) => ({
          ...cred,
          id: typeof cred.id === 'string' ? cred.id : toBase64URL(toUint8Array(cred.id)),
        })),
        authenticatorSelection: publicKey.authenticatorSelection ? {
          ...publicKey.authenticatorSelection,
          requireResidentKey: true,
          residentKey: 'required',
        } : undefined,
        extensions: undefined,
      };
      // Android Credential Manager is very strict about the RP ID.
      // It must match the domain where the assetlinks.json is hosted.
      try {
        const result = await Passkey.create(request as any);
        if (!result) return null;

        const clientDataJSON = toArrayBuffer(result.response.clientDataJSON);
        const parsedClientData = parseClientDataJSON(clientDataJSON);

        if (typeof await provider.passkey.store.getPasskey(result.id) === "undefined") {
          const publicKey = result.response.publicKey ? toUint8Array(toArrayBuffer(result.response.publicKey)) : new Uint8Array(0);
          await provider.passkey.store.addPasskey({
            algorithm: "ES256",
            name: publicKey.length > 0 ? `Passkey ${result.id.slice(0, 8)}` : "Passkey",
            publicKey,
            id: result.id,
            createdAt: Date.now(),
            metadata: {
              origin: formatOrigin(request.rp.id || (parsedClientData.origin?.startsWith('android:apk-key-hash') ? "" : parsedClientData.origin)),
              userHandle: request.user.id ? toUint8Array(toArrayBuffer(request.user.id as string)) : null,
              challenge: parsedClientData.challenge,
            },
          });
        }

        return {
          id: result.id,
          rawId: toArrayBuffer(result.id),
          response: {
            clientDataJSON,
            attestationObject: toArrayBuffer(result.response.attestationObject),
            getTransports: () => (result.response as any).transports || [],
            getPublicKeyAlgorithm: () => (result.response as any).publicKeyAlgorithm || -7,
            getPublicKey: () => result.response.publicKey ? toArrayBuffer(result.response.publicKey) : null,
            getAuthenticatorData: () => result.response.authenticatorData ? toArrayBuffer(result.response.authenticatorData) : null,
            clientExtensionResults: result.clientExtensionResults || {},
          },
          authenticatorAttachment: result.authenticatorAttachment,
          type: result.type,
          getClientExtensionResults: () => result.clientExtensionResults || {},
        };
      } catch (error) {
        throw error;
      }
    },
  };
}
