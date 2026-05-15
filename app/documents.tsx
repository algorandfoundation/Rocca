import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useProvider } from '@/hooks/useProvider';
import { removeDocument } from '@/stores/documents';

export default function DocumentsScreen() {
  const router = useRouter();
  const { documents } = useProvider();

  const sorted = [...documents].sort((a, b) => b.timestamp - a.timestamp);

  function formatRelativeTime(ts: number): string {
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  async function handleDelete(id: string, name: string) {
    Alert.alert('Delete Document', `Remove "${name}" from your wallet? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeDocument(id);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Documents',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={24} color="#3B82F6" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Signed Documents</Text>
          <View style={styles.list}>
            {sorted.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: '/sign' as any,
                    params: { pdfUri: doc.uri, readonly: 'true' },
                  })
                }
              >
                <View style={styles.iconContainer}>
                  <MaterialIcons name="description" size={24} color="#3B82F6" />
                </View>
                <View style={styles.details}>
                  <Text style={styles.name} numberOfLines={1} ellipsizeMode="middle">
                    {doc.name}
                  </Text>
                  <Text style={styles.meta}>
                    {doc.signerName} · {formatRelativeTime(doc.timestamp)}
                  </Text>
                </View>
                <View style={styles.right}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Signed</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(doc.id, doc.name)}
                  >
                    <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
            {sorted.length === 0 && (
              <View style={styles.emptyState}>
                <MaterialIcons name="folder-open" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No documents yet</Text>
                <Text style={styles.emptySub}>
                  Share a PDF with Rocca to sign and save it here.
                </Text>
              </View>
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
    marginBottom: 12,
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
    backgroundColor: '#E1EFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  details: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  meta: {
    fontSize: 13,
    color: '#64748B',
  },
  right: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
  },
  badge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  deleteButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  emptySub: {
    marginTop: 8,
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 260,
  },
});
