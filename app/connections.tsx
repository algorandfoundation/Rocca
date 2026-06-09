import React, { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useStore } from '@tanstack/react-store';
import { AC2MessageTypes } from '@algorandfoundation/ac2-sdk/schema';

import { useProvider } from '@/hooks/useProvider';
import { sessionsStore, removeSession, type Session } from '@/stores/sessions';
import { messagesStore, clearMessagesByConnection } from '@/stores/messages';
import {
  ac2MessagesStore,
  clearAc2MessagesByConnection,
  type Ac2MessageEntry,
} from '@/stores/ac2Messages';
import {
  agentIdentitiesStore,
  clearAgentIdentitiesByConnection,
  type AgentIdentity,
} from '@/stores/agentIdentities';

/** Thread id used for messages/envelopes that carry no explicit `thid`. */
const DEFAULT_THID = 'default';

/** Truncate a long identifier (DID, public key, requestId) for display. */
function truncateMiddle(value: string, head = 10, tail = 8): string {
  if (!value) return '';
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function formatTimestamp(ms: number): string {
  if (!ms) return '—';
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return String(ms);
  }
}

interface ThreadSummary {
  thid: string;
  messageCount: number;
  lastActivity: number;
}

interface AgentKeyMetadata {
  /** DID of the account that linked / answered the KeyRequest. */
  controllerDid: string;
  /** The agent identity public key issued in the KeyResponse (base64). */
  publicKey: string;
  /** Whether private key material was handed to the agent. */
  materialHeld: boolean;
  /** When the identity was granted (ms). */
  grantedAt: number;
}

interface ConnectionSummary {
  session: Session;
  chatCount: number;
  ac2Count: number;
  threads: ThreadSummary[];
  agentKey: AgentKeyMetadata | null;
}

export default function ConnectionsScreen() {
  const router = useRouter();
  const { keys, accounts, identities } = useProvider();
  const sessions = useStore(sessionsStore, (state) => state.sessions);
  const textMessages = useStore(messagesStore, (state) => state.messages);
  const ac2Messages = useStore(ac2MessagesStore, (state) => state.messages);
  const agentIdentities = useStore(agentIdentitiesStore, (state) => state.identities);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Forget a persisted connection: drops the session record and clears the
  // chat / AC2 history scoped to it. Confirmed because it is destructive.
  const handleForget = (session: Session) => {
    Alert.alert(
      'Forget connection?',
      `This removes the saved connection to ${session.origin} and deletes its conversation history on this device.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forget',
          style: 'destructive',
          onPress: () => {
            clearMessagesByConnection(session.origin, session.id);
            clearAc2MessagesByConnection(session.origin, session.id);
            clearAgentIdentitiesByConnection(session.origin, session.id);
            removeSession(session.id, session.origin);
            setExpandedId((curr) => (curr === session.id ? null : curr));
          },
        },
      ],
    );
  };

  // Aggregate everything the controller persists into a per-connection
  // diagnostic view: chat/AC2 message counts, conversation threads (keyed by
  // `thid`), and the agent identity key granted on that connection.
  const connections = useMemo<ConnectionSummary[]>(() => {
    return sessions.map((session) => {
      const matches = (origin: string, requestId: string) =>
        origin === session.origin && requestId === session.id;

      const chatMsgs = textMessages.filter((m) => matches(m.origin, m.requestId));
      const ac2Msgs = ac2Messages.filter((m) => matches(m.origin, m.requestId));

      // Build conversation threads keyed by the *conversation* `thid`. Free-text
      // chat and AC2 envelopes both carry the conversation thread they were
      // stored under (falling back to `default` for legacy entries). Note the
      // AC2 entry's `thid` is the conversation thread, not the DIDComm
      // envelope's request/response `thid`.
      const threadMap = new Map<string, ThreadSummary>();
      const bump = (thid: string, at: number) => {
        const existing = threadMap.get(thid);
        if (existing) {
          existing.messageCount += 1;
          existing.lastActivity = Math.max(existing.lastActivity, at);
        } else {
          threadMap.set(thid, { thid, messageCount: 1, lastActivity: at });
        }
      };
      for (const m of chatMsgs) bump(DEFAULT_THID, m.timestamp);
      for (const m of ac2Msgs) bump(m.thid ?? DEFAULT_THID, m.receivedAt);
      const threads = Array.from(threadMap.values()).sort(
        (a, b) => b.lastActivity - a.lastActivity,
      );

      const agentKey = extractAgentKey(ac2Msgs);

      return {
        session,
        chatCount: chatMsgs.length,
        ac2Count: ac2Msgs.length,
        threads,
        agentKey,
      };
    });
  }, [sessions, textMessages, ac2Messages]);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Diagnostics',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={24} color="#3B82F6" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Overview ─────────────────────────────────────────────── */}
        <View style={styles.overviewRow}>
          <StatCard icon="link" label="Connections" value={connections.length} />
          <StatCard icon="vpn-key" label="Keys" value={keys.length} />
          <StatCard icon="badge" label="Identities" value={identities.length} />
          <StatCard icon="smart-toy" label="Agent keys" value={agentIdentities.length} />
          <StatCard icon="account-balance-wallet" label="Accounts" value={accounts.length} />
        </View>

        {/* ── Connections ──────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connections</Text>
          <View style={styles.list}>
            {connections.map((conn) => {
              const { session } = conn;
              const isExpanded = expandedId === session.id;
              return (
                <View key={`${session.origin}-${session.id}`} style={styles.card}>
                  <TouchableOpacity
                    style={styles.cardHeader}
                    onPress={() => setExpandedId(isExpanded ? null : session.id)}
                  >
                    <View style={styles.iconContainer}>
                      <MaterialIcons name="link" size={22} color="#64748B" />
                    </View>
                    <View style={styles.details}>
                      <Text style={styles.origin} numberOfLines={1}>
                        {session.origin}
                      </Text>
                      <Text style={styles.subtle} numberOfLines={1}>
                        {truncateMiddle(session.id)} · {conn.threads.length} thread
                        {conn.threads.length === 1 ? '' : 's'}
                      </Text>
                    </View>
                    <StatusBadge status={session.status} />
                    <MaterialIcons
                      name={isExpanded ? 'expand-less' : 'expand-more'}
                      size={24}
                      color="#CBD5E1"
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.cardBody}>
                      <Row label="Request ID" value={session.id} mono />
                      <Row label="Origin" value={session.origin} mono />
                      <Row label="Last activity" value={formatTimestamp(session.lastActivity)} />
                      <Row label="Created" value={formatTimestamp(session.timestamp)} />
                      <Row
                        label="Messages"
                        value={`${conn.chatCount} chat · ${conn.ac2Count} AC2`}
                      />

                      {/* Agent identity key granted on this connection. */}
                      <Text style={styles.groupLabel}>Agent identity</Text>
                      {conn.agentKey ? (
                        <View style={styles.subBlock}>
                          <Row label="Controller DID" value={conn.agentKey.controllerDid} mono />
                          <Row label="Agent key" value={conn.agentKey.publicKey} mono />
                          <Row
                            label="Material"
                            value={conn.agentKey.materialHeld ? 'Held by agent' : 'Not provided'}
                          />
                          <Row label="Granted" value={formatTimestamp(conn.agentKey.grantedAt)} />
                        </View>
                      ) : (
                        <Text style={styles.emptyInline}>No identity granted yet</Text>
                      )}

                      {/* Conversation threads. */}
                      <Text style={styles.groupLabel}>Conversations</Text>
                      {conn.threads.length > 0 ? (
                        <View style={styles.subBlock}>
                          {conn.threads.map((t) => (
                            <View key={t.thid} style={styles.threadRow}>
                              <MaterialIcons name="forum" size={16} color="#94A3B8" />
                              <Text style={styles.threadId} numberOfLines={1}>
                                {t.thid === DEFAULT_THID ? 'default' : truncateMiddle(t.thid)}
                              </Text>
                              <Text style={styles.threadCount}>{t.messageCount}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.emptyInline}>No conversations yet</Text>
                      )}

                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.openButton}
                          onPress={() =>
                            router.push({
                              pathname: '/chat',
                              params: { origin: session.origin, requestId: session.id },
                            })
                          }
                        >
                          <MaterialIcons
                            name={session.status === 'active' ? 'chat' : 'sync'}
                            size={18}
                            color="#FFFFFF"
                          />
                          <Text style={styles.openButtonText}>
                            {session.status === 'active' ? 'Open chat' : 'Reconnect'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.forgetButton}
                          onPress={() => handleForget(session)}
                        >
                          <MaterialIcons name="delete-outline" size={18} color="#EF4444" />
                          <Text style={styles.forgetButtonText}>Forget</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
            {connections.length === 0 && <Text style={styles.emptyText}>No connections found</Text>}
          </View>
        </View>

        {/* ── Keys ─────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Keys</Text>
          <View style={styles.list}>
            {keys.map((k) => (
              <View key={k.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="vpn-key" size={22} color="#64748B" />
                  </View>
                  <View style={styles.details}>
                    <Text style={styles.origin} numberOfLines={1}>
                      {k.type ?? 'key'}
                    </Text>
                    <Text style={styles.subtle} numberOfLines={1}>
                      {truncateMiddle(k.id)} · {k.algorithm ?? 'unknown'}
                    </Text>
                  </View>
                  {!!(k.metadata as { registered?: boolean } | undefined)?.registered && (
                    <MaterialIcons name="verified" size={20} color="#10B981" />
                  )}
                </View>
              </View>
            ))}
            {keys.length === 0 && <Text style={styles.emptyText}>No keys found</Text>}
          </View>
        </View>

        {/* ── Agent identities ─────────────────────────────────────────
            Keys this wallet minted and granted to connected agents, tracked
            separately from the user's own keys/accounts above. */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agent identities</Text>
          <View style={styles.list}>
            {agentIdentities.map((ident: AgentIdentity) => (
              <View key={ident.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="smart-toy" size={22} color="#6366F1" />
                  </View>
                  <View style={styles.details}>
                    <Text style={styles.origin} numberOfLines={1}>
                      {truncateMiddle(ident.agentDid)}
                    </Text>
                    <Text style={styles.subtle} numberOfLines={1}>
                      granted by {truncateMiddle(ident.controllerDid)}
                    </Text>
                  </View>
                  <MaterialIcons name="vpn-key" size={18} color="#10B981" />
                </View>
                <View style={styles.cardBody}>
                  <Row label="Agent key" value={ident.publicKey} mono />
                  <Row label="Keystore id" value={ident.keyId} mono />
                  <Row label="Origin" value={ident.origin} mono />
                  <Row label="Granted" value={formatTimestamp(ident.createdAt)} />
                </View>
              </View>
            ))}
            {agentIdentities.length === 0 && (
              <Text style={styles.emptyText}>No agent identities granted yet</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Finds the most recent approved `KeyResponse` in a connection's AC2 message
 * log and extracts the agent identity metadata (controller DID, agent public
 * key, whether private material was issued).
 */
function extractAgentKey(ac2Msgs: Ac2MessageEntry[]): AgentKeyMetadata | null {
  let latest: AgentKeyMetadata | null = null;
  for (const entry of ac2Msgs) {
    const env = entry.envelope;
    if (env.type !== AC2MessageTypes.KEY_RESPONSE) continue;
    const body = env.body as {
      status?: string;
      public_key?: string;
      material?: string;
    };
    if (body.status !== 'approved') continue;
    const candidate: AgentKeyMetadata = {
      controllerDid: env.from,
      publicKey: body.public_key ?? '',
      materialHeld: !!body.material && body.material !== 'rejected',
      grantedAt: entry.receivedAt,
    };
    if (!latest || candidate.grantedAt >= latest.grantedAt) latest = candidate;
  }
  return latest;
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.statCard}>
      <MaterialIcons name={icon} size={20} color="#3B82F6" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: Session['status'] }) {
  const color = status === 'active' ? '#10B981' : status === 'failed' ? '#EF4444' : '#94A3B8';
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1A` }]}>
      <Text style={[styles.badgeText, { color }]}>{status}</Text>
    </View>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && styles.mono]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
  },
  overviewRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  details: {
    flex: 1,
  },
  origin: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  subtle: {
    fontSize: 13,
    color: '#94A3B8',
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 12,
  },
  rowLabel: {
    fontSize: 13,
    color: '#64748B',
    flexShrink: 0,
  },
  rowValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
  },
  groupLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 6,
  },
  subBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  threadId: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  threadCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3B82F6',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  openButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 10,
  },
  openButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  forgetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  forgetButtonText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyInline: {
    fontSize: 13,
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 20,
  },
});
