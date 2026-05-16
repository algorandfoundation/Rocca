import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Modal from '../components/Modal';

export type FieldType = 'signature' | 'field';

export interface FieldTypeChoice {
  type: FieldType;
  label: string;
  content?: string;
}

interface FieldTypeModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (choice: FieldTypeChoice) => void;
  defaultLabel?: string;
}

export function FieldTypeModal({ visible, onClose, onConfirm, defaultLabel }: FieldTypeModalProps) {
  const [type, setType] = useState<FieldType>('signature');
  const [text, setText] = useState('');

  function handleConfirm() {
    const trimmed =
      text.trim() || defaultLabel || (type === 'signature' ? 'Signature' : 'Text Field');
    onConfirm({
      type,
      label: trimmed,
      content: type === 'field' ? trimmed : undefined,
    });
    reset();
  }

  function reset() {
    setText('');
    setType('signature');
  }

  function handleClose() {
    reset();
    onClose();
  }

  const isSignature = type === 'signature';
  const previewText = text.trim() || (isSignature ? 'Jane Doe' : 'Your text here');

  return (
    <Modal visible={visible} onClose={handleClose} title="Add Field">
      <View style={styles.body}>
        <Text style={styles.sectionLabel}>Field type</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeButton, isSignature && styles.typeButtonActive]}
            onPress={() => setType('signature')}
          >
            <MaterialIcons name="edit" size={20} color={isSignature ? '#3B82F6' : '#64748B'} />
            <Text style={[styles.typeText, isSignature && styles.typeTextActive]}>Signature</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, !isSignature && styles.typeButtonActive]}
            onPress={() => setType('field')}
          >
            <MaterialIcons
              name="text-fields"
              size={20}
              color={!isSignature ? '#3B82F6' : '#64748B'}
            />
            <Text style={[styles.typeText, !isSignature && styles.typeTextActive]}>Text Field</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>{isSignature ? 'Name' : 'Text to print'}</Text>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={isSignature ? 'e.g. Alice Smith' : 'e.g. 2024-01-15'}
          placeholderTextColor="#94A3B8"
          autoCapitalize={isSignature ? 'words' : 'sentences'}
        />

        {/* Live preview */}
        <View style={styles.previewBox}>
          {isSignature ? (
            <>
              <View style={styles.previewUnderline} />
              <Text style={styles.previewName}>{previewText}</Text>
              <Text style={styles.previewMeta}>Key: 0xABCD…EF | Sig: 0x1234…AB</Text>
            </>
          ) : (
            <Text style={styles.previewFieldText}>{previewText}</Text>
          )}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleConfirm}>
          <Text style={styles.primaryButtonText}>Place on Page</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#F1F5F9',
  },
  typeButtonActive: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  typeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  typeTextActive: {
    color: '#3B82F6',
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
  previewBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
    alignItems: 'flex-start',
    minHeight: 70,
    justifyContent: 'center',
  },
  previewUnderline: {
    width: 140,
    height: 2,
    backgroundColor: '#3B82F6',
    marginBottom: 4,
  },
  previewName: {
    fontSize: 16,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#0F172A',
  },
  previewMeta: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  previewFieldText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#0F172A',
  },
});
