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

/**
 * Confirmation screen for an OID4VCI credential offer (`openid-credential-offer://...`).
 *
 * The user can review the offer URI, pick the receiving identity (defaults
 * to the first one), and accept — at which point the wallet redeems the
 * pre-authorized code and persists the issued credential locally.
 */
export default function CredentialOfferScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ uri?: string }>();
  const { identities, credential } = useProvider();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | undefined>(undefined);
  const [selected, setSelected] = React.useState(0);

  const uri = typeof params.uri === 'string' ? params.uri : undefined;
  const activeIdentity = identities[selected];

  const handleAccept = async () => {
    if (!uri) {
      setError('No credential offer URI provided.');
      return;
    }
    if (!activeIdentity) {
      setError('No identity available to receive the credential.');
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const { credential: issued } = await credential.intermezzo.redeemOfferUri({
        identityAddress: activeIdentity.address,
        offerUri: uri,
      });
      Alert.alert('Credential received', `Stored "${issued.name}".`, [
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
          title: 'Credential Offer',
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
          <MaterialIcons name="card-membership" size={56} color="#3B82F6" />
        </View>
        <Text style={styles.title}>Accept Credential?</Text>
        <Text style={styles.subtitle}>
          An issuer would like to send a verifiable credential to your wallet.
        </Text>

        <Text style={styles.label}>Receiving Identity</Text>
        {identities.length === 0 ? (
          <Text style={styles.empty}>No identities available. Create one first.</Text>
        ) : (
          identities.map((id, idx) => (
            <TouchableOpacity
              key={id.address}
              style={[styles.identityRow, idx === selected && styles.identityRowActive]}
              onPress={() => setSelected(idx)}
            >
              <MaterialIcons
                name={idx === selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                size={20}
                color={idx === selected ? '#3B82F6' : '#94a3b8'}
              />
              <Text style={styles.identityText} numberOfLines={1}>
                {id.did ?? id.address}
              </Text>
            </TouchableOpacity>
          ))
        )}

        <Text style={styles.label}>Offer URI</Text>
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
          <Text style={[styles.buttonText, styles.buttonSecondaryText]}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.button,
            styles.buttonPrimary,
            (busy || !activeIdentity) && styles.buttonDisabled,
          ]}
          onPress={handleAccept}
          disabled={busy || !activeIdentity}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Accept</Text>
          )}
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
  identityRow: {
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
  identityRowActive: { borderColor: '#3B82F6', backgroundColor: '#eff6ff' },
  identityText: { flex: 1, fontSize: 13, color: '#0f172a' },
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
