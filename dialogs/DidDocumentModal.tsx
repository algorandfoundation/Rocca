import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Modal from '../components/Modal';
import type { DIDDocument } from "@/extensions/identities/types";
import { exportDidDocument, importDidDocument } from '@/utils/did-backup';

interface DidDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  didDocument: DIDDocument | undefined;
  onDidDocumentUpdate?: (didDocument: DIDDocument) => void;
}

export function DidDocumentModal({ visible, onClose, didDocument, onDidDocumentUpdate }: DidDocumentModalProps) {
  const [isLoading, setIsLoading] = useState(false);

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
            onPress: () => {
              onDidDocumentUpdate?.(importedDoc);
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('Import Failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title="DID Document"
    >
      {didDocument ? (
        <View>
          <Text style={styles.docLabel}>@context:</Text>
          {didDocument['@context'].map((ctx, index) => (
            <Text key={index} style={styles.docValue}>{ctx}</Text>
          ))}
          
          <Text style={styles.docLabel}>id:</Text>
          <Text style={styles.docValue}>{didDocument.id}</Text>
          
          <Text style={styles.docLabel}>verificationMethod:</Text>
          {didDocument.verificationMethod.map((method, index) => (
            <View key={index} style={styles.verificationMethod}>
              <Text style={styles.docSubLabel}>  id: {method.id}</Text>
              <Text style={styles.docSubLabel}>  type: {method.type}</Text>
              <Text style={styles.docSubLabel}>  controller: {method.controller}</Text>
              <Text style={styles.docSubLabel}>  publicKeyMultibase: {method.publicKeyMultibase}</Text>
            </View>
          ))}
          
          <Text style={styles.docLabel}>authentication:</Text>
          {didDocument.authentication.map((auth, index) => (
            <Text key={index} style={styles.docValue}>{auth}</Text>
          ))}
          
          <Text style={styles.docLabel}>assertionMethod:</Text>
          {didDocument.assertionMethod.map((method, index) => (
            <Text key={index} style={styles.docValue}>{method}</Text>
          ))}
          
          <Text style={styles.docLabel}>service:</Text>
          {didDocument.service?.map((svc, index) => (
            <View key={index} style={styles.serviceSection}>
              <Text style={styles.docSubLabel}>  id: {svc.id}</Text>
              <Text style={styles.docSubLabel}>  type: {svc.type}</Text>
              <Text style={styles.docSubLabel}>  iceServers:</Text>
              <View style={styles.endpointContainer}>
                {svc.iceServers.map((iceServer, idx) => (
                  <View key={`ice-${idx}`}>
                    <Text style={styles.endpointLabel}>    - urls:</Text>
                    {Array.isArray(iceServer.urls) ? (
                      iceServer.urls.map((url, urlIdx) => (
                        <Text key={`url-${urlIdx}`} style={styles.endpointValue}>        - {url}</Text>
                      ))
                    ) : (
                      <Text style={styles.endpointValue}>        - {iceServer.urls}</Text>
                    )}
                    {iceServer.username && (
                      <Text style={styles.endpointValue}>      username: {iceServer.username}</Text>
                    )}
                    {iceServer.credential && (
                      <Text style={styles.endpointValue}>      credential: ***</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}

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
    </Modal>
  );
}

const styles = StyleSheet.create({
  docLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 4,
  },
  docValue: {
    fontSize: 12,
    color: '#334155',
    fontFamily: 'monospace',
    marginLeft: 8,
    marginBottom: 2,
  },
  docSubLabel: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'monospace',
    marginLeft: 8,
    marginBottom: 2,
  },
  verificationMethod: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  serviceSection: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  endpointContainer: {
    marginTop: 4,
  },
  endpointLabel: {
    fontSize: 12,
    color: '#166534',
    fontFamily: 'monospace',
    marginLeft: 16,
    marginTop: 4,
  },
  endpointValue: {
    fontSize: 11,
    color: '#15803D',
    fontFamily: 'monospace',
    marginLeft: 24,
    marginBottom: 2,
  },
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
});

export default DidDocumentModal;
