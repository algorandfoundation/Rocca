import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Pdf from 'react-native-pdf';
import { PDFDocument } from 'pdf-lib';
import { useProvider } from '@/hooks/useProvider';
import { SignDocumentModal } from '@/dialogs/SignDocumentModal';
import { FieldTypeModal } from '@/dialogs/FieldTypeModal';
import { FieldPlacementOverlay, type PlacedField } from '@/components/FieldPlacementOverlay';
import { setSigningName, getSigningName } from '@/utils/did-signing-name';
import { stampPdf, hashDocument, type SignatureField } from '@/utils/pdf-sign';
import { verifyPdf, extractProof } from '@/utils/verify-pdf';
import type { VerifyResult } from '@/utils/verify-pdf';
import { addDocument } from '@/stores/documents';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Buffer } from 'buffer';
import type { PageSize } from '@/utils/pdf-form';

function generateFieldId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export default function SignScreen() {
  const router = useRouter();
  const { pdfUri, readonly } = useLocalSearchParams<{ pdfUri?: string; readonly?: string }>();
  const { identities, identity } = useProvider();

  const isReadonly = readonly === 'true';

  const [error, setError] = useState<string | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);

  const [signPhase, setSignPhase] = useState<'idle' | 'signing' | 'success' | 'error'>('idle');
  const [signedUri, setSignedUri] = useState<string | null>(null);
  const [signError, setSignError] = useState<string | null>(null);
  const [signerNameState, setSignerNameState] = useState<string | null>(null);
  const [signerDidState, setSignerDidState] = useState<string | null>(null);
  const [hashPayloadState, setHashPayloadState] = useState<Uint8Array | null>(null);

  const [docMode, setDocMode] = useState<'sign' | 'verify' | 'view'>('sign');
  const [verifyPhase, setVerifyPhase] = useState<'idle' | 'verifying' | 'done'>('idle');
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastOpacity = React.useRef(new Animated.Value(0)).current;
  const toastTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  /* -- placement mode state -- */
  const [appMode, setAppMode] = useState<'view' | 'place'>('view');
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);
  const [pageSizes, setPageSizes] = useState<PageSize[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [showFieldTypeModal, setShowFieldTypeModal] = useState(false);
  const [pendingTap, setPendingTap] = useState<{ x: number; y: number; page: number } | null>(null);

  const source = pdfUri ? { uri: pdfUri, cache: false } : undefined;
  const activeIdentity = identities[0];

  /* -- detect existing signature / pre-scan pages -- */
  useEffect(() => {
    let cancelled = false;
    async function detect() {
      if (!pdfUri) return;
      try {
        const base64 = await FileSystem.readAsStringAsync(pdfUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const bytes = new Uint8Array(Buffer.from(base64, 'base64'));
        const detected = await extractProof(bytes);
        if (cancelled) return;
        if (!detected) {
          setDocMode('sign');
        } else if (detected.type === 'rocca') {
          setDocMode('verify');
        } else {
          setDocMode('view');
        }

        // Pre-scan page sizes
        const pdfDoc = await PDFDocument.load(bytes);
        const pages = pdfDoc.getPages();
        const sizes: PageSize[] = pages.map((p) => ({
          width: p.getWidth(),
          height: p.getHeight(),
        }));
        setPageSizes(sizes);
      } catch (e) {
        console.error('[SignScreen] Error pre-scanning PDF:', e);
        if (!cancelled) setDocMode('sign');
      }
    }
    detect();
    return () => {
      cancelled = true;
    };
  }, [pdfUri]);

  const showToast = useCallback(
    (msg: string) => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToastMsg(msg);
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      toastTimer.current = setTimeout(() => {
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setToastMsg(null));
      }, 2500);
    },
    [toastOpacity],
  );

  async function handleNameUpdated(name: string) {
    if (!activeIdentity) return;
    if (activeIdentity.didDocument) {
      const updatedDoc = setSigningName(activeIdentity.didDocument, name);
      await identity.store.updateDidDocument(activeIdentity.address, updatedDoc);
    }
  }

  async function handleVerify() {
    if (!pdfUri) return;
    setVerifyPhase('verifying');
    try {
      const result = await verifyPdf(pdfUri, identities);
      setVerifyResult(result);
    } catch (err) {
      setVerifyResult({
        valid: false,
        knownSigner: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setVerifyPhase('done');
    }
  }

  /* -- single-field fallback (backward compatible) -- */
  async function handleSign(signerName: string) {
    if (!pdfUri || !activeIdentity || !activeIdentity.sign) {
      setSignPhase('error');
      setSignError('Cannot sign: missing PDF or identity');
      return;
    }

    setSignPhase('signing');
    setShowNameModal(false);

    try {
      const pk = activeIdentity.didDocument?.verificationMethod?.[0]?.publicKeyMultibase;
      const signerDid = pk || activeIdentity.did || activeIdentity.address || 'unknown';

      const field: SignatureField = {
        id: 'default',
        page: 1,
        x: 0,
        y: 0,
      };

      const originalBase64 = await FileSystem.readAsStringAsync(pdfUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const originalBytes = new Uint8Array(Buffer.from(originalBase64, 'base64'));

      const timestamp = new Date().toISOString();
      const hashPayload = hashDocument(originalBytes, [field], signerName, signerDid, timestamp);

      const [signature] = await activeIdentity.sign([hashPayload]);
      console.log('[SignScreen] Signature OK, length:', signature.length);

      const stampedUri = await stampPdf(
        pdfUri,
        signerName,
        signerDid,
        hashPayload,
        signature,
        timestamp,
        [field],
      );

      await handleNameUpdated(signerName);

      setSignedUri(stampedUri);
      setSignerNameState(signerName);
      setSignerDidState(signerDid);
      setHashPayloadState(hashPayload);
      setSignPhase('success');
      showToast('Document signed successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[SignScreen] Signing error:', err);
      setSignError(msg);
      setSignPhase('error');
    }
  }

  /* -- multi-field sign flow: one dialog, one signature, commit all -- */
  async function commitMultiFieldSign(signerName: string) {
    if (!pdfUri || !activeIdentity || !activeIdentity.sign || placedFields.length === 0) {
      setSignPhase('error');
      setSignError('Cannot sign: missing PDF, identity, or fields');
      return;
    }

    setSignPhase('signing');
    setShowNameModal(false);

    try {
      const pk = activeIdentity.didDocument?.verificationMethod?.[0]?.publicKeyMultibase;
      const signerDid = pk || activeIdentity.did || activeIdentity.address || 'unknown';

      const originalBase64 = await FileSystem.readAsStringAsync(pdfUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const originalBytes = new Uint8Array(Buffer.from(originalBase64, 'base64'));

      const timestamp = new Date().toISOString();
      const fields: SignatureField[] = placedFields.map((f) => ({
        id: f.id,
        page: f.page,
        x: f.x,
        y: f.y,
        type: f.kind,
        content: f.content,
      }));
      const hashPayload = hashDocument(originalBytes, fields, signerName, signerDid, timestamp);

      const [signature] = await activeIdentity.sign([hashPayload]);

      const stampedUri = await stampPdf(
        pdfUri,
        signerName,
        signerDid,
        hashPayload,
        signature,
        timestamp,
        fields,
      );

      await handleNameUpdated(signerName);

      setSignedUri(stampedUri);
      setSignerNameState(signerName);
      setSignerDidState(signerDid);
      setHashPayloadState(hashPayload);
      setSignPhase('success');
      setAppMode('view');
      setPlacedFields([]);
      showToast('Document signed successfully');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[SignScreen] Multi-field signing error:', err);
      setSignError(msg);
      setSignPhase('error');
    }
  }

  /* -- placement helpers -- */
  function handleTapAt(pdfX: number, pdfY: number, page: number) {
    setPendingTap({ x: pdfX, y: pdfY, page });
    setShowFieldTypeModal(true);
  }

  function handleConfirmFieldType(
    type: 'signature' | 'field',
    label: string,
    content?: string,
    size?: number,
  ) {
    if (!pendingTap) return;
    const field: PlacedField = {
      id: generateFieldId(),
      page: pendingTap.page,
      x: pendingTap.x,
      y: pendingTap.y,
      kind: type,
      label: label || (type === 'signature' ? 'Signature' : 'Text Field'),
      content: type === 'field' ? content : undefined,
      size,
    };
    setPlacedFields((prev) => [...prev, field]);
    setPendingTap(null);
    setShowFieldTypeModal(false);
  }

  function handleRemoveField(id: string) {
    setPlacedFields((prev) => prev.filter((f) => f.id !== id));
  }

  function handleMoveField(id: string, pdfX: number, pdfY: number) {
    setPlacedFields((prev) => prev.map((f) => (f.id === id ? { ...f, x: pdfX, y: pdfY } : f)));
  }

  function handleSetFieldSize(id: string, size: number) {
    setPlacedFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, size: Math.min(32, Math.max(8, size)) } : f)),
    );
  }

  /* -- share / wallet -- */
  async function handleShare() {
    if (!signedUri) return;
    try {
      await Sharing.shareAsync(signedUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Signed Document',
      });
    } catch {
      // ignore
    }
  }

  async function handleViewInWallet() {
    if (!signedUri) return;
    const fileName = signedUri.split('/').pop() || 'signed-document.pdf';
    addDocument({
      name: fileName,
      uri: signedUri,
      signerDid: signerDidState || 'unknown',
      signerName: signerNameState || 'unknown',
      signatureHash: hashPayloadState
        ? Buffer.from(hashPayloadState).toString('hex').toUpperCase()
        : '',
      status: 'signed',
    });
    router.replace({
      pathname: '/sign',
      params: { pdfUri: signedUri, readonly: 'true' },
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{ title: isReadonly ? 'Document' : 'Sign Document', headerShown: false }}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isReadonly ? 'Document' : appMode === 'place' ? 'Place Fields' : 'Sign Document'}
        </Text>
        {isReadonly && (
          <TouchableOpacity
            style={styles.iconButton}
            onPress={async () => {
              if (!pdfUri) return;
              try {
                await Sharing.shareAsync(pdfUri, {
                  mimeType: 'application/pdf',
                  dialogTitle: 'Share Document',
                });
              } catch {
                // ignore
              }
            }}
          >
            <MaterialIcons name="share" size={24} color="#3B82F6" />
          </TouchableOpacity>
        )}
        {!isReadonly && <View style={styles.iconButton} />}
      </View>

      {/* PDF */}
      {!source || error ? (
        <View style={styles.center}>
          <MaterialIcons name="insert-drive-file" size={64} color="#CBD5E1" />
          <Text style={styles.errorText}>{error || 'No PDF file available.'}</Text>
        </View>
      ) : (
        <View style={styles.pdfContainer}>
          <FieldPlacementOverlay
            fields={placedFields}
            pageSizes={pageSizes}
            currentPage={currentPage}
            currentZoom={currentZoom}
            isActive={appMode === 'place'}
            onTapAt={handleTapAt}
            onMoveField={handleMoveField}
            onRemoveField={handleRemoveField}
            onSetFieldSize={handleSetFieldSize}
          >
            <Pdf
              source={source}
              style={styles.pdf}
              enableDoubleTapZoom={appMode !== 'place'}
              enablePaging={appMode === 'place'}
              spacing={10}
              fitPolicy={0}
              onError={(err) => {
                console.error('[SignScreen] PDF load error:', err);
                setError('Failed to load PDF. The file may be corrupted or unsupported.');
              }}
              onPageChanged={(page) => setCurrentPage(page)}
              onScaleChanged={(scale) => setCurrentZoom(scale)}
            />
          </FieldPlacementOverlay>

          {toastMsg && (
            <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
              <MaterialIcons name="check-circle" size={18} color="#10B981" />
              <Text style={styles.toastText}>{toastMsg}</Text>
            </Animated.View>
          )}
        </View>
      )}

      {/* Bottom bar — single Sign / Fill button to enter placement mode */}
      {!isReadonly && docMode === 'sign' && appMode === 'view' && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.signButton, !activeIdentity && styles.signButtonDisabled]}
            onPress={() => {
              setAppMode('place');
              setPlacedFields([]);
            }}
            disabled={!activeIdentity}
          >
            <MaterialIcons name="edit" size={20} color="#FFFFFF" />
            <Text style={styles.signButtonText}>Sign</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Placement mode bottom bar */}
      {appMode === 'place' && (
        <View style={styles.bottomBar}>
          <Text style={styles.placeHint}>
            {placedFields.length === 0
              ? 'Tap anywhere on the page to place a field'
              : `${placedFields.length} field(s) placed. Tap to add more.`}
          </Text>
          <View style={styles.placeRow}>
            <TouchableOpacity
              style={[styles.signButton, { backgroundColor: '#64748B', flex: 1 }]}
              onPress={() => {
                setAppMode('view');
                setPlacedFields([]);
              }}
            >
              <Text style={styles.signButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.signButton, { flex: 2 }]}
              onPress={() => {
                if (placedFields.length === 0) {
                  setAppMode('view');
                  return;
                }
                setShowNameModal(true);
              }}
            >
              <MaterialIcons name="done" size={20} color="#FFFFFF" />
              <Text style={styles.signButtonText}>Confirm to Sign</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {docMode === 'verify' && appMode === 'view' && (
        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.signButton} onPress={handleVerify}>
            <MaterialIcons name="verified-user" size={20} color="#FFFFFF" />
            <Text style={styles.signButtonText}>Verify Signature</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Signing overlay */}
      {signPhase === 'signing' && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.overlayTitle}>Signing document...</Text>
            <Text style={styles.overlaySub}>Use your fingerprint when prompted</Text>
          </View>
        </View>
      )}

      {signPhase === 'success' && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <MaterialIcons name="check-circle" size={56} color="#10B981" />
            <Text style={styles.overlayTitle}>Document Signed!</Text>

            {signedUri && (
              <View style={styles.fileInfo}>
                <MaterialIcons name="insert-drive-file" size={16} color="#64748B" />
                <Text style={styles.fileInfoText} numberOfLines={1}>
                  {signedUri.split('/').pop()}
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <MaterialIcons name="share" size={20} color="#FFFFFF" />
              <Text style={styles.shareButtonText}>Share Signed PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.viewButton} onPress={handleViewInWallet}>
              <MaterialIcons name="visibility" size={20} color="#3B82F6" />
              <Text style={styles.viewButtonText}>View Document</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                router.replace('/landing' as any);
              }}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {signPhase === 'error' && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <MaterialIcons name="error" size={56} color="#EF4444" />
            <Text style={styles.overlayTitle}>Signing Failed</Text>
            <Text style={styles.overlaySub}>{signError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setSignPhase('idle');
                setSignError(null);
              }}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Verify overlay */}
      {verifyPhase === 'verifying' && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.overlayTitle}>Checking signature...</Text>
          </View>
        </View>
      )}

      {verifyPhase === 'done' && verifyResult && (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            {verifyResult.valid ? (
              <>
                <MaterialIcons name="verified" size={56} color="#10B981" />
                <Text style={styles.overlayTitle}>Signature Valid</Text>
                {verifyResult.signerName && (
                  <Text style={styles.overlaySub}>{verifyResult.signerName}</Text>
                )}
                {verifyResult.timestamp && (
                  <Text style={styles.overlaySub}>
                    {new Date(verifyResult.timestamp).toLocaleString()}
                  </Text>
                )}
                <View
                  style={[
                    styles.knownBadge,
                    {
                      backgroundColor: verifyResult.knownSigner ? '#ECFDF5' : '#FEF3C7',
                      borderColor: verifyResult.knownSigner ? '#10B981' : '#F59E0B',
                    },
                  ]}
                >
                  <MaterialIcons
                    name={verifyResult.knownSigner ? 'verified-user' : 'person-outline'}
                    size={18}
                    color={verifyResult.knownSigner ? '#10B981' : '#F59E0B'}
                  />
                  <Text
                    style={[
                      styles.knownBadgeText,
                      { color: verifyResult.knownSigner ? '#10B981' : '#F59E0B' },
                    ]}
                  >
                    {verifyResult.knownSigner ? 'Known signer' : 'Unknown signer'}
                  </Text>
                </View>
              </>
            ) : (
              <>
                <MaterialIcons name="error" size={56} color="#EF4444" />
                <Text style={styles.overlayTitle}>Signature Invalid</Text>
                <Text style={styles.overlaySub}>{verifyResult.error || 'Verification failed'}</Text>
              </>
            )}
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setVerifyPhase('idle');
                setVerifyResult(null);
              }}
            >
              <Text style={styles.retryButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modals */}
      {activeIdentity && !isReadonly && appMode === 'view' && docMode === 'sign' && (
        <SignDocumentModal
          visible={showNameModal}
          onClose={() => setShowNameModal(false)}
          identity={activeIdentity}
          onSign={handleSign}
          prefilledName={getSigningName(activeIdentity.didDocument)}
        />
      )}

      {activeIdentity && !isReadonly && appMode === 'place' && (
        <SignDocumentModal
          visible={showNameModal}
          onClose={() => setShowNameModal(false)}
          identity={activeIdentity}
          onSign={commitMultiFieldSign}
          prefilledName={
            getSigningName(activeIdentity.didDocument) ||
            placedFields.find((f) => f.kind === 'signature')?.label ||
            ''
          }
        />
      )}

      <FieldTypeModal
        visible={showFieldTypeModal}
        onClose={() => {
          setShowFieldTypeModal(false);
          setPendingTap(null);
        }}
        onConfirm={(choice) => handleConfirmFieldType(choice.type, choice.label, choice.content)}
        defaultLabel={
          pendingTap
            ? placedFields.some((f) => f.kind === 'signature')
              ? `Field ${placedFields.filter((f) => f.kind === 'field').length + 1}`
              : 'Signature'
            : undefined
        }
      />
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
    textAlign: 'center',
  },
  pdfContainer: {
    flex: 1,
  },
  pdf: {
    flex: 1,
    width,
    height,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#10B981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  toastText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  signButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
  },
  signButtonDisabled: {
    backgroundColor: '#CBD5E1',
  },
  signButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248, 250, 252, 0.96)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 10,
  },
  overlayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  overlayTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  overlaySub: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 4,
  },
  fileInfoText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    maxWidth: 220,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    marginTop: 8,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
  },
  viewButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '700',
  },
  doneButton: {
    alignItems: 'center',
    paddingVertical: 10,
    width: '100%',
  },
  doneButtonText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
  },
  knownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginTop: 4,
  },
  knownBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  placeHint: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 8,
  },
  placeRow: {
    flexDirection: 'row',
    gap: 8,
  },
});
