import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Modal from '../components/Modal';
import type { Identity } from '@/extensions/identities/types';
import { getSigningName } from '@/utils/did-signing-name';

interface SignDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  identity: Identity;
  onSign: (name: string) => void;
}

export function SignDocumentModal({ visible, onClose, identity, onSign }: SignDocumentModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (visible) {
      const saved = getSigningName(identity.didDocument);
      setName(saved ?? '');
    }
  }, [visible, identity]);

  function handleConfirm() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSign(trimmed);
  }

  return (
    <Modal visible={visible} onClose={onClose} title="Sign Document">
      <View style={styles.body}>
        <Text style={styles.label}>Type your name to sign</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Alice Smith"
          placeholderTextColor="#94A3B8"
          autoCapitalize="words"
        />

        <TouchableOpacity
          style={[styles.primaryButton, !name.trim() && styles.primaryButtonDisabled]}
          onPress={handleConfirm}
          disabled={!name.trim()}
        >
          <MaterialIcons name="fingerprint" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Sign with Biometrics</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#0F172A',
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  primaryButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '500',
  },
});

export default SignDocumentModal;
