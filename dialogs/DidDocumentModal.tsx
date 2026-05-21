import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import JSONTree from 'react-native-json-tree';
import Modal from '../components/Modal';
import type { DIDDocument, Identity } from '@algorandfoundation/identities-store';
import { exportDidDocument, importDidDocument } from '@/utils/did-backup';
import { useProvider } from '@/hooks/useProvider';
import { getIdentityAnchor, isAnchorUpToDate } from '@/utils/anchor';
import { AnchorIdentityModal } from '@/dialogs/AnchorIdentityModal';

interface DidDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  didDocument: DIDDocument | undefined;
  /**
   * Owning identity. When provided, the modal surfaces an "Anchor
   * status" section showing the on-chain snapshot (if any) and
   * conditionally renders an "Anchor on-chain" CTA — visible only
   * when the local document differs from the anchored snapshot or
   * no anchor exists yet.
   */
  identity?: Identity;
  onDidDocumentUpdate?: (didDocument: DIDDocument) => void;
}

export function DidDocumentModal({
  visible,
  onClose,
  didDocument,
  identity: targetIdentity,
  onDidDocumentUpdate,
}: DidDocumentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [anchorOpen, setAnchorOpen] = useState(false);
  const { identity } = useProvider();
  const anchor = getIdentityAnchor(targetIdentity);
  const upToDate = isAnchorUpToDate(targetIdentity);

  const handleExport = async () => {
    if (!didDocument) {
      Alert.alert('Error', 'No DID Document to export');
      return;
    }

    setIsLoading(true);
    try {
      await exportDidDocument(didDocument);
    } catch (error) {
      Alert.alert('Export Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!didDocument) {
      Alert.alert('Error', 'No current DID Document to validate against');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];

      setIsLoading(true);
      const importedDoc = await importDidDocument(file.uri, didDocument.id);

      Alert.alert(
        'Import Successful',
        'DID Document imported successfully. Replace current document?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'default',
            onPress: async () => {
              try {
                await identity.store.restoreFromDidDocument(importedDoc);
                onDidDocumentUpdate?.(importedDoc);
              } catch (error) {
                Alert.alert(
                  'Restore Failed',
                  error instanceof Error ? error.message : 'Unknown error',
                );
              }
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('Import Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title="DID Document">
      {didDocument ? (
        <View>
          <JSONTree
            data={didDocument}
            theme={{
              scheme: 'google',
              author: 'seth wright (http://sethawright.com)',
              base00: '#ffffff',
              base01: '#e0e0e0',
              base02: '#d0d0d0',
              base03: '#b0b0b0',
              base04: '#505050',
              base05: '#373b41',
              base06: '#282a2e',
              base07: '#1d1f21',
              base08: '#CC342B',
              base09: '#F96A38',
              base0A: '#FBA922',
              base0B: '#198844',
              base0C: '#3971ED',
              base0D: '#3971ED',
              base0E: '#A36AC7',
              base0F: '#3971ED',
            }}
            invertTheme={false}
            hideRoot={true}
          />

          {targetIdentity && (
            <View style={styles.anchorSection}>
              <Text style={styles.anchorTitle}>Anchor status</Text>
              {anchor ? (
                <>
                  <Text style={styles.anchorMeta}>
                    Anchored {new Date(anchor.anchoredAt).toLocaleString()}
                  </Text>
                  {anchor.didAlgo && (
                    <Text style={styles.anchorMeta} numberOfLines={1} ellipsizeMode="middle">
                      {anchor.didAlgo}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.anchorStatus,
                      upToDate ? styles.anchorStatusOk : styles.anchorStatusStale,
                    ]}
                  >
                    {upToDate
                      ? '✓ Document matches on-chain version'
                      : '⚠ Local document has diverged from on-chain version'}
                  </Text>
                </>
              ) : (
                <Text style={styles.anchorMeta}>Not yet anchored on-chain</Text>
              )}
              {!upToDate && (
                <TouchableOpacity style={styles.anchorCta} onPress={() => setAnchorOpen(true)}>
                  <MaterialIcons name="anchor" size={20} color="#FFFFFF" />
                  <Text style={styles.anchorCtaText}>
                    {anchor ? 'Update on-chain anchor' : 'Anchor on-chain'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleExport}
              disabled={isLoading}
            >
              <MaterialIcons name="file-upload" size={20} color="#3B82F6" />
              <Text style={styles.actionButtonText}>Export</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleImport}
              disabled={isLoading}
            >
              <MaterialIcons name="file-download" size={20} color="#10B981" />
              <Text style={styles.actionButtonText}>Import</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text style={styles.noDocText}>No DID Document available</Text>
      )}
      <AnchorIdentityModal
        visible={anchorOpen}
        identityAddress={targetIdentity?.address}
        onClose={() => setAnchorOpen(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  noDocText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#E2E8F0',
    paddingBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    minWidth: 120,
    justifyContent: 'center',
  },
  actionButtonText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  anchorSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  anchorTitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  anchorMeta: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  anchorStatus: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  anchorStatusOk: {
    color: '#059669',
  },
  anchorStatusStale: {
    color: '#B45309',
  },
  anchorCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
  },
  anchorCtaText: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 14,
  },
});

export default DidDocumentModal;
