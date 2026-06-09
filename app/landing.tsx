/**
 * Minimal landing screen for the AC2 reference controller.
 *
 * Surface is intentionally tiny:
 *   - identifies the controller by its first identity DID,
 *   - links to `scan` to pair a new Liquid Auth session,
 *   - links to `connections` (the diagnostics panel) to inspect connections,
 *     their granted agent identity keys, and per-thread conversations.
 *
 * Everything else (accounts, passkeys browser, identities browser, import,
 * balance/activity cards) was removed to keep this app as a reference for
 * the AC2 SDK rather than a full wallet.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Logo from '../components/Logo';
import { useProvider } from '@/hooks/useProvider';

export default function LandingScreen() {
  const router = useRouter();
  const { identities, sessions, key, account, identity, passkey } = useProvider();
  const activeIdentity = identities[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Logo size={40} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>AC2 Reference</Text>
            <Text style={styles.subtitle}>Liquid Auth · AC2 SDK</Text>
          </View>
        </View>

        <View style={styles.didCard}>
          <Text style={styles.cardLabel}>Controller DID</Text>
          <Text style={styles.didText} numberOfLines={1} ellipsizeMode="middle">
            {activeIdentity?.did || 'No identity found'}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/scan')}>
            <MaterialIcons name="qr-code-scanner" size={28} color="#3B82F6" />
            <Text style={styles.actionLabel}>Pair</Text>
            <Text style={styles.actionSub}>Scan to connect</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/connections')}>
            <MaterialIcons name="insights" size={28} color="#10B981" />
            <Text style={styles.actionLabel}>Diagnostics</Text>
            <Text style={styles.actionSub}>
              {sessions.length} connection{sessions.length === 1 ? '' : 's'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.resetButton}
          onPress={async () => {
            await key.store.clear();
            await account.store.clear();
            await identity.store.clear();
            await passkey.store.clear();
            router.replace('/onboarding');
          }}
        >
          <Text style={styles.resetButtonText}>Reset Wallet</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20, paddingTop: 8 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  didCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  cardLabel: {
    fontSize: 12,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginBottom: 6,
  },
  didText: { fontFamily: 'monospace', fontSize: 14, color: '#334155' },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-start',
  },
  actionLabel: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 10 },
  actionSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  resetButton: {
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  resetButtonText: { color: '#64748B', fontSize: 14, fontWeight: '500' },
});
