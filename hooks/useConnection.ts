import { useState, useEffect, useRef, useCallback } from 'react';
import { NativeModules, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '@tanstack/react-store';
import { SignalClient, toBase64URL } from "@algorandfoundation/liquid-client";
import { encodeAddress } from "@algorandfoundation/keystore";
import { useProvider } from '@/hooks/useProvider';
import { addMessage } from '@/stores/messages';
import { sessionsStore, addSession, updateSessionStatus, updateSessionActivity, Session } from '@/stores/sessions';

interface UseConnectionResult {
  session: Session | undefined;
  send: (text: string) => void;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  isConnected: boolean;
  lastHeartbeat: number;
  reset: () => void;
}

export function useConnection(origin: string, requestId: string): UseConnectionResult {
  const router = useRouter();
  const { accounts, keys, key } = useProvider();
  
  const [isConnected, setIsConnected] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const clientRef = useRef<SignalClient | null>(null);
  const lastUserActivityRef = useRef<number>(Date.now());

  const session = useStore(sessionsStore, (state) => 
    state.sessions.find(s => s.id === requestId)
  );

  const reset = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    setIsConnected(false);
    setIsLoading(false);
    setError(null);
    updateSessionStatus(requestId, 'closed');
  }, [requestId]);

  const send = useCallback((text: string) => {
    if (text.trim() && dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
      dataChannelRef.current.send(text.trim());
      addMessage({ text: text.trim(), sender: 'me' });
      updateSessionActivity(requestId);
      lastUserActivityRef.current = Date.now();
    }
  }, [requestId]);

  useEffect(() => {
    let active = true;
    let heartbeatInterval: any = null;
    let inactivityInterval: any = null;

    if (isConnected) {
      heartbeatInterval = setInterval(() => {
        if (dataChannelRef.current && dataChannelRef.current.readyState === 'open') {
          console.log("Sending heartbeat message");
          dataChannelRef.current.send('');
          if (active) setLastHeartbeat(Date.now());
        }
      }, 20000);

      inactivityInterval = setInterval(() => {
        const now = Date.now();
        const inactiveTime = now - lastUserActivityRef.current;
        if (inactiveTime >= 60000) {
          console.log("Closing connection due to inactivity (1 minute)");
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
        console.error("Missing origin or requestId");
        setIsLoading(false);
        return;
      }

      if (accounts.length === 0 || keys.length === 0) {
        console.log("Waiting for accounts and keys to load...");
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

      try {
        addSession({ id: requestId, origin, status: 'active', ttl: 60000 });
        
        let options: any = { autoConnect: true };
        if (NativeModules.CookieModule) {
          const cookie = await NativeModules.CookieModule.getCookie(origin);
          if (cookie) {
            options.extraHeaders = { Cookie: cookie };
          }
        }

        const client = new SignalClient(origin, options);
        clientRef.current = client;

        // Try to find the key associated with the first account, but fall back to the first available key
        let foundKey = keys.find((k) => k.id === accounts[0]?.metadata?.keyId);
        if (!foundKey && keys.length > 0) {
          foundKey = keys[0];
          console.log("Falling back to the first available key for attestation");
        }

        if (!foundKey || !foundKey.publicKey) {
          console.error("No key found for attestation. Keys:", JSON.stringify(keys.map(k => ({id: k.id, type: k.type})), null, 2));
          console.error("Accounts:", JSON.stringify(accounts.map(a => ({address: a.address, keyId: a.metadata?.keyId})), null, 2));
          throw new Error("No key found for attestation");
        }

        console.log("Found key for attestation:", foundKey.id, foundKey.type);

        await client.attestation(async (challenge) => {
          console.log("Attestation challenge received:", toBase64URL(challenge));
          try {
            const signature = await key.store.sign(foundKey.id, challenge);
            console.log("Attestation signature generated successfully");
            return {
              requestId,
              origin,
              type: 'algorand',
              address: encodeAddress(foundKey.publicKey!!),
              signature: toBase64URL(signature),
              device: 'Rocca Wallet'
            };
          } catch (signError) {
            console.error("Error during attestation signing:", signError);
            throw signError;
          }
        });

        const datachannel = await client.peer(requestId, "answer");
        dataChannelRef.current = datachannel;

        datachannel.onopen = () => {
          console.log("Data channel opened");
          if (active) {
            setIsConnected(true);
            setIsLoading(false);
            updateSessionStatus(requestId, 'active');
          }
        };

        datachannel.onmessage = (event) => {
          if (!active) return;
          console.log("Received message:", event.data);
          updateSessionActivity(requestId);
          lastUserActivityRef.current = Date.now();
          setLastHeartbeat(Date.now());
          if (event.data && event.data.trim()) {
            addMessage({ text: event.data.trim(), sender: 'peer' });
          }
        };

        datachannel.onclose = () => {
          console.log("Data channel closed");
          updateSessionStatus(requestId, 'closed');
          if (active) {
            setIsConnected(false);
            router.back();
          }
        };
        
        datachannel.onerror = (error) => {
          console.error("Data channel error:", error);
        };

      } catch (err: any) {
        console.error("Failed to setup connection:", err);
        updateSessionStatus(requestId, 'failed');
        if (active) {
          setError(err);
          setIsLoading(false);
          Alert.alert(
            "Connection Failed",
            err.message || "Failed to setup connection to the peer",
            [{ text: "OK", onPress: () => router.back() }]
          );
        }
      }
    }

    setupConnection();

    return () => {
      active = false;
      if (dataChannelRef.current) {
        dataChannelRef.current.close();
      }
    };
  }, [origin, requestId, accounts, keys, key.store, router]);

  return {
    session,
    send,
    error,
    isError: !!error,
    isLoading,
    isConnected,
    lastHeartbeat,
    reset
  };
}
