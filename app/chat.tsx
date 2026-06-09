import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '@tanstack/react-store';
import type {
  AC2KeyRequest as KeyRequestMessage,
  AC2SigningRequest as SigningRequestMessage,
} from '@algorandfoundation/ac2-sdk/schema';
import { messagesStore, Message, clearMessages } from '@/stores/messages';
import { ac2MessagesStore, Ac2MessageEntry, clearAc2Messages } from '@/stores/ac2Messages';
import { useConnection } from '@/hooks/useConnection';
import { useAc2Responders } from '@/hooks/useAc2Responders';

// Unified timeline entry — keeps free-text chat and AC2 protocol messages
// in the same scroll view while preserving their distinct typing/rendering.
type TimelineEntry =
  | { kind: 'text'; id: string; timestamp: number; data: Message }
  | { kind: 'ac2'; id: string; timestamp: number; data: Ac2MessageEntry }
  | {
      kind: 'typing';
      id: string;
      timestamp: number;
      text: string;
      presence: 'thinking' | 'tool' | 'typing';
      detail?: string | null;
    };

// A durable "tool card": one tool/exec step the agent ran during a turn,
// rendered distinctly from chat bubbles. Collapsed by default — only the tool
// name (and a one-line command preview) shows, keeping a busy turn's exec
// activity from flooding the conversation. Tapping the header expands the card
// to reveal the full command and (potentially long) output.
function ToolActivityCard({ message }: { message: Message }) {
  const [expanded, setExpanded] = useState(false);
  const toolName = message.tool || 'tool';
  const hasOutput = !!message.output && message.output.trim().length > 0;
  const hasCommand = !!message.command && message.command.trim().length > 0;
  const hasBody = hasOutput || hasCommand;
  return (
    <View style={styles.toolCard}>
      <TouchableOpacity
        style={styles.toolHeader}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={hasBody ? 0.6 : 1}
        disabled={!hasBody}
      >
        <MaterialIcons name="terminal" size={16} color="#6366F1" />
        <Text style={styles.toolName}>{toolName}</Text>
        {/* When collapsed, surface a compact one-line command preview so the
            user can tell what ran without expanding the whole card. */}
        {!expanded && hasCommand && (
          <Text style={styles.toolCommandPreview} numberOfLines={1}>
            {message.command}
          </Text>
        )}
        <Text style={styles.toolTime}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
        {hasBody && (
          <MaterialIcons
            name={expanded ? 'expand-less' : 'expand-more'}
            size={18}
            color="#A5B4FC"
          />
        )}
      </TouchableOpacity>
      {expanded && hasCommand && <Text style={styles.toolCommand}>{`$ ${message.command}`}</Text>}
      {expanded && hasOutput && <Text style={styles.toolOutput}>{message.output}</Text>}
    </View>
  );
}

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
    agentPresence,
    agentPresenceDetail,
    activeThid,
    openConversation,
    closeConversation,
    remoteThreads,
  } = useConnection(params.origin || '', params.requestId || '');
  const {
    approveSigning: handleApprove,
    rejectSigning: handleReject,
    approveKey: handleApproveKey,
    rejectKey: handleRejectKey,
  } = useAc2Responders({
    address,
    sendAc2,
    origin: params.origin || '',
    requestId: params.requestId || '',
  });

  // Thread id used for messages persisted before multi-conversation support.
  const DEFAULT_THID = 'default';

  // All chat messages on this connection across every conversation thread —
  // used to derive the thread switcher. Legacy messages carry no `thid` and
  // are treated as the `default` thread.
  const connectionTextMessages = useStore(messagesStore, (state) =>
    state.messages.filter(
      (m) =>
        m.origin === params.origin &&
        m.requestId === params.requestId &&
        (address ? m.address === address : true),
    ),
  );

  // Only the active conversation's messages are shown in the timeline.
  const textMessages = useMemo(
    () => connectionTextMessages.filter((m) => (m.thid ?? DEFAULT_THID) === activeThid),
    [connectionTextMessages, activeThid],
  );

  // The set of conversation threads on this connection (most-recent first),
  // always including the active thread and the default thread so the switcher
  // can render them even before any message has landed.
  const threads = useMemo(() => {
    const lastSeen = new Map<string, number>();
    for (const m of connectionTextMessages) {
      const t = m.thid ?? DEFAULT_THID;
      const prev = lastSeen.get(t) ?? 0;
      if (m.timestamp > prev) lastSeen.set(t, m.timestamp);
    }
    // Merge in threads the agent reported it already holds (a reconnecting /
    // fresh controller may have no local messages for them yet). Opening such
    // a thread triggers the agent to replay its history.
    for (const rt of remoteThreads) {
      if (!lastSeen.has(rt.thid)) lastSeen.set(rt.thid, rt.updatedAt ?? 0);
    }
    if (!lastSeen.has(DEFAULT_THID)) lastSeen.set(DEFAULT_THID, 0);
    if (!lastSeen.has(activeThid)) lastSeen.set(activeThid, Date.now());
    return Array.from(lastSeen.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([thid]) => thid);
  }, [connectionTextMessages, activeThid, remoteThreads]);

  // A short, human-facing label for a thread chip: the default thread reads
  // "Main"; others fall back to a truncated id.
  const threadLabel = (thid: string): string => {
    if (thid === DEFAULT_THID) return 'Main';
    const remote = remoteThreads.find((r) => r.thid === thid);
    if (remote?.title)
      return remote.title.length > 18 ? `${remote.title.slice(0, 18)}…` : remote.title;
    return thid.length > 12 ? `${thid.slice(0, 12)}…` : thid;
  };

  // All AC2 protocol envelopes on this connection across every conversation
  // thread — used to derive request/response "actioned" state, which is keyed
  // by the envelope's own `thid` (request id) and so is thread-independent.
  const ac2Messages = useStore(ac2MessagesStore, (state) =>
    state.messages.filter((m) => m.origin === params.origin && m.requestId === params.requestId),
  );

  // Only the active conversation's AC2 envelopes are shown in the timeline.
  // Legacy entries carry no `thid` and are treated as the `default` thread.
  const threadAc2Messages = useMemo(
    () => ac2Messages.filter((m) => (m.thid ?? DEFAULT_THID) === activeThid),
    [ac2Messages, activeThid],
  );

  // A SigningRequest is "actioned" once we have a matching outbound response
  // or rejection on the same `thid` (the SDK builders thread `thid = request.id`).
  // This survives reloads because it's derived from the persisted ac2 store.
  const actionedRequestIds = useMemo(() => {
    const set = new Set<string>();
    for (const m of ac2Messages) {
      if (m.direction !== 'outbound') continue;
      const t = m.envelope.type;
      if (t === 'ac2/SigningResponse' || t === 'ac2/SigningRejected' || t === 'ac2/KeyResponse') {
        if (m.envelope.thid) set.add(m.envelope.thid);
      }
    }
    return set;
  }, [ac2Messages]);

  const timeline: TimelineEntry[] = [
    ...textMessages.map(
      (m): TimelineEntry => ({
        kind: 'text',
        id: `t-${m.id}`,
        timestamp: m.timestamp,
        data: m,
      }),
    ),
    ...threadAc2Messages.map(
      (m): TimelineEntry => ({
        kind: 'ac2',
        id: `a-${m.id}`,
        timestamp: m.receivedAt,
        data: m,
      }),
    ),
  ].sort((a, b) => a.timestamp - b.timestamp);

  // While the agent is working on a reply, render an ephemeral indicator
  // instead of a final message bubble:
  //   - "Agent is thinking…" once the agent has acked the message and the
  //     model is running (no tokens yet);
  //   - "Agent is typing…" (with a live preview of the partial text) once
  //     the reply starts streaming.
  // Both are driven by the agent's out-of-band presence frames; we also fall
  // back to `typing` whenever partial stream text exists. Once the stream
  // goes idle the accumulated text is committed as a normal peer message by
  // `useConnection`.
  const presence: 'thinking' | 'tool' | 'typing' | null = activeStreamText
    ? 'typing'
    : agentPresence;
  if (presence) {
    timeline.push({
      kind: 'typing',
      id: 'active-stream',
      timestamp: Date.now(),
      text: activeStreamText,
      presence,
      detail: agentPresenceDetail,
    });
  }

  const flatListRef = useRef<FlatList>(null);
  // Whether the list is currently scrolled to (near) the bottom. We only
  // auto-scroll on new content when the user is already at the bottom, so
  // scrolling up to read earlier messages / expand a tool card is never
  // yanked back down by a streaming reply or an incoming message.
  const isAtBottomRef = useRef(true);
  // Whether the latest scrolling is driven by the user (a drag / fling) rather
  // than by our own programmatic `scrollToEnd`. Programmatic scrolls fire
  // `onScroll` with transient/intermediate `contentSize` values while the list
  // is still growing during streaming, which could momentarily compute a large
  // `distanceFromBottom` and wrongly flip `isAtBottomRef` to false —
  // permanently stopping auto-scroll mid-reply. We only trust scroll offsets
  // for the "at bottom" decision while the user is actually scrolling.
  const userScrollingRef = useRef(false);

  const [isHeartbeatVisible, setIsHeartbeatVisible] = useState(false);

  useEffect(() => {
    if (isConnected) {
      setIsHeartbeatVisible(true);
      const timer = setTimeout(() => setIsHeartbeatVisible(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [lastHeartbeat, isConnected]);

  // Track how far the list is from the bottom so auto-scroll only kicks in
  // when the user hasn't deliberately scrolled up.
  const handleScroll = (e: {
    nativeEvent: {
      contentOffset: { y: number };
      contentSize: { height: number };
      layoutMeasurement: { height: number };
    };
  }) => {
    // Only trust scroll offsets when the user is driving the scroll. This keeps
    // programmatic `scrollToEnd` events (fired while content is still growing
    // during streaming) from corrupting the "at bottom" state and stalling
    // auto-scroll.
    if (!userScrollingRef.current) return;
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    isAtBottomRef.current = distanceFromBottom < 80;
  };

  // The user grabbed the list — start trusting scroll offsets.
  const handleScrollBeginDrag = () => {
    userScrollingRef.current = true;
  };

  // The user let go and any fling momentum has settled — stop trusting scroll
  // offsets so subsequent programmatic scrolls don't flip the bottom state.
  const handleMomentumScrollEnd = () => {
    userScrollingRef.current = false;
  };

  // Scroll to the bottom without animation (animated scrolls fight rapid
  // streaming updates and feel janky), but only when already pinned there.
  const maybeScrollToEnd = () => {
    if (isAtBottomRef.current) {
      flatListRef.current?.scrollToEnd({ animated: false });
    }
  };

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
      // Durable tool-activity card — render the agent's tool/exec step (command
      // + output) as a distinct, expandable card rather than a chat bubble.
      if (m.kind === 'tool') {
        return <ToolActivityCard message={m} />;
      }
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

    // The agent is working on a reply — show a "thinking…" indicator until
    // the first token lands, then a "typing…" indicator with a live preview
    // of the text received so far.
    if (item.kind === 'typing') {
      const isThinking = item.presence === 'thinking';
      const isTool = item.presence === 'tool';
      // Choose an icon + label per presence: thinking (model running), tool
      // (running an operation, optionally named), or typing (streaming reply).
      const iconName = isThinking ? 'psychology' : isTool ? 'build' : 'more-horiz';
      const label = isThinking
        ? 'Agent is thinking…'
        : isTool
          ? item.detail
            ? `Agent is running ${item.detail}…`
            : 'Agent is working…'
          : 'Agent is typing…';
      return (
        <View style={[styles.messageBubble, styles.peerMessage]}>
          {item.text.trim().length > 0 && (
            <Text style={[styles.messageText, styles.peerMessageText]}>{item.text}</Text>
          )}
          <View style={styles.typingHeader}>
            <MaterialIcons name={iconName} size={18} color="#6366F1" />
            <Text style={styles.typingLabel}>{label}</Text>
          </View>
        </View>
      );
    }

    // AC2 protocol message — rendered as a distinct, monospaced card so the
    // protocol surface is visually obvious in the reference UI.
    const m = item.data;
    const isOutbound = m.direction === 'outbound';
    const isInboundSigningRequest = !isOutbound && m.envelope.type === 'ac2/SigningRequest';
    const isInboundKeyRequest = !isOutbound && m.envelope.type === 'ac2/KeyRequest';
    const req = isInboundSigningRequest ? (m.envelope as SigningRequestMessage) : null;
    const keyReq = isInboundKeyRequest ? (m.envelope as KeyRequestMessage) : null;
    const actionable = req ?? keyReq;
    const actioned = actionable ? actionedRequestIds.has(actionable.id) : false;
    const expired =
      actionable?.expires_time !== undefined && actionable.expires_time * 1000 < Date.now();

    return (
      <View style={[styles.ac2Bubble, isOutbound ? styles.ac2Outbound : styles.ac2Inbound]}>
        <View style={styles.ac2Header}>
          <MaterialIcons name="vpn-key" size={14} color="#6366F1" />
          <Text style={styles.ac2Type}>{m.envelope.type}</Text>
          <Text style={styles.ac2Direction}>{isOutbound ? '→ peer' : 'peer →'}</Text>
        </View>
        {req && <Text style={styles.ac2Description}>{req.body.description}</Text>}
        {keyReq && (
          <Text style={styles.ac2Description}>
            The agent is requesting an identity key ({keyReq.body.key_type}) for{' '}
            {keyReq.body.for_operation}.
          </Text>
        )}
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
        {keyReq && (
          <View style={styles.ac2Actions}>
            {actioned ? (
              <Text style={styles.ac2Actioned}>Actioned</Text>
            ) : expired ? (
              <Text style={styles.ac2Expired}>Expired</Text>
            ) : (
              <>
                <TouchableOpacity
                  style={[styles.ac2Btn, styles.ac2Reject]}
                  onPress={() => handleRejectKey(keyReq)}
                  disabled={!isConnected}
                >
                  <MaterialIcons name="close" size={16} color="#fff" />
                  <Text style={styles.ac2BtnText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ac2Btn, styles.ac2Approve]}
                  onPress={() => handleApproveKey(keyReq)}
                  disabled={!isConnected}
                >
                  <MaterialIcons name="check" size={16} color="#fff" />
                  <Text style={styles.ac2BtnText}>Grant Identity</Text>
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
        {/* NOTE: do NOT wrap this body in a TouchableWithoutFeedback to dismiss
            the keyboard — that wrapper steals the touch responder and prevents
            the FlatList below from ever receiving scroll/pan gestures (the list
            would only scroll after focusing the input reshuffled the
            responder). The keyboard is dismissed via the FlatList's
            keyboardDismissMode/keyboardShouldPersistTaps instead. */}
        <View style={{ flex: 1 }}>
          {/* Conversation switcher — one connection multiplexes several
                threads. Tapping a chip switches the active conversation
                (and sends ac2/ConversationOpen so the agent follows); the
                "+" opens a brand-new conversation. */}
          <View style={styles.threadBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.threadBarContent}
              keyboardShouldPersistTaps="handled"
            >
              {threads.map((thid) => {
                const isActive = thid === activeThid;
                return (
                  <TouchableOpacity
                    key={thid}
                    style={[styles.threadChip, isActive && styles.threadChipActive]}
                    onPress={() => {
                      if (!isActive) openConversation(thid);
                    }}
                    onLongPress={() => {
                      if (thid !== DEFAULT_THID) {
                        Alert.alert('Close conversation?', `Close "${threadLabel(thid)}"?`, [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Close',
                            style: 'destructive',
                            onPress: () => closeConversation(thid),
                          },
                        ]);
                      }
                    }}
                  >
                    <MaterialIcons
                      name={thid === DEFAULT_THID ? 'forum' : 'chat-bubble-outline'}
                      size={14}
                      color={isActive ? '#FFFFFF' : '#6366F1'}
                    />
                    <Text style={[styles.threadChipText, isActive && styles.threadChipTextActive]}>
                      {threadLabel(thid)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={styles.threadNewChip}
                onPress={() => openConversation()}
                disabled={!isConnected}
              >
                <MaterialIcons name="add" size={16} color="#3B82F6" />
                <Text style={styles.threadNewChipText}>New</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
          <FlatList
            ref={flatListRef}
            data={timeline}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            inverted={false}
            onScroll={handleScroll}
            onScrollBeginDrag={handleScrollBeginDrag}
            onScrollEndDrag={handleMomentumScrollEnd}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            scrollEventThrottle={16}
            onContentSizeChange={maybeScrollToEnd}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
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
    // Extra bottom breathing room so the last bubble — especially the live
    // "thinking…/typing…/running…" indicator that appears while the agent is
    // actively replying or executing a tool — is never clipped against the
    // input bar after an auto-scroll-to-end.
    paddingBottom: 48,
    flexGrow: 1,
  },
  threadBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  threadBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  threadChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  threadChipActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  threadChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4338CA',
  },
  threadChipTextActive: {
    color: '#FFFFFF',
  },
  threadNewChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
    backgroundColor: '#F8FAFF',
  },
  threadNewChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B82F6',
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
  typingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  typingLabel: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#6366F1',
  },
  toolCard: {
    alignSelf: 'stretch',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  toolName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A5B4FC',
  },
  toolTime: {
    fontSize: 10,
    color: '#64748B',
    marginLeft: 'auto',
  },
  toolCommand: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#7DD3FC',
    marginBottom: 4,
    marginTop: 4,
  },
  toolCommandPreview: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#64748B',
  },
  toolOutput: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#CBD5E1',
  },
  toolToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  toolToggleText: {
    fontSize: 12,
    color: '#A5B4FC',
    fontWeight: '600',
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
