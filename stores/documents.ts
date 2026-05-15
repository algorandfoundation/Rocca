import { Store } from '@tanstack/react-store';
import { createMMKV } from 'react-native-mmkv';
import * as FileSystem from 'expo-file-system/legacy';

export interface WalletDocument {
  id: string;
  name: string;
  uri: string;
  timestamp: number;
  signerDid: string;
  signerName: string;
  signatureHash: string;
  status: 'signed';
}

export interface DocumentsState {
  documents: WalletDocument[];
}

const documentsLocalStorage = createMMKV({
  id: 'documents',
});

const loadInitialDocuments = (): DocumentsState => {
  try {
    const stored = documentsLocalStorage.getString('documents');
    if (stored) {
      const parsed = JSON.parse(stored);
      return { documents: Array.isArray(parsed) ? parsed : [] };
    }
  } catch (error) {
    console.error('Failed to load documents from storage:', error);
  }
  return { documents: [] };
};

export const documentsStore = new Store<DocumentsState>(loadInitialDocuments());

documentsStore.subscribe(() => {
  const state = documentsStore.state;
  try {
    documentsLocalStorage.set('documents', JSON.stringify(state.documents));
  } catch (error) {
    console.error('Failed to save documents to storage:', error);
  }
});

export function addDocument(doc: Omit<WalletDocument, 'id' | 'timestamp'>) {
  documentsStore.setState((state) => {
    // Prevent duplicates: same URI already exists
    const isDuplicate = state.documents.some((d) => d.uri === doc.uri);
    if (isDuplicate) return state;

    return {
      ...state,
      documents: [
        ...state.documents,
        {
          ...doc,
          id: Math.random().toString(36).substring(2, 15),
          timestamp: Date.now(),
        },
      ],
    };
  });
}

export async function removeDocument(id: string) {
  const state = documentsStore.state;
  const doc = state.documents.find((d) => d.id === id);
  if (doc) {
    try {
      await FileSystem.deleteAsync(doc.uri, { idempotent: true });
    } catch (error) {
      console.warn('Failed to delete document file:', error);
    }
  }
  documentsStore.setState((state) => ({
    ...state,
    documents: state.documents.filter((d) => d.id !== id),
  }));
}

export function clearDocuments() {
  documentsStore.setState((state) => {
    // Best-effort delete all files
    state.documents.forEach(async (doc) => {
      try {
        await FileSystem.deleteAsync(doc.uri, { idempotent: true });
      } catch {
        // ignore
      }
    });
    return { ...state, documents: [] };
  });
}
