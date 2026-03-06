import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Modal from '../components/Modal';
import type { DIDDocument } from "@/extensions/identities/did-document";

interface DidDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  didDocument: DIDDocument | undefined;
}

export function DidDocumentModal({ visible, onClose, didDocument }: DidDocumentModalProps) {
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
  noDocText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 20,
  },
});

export default DidDocumentModal;
