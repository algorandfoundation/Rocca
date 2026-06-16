import { Button } from '@/components/Button';
import { AppText } from '@/components/Text';
import { useProvider } from '@/hooks/useProvider';
import { MaterialIcons } from '@expo/vector-icons';
import { BottomSheetBackdrop, BottomSheetModal } from '@gorhom/bottom-sheet';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { forwardRef, useCallback, useState, type ComponentProps } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

function isValidURL(urlString: string) {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

export const ConnectNewAgentModal = forwardRef<BottomSheetModal, { children?: React.ReactNode }>(
  function ConnectNewAgentModal(_props, ref) {
    const router = useRouter();
    const { theme } = useUnistyles();
    const { accounts } = useProvider();
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    const renderBackdrop = useCallback(
      (props: ComponentProps<typeof BottomSheetBackdrop>) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      ),
      [],
    );

    const handleSheetChange = useCallback(
      (index: number) => {
        if (index >= 0 && !permission?.granted && permission?.canAskAgain !== false) {
          requestPermission();
        }
      },
      [permission, requestPermission],
    );

    const dismiss = () => (ref as React.RefObject<BottomSheetModal>)?.current?.dismiss();

    const handleBarcodeScanned = async (scanningResult: { type: string; data: string }) => {
      if (scanned) return;
      setScanned(true);
      let { data } = scanningResult;

      const lowerData = data.toLowerCase();

      if (lowerData.startsWith('fido:')) {
        try {
          Alert.alert(
            'FIDO Link',
            'FIDO links are not supported in this modal. Please use the main Scan screen.',
            [{ text: 'OK' }],
          );
          dismiss();
        } catch {
          Alert.alert('Error', 'Could not process FIDO link');
          dismiss();
        }
        return;
      }

      if (!lowerData.startsWith('liquid:')) {
        Alert.alert('Error', 'Unsupported QR code. Only liquid: links are supported.');
        setScanned(false);
        return;
      }

      let processedData = data;
      if (lowerData.startsWith('liquid://')) {
        processedData = 'https://' + data.substring(9);
      } else if (lowerData.startsWith('liquid:')) {
        processedData = 'https://' + data.substring(7);
      }

      if (isValidURL(processedData)) {
        if (accounts.length === 0) {
          Alert.alert('Error', 'No accounts found. Please create or import an account first.');
          dismiss();
          return;
        }

        const url = new URL(processedData);

        let requestId = url.searchParams.get('requestId');
        let pathname = url.pathname;

        if (!requestId && pathname && pathname !== '/') {
          const segments = pathname.split('/').filter(Boolean);
          if (segments.length === 1) {
            requestId = segments[0];
            pathname = '/';
          }
        }

        if (!requestId) {
          Alert.alert('Error', 'Invalid QR code: missing requestId');
          setScanned(false);
          return;
        }

        let origin = `${url.protocol}//${url.host}`;
        if (pathname && pathname !== '/') {
          origin += pathname;
        }

        dismiss();
        router.push({ pathname: '/chat', params: { origin, requestId } });
        return;
      }

      Alert.alert('Error', 'Invalid liquid link format.');
      setScanned(false);
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['70%']}
        index={0}
        enableDynamicSizing={false}
        onChange={handleSheetChange}
        backdropComponent={renderBackdrop}
        backgroundStyle={stylesheet.shell}
        handleComponent={null}
      >
        <View style={stylesheet.body}>
          <View style={stylesheet.header}>
            <View style={stylesheet.headerLeft}>
              <MaterialIcons name="qr-code-scanner" size={20} color={theme.colors.fg.primary} />
              <AppText variant="h3">Connect New Agent</AppText>
            </View>
            <Pressable onPress={dismiss} hitSlop={8}>
              <MaterialIcons name="keyboard-arrow-down" size={26} color={theme.colors.fg.muted} />
            </Pressable>
          </View>

          {!permission ? (
            <View style={stylesheet.centered}>
              <AppText variant="body" color="muted">
                Loading camera…
              </AppText>
            </View>
          ) : !permission.granted ? (
            <View style={stylesheet.centered}>
              <MaterialIcons name="camera-alt" size={48} color={theme.colors.fg.muted} />
              <AppText variant="body" color="muted" style={stylesheet.permissionText}>
                {permission.canAskAgain
                  ? 'Camera access is needed to scan QR codes'
                  : 'Camera access was denied. Enable it in Settings to scan QR codes.'}
              </AppText>
              <Button
                label={permission.canAskAgain ? 'Grant Permission' : 'Open Settings'}
                onPress={permission.canAskAgain ? requestPermission : () => Linking.openSettings()}
                variant="primary"
                size="md"
                color="primary"
                style={stylesheet.permissionButton}
              />
            </View>
          ) : (
            <View style={stylesheet.cameraContainer}>
              <CameraView
                style={stylesheet.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              >
                <View style={stylesheet.overlay}>
                  <View style={stylesheet.scanAreaContainer}>
                    <View style={stylesheet.scanArea} />
                    <AppText variant="body" color="inverse" style={stylesheet.scanText}>
                      Align QR code within the frame
                    </AppText>
                  </View>
                </View>
              </CameraView>
            </View>
          )}
        </View>
      </BottomSheetModal>
    );
  },
);

ConnectNewAgentModal.displayName = 'ConnectNewAgentModal';

const stylesheet = StyleSheet.create((theme) => ({
  shell: {
    backgroundColor: theme.colors.bg.surface,
  },
  body: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.default,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.base,
  },
  permissionText: {
    textAlign: 'center',
  },
  permissionButton: {
    minWidth: 180,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanAreaContainer: {
    alignItems: 'center',
    gap: theme.spacing.base,
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: theme.colors.fg.primary,
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.lg,
  },
  scanText: {
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
}));
