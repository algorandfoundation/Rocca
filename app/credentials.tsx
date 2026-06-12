import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useProvider } from '@/hooks/useProvider';
import type { Credential, IssuanceSession, VerificationSession } from '@/extensions/credentials';

function formatDate(value?: number | string): string {
  if (!value) return 'N/A';
  const d = typeof value === 'number' ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString();
}

export default function CredentialsScreen() {
  const router = useRouter();
  const { credentials, issuanceSessions, verificationSessions, credential } = useProvider();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        credential.intermezzo.refreshIssuanceSessions().catch(() => undefined),
        credential.intermezzo.refreshVerificationSessions().catch(() => undefined),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [credential]);

  const handleDeleteCredential = (id: string, name: string) => {
    Alert.alert('Delete Credential', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await credential.store.removeCredential(id);
          } catch (error) {
            console.error('Failed to remove credential:', error);
            Alert.alert('Error', 'Failed to remove credential');
          }
        },
      },
    ]);
  };

  const handleDeleteIssuance = (id: string) => {
    credential.store.removeIssuanceSession(id).catch((e) => {
      console.error('Failed to remove issuance session:', e);
    });
  };

  const handleDeleteVerification = (id: string) => {
    credential.store.removeVerificationSession(id).catch((e) => {
      console.error('Failed to remove verification session:', e);
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Credentials',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={24} color="#3B82F6" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', marginRight: 10, gap: 12 }}>
              <TouchableOpacity onPress={() => router.push('/scan')}>
                <MaterialIcons name="qr-code-scanner" size={24} color="#3B82F6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onRefresh}>
                <MaterialIcons name="refresh" size={24} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verifiable Credentials</Text>
          <View style={styles.list}>
            {credentials.map((cred: Credential) => (
              <View key={cred.id} style={styles.card}>
                <View style={[styles.iconContainer, { backgroundColor: '#EFF6FF' }]}>
                  <MaterialIcons name="verified-user" size={24} color="#3B82F6" />
                </View>
                <View style={styles.details}>
                  <Text style={styles.itemName} numberOfLines={1} ellipsizeMode="tail">
                    {cred.name}
                  </Text>
                  <Text style={styles.detailText} numberOfLines={1} ellipsizeMode="middle">
                    Format: {cred.format}
                  </Text>
                  {cred.issuer && (
                    <Text style={styles.detailText} numberOfLines={1} ellipsizeMode="middle">
                      Issuer: {cred.issuer}
                    </Text>
                  )}
                  <Text style={styles.detailText} numberOfLines={1} ellipsizeMode="middle">
                    Holder: {cred.identityAddress}
                  </Text>
                  {cred.expiresAt && (
                    <Text style={styles.detailText}>Expires: {formatDate(cred.expiresAt)}</Text>
                  )}
                  <Text style={styles.date}>Received: {formatDate(cred.receivedAt)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteCredential(cred.id, cred.name)}
                  style={styles.deleteButton}
                >
                  <MaterialIcons name="delete-outline" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            {credentials.length === 0 && <Text style={styles.emptyText}>No credentials yet</Text>}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Issuance Sessions</Text>
          <View style={styles.list}>
            {issuanceSessions.map((s: IssuanceSession) => (
              <View key={s.id} style={styles.card}>
                <View style={[styles.iconContainer, { backgroundColor: '#FEF3C7' }]}>
                  <MaterialIcons name="card-membership" size={24} color="#D97706" />
                </View>
                <View style={styles.details}>
                  <Text style={styles.itemName} numberOfLines={1} ellipsizeMode="middle">
                    {s.credentialConfigurationIds.join(', ') || s.id}
                  </Text>
                  <Text style={styles.detailText}>State: {s.state}</Text>
                  <Text style={styles.detailText} numberOfLines={1} ellipsizeMode="middle">
                    Holder: {s.identityAddress}
                  </Text>
                  <Text style={styles.date}>Updated: {formatDate(s.updatedAt ?? s.createdAt)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteIssuance(s.id)}
                  style={styles.deleteButton}
                >
                  <MaterialIcons name="close" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            {issuanceSessions.length === 0 && (
              <Text style={styles.emptyText}>No active issuance sessions</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verification Sessions</Text>
          <View style={styles.list}>
            {verificationSessions.map((s: VerificationSession) => (
              <View key={s.id} style={styles.card}>
                <View style={[styles.iconContainer, { backgroundColor: '#F3E8FF' }]}>
                  <MaterialIcons name="task-alt" size={24} color="#9333EA" />
                </View>
                <View style={styles.details}>
                  <Text style={styles.itemName} numberOfLines={1} ellipsizeMode="middle">
                    {s.id}
                  </Text>
                  <Text style={styles.detailText}>State: {s.state}</Text>
                  <Text style={styles.detailText} numberOfLines={1} ellipsizeMode="middle">
                    Holder: {s.identityAddress}
                  </Text>
                  <Text style={styles.date}>Updated: {formatDate(s.updatedAt ?? s.createdAt)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteVerification(s.id)}
                  style={styles.deleteButton}
                >
                  <MaterialIcons name="close" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            {verificationSessions.length === 0 && (
              <Text style={styles.emptyText}>No active verification sessions</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  details: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  detailText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: '#94A3B8',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 20,
  },
});
