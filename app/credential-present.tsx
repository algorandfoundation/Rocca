import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useProvider } from '@/hooks/useProvider';
import type { Credential } from '@/extensions/credentials';

/**
 * Confirmation screen for an OID4VP presentation request (`openid4vp://...`).
 *
 * The user picks the identity that will sign the VP and the credential
 * to present, then confirms — at which point the wallet posts the VP
 * token to the verifier's `response_uri` (direct_post response mode).
 */
export default function CredentialPresentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ uri?: string }>();
  const { identities, credentials, credential } = useProvider();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [selectedIdentity, setSelectedIdentity] = React.useState(0);
  const [selectedCredentialId, setSelectedCredentialId] = React.useState<string | undefined>();

  const uri = typeof params.uri === 'string' ? params.uri : undefined;
  const activeIdentity = identities[selectedIdentity];
  const credsForIdentity = React.useMemo<Credential[]>(
    () =>
      activeIdentity ? credentials.filter((c) => c.identityAddress === activeIdentity.address) : [],
    [credentials, activeIdentity],
  );

  // Pick the first matching credential when identity changes.
  React.useEffect(() => {
    if (!credsForIdentity.find((c) => c.id === selectedCredentialId)) {
      setSelectedCredentialId(credsForIdentity[0]?.id);
    }
  }, [credsForIdentity, selectedCredentialId]);

  const handlePresent = async () => {
    if (!uri) {
      setError('No authorization request URI provided.');
      return;
    }
    if (!activeIdentity) {
      setError('No identity available to sign the presentation.');
      return;
    }
    if (!selectedCredentialId) {
      setError('No credential selected to present.');
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      await credential.intermezzo.respondToPresentationRequest({
        identityAddress: activeIdentity.address,
        authorizationRequestUri: uri,
        credentialId: selectedCredentialId,
      });
      Alert.alert('Presentation sent', 'The verifier accepted your response.', [
        { text: 'OK', onPress: () => router.replace('/credentials') },
      ]);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Presentation Request',
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
              <MaterialIcons name="arrow-back" size={24} color="#3B82F6" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconWrap}>
          <MaterialIcons name="verified-user" size={56} color="#3B82F6" />
        </View>
        <Text style={styles.title}>Share Credential?</Text>
        <Text style={styles.subtitle}>
          A verifier is requesting that you prove ownership of a credential.
        </Text>

        <Text style={styles.label}>Responding Identity</Text>
        {identities.length === 0 ? (
          <Text style={styles.empty}>No identities available.</Text>
        ) : (
          identities.map((id, idx) => (
            <TouchableOpacity
              key={id.address}
              style={[styles.row, idx === selectedIdentity && styles.rowActive]}
              onPress={() => setSelectedIdentity(idx)}
            >
              <MaterialIcons
                name={idx === selectedIdentity ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={20}
                color={idx === selectedIdentity ? '#3B82F6' : '#94a3b8'}
              />
              <Text style={styles.rowText} numberOfLines={1}>
                {id.did ?? id.address}
              </Text>
            </TouchableOpacity>
          ))
        )}

        <Text style={styles.label}>Credential to Present</Text>
        {credsForIdentity.length === 0 ? (
          <Text style={styles.empty}>This identity holds no credentials.</Text>
        ) : (
          credsForIdentity.map((c) => {
            const active = c.id === selectedCredentialId;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.row, active && styles.rowActive]}
                onPress={() => setSelectedCredentialId(c.id)}
              >
                <MaterialIcons
                  name={active ? 'radio-button-checked' : 'radio-button-unchecked'}
                  size={20}
                  color={active ? '#3B82F6' : '#94a3b8'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowText}>{c.name}</Text>
                  <Text style={styles.rowSubtext}>{c.format}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <Text style={styles.label}>Request URI</Text>
        <Text style={styles.code} numberOfLines={6}>
          {uri ?? '(missing)'}
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => router.back()}
          disabled={busy}
        >
          <Text style={[styles.buttonText, styles.buttonSecondaryText]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.buttonPrimary,
            (busy || !activeIdentity || !selectedCredentialId) && styles.buttonDisabled,
          ]}
          onPress={handlePresent}
          disabled={busy || !activeIdentity || !selectedCredentialId}
        >
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Share</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 32 },
  iconWrap: { alignItems: 'center', marginVertical: 16 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    color: '#0f172a',
  },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 20 },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    marginTop: 12,
    marginBottom: 6,
  },
  empty: { color: '#dc2626', fontSize: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 6,
    gap: 8,
  },
  rowActive: { borderColor: '#3B82F6', backgroundColor: '#eff6ff' },
  rowText: { flex: 1, fontSize: 13, color: '#0f172a' },
  rowSubtext: { fontSize: 11, color: '#64748b', marginTop: 2 },
  code: {
    fontFamily: 'Menlo',
    fontSize: 11,
    color: '#334155',
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 6,
  },
  error: { color: '#dc2626', marginTop: 12, fontSize: 13 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: { backgroundColor: '#3B82F6' },
  buttonSecondary: { backgroundColor: '#f1f5f9' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600' },
  buttonSecondaryText: { color: '#0f172a' },
});
