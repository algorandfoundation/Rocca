import type { Extension } from '@algorandfoundation/wallet-provider';
import { DfnsKeysClient } from './client';
import type {
  DfnsKeystoreApi,
  DfnsKeystoreExtension,
  DfnsKeystoreOptions,
  DfnsSignParams,
  DfnsSignatureRequestBody,
} from './types';

/**
 * Encodes a Uint8Array as a lowercase hex string (no `0x` prefix), as expected
 * by the DFNS `Hash`/`Message` signature payloads.
 */
export function toHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * Decodes a hex string (with or without `0x` prefix) into a Uint8Array. Returns
 * an empty Uint8Array when the input is not a valid hex string.
 */
export function fromHex(hex: string | undefined): Uint8Array {
  if (!hex) return new Uint8Array();
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0 || /[^0-9a-fA-F]/.test(clean)) return new Uint8Array();
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Extracts the raw signature bytes from a DFNS signature response, preferring
 * `signature.encoded`, then falling back to `signedData`, and finally to the
 * concatenation of `r` and `s`.
 */
export function signatureBytes(response: {
  signature?: { r?: string; s?: string; encoded?: string };
  signedData?: string;
}): Uint8Array {
  if (response.signature?.encoded) return fromHex(response.signature.encoded);
  if (response.signedData) return fromHex(response.signedData);
  if (response.signature?.r && response.signature?.s) {
    const r = fromHex(response.signature.r);
    const s = fromHex(response.signature.s);
    const out = new Uint8Array(r.length + s.length);
    out.set(r, 0);
    out.set(s, r.length);
    return out;
  }
  return new Uint8Array();
}

/**
 * Extension that contributes a DFNS-backed key store API to a Provider, exposed
 * under `provider.key.dfns`.
 *
 * The end user's Personal Access Token (PAT) is provided via
 * `options.key.dfns.pat` and used as `Authorization: Bearer <pat>` for all
 * DFNS API calls.
 *
 * See:
 * - https://docs.dfns.co/openapi.yaml
 * - https://docs.dfns.co/api-reference/keys
 */
export const WithDfnsKeystore: Extension<DfnsKeystoreExtension> = (
  _provider,
  options: DfnsKeystoreOptions,
) => {
  if (!options?.key?.dfns) {
    throw new Error('[dfns-keystore] Missing `key.dfns` configuration.');
  }
  const config = options.key.dfns;
  const defaultKind = config.signatureKind ?? 'Hash';
  const client = new DfnsKeysClient(config);

  const api: DfnsKeystoreApi = {
    generateSignature: (keyId, body) => client.generateSignature(keyId, body),
    listAllKeys: (pageSize) => client.listAllKeys(pageSize),
    sign: async (params: DfnsSignParams): Promise<Uint8Array> => {
      const kind = params.kind ?? defaultKind;
      const body: DfnsSignatureRequestBody = params.body ?? {
        kind,
        ...(kind === 'Message' ? { message: toHex(params.data) } : { hash: toHex(params.data) }),
        ...(params.network ? { network: params.network } : {}),
      };
      const response = await client.generateSignature(params.keyId, body);
      if (response.status === 'Failed') {
        throw new Error(
          `[dfns-keystore] Signature request ${response.id} failed for key ${params.keyId}.`,
        );
      }
      return signatureBytes(response);
    },
  };

  return {
    key: {
      dfns: api,
    },
  } as DfnsKeystoreExtension;
};
