import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Modal from '../components/Modal';
import type { Identity } from '@/extensions/identities/types';
import { getSigningName } from '@/utils/did-signing-name';

interface SignDocumentModalProps {
  visible: boolean;
  onClose: () => void;
  identity: Identity;
  onSign: (name: string) => void;
  prefilledName?: string;
}

export function SignDocumentModal({
  visible,
  onClose,
  identity,
  onSign,
  prefilledName,
}: SignDocumentModalProps) {
  const [name, setName] = useState('');
  const savedName = getSigningName(identity.didDocument) || '';
  const resolvedName = savedName || prefilledName || '';

  useEffect(() => {
    if (visible) {
      setName(resolvedName);
    }
  }, [visible, resolvedName]);

  function handleConfirm() {
    const finalName = resolvedName.trim() || name.trim();
    if (!finalName) return;
    onSign(finalName);
  }

  const hasName = !!resolvedName.trim();

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      onRequestClose={() => {}}
      title={hasName ? 'Confirm Signature' : 'Sign Document'}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingVertical: 8 }}
        >
          <View style={styles.body}>
            {hasName ? (
              <>
                <Text style={styles.confirmLabel}>Sign as</Text>
                <Text style={styles.confirmName}>{resolvedName}</Text>
                <Text style={styles.confirmHint}>
                  {savedName
                    ? 'Your signing name is saved in your identity.'
                    : 'Name taken from your signature field.'}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.label}>Type your name to sign</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Alice Smith"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />
              </>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                !hasName && !name.trim() && styles.primaryButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!hasName && !name.trim()}
            >
              <MaterialIcons name="fingerprint" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                {hasName ? 'Sign with Biometrics' : 'Confirm & Sign'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  confirmLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  confirmName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  confirmHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
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
