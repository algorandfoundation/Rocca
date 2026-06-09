import { useProvider } from '@/hooks/useProvider';
import { accountsStore } from '@/stores/accounts';
import { keyStore } from '@/stores/keystore';
import { addMessage, addToolActivity, setThreadHistory } from '@/stores/messages';
import { addAc2Message } from '@/stores/ac2Messages';
import { Ac2Client } from '@algorandfoundation/ac2-sdk';
import type { AC2BaseMessage as Ac2Message } from '@algorandfoundation/ac2-sdk/schema';
import {
  attachHeartbeatChannel,
  createAc2Client,
  createAc2Transport,
  DEFAULT_THID,
  generateThid,
  parseStreamControlFrame,
  sendConversationClose,
  sendConversationOpen,
} from '@/lib/ac2';
import {
  addSession,
  Session,
  sessionsStore,
  updateSessionActivity,
  updateSessionStatus,
} from '@/stores/sessions';
import { decodeAddress } from '@/utils/algorand';
import { toUrlSafe } from '@/utils/base64';
import type { KeyData } from '@algorandfoundation/keystore';
import { encodeAddress } from '@algorandfoundation/keystore';
import { assertion, encoding, SignalClient } from '@algorandfoundation/liquid-client';
import {
  encode,
  encryptData,
  fetchSecret,
  getMasterKey,
  storage,
} from '@algorandfoundation/react-native-keystore';
import { Buffer } from 'buffer';
import { useStore } from '@tanstack/react-store';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, NativeModules } from 'react-native';

/**
 * Re-encrypt a key record with the supplied master key and reflect the new
 * metadata in the reactive key store, bypassing the keystore library's
 * `commit()` (which would re-fetch the master key and prompt again).
 */
function persistKeyMetadata(keyData: KeyData, masterKey: Buffer): void {
  // Re-encrypt the full key record (incl. private material) and store it.
  storage.set(keyData.id, encryptData(Buffer.from(masterKey), encode(keyData)));
  // Reflect the metadata change in the reactive store without leaking the
  // private key/seed, de-duplicating by id so we don't append a stale copy.
  const { privateKey, seed, ...keyState } = keyData as any;
  void privateKey;
  void seed;
  keyStore.setState((state) => ({
    ...state,
    keys: [{ ...keyState }, ...state.keys.filter((k) => k.id !== keyState.id)],
  }));
}

interface UseConnectionResult {
  session: Session | undefined;
  address: string | null;
  /** Send a free-text chat message over the DataChannel. */
  send: (text: string) => void;
  /** Send an AC2 envelope; mirrored into `ac2MessagesStore` as `outbound`. */
  sendAc2: (message: Ac2Message) => void;
  /** Active `Ac2Client`; `null` until the `ac2-v1` channel is open. */
  ac2Client: Ac2Client | null;
  activeStreamText: string;
  /** Ephemeral agent presence from `ac2-stream` control frames. */
  agentPresence: 'thinking' | 'tool' | 'typing' | null;
  /** Optional detail for the current presence (e.g. tool name). */
  agentPresenceDetail: string | null;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  isConnected: boolean;
  lastHeartbeat: number;
  reset: () => void;
  /** Active conversation `thid`; defaults to `'default'`. */
  activeThid: string;
  /** Open/switch to a thread; sends `ac2/ConversationOpen`. Returns the `thid`. */
  openConversation: (thid?: string, title?: string) => string;
  /** Close a thread; sends `ac2/ConversationClose`. */
  closeConversation: (thid: string) => void;
  /** Threads the agent advertised on connect (`conversations` control frame). */
  remoteThreads: { thid: string; title?: string; updatedAt?: number }[];
}

export function useConnection(origin: string, requestId: string): UseConnectionResult {
  const router = useRouter();
  const { accounts, keys, key, passkey, sessions } = useProvider();

  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const addressRef = useRef<string | null>(null);

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  const [lastHeartbeat, setLastHeartbeat] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const streamChannelRef = useRef<RTCDataChannel | null>(null);
  // Dedicated `ac2-heartbeat` liveness channel — out-of-band relative to `ac2-v1`.
  const heartbeatChannelRef = useRef<RTCDataChannel | null>(null);
  const clientRef = useRef<SignalClient | null>(null);
  const lastUserActivityRef = useRef<number>(Date.now());
  const authFlowInProgressRef = useRef<boolean>(false);

  // Active conversation thread; the ref mirror lets DataChannel handlers see the live value.
  const [activeThid, setActiveThid] = useState<string>(DEFAULT_THID);
  const activeThidRef = useRef<string>(DEFAULT_THID);
  useEffect(() => {
    activeThidRef.current = activeThid;
  }, [activeThid]);

  const [activeStreamText, setActiveStreamText] = useState<string>('');
  // Ephemeral presence from agent stream-channel control frames.
  const [agentPresence, setAgentPresence] = useState<'thinking' | 'tool' | 'typing' | null>(null);
  const [agentPresenceDetail, setAgentPresenceDetail] = useState<string | null>(null);
  // Threads the agent advertised on connect (`conversations` control frame).
  const [remoteThreads, setRemoteThreads] = useState<
    { thid: string; title?: string; updatedAt?: number }[]
  >([]);

  // AC2 SDK client; bound once the `ac2-v1` DataChannel opens.
  const [ac2Client, setAc2Client] = useState<Ac2Client | null>(null);
  const ac2ClientRef = useRef<Ac2Client | null>(null);

  const session = useStore(sessionsStore, (state) =>
    state.sessions.find((s) => s.id === requestId && s.origin === origin),
  );

  const reset = useCallback(() => {
    if (ac2ClientRef.current) {
      // Closing the client closes the underlying transport, which closes
      // the DataChannel. Guard against double-close below.
      try {
        ac2ClientRef.current.close();
      } catch {
        /* noop */
      }
      ac2ClientRef.current = null;
      setAc2Client(null);
    }
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (streamChannelRef.current) {
      streamChannelRef.current.close();
      streamChannelRef.current = null;
    }
    if (heartbeatChannelRef.current) {
      heartbeatChannelRef.current.close();
      heartbeatChannelRef.current = null;
    }
    setActiveStreamText('');
    setAgentPresence(null);
    setAgentPresenceDetail(null);
    setIsConnected(false);
    setIsLoading(false);
    setError(null);
    updateSessionStatus(requestId, origin, 'closed');
  }, [requestId, origin]);

  const send = useCallback(
    (text: string) => {
      const channel = streamChannelRef.current || dataChannelRef.current;
      if (text.trim() && channel && channel.readyState === 'open' && address) {
        const thid = activeThidRef.current;
        // Tag the wire frame with the active `thid` so the agent routes it without
        // racing the separately-delivered `ac2/ConversationOpen` control frame.
        channel.send(JSON.stringify({ thid, text: text.trim() }));
        addMessage({
          text: text.trim(),
          sender: 'me',
          address,
          origin,
          requestId,
          thid,
        });
        updateSessionActivity(requestId, origin);
        lastUserActivityRef.current = Date.now();
      }
    },
    [requestId, origin, address],
  );

  // Multi-conversation control plane — sends `ac2/Conversation{Open,Close}`
  // envelopes (see `lib/ac2/conversations.ts`) and tracks the active `thid`.
  const openConversation = useCallback(
    (thid?: string, title?: string): string => {
      const nextThid = thid && thid.length > 0 ? thid : generateThid();
      sendConversationOpen(
        { getClient: () => ac2ClientRef.current, getAddress: () => address },
        nextThid,
        title,
      );
      setActiveThid(nextThid);
      activeThidRef.current = nextThid;
      updateSessionActivity(requestId, origin);
      lastUserActivityRef.current = Date.now();
      return nextThid;
    },
    [origin, requestId, address],
  );

  const closeConversation = useCallback(
    (thid: string): void => {
      sendConversationClose(
        { getClient: () => ac2ClientRef.current, getAddress: () => address },
        thid,
      );
      if (activeThidRef.current === thid) {
        setActiveThid(DEFAULT_THID);
        activeThidRef.current = DEFAULT_THID;
      }
      lastUserActivityRef.current = Date.now();
    },
    [address],
  );

  const sendAc2 = useCallback(
    (message: Ac2Message) => {
      const client = ac2ClientRef.current;
      if (!client) {
        throw new Error('AC2 client not ready (DataChannel not open)');
      }
      client.send(message);
      addAc2Message({
        origin,
        requestId,
        address: address ?? '',
        direction: 'outbound',
        // Scope the protocol envelope to the active conversation thread.
        thid: activeThidRef.current,
        envelope: message,
      });
      updateSessionActivity(requestId, origin);
      lastUserActivityRef.current = Date.now();
    },
    [origin, requestId, address],
  );

  useEffect(() => {
    let active = true;
    let heartbeatInterval: any = null;
    let inactivityInterval: any = null;

    if (isConnected) {
      heartbeatInterval = setInterval(() => {
        // Prefer the `ac2-heartbeat` channel; fall back to the control channel
        // (empty frame) if the peer didn't negotiate it.
        const hb = heartbeatChannelRef.current;
        if (hb && hb.readyState === 'open') {
          console.log('Sending heartbeat ping');
          hb.send('ping');
          if (active) setLastHeartbeat(Date.now());
        } else if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
          console.log('Sending heartbeat message');
          dataChannelRef.current.send('');
          if (active) setLastHeartbeat(Date.now());
        }
      }, 20000);

      inactivityInterval = setInterval(() => {
        const now = Date.now();
        const inactiveTime = now - lastUserActivityRef.current;
        if (inactiveTime >= 60000) {
          console.log('Closing connection due to inactivity (1 minute)');
          if (dataChannelRef.current) {
            dataChannelRef.current.close();
          }
          if (active) {
            setIsConnected(false);
            router.back();
          }
        }
      }, 5000);
    }

    return () => {
      active = false;
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (inactivityInterval) clearInterval(inactivityInterval);
    };
  }, [isConnected, router]);

  useEffect(() => {
    let active = true;

    async function setupConnection() {
      if (!origin || !requestId) {
        console.error('Missing origin or requestId');
        setIsLoading(false);
        return;
      }

      if (authFlowInProgressRef.current) {
        console.log('Auth flow already in progress, skipping duplicate setup');
        return;
      }

      if (accountsStore.state.accounts.length === 0 || keyStore.state.keys.length === 0) {
        console.log('Waiting for accounts and keys to load...');
        // If it's been loading for more than a few seconds, it might really be empty
        // but typically it's better to wait for them to be non-empty.
        return;
      }

      // If we are already connecting or connected, don't start again
      if (clientRef.current || isConnected) {
        return;
      }

      setIsLoading(true);
      setError(null);
      authFlowInProgressRef.current = true;

      try {
        const currentSessions = sessionsStore.state.sessions;
        const currentKeys = keyStore.state.keys;
        const currentAccounts = accountsStore.state.accounts;

        const existingSession = currentSessions.find(
          (s) => s.id === requestId && s.origin === origin,
        );
        if (!existingSession) {
          // Persist the connection durably (no TTL) so it survives app
          // restarts and can be reconnected/renegotiated later using the same
          // requestId — mirroring how the OpenClaw plugin persists connections.
          addSession({ id: requestId, origin, status: 'active' });
        } else if (existingSession.status !== 'active') {
          updateSessionStatus(requestId, origin, 'active');
        }

        // Try to find the key associated with the first account, but fall back to the first available key
        let foundKey = currentKeys.find((k) => k.id === currentAccounts[0]?.metadata?.keyId);
        if (!foundKey && currentKeys.length > 0) {
          foundKey = currentKeys[0];
          console.log('Falling back to the first available key for attestation');
        }

        if (!foundKey || !foundKey.publicKey) {
          console.error(
            'No key found for attestation. Keys:',
            JSON.stringify(
              currentKeys.map((k) => ({ id: k.id, type: k.type })),
              null,
              2,
            ),
          );
          console.error(
            'Accounts:',
            JSON.stringify(
              currentAccounts.map((a) => ({ address: a.address, keyId: a.metadata?.keyId })),
              null,
              2,
            ),
          );
          throw new Error('No key found for attestation');
        }

        console.log('Found key for attestation:', foundKey.id, foundKey.type);

        const sessionCheck = await fetch(`${origin}/auth/session`);
        if (!active) return;
        console.log('Initial session status:', sessionCheck.ok);

        const currentPasskeys = await passkey.store.getPasskeys();
        const relevantPasskeys = currentPasskeys.filter((p) => {
          const storedOrigin = p.metadata?.origin;
          if (!storedOrigin) return false;
          try {
            const storedHost = storedOrigin.includes('://')
              ? new URL(storedOrigin).host
              : storedOrigin;
            const currentHost = origin.includes('://') ? new URL(origin).host : origin;
            return storedHost === currentHost;
          } catch {
            return storedOrigin === origin;
          }
        });

        if (relevantPasskeys.length > 0) {
          const firstPasskey = relevantPasskeys[0];
          console.log(
            'Found existing passkeys for origin, using first one for options request:',
            firstPasskey.id,
          );
          // TODO: move options upstream
          const optionsResponse = await fetch(`${origin}/assertion/request/${firstPasskey.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userVerification: 'required',
            }),
          });

          if (!active) return;

          if (!optionsResponse.ok) {
            throw new Error(
              `Failed to get assertion request: ${optionsResponse.status} ${optionsResponse.statusText}`,
            );
          }

          const options = await optionsResponse.json();
          if (!active) return;
          const decodedOptions = assertion.encoder.decodeOptions(options);

          // Ensure all relevant passkeys are allowed in the options to allow user selection in the intent
          if (relevantPasskeys.length > 1) {
            if (!decodedOptions.allowCredentials) {
              decodedOptions.allowCredentials = [];
            }
            const existingIds = new Set(
              decodedOptions.allowCredentials.map((c) =>
                encoding.toBase64URL(new Uint8Array(c.id as ArrayBuffer)),
              ),
            );
            relevantPasskeys.forEach((p) => {
              if (!existingIds.has(p.id)) {
                decodedOptions.allowCredentials!.push({
                  id: encoding.fromBase64Url(p.id),
                  type: 'public-key',
                });
              }
            });
          }

          const challenge = encoding.fromBase64Url(options.challenge);

          const liquidOptions = {
            requestId,
            origin,
            type: 'algorand',
            address: encodeAddress(foundKey?.publicKey),
            signature: encoding.toBase64URL(await key.store.sign(foundKey.id, challenge)),
            device: 'Demo Web Wallet',
          };

          const credential = (await navigator.credentials.get({
            publicKey: decodedOptions,
          })) as any;
          if (!active) return;
          authFlowInProgressRef.current = false;

          if (!credential) {
            throw new Error('Credential creation failed');
          }

          const currentPasskeys = await passkey.store.getPasskeys();
          let selectedAddress: string | null = null;
          if (credential.response?.userHandle) {
            try {
              selectedAddress = encodeAddress(new Uint8Array(credential.response.userHandle));
            } catch (e) {
              console.error('Failed to encode address from userHandle', e);
            }
          }

          if (!selectedAddress) {
            const matchedPasskey =
              relevantPasskeys.find((p) => p.id === credential.id) ||
              currentPasskeys.find((p) => p.id === credential.id);
            const userHandle = matchedPasskey?.metadata?.userHandle;
            if (userHandle) {
              try {
                // Handle different possible formats of userHandle in store (Uint8Array or serialized object)
                const handleArray =
                  userHandle instanceof Uint8Array
                    ? userHandle
                    : typeof userHandle === 'object'
                      ? new Uint8Array(Object.values(userHandle))
                      : null;
                if (handleArray) {
                  selectedAddress = encodeAddress(handleArray);
                }
              } catch (e) {
                console.error('Failed to encode address from stored userHandle', e);
              }
            }
          }

          if (selectedAddress) {
            console.log('Selected address from passkey:', selectedAddress);
            setAddress(selectedAddress);
            addressRef.current = selectedAddress;
            liquidOptions.address = selectedAddress;

            // Re-sign the challenge if the address changed to match the selected passkey
            const selectedPublicKey = decodeAddress(selectedAddress).publicKey;
            const selectedKey = keyStore.state.keys.find(
              (k) =>
                k.publicKey &&
                k.publicKey.length === selectedPublicKey.length &&
                k.publicKey.every((v, i) => v === selectedPublicKey[i]),
            );

            if (selectedKey) {
              console.log('Found key for selected address, re-signing challenge');
              liquidOptions.signature = encoding.toBase64URL(
                await key.store.sign(selectedKey.id, challenge),
              );
            } else {
              console.warn('Could not find key for selected address', selectedAddress);
            }
          }

          const encodedCredential = assertion.encoder.encodeCredential(credential);
          encodedCredential.clientExtensionResults = {
            ...encodedCredential.clientExtensionResults,
            liquid: liquidOptions,
          } as any;

          const submitResponse = await fetch(`${origin}/assertion/response`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(encodedCredential),
          });

          if (!submitResponse.ok) {
            throw new Error(
              `Failed to submit assertion response: ${submitResponse.status} ${submitResponse.statusText}`,
            );
          }

          const matchedPasskey = currentPasskeys.find((p) => p.id === credential.id);
          const matchedKey =
            keyStore.state.keys.find((k) => k.id === matchedPasskey?.metadata?.keyId) ||
            keyStore.state.keys.find((k) => toUrlSafe(k.id) === credential.id);

          if (matchedKey) {
            try {
              // Pass a defensive copy via `options.masterKey` so `fetchSecret`
              // can zero its own buffer in `finally` without wiping ours.
              const masterKey = await getMasterKey();
              const keyData = await fetchSecret<KeyData>({
                keyId: matchedKey.id,
                options: { masterKey: Buffer.from(masterKey) },
              });
              if (keyData) {
                keyData.metadata = { ...keyData.metadata, registered: true };
                persistKeyMetadata(keyData, masterKey);
              }
            } catch (error) {
              console.error('Failed to update key metadata after assertion:', error);
            }
          }
        } else {
          console.log('No existing passkey for origin, using attestation');

          const optionsResponse = await fetch(`${origin}/attestation/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              attestationType: 'none',
              authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'required',
                residentKey: 'required',
                requireResidentKey: true,
              },
              extensions: {
                liquid: true,
              },
            }),
          });

          if (!active) return;

          if (!optionsResponse.ok) {
            throw new Error(
              `Failed to get attestation request: ${optionsResponse.status} ${optionsResponse.statusText}`,
            );
          }

          const encodedAttestationOptions = await optionsResponse.json();
          if (!active) return;
          const challenge = encoding.fromBase64Url(encodedAttestationOptions.challenge);

          const liquidOptions = {
            requestId,
            origin: origin,
            type: 'algorand',
            address: encodeAddress(foundKey?.publicKey),
            signature: encoding.toBase64URL(await key.store.sign(foundKey.id, challenge)),
            device: 'Demo Web Wallet',
          };

          const decodedPublicKey = {
            ...encodedAttestationOptions,
            user: {
              ...encodedAttestationOptions.user,
              id: decodeAddress(liquidOptions.address).publicKey,
              name: liquidOptions.address,
              displayName: liquidOptions.address,
            },
            challenge: encoding.fromBase64Url(encodedAttestationOptions.challenge),
            excludeCredentials: encodedAttestationOptions.excludeCredentials?.map((cred: any) => ({
              ...cred,
              id: encoding.fromBase64Url(cred.id),
            })),
          };

          const credential = (await navigator.credentials.create({
            publicKey: decodedPublicKey,
          })) as any;
          if (!active) return;
          authFlowInProgressRef.current = false;

          if (!credential) {
            throw new Error('Credential creation failed');
          }

          setAddress(liquidOptions.address);
          addressRef.current = liquidOptions.address;

          const response = credential.response;
          const encodedCredential = {
            id: credential.id,
            rawId: encoding.toBase64URL(credential.rawId),
            type: credential.type,
            response: {
              clientDataJSON: encoding.toBase64URL(response.clientDataJSON),
              attestationObject: encoding.toBase64URL(response.attestationObject),
              clientExtensionResults: response.clientExtensionResults || {},
            },
            clientExtensionResults: {
              ...(credential.getClientExtensionResults
                ? credential.getClientExtensionResults()
                : credential.clientExtensionResults || {}),
              liquid: liquidOptions,
            },
          };

          const submitResponse = await fetch(`${origin}/attestation/response`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(encodedCredential),
          });

          if (!active) return;

          if (!submitResponse.ok) {
            throw new Error(
              `Failed to submit attestation response: ${submitResponse.status} ${submitResponse.statusText}`,
            );
          }

          const currentPasskeys = await passkey.store.getPasskeys();
          const matchedPasskey = currentPasskeys.find((p) => p.id === credential.id);
          const matchedKey =
            keyStore.state.keys.find((k) => k.id === matchedPasskey?.metadata?.keyId) ||
            keyStore.state.keys.find((k) => toUrlSafe(k.id) === credential.id);

          if (matchedKey) {
            try {
              // Pass a defensive copy via `options.masterKey` so `fetchSecret`
              // can zero its own buffer in `finally` without wiping ours.
              const masterKey = await getMasterKey();
              const keyData = await fetchSecret<KeyData>({
                keyId: matchedKey.id,
                options: { masterKey: Buffer.from(masterKey) },
              });
              if (keyData) {
                keyData.metadata = { ...keyData.metadata, registered: true };
                persistKeyMetadata(keyData, masterKey);
              }
            } catch (error) {
              console.error('Failed to update key metadata after attestation:', error);
            }
          }
        }

        // Final validation of the session before connecting
        const finalSessionCheck = await fetch(`${origin}/auth/session`);

        if (!active) return;

        if (finalSessionCheck.ok) {
          const sessionData = await finalSessionCheck.json();

          if (!active) return;

          if (sessionData.address) {
            setAddress(sessionData.address);
            addressRef.current = sessionData.address;
          }
        } else {
          console.log('Session validation failed (ignored for debugging)');
        }

        let options: any = { autoConnect: true };
        if (NativeModules.CookieModule) {
          const cookie = await NativeModules.CookieModule.getCookie(origin);

          if (!active) return;

          if (cookie) {
            options.extraHeaders = { Cookie: cookie };
          }
        }

        const client = new SignalClient(origin, options);

        if (!active) return;

        clientRef.current = client;
        //@ts-ignore
        client.authenticated = true;

        // Apply one STX-prefixed control frame from the agent's stream channel.
        // See `lib/ac2/stream.ts` for the frame shapes. Returns true when `raw`
        // was a control frame (recognized or malformed) — never render as chat.
        const applyControlFrame = (raw: string): boolean => {
          const parsed = parseStreamControlFrame(raw);
          if (parsed === null) return false;
          // Any inbound control frame means the agent is alive — reset the
          // inactivity watchdog so a long "thinking" turn is never torn down.
          lastUserActivityRef.current = Date.now();
          if (parsed === undefined) return true; // malformed payload, swallow
          const frame: any = parsed;
          const fthid: string =
            typeof frame?.thid === 'string' && frame.thid.length > 0
              ? frame.thid
              : activeThidRef.current;
          const isActiveThread = fthid === activeThidRef.current;
          switch (frame?.t) {
            case 'preview': {
              // Live draft for `fthid`; only reflect it in the on-screen UI
              // when it belongs to the conversation currently open.
              if (isActiveThread) {
                if (frame.phase === 'tool') {
                  setAgentPresence('tool');
                  setAgentPresenceDetail(typeof frame.detail === 'string' ? frame.detail : null);
                } else if (frame.phase === 'typing') {
                  setAgentPresence('typing');
                  setAgentPresenceDetail(null);
                } else {
                  // `thinking` (and any unknown phase) → thinking indicator.
                  setAgentPresence('thinking');
                  setAgentPresenceDetail(null);
                }
                if (typeof frame.text === 'string') setActiveStreamText(frame.text);
              }
              break;
            }
            case 'finalize': {
              // Commit the streamed draft in place as the agent's message for
              // its thread; clear the live preview if it's the active thread.
              const text = typeof frame.text === 'string' ? frame.text.trim() : '';
              if (text && addressRef.current) {
                addMessage({
                  text,
                  sender: 'peer',
                  address: addressRef.current,
                  origin,
                  requestId,
                  thid: fthid,
                });
                updateSessionActivity(requestId, origin);
                setLastHeartbeat(Date.now());
              }
              if (isActiveThread) {
                setActiveStreamText('');
                setAgentPresence(null);
                setAgentPresenceDetail(null);
              }
              break;
            }
            case 'discard': {
              if (isActiveThread) {
                setActiveStreamText('');
                setAgentPresence(null);
                setAgentPresenceDetail(null);
              }
              break;
            }
            case 'conversations': {
              if (Array.isArray(frame.threads)) {
                // The agent advertised the conversations it already holds for
                // this connection. Surface them so the controller can show
                // (and restore) threads it has no local copy of.
                setRemoteThreads(
                  frame.threads
                    .filter((t: any) => typeof t?.thid === 'string' && t.thid.length > 0)
                    .map((t: any) => ({
                      thid: t.thid as string,
                      ...(typeof t.title === 'string' ? { title: t.title } : {}),
                      ...(typeof t.updatedAt === 'number' ? { updatedAt: t.updatedAt } : {}),
                    })),
                );
              }
              break;
            }
            case 'tool': {
              // Durable tool-activity card: a record of one tool/exec step the
              // agent ran. Persist it (de-duped by the agent-supplied id) so it
              // renders as a distinct "tool card" in the thread's timeline,
              // independent of the ephemeral `preview` (phase tool) indicator.
              if (typeof frame.id === 'string' && addressRef.current) {
                addToolActivity({
                  toolId: frame.id,
                  address: addressRef.current,
                  origin,
                  requestId,
                  thid: fthid,
                  ...(typeof frame.name === 'string' ? { tool: frame.name } : {}),
                  ...(typeof frame.command === 'string' ? { command: frame.command } : {}),
                  ...(typeof frame.output === 'string' ? { output: frame.output } : {}),
                });
                updateSessionActivity(requestId, origin);
              }
              break;
            }
            case 'history': {
              if (
                typeof frame.thid === 'string' &&
                Array.isArray(frame.messages) &&
                addressRef.current
              ) {
                // The agent replayed an existing conversation's history (e.g.
                // after we opened/switched to it). Restore it into the local
                // store, idempotently replacing our copy of that thread.
                const history = frame.messages
                  .filter(
                    (m: any) =>
                      (m?.role === 'user' || m?.role === 'assistant' || m?.role === 'tool') &&
                      (typeof m?.text === 'string' || m?.role === 'tool'),
                  )
                  .map((m: any) => {
                    if (m.role === 'tool') {
                      // A persisted tool/exec card replayed by the agent — carry
                      // through its id (so it coalesces with live frames) and
                      // tool/command/output fields.
                      return {
                        role: 'tool' as const,
                        text: '',
                        ...(typeof m.id === 'string' ? { toolId: m.id } : {}),
                        ...(typeof m.name === 'string' ? { tool: m.name } : {}),
                        ...(typeof m.command === 'string' ? { command: m.command } : {}),
                        ...(typeof m.output === 'string' ? { output: m.output } : {}),
                        ...(typeof m.at === 'number' ? { at: m.at } : {}),
                      };
                    }
                    return {
                      role: m.role as 'user' | 'assistant',
                      text: m.text as string,
                      ...(typeof m.at === 'number' ? { at: m.at } : {}),
                    };
                  });
                setThreadHistory(addressRef.current, origin, requestId, frame.thid, history);
              }
              break;
            }
            default:
              break;
          }
          return true;
        };

        const { datachannel } = await createAc2Transport({
          requestId,
          signalClient: client,
          onSideChannel: (channel) => {
            console.log(`[ac2] Discovered channel: ${channel.label}`);
            if (channel.label === 'ac2-heartbeat') {
              heartbeatChannelRef.current = attachHeartbeatChannel(channel, {
                onPing: () => {
                  if (!active) return;
                  lastUserActivityRef.current = Date.now();
                  setLastHeartbeat(Date.now());
                },
              });
              return;
            }
            if (channel.label === 'ac2-stream') {
              streamChannelRef.current = channel;
              channel.onmessage = (event) => {
                if (!active) return;
                if (typeof event.data === 'string') applyControlFrame(event.data);
              };
              channel.onopen = () => console.log('Stream channel opened');
              channel.onclose = () => console.log('Stream channel closed');
            }
          },
        });

        if (!active) {
          client.close();
          return;
        }

        dataChannelRef.current = datachannel;

        // Wallet-side responders (`onSigningRequest` / `onKeyRequest`) are
        // intentionally NOT installed: inbound envelopes are mirrored into
        // `ac2MessagesStore` by `createAc2Client` and `app/chat.tsx` handles
        // approve/reject interactively against the visible store entry.
        const { client: ac2 } = createAc2Client({
          datachannel,
          origin,
          requestId,
          getAddress: () => addressRef.current,
          getActiveThid: () => activeThidRef.current,
          onInboundEnvelope: () => {
            updateSessionActivity(requestId, origin);
            lastUserActivityRef.current = Date.now();
            setLastHeartbeat(Date.now());
          },
          onRawMessage: (raw: string) => {
            if (applyControlFrame(raw)) return;
            if (!raw.trim() || !addressRef.current) return;
            addMessage({
              text: raw.trim(),
              sender: 'peer',
              address: addressRef.current,
              origin,
              requestId,
              thid: activeThidRef.current,
            });
            updateSessionActivity(requestId, origin);
            lastUserActivityRef.current = Date.now();
            setLastHeartbeat(Date.now());
          },
          onOpen: () => {
            console.log('Data channel opened');
            if (active) {
              setIsConnected(true);
              setIsLoading(false);
              setAc2Client(ac2);
              updateSessionStatus(requestId, origin, 'active');
            }
          },
          onClose: () => {
            console.log('Data channel closed');
            updateSessionStatus(requestId, origin, 'closed');
            if (active) {
              setIsConnected(false);
              setAc2Client(null);
              ac2ClientRef.current = null;
              router.back();
            }
          },
        });
        ac2ClientRef.current = ac2;
      } catch (err: any) {
        console.error('Failed to setup connection:', err);
        clientRef.current = null;
        updateSessionStatus(requestId, origin, 'failed');
        if (active) {
          setError(err);
          setIsLoading(false);
          Alert.alert(
            'Connection Failed',
            err.message || 'Failed to setup connection to the peer',
            [{ text: 'OK', onPress: () => router.back() }],
          );
        }
      } finally {
        authFlowInProgressRef.current = false;
      }
    }

    setupConnection();

    return () => {
      active = false;
      if (ac2ClientRef.current) {
        try {
          ac2ClientRef.current.close();
        } catch {
          /* noop */
        }
        ac2ClientRef.current = null;
      }
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
        dataChannelRef.current = null;
      }
      if (clientRef.current) {
        clientRef.current.close();
        clientRef.current = null;
      }
    };
  }, [origin, requestId, router, accounts.length > 0, keys.length > 0]);

  return {
    session,
    address,
    send,
    sendAc2,
    ac2Client,
    activeStreamText,
    agentPresenceDetail,
    agentPresence,
    error,
    isError: !!error,
    isLoading,
    isConnected,
    lastHeartbeat,
    reset,
    activeThid,
    openConversation,
    closeConversation,
    remoteThreads,
  };
}
