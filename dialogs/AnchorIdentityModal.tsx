import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Modal from '../components/Modal';
import { useProvider } from '@/hooks/useProvider';

interface AnchorIdentityModalProps {
  visible: boolean;
  onClose: () => void;
  identityAddress: string | undefined;
}

type Stage = 'idle' | 'running' | 'done' | 'error';

/**
 * Drives the "anchor this identity on-chain via intermezzo" upgrade
 * path. Wraps {@link import('@/extensions/intermezzo-identities').IntermezzoIdentitiesApi.anchorIdentity}
 * with a tiny UI so the user can:
 *
 *   1. Confirm which identity they're anchoring.
 *   2. See the resulting build response + derived Algorand address.
 *
 * This requires a `device-attestation-credential` to be already
 * present in the wallet for the selected identity.
 */
export function AnchorIdentityModal({
  visible,
  onClose,
  identityAddress,
}: AnchorIdentityModalProps) {
  const { credentials, identity } = useProvider();

  const linkCredential = useMemo(() => {
    return credentials.find(
      (c) =>
        c.identityAddress === identityAddress &&
        c.configurationId === 'device-attestation-credential',
    );
  }, [credentials, identityAddress]);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | undefined>();
  const [result, setResult] = useState<
    | {
        algorandAddress: string;
        didAlgo?: string;
        appId?: string;
        txId?: string;
      }
    | undefined
  >();

  const intermezzo = useMemo(() => identity?.intermezzo, [identity]);

  const reset = useCallback(() => {
    setStage('idle');
    setError(undefined);
    setResult(undefined);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleAnchor = useCallback(async () => {
    if (!identityAddress || !intermezzo || !linkCredential) return;
    setStage('running');
    setError(undefined);
    try {
      const credentialPresentation =
        typeof linkCredential.raw === 'string'
          ? linkCredential.raw
          : new TextDecoder().decode(linkCredential.raw);

      const outcome = await intermezzo.anchorIdentity({
        identityAddress,
        credentialPresentation,
      });
      setResult({
        algorandAddress: outcome.signer.addr.toString(),
        didAlgo:
          typeof outcome.submitResponse.did === 'string' ? outcome.submitResponse.did : undefined,
        appId:
          typeof outcome.submitResponse.appId === 'string'
            ? outcome.submitResponse.appId
            : undefined,
        txId:
          typeof outcome.submitResponse.txId === 'string' ? outcome.submitResponse.txId : undefined,
      });
      setStage('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStage('error');
    }
  }, [identityAddress, intermezzo, linkCredential]);

  return (
    <Modal visible={visible} onClose={handleClose} title="Anchor identity on-chain">
      <View style={styles.body}>
        <Text style={styles.identity} numberOfLines={1} ellipsizeMode="middle">
          {identityAddress ?? '—'}
        </Text>
        <Text style={styles.description}>
          Anchoring uses the device-attestation credential on file to ask intermezzo to build the
          on-chain transactions that will deploy this identity&apos;s{' '}
          <Text style={styles.code}>did:algo</Text> contract.
        </Text>

        {!linkCredential && stage === 'idle' && (
          <View
            style={[styles.resultBlock, { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' }]}
          >
            <View style={styles.statusRow}>
              <MaterialIcons name="warning" size={20} color="#EF4444" />
              <Text style={[styles.statusText, { color: '#991B1B' }]}>
                No device-attestation credential found for this identity. Please issue one first.
              </Text>
            </View>
          </View>
        )}

        {stage === 'idle' && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAnchor}
            disabled={!identityAddress || !linkCredential}
          >
            <MaterialIcons name="anchor" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Start anchor flow</Text>
          </TouchableOpacity>
        )}

        {stage === 'running' && (
          <View style={styles.statusRow}>
            <ActivityIndicator color="#3B82F6" />
            <Text style={styles.statusText}>Building transactions…</Text>
          </View>
        )}

        {stage === 'done' && result && (
          <View style={styles.resultBlock}>
            <View style={styles.statusRow}>
              <MaterialIcons name="check-circle" size={20} color="#10B981" />
              <Text style={styles.statusText}>Identity anchored on-chain.</Text>
            </View>
            {result.didAlgo && (
              <>
                <Text style={styles.resultLabel}>did:algo</Text>
                <Text style={styles.resultValue} numberOfLines={1} ellipsizeMode="middle">
                  {result.didAlgo}
                </Text>
              </>
            )}
            {result.appId && (
              <>
                <Text style={styles.resultLabel}>App id</Text>
                <Text style={styles.resultValue} numberOfLines={1} ellipsizeMode="middle">
                  {result.appId}
                </Text>
              </>
            )}
            {result.txId && (
              <>
                <Text style={styles.resultLabel}>Create txn id</Text>
                <Text style={styles.resultValue} numberOfLines={1} ellipsizeMode="middle">
                  {result.txId}
                </Text>
              </>
            )}
            <Text style={styles.resultLabel}>Algorand sender (from did:key)</Text>
            <Text style={styles.resultValue} numberOfLines={1} ellipsizeMode="middle">
              {result.algorandAddress}
            </Text>
          </View>
        )}

        {stage === 'error' && (
          <View style={styles.resultBlock}>
            <View style={styles.statusRow}>
              <MaterialIcons name="error" size={20} color="#EF4444" />
              <Text style={[styles.statusText, { color: '#B91C1C' }]}>{error}</Text>
            </View>
            <TouchableOpacity style={styles.secondaryButton} onPress={reset}>
              <Text style={styles.secondaryButtonText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingBottom: 12,
  },
  identity: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 16,
  },
  code: {
    fontFamily: 'monospace',
    color: '#0F172A',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#0F172A',
  },
  resultBlock: {
    marginTop: 8,
  },
  resultLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  resultValue: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#0F172A',
    marginTop: 4,
  },
  note: {
    marginTop: 16,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  secondaryButton: {
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  secondaryButtonText: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
});

export default AnchorIdentityModal;
