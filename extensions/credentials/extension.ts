import type { Extension } from '@algorandfoundation/wallet-provider';
import { Store } from '@tanstack/store';
import Hook from 'before-after-hook';
import {
  addCredential,
  clearCredentials,
  getCredential,
  getCredentials,
  getCredentialsByIdentity,
  getIssuanceSessionsByIdentity,
  getVerificationSessionsByIdentity,
  removeByIdentity,
  removeCredential,
  removeIssuanceSession,
  removeVerificationSession,
  upsertIssuanceSession,
  upsertVerificationSession,
  queryCredentials,
} from './store';
import type {
  Credential,
  CredentialStoreExtension,
  CredentialStoreState,
  IssuanceSession,
  VerificationSession,
} from './types';
import type { LogStoreExtension } from '@algorandfoundation/log-store';
import type { Identity, IdentityStoreExtension } from '@algorandfoundation/identities-store';
import { didKeyToJwk, parseDidKey } from './utils/did-key';
import type { JwsSigner } from './utils/signer';

/**
 * An extension that provides a credential store for managing
 * Verifiable Credentials held by the wallet and mirroring OID4VC
 * issuance / verification session state.
 *
 * Follows the same Provider/Extension pattern as
 * {@link import('@/extensions/passkeys').WithPasskeyStore} — a tanstack
 * store + before-after hooks + optional log integration.
 *
 * @example
 * ```typescript
 * const provider = new MyProvider(..., {
 *   credentials: {
 *     store: new Store({ credentials: [], issuanceSessions: [], verificationSessions: [] }),
 *     hooks: new HookCollection(),
 *   },
 * });
 * ```
 */
export const WithCredentialStore: Extension<CredentialStoreExtension> = (
  _provider: IdentityStoreExtension & Partial<LogStoreExtension>,
  options,
) => {
  const log = _provider.log;

  // Hard dependency: the credential store is meaningless without an
  // identity to scope credentials and OID4VC sessions to. We refuse
  // to mount unless the identities extension is already on the
  // provider (see SEQUENCE.md §3–6 — every credential is bound to a
  // holder `did:key`/identity).
  if (!_provider.identity?.store) {
    throw new Error(
      'WithCredentialStore requires an identities extension to be installed first ' +
        '(e.g. WithIdentityStore from @algorandfoundation/identities-store or ' +
        'WithIdentities from @algorandfoundation/identities-extension).',
    );
  }
  const identityStore = _provider.identity.store;

  const credentialStore =
    options?.credentials?.store ??
    new Store<CredentialStoreState>({
      credentials: [],
      issuanceSessions: [],
      verificationSessions: [],
    });
  const credentialHooks = options?.credentials?.hooks ?? new Hook.Collection<any>();

  // Helper: cascade-evict credentials + sessions whose identity goes
  // away. We attach as a `before` hook so that even if downstream
  // identity-store consumers fail, we don't leave dangling credential
  // material in the store.
  identityStore.hooks.before('remove', (params: unknown) => {
    const address =
      typeof params === 'string'
        ? params
        : ((params as { address?: string } | undefined)?.address ?? undefined);
    if (!address) return;
    log?.info(`cascading credential removal for identity=${address}`, {}, 'CredentialStore');
    removeByIdentity({ store: credentialStore, address });
  });

  /**
   * Bridges an `Identity` to a {@link JwsSigner} so credential
   * utilities (`signCompactJwt`, `buildSdJwtPresentation`,
   * OID4VCI holder proof, OID4VP VP token) can sign with the
   * identity's on-device key without callers having to re-plumb the
   * keystore. The identity's `sign(Uint8Array[]) → Uint8Array[]` is
   * adapted to the single-signature shape JWS expects.
   */
  const buildSignerFromIdentity = (identity: Identity): JwsSigner | undefined => {
    if (!identity.sign) return undefined;
    const did = identity.did ?? identity.address;
    let publicKeyJwk: JwsSigner['publicKeyJwk'];
    let kid: string | undefined;
    let alg = (identity.metadata?.alg as string | undefined) ?? 'EdDSA';
    try {
      const parsed = parseDidKey(did);
      publicKeyJwk = didKeyToJwk(did);
      kid = `${parsed.did}#${parsed.multibase}`;
      if (!identity.metadata?.alg) {
        alg =
          parsed.curve === 'Ed25519'
            ? 'EdDSA'
            : parsed.curve === 'P-256'
              ? 'ES256'
              : parsed.curve === 'P-384'
                ? 'ES384'
                : parsed.curve === 'secp256k1'
                  ? 'ES256K'
                  : 'EdDSA';
      }
    } catch {
      // Identity address is not a did:key (e.g. xhd address); fall
      // back to whatever caller supplies via metadata.
      publicKeyJwk = (identity.metadata?.publicKeyJwk as JwsSigner['publicKeyJwk']) ?? {
        kty: 'OKP',
      };
      kid = identity.metadata?.kid as string | undefined;
    }
    return {
      alg,
      kid,
      publicKeyJwk,
      async sign(data) {
        const signed = await identity.sign!([data]);
        if (!signed?.[0]) throw new Error('Identity signer returned no signature');
        return signed[0];
      },
    };
  };

  const credentialStoreApi = {
    addCredential: async (credential: Credential) => {
      log?.info(
        `addCredential called: id=${credential.id}, format=${credential.format}`,
        {},
        'CredentialStore',
      );
      return credentialHooks('add', addCredential, {
        store: credentialStore,
        credential,
      });
    },
    removeCredential: async (id: string) => {
      log?.info(`removeCredential called: id=${id}`, {}, 'CredentialStore');
      return credentialHooks('remove', removeCredential, {
        store: credentialStore,
        id,
      });
    },
    getCredential: async (id: string) => {
      log?.debug(`getCredential called: id=${id}`, {}, 'CredentialStore');
      return credentialHooks('get', getCredential, {
        store: credentialStore,
        id,
      });
    },
    getCredentials: async () => {
      log?.debug('getCredentials called', {}, 'CredentialStore');
      return credentialHooks('list', getCredentials, {
        store: credentialStore,
      });
    },
    getCredentialsByIdentity: async (address: string) => {
      log?.debug(`getCredentialsByIdentity called: address=${address}`, {}, 'CredentialStore');
      return credentialHooks('listByIdentity', getCredentialsByIdentity, {
        store: credentialStore,
        address,
      });
    },
    query: async (queries: any[]) => {
      log?.debug('query called', { queries }, 'CredentialStore');
      return credentialHooks('query', queryCredentials, {
        store: credentialStore,
        queries,
      });
    },
    getIssuanceSessionsByIdentity: async (address: string) => {
      log?.debug(`getIssuanceSessionsByIdentity called: address=${address}`, {}, 'CredentialStore');
      return credentialHooks('listIssuanceSessionsByIdentity', getIssuanceSessionsByIdentity, {
        store: credentialStore,
        address,
      });
    },
    getVerificationSessionsByIdentity: async (address: string) => {
      log?.debug(
        `getVerificationSessionsByIdentity called: address=${address}`,
        {},
        'CredentialStore',
      );
      return credentialHooks(
        'listVerificationSessionsByIdentity',
        getVerificationSessionsByIdentity,
        { store: credentialStore, address },
      );
    },
    removeByIdentity: async (address: string) => {
      log?.info(`removeByIdentity called: address=${address}`, {}, 'CredentialStore');
      return credentialHooks('removeByIdentity', removeByIdentity, {
        store: credentialStore,
        address,
      });
    },
    getSignerForIdentity: async (address: string) => {
      log?.debug(`getSignerForIdentity called: address=${address}`, {}, 'CredentialStore');
      const identity = await identityStore.getIdentity(address);
      if (!identity) return undefined;
      return buildSignerFromIdentity(identity);
    },
    upsertIssuanceSession: async (session: IssuanceSession) => {
      log?.info(
        `upsertIssuanceSession called: id=${session.id}, state=${session.state}`,
        {},
        'CredentialStore',
      );
      return credentialHooks('upsertIssuanceSession', upsertIssuanceSession, {
        store: credentialStore,
        session,
      });
    },
    removeIssuanceSession: async (id: string) => {
      log?.info(`removeIssuanceSession called: id=${id}`, {}, 'CredentialStore');
      return credentialHooks('removeIssuanceSession', removeIssuanceSession, {
        store: credentialStore,
        id,
      });
    },
    upsertVerificationSession: async (session: VerificationSession) => {
      log?.info(
        `upsertVerificationSession called: id=${session.id}, state=${session.state}`,
        {},
        'CredentialStore',
      );
      return credentialHooks('upsertVerificationSession', upsertVerificationSession, {
        store: credentialStore,
        session,
      });
    },
    removeVerificationSession: async (id: string) => {
      log?.info(`removeVerificationSession called: id=${id}`, {}, 'CredentialStore');
      return credentialHooks('removeVerificationSession', removeVerificationSession, {
        store: credentialStore,
        id,
      });
    },
    clear: async () => {
      log?.info('clear called', {}, 'CredentialStore');
      return credentialHooks('clear', clearCredentials, {
        store: credentialStore,
      });
    },
    hooks: credentialHooks,
  };

  return {
    ..._provider,
    get credentials() {
      return credentialStore.state.credentials;
    },
    get issuanceSessions() {
      return credentialStore.state.issuanceSessions;
    },
    get verificationSessions() {
      return credentialStore.state.verificationSessions;
    },
    credential: {
      store: credentialStoreApi,
    },
  } as CredentialStoreExtension;
};
