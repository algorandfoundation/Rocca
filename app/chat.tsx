import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Buffer } from 'buffer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '@tanstack/react-store';
import { buildSigningRejected, buildSigningResponse } from '@algorandfoundation/ac2-sdk/protocol';
import type { AC2SigningRequest as SigningRequestMessage } from '@algorandfoundation/ac2-sdk/schema';
import { messagesStore, Message, clearMessages } from '@/stores/messages';
import { ac2MessagesStore, Ac2MessageEntry, clearAc2Messages } from '@/stores/ac2Messages';
import { useConnection } from '@/hooks/useConnection';
import { useProvider } from '@/hooks/useProvider';
import { keyStore } from '@/stores/keystore';
import { decodeAddress } from '@/utils/algorand';

// Unified timeline entry — keeps free-text chat and AC2 protocol messages
// in the same scroll view while preserving their distinct typing/rendering.
type TimelineEntry =
  | { kind: 'text'; id: string; timestamp: number; data: Message }
  | { kind: 'ac2'; id: string; timestamp: number; data: Ac2MessageEntry };

export default function ChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ origin: string; requestId: string }>();
  const [inputText, setInputText] = useState('');
  const {
    isConnected,
    isLoading,
    isError,
    send,
    sendAc2,
    lastHeartbeat,
    reset,
    address,
    activeStreamText,
  } = useConnection(params.origin || '', params.requestId || '');
  const { key } = useProvider();

  const textMessages = useStore(messagesStore, (state) =>
    state.messages.filter(
      (m) =>
        m.origin === params.origin &&
        m.requestId === params.requestId &&
        (address ? m.address === address : true),
    ),
  );

  const ac2Messages = useStore(ac2MessagesStore, (state) =>
    state.messages.filter((m) => m.origin === params.origin && m.requestId === params.requestId),
  );

  // A SigningRequest is "actioned" once we have a matching outbound response
  // or rejection on the same `thid` (the SDK builders thread `thid = request.id`).
  // This survives reloads because it's derived from the persisted ac2 store.
  const actionedRequestIds = useMemo(() => {
    const set = new Set<string>();
    for (const m of ac2Messages) {
      if (m.direction !== 'outbound') continue;
      const t = m.envelope.type;
      if (t === 'ac2/SigningResponse' || t === 'ac2/SigningRejected') {
        if (m.envelope.thid) set.add(m.envelope.thid);
      }
    }
    return set;
  }, [ac2Messages]);

  const handleApprove = async (req: SigningRequestMessage) => {
    try {
      if (!address) throw new Error('No active address');
      const publicKey = decodeAddress(address).publicKey;
      const matchedKey = keyStore.state.keys.find(
        (k) =>
          k.publicKey &&
          k.publicKey.length === publicKey.length &&
          k.publicKey.every((v, i) => v === publicKey[i]),
      );
      if (!matchedKey || !matchedKey.publicKey) {
        throw new Error('No matching key for active address');
      }

      const payloadBytes = new Uint8Array(Buffer.from(req.body.payload, 'base64'));
      const sigBytes: Uint8Array = await key.store.sign(matchedKey.id, payloadBytes);

      const toB64 = (bytes: Uint8Array): string =>
        Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64');

      const response = buildSigningResponse({
        request: req,
        body: {
          signature: toB64(sigBytes),
          public_key: toB64(new Uint8Array(matchedKey.publicKey)),
          address,
          key_type: req.body.key_type ?? 'account',
        },
      });
      sendAc2(response);
    } catch (err) {
      console.error('Failed to approve signing request', err);
      Alert.alert('Signing failed', err instanceof Error ? err.message : String(err));
    }
  };

  const handleReject = (req: SigningRequestMessage) => {
    try {
      const rejected = buildSigningRejected({
        request: req,
        reason: 'User declined the signing request.',
      });
      sendAc2(rejected);
    } catch (err) {
      console.error('Failed to reject signing request', err);
      Alert.alert('Reject failed', err instanceof Error ? err.message : String(err));
    }
  };

  const timeline: TimelineEntry[] = [
    ...textMessages.map(
      (m): TimelineEntry => ({
        kind: 'text',
        id: `t-${m.id}`,
        timestamp: m.timestamp,
        data: m,
      }),
    ),
    ...ac2Messages.map(
      (m): TimelineEntry => ({
        kind: 'ac2',
        id: `a-${m.id}`,
        timestamp: m.receivedAt,
        data: m,
      }),
    ),
  ].sort((a, b) => a.timestamp - b.timestamp);

  if (activeStreamText) {
    timeline.push({
      kind: 'text',
      id: 'active-stream',
      timestamp: Date.now(),
      data: {
        id: 'active-stream',
        text: activeStreamText,
        sender: 'peer',
        timestamp: Date.now(),
        address: address || '',
        origin: params.origin || '',
        requestId: params.requestId || '',
      },
    });
  }

  const flatListRef = useRef<FlatList>(null);

  const [isHeartbeatVisible, setIsHeartbeatVisible] = useState(false);

  useEffect(() => {
    if (isConnected) {
      setIsHeartbeatVisible(true);
      const timer = setTimeout(() => setIsHeartbeatVisible(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [lastHeartbeat, isConnected]);

  // Scroll to bottom when keyboard opens
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });

    return () => {
      keyboardDidShowListener.remove();
    };
  }, []);

  const handleDisconnect = () => {
    reset();
    router.back();
  };

  const handleSend = () => {
    if (inputText.trim()) {
      send(inputText.trim());
      setInputText('');
    }
  };

  const renderItem = ({ item }: { item: TimelineEntry }) => {
    if (item.kind === 'text') {
      const m = item.data;
      return (
        <View
          style={[styles.messageBubble, m.sender === 'me' ? styles.myMessage : styles.peerMessage]}
        >
          <Text
            style={[
              styles.messageText,
              m.sender === 'me' ? styles.myMessageText : styles.peerMessageText,
            ]}
          >
            {m.text}
          </Text>
          <Text style={[styles.timestamp, m.sender === 'me' && styles.myTimestamp]}>
            {new Date(m.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      );
    }

    // AC2 protocol message — rendered as a distinct, monospaced card so the
    // protocol surface is visually obvious in the reference UI.
    const m = item.data;
    const isOutbound = m.direction === 'outbound';
    const isInboundSigningRequest = !isOutbound && m.envelope.type === 'ac2/SigningRequest';
    const req = isInboundSigningRequest ? (m.envelope as SigningRequestMessage) : null;
    const actioned = req ? actionedRequestIds.has(req.id) : false;
    const expired = req?.expires_time !== undefined && req.expires_time * 1000 < Date.now();

    return (
      <View style={[styles.ac2Bubble, isOutbound ? styles.ac2Outbound : styles.ac2Inbound]}>
        <View style={styles.ac2Header}>
          <MaterialIcons name="vpn-key" size={14} color="#6366F1" />
          <Text style={styles.ac2Type}>{m.envelope.type}</Text>
          <Text style={styles.ac2Direction}>{isOutbound ? '→ peer' : 'peer →'}</Text>
        </View>
        {req && <Text style={styles.ac2Description}>{req.body.description}</Text>}
        <Text style={styles.ac2Body} numberOfLines={6}>
          {JSON.stringify(m.envelope.body, null, 2)}
        </Text>
        {req && (
          <View style={styles.ac2Actions}>
            {actioned ? (
              <Text style={styles.ac2Actioned}>Actioned</Text>
            ) : expired ? (
              <Text style={styles.ac2Expired}>Expired</Text>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.ac2Btn, styles.ac2Reject]}
                  onPress={() => handleReject(req)}
                  disabled={!isConnected}
                >
                  <MaterialIcons name="close" size={16} color="#fff" />
                  <Text style={styles.ac2BtnText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ac2Btn, styles.ac2Approve]}
                  onPress={() => handleApprove(req)}
                  disabled={!isConnected}
                >
                  <MaterialIcons name="check" size={16} color="#fff" />
                  <Text style={styles.ac2BtnText}>Approve & Sign</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: isConnected
            ? 'Connected'
            : isLoading
              ? 'Connecting...'
              : isError
                ? 'Error'
                : 'Disconnected',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={24} color="#3B82F6" />
            </TouchableOpacity>
          ),
          headerRight: () =>
            isConnected ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {isHeartbeatVisible && (
                  <MaterialIcons
                    name="favorite"
                    size={16}
                    color="#10B981"
                    style={{ marginRight: 10 }}
                  />
                )}
                <TouchableOpacity
                  onPress={() => {
                    if (address) {
                      clearMessages(address, params.origin || '', params.requestId || '');
                    }
                    clearAc2Messages(address || '', params.origin || '', params.requestId || '');
                  }}
                  style={{ marginRight: 15 }}
                >
                  <MaterialIcons name="delete-outline" size={24} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDisconnect} style={{ marginRight: 15 }}>
                  <MaterialIcons name="link-off" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : null,
        }}
      />

      <KeyboardAvoidingView style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ display: 'flex', height: '100%' }}>
            <FlatList
              ref={flatListRef}
              data={timeline}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messageList}
              inverted={false}
              onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
              onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder={isConnected ? 'Type a message...' : 'Connecting...'}
                placeholderTextColor="#94A3B8"
                editable={isConnected}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!inputText.trim() || !isConnected) && styles.sendButtonDisabled,
                ]}
                onPress={handleSend}
                disabled={!inputText.trim() || !isConnected}
              >
                <MaterialIcons name="send" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  messageList: {
    padding: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  peerMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E2E8F0',
    borderBottomLeftRadius: 4,
    borderTopRightRadius: 16,
    borderTopLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  myMessageText: {
    color: 'white',
  },
  peerMessageText: {
    color: '#1E293B',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
    color: 'rgba(0,0,0,0.5)',
  },
  myTimestamp: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 120,
    color: '#1E293B',
  },
  sendButton: {
    backgroundColor: '#3B82F6',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  ac2Bubble: {
    alignSelf: 'stretch',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  ac2Inbound: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  ac2Outbound: {
    borderRightWidth: 4,
    borderRightColor: '#6366F1',
  },
  ac2Header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  ac2Type: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4338CA',
    flex: 1,
  },
  ac2Direction: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '600',
  },
  ac2Body: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#1E1B4B',
  },
  ac2Description: {
    fontSize: 14,
    color: '#1E1B4B',
    marginBottom: 6,
    fontWeight: '500',
  },
  ac2Actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  ac2Btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  ac2Approve: {
    backgroundColor: '#10B981',
  },
  ac2Reject: {
    backgroundColor: '#EF4444',
  },
  ac2BtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  ac2Actioned: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    fontStyle: 'italic',
  },
  ac2Expired: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
    fontStyle: 'italic',
  },
});
