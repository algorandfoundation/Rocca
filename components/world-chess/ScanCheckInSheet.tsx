import theme from '@/theme/theme';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { forwardRef, useCallback, useMemo } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';

interface ScanCheckInSheetProps {
  onDismiss: () => void;
}

const ScanCheckInSheet = forwardRef<BottomSheetModal, ScanCheckInSheetProps>(
  ({ onDismiss }, ref) => {
    const [cameraPermission, requestCameraPermission] = useCameraPermissions();
    const { height: windowHeight, width: windowWidth } = useWindowDimensions();
    // Explicit pixel height so CameraView renders inside Reanimated's BottomSheetView
    // (flex: 1 doesn't resolve inside worklet-driven layout)
    const cameraHeight = windowHeight * 0.6 - 140;
    // Square viewport sized to fit within available width/height
    const viewportSize = useMemo(
      () => Math.min(windowWidth - 32, cameraHeight),
      [windowWidth, cameraHeight],
    );

    const renderBackdrop = useCallback(
      (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          pressBehavior="close"
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['60%']}
        index={0}
        enablePanDownToClose
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.semantic.bg['surface-1'] }}
        handleIndicatorStyle={{ display: 'none' }}
      >
        <BottomSheetView
          style={{
            flex: 1,
            paddingHorizontal: theme.primitives.spacing['16'],
            paddingBottom: theme.primitives.spacing['32'],
          }}
        >
          {/* Header row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.primitives.spacing['16'],
              position: 'relative',
            }}
          >
            <Text
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                color: theme.semantic.fg['high-emphasis'] as string,
                fontSize: theme.primitives.font.size['p-md'],
                fontFamily: theme.primitives.font.family.p,
                textAlign: 'center',
              }}
            >
              Scan to check in
            </Text>
            <Pressable onPress={onDismiss} hitSlop={8}>
              <Text
                style={{
                  color: theme.semantic.fg['brand-secondary'] as string,
                  fontSize: theme.primitives.font.size['p-lg'],
                  fontFamily: theme.primitives.font.family.p,
                  marginLeft: theme.primitives.spacing['8'],
                }}
              >
                Cancel
              </Text>
            </Pressable>
          </View>

          {/* Camera section */}
          <View
            style={{
              width: viewportSize,
              height: viewportSize,
              borderRadius: theme.primitives.radius['4'],
              overflow: 'hidden',
              backgroundColor: theme.primitives.color.neutral['90'],
              borderWidth: theme.primitives['border-width'][4],
              borderColor: theme.primitives.color.neutral.White,
              alignSelf: 'center',
              marginBottom: theme.primitives.spacing['16'],
            }}
          >
            {!cameraPermission?.granted ? (
              <View
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 24,
                }}
              >
                <Ionicons
                  name="camera-outline"
                  size={40}
                  color={theme.semantic.fg['low-emphasis']}
                />
                <Text
                  style={{
                    color: theme.semantic.fg['high-emphasis'] as string,
                    fontSize: theme.primitives.font.size['p-md'],
                    fontFamily: theme.primitives.font.family.p,
                    textAlign: 'center',
                    marginTop: theme.primitives.spacing['8'],
                    marginBottom: theme.primitives.spacing['16'],
                  }}
                >
                  Camera access is required to scan QR codes
                </Text>
                <Pressable
                  onPress={requestCameraPermission}
                  style={({ pressed }) => ({
                    backgroundColor: theme.semantic.bg['brand-primary'] as string,
                    paddingHorizontal: theme.primitives.spacing['16'],
                    paddingVertical: theme.primitives.spacing['12'],
                    borderRadius: theme.primitives.radius['8'],
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: theme.primitives.color.neutral.Black,
                      fontSize: theme.primitives.font.size['p-md'],
                      fontFamily: theme.primitives.font.family.p,
                    }}
                  >
                    Grant Permission
                  </Text>
                </Pressable>
              </View>
            ) : (
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              />
            )}
          </View>

          <Text
            style={{
              color: theme.semantic.fg['high-emphasis'] as string,
              fontSize: theme.primitives.font.size['p-md'],
              fontFamily: theme.primitives.font.family.p,
              textAlign: 'center',
              marginTop: theme.primitives.spacing['12'],
              paddingHorizontal: theme.primitives.spacing['8'],
              width: '85%',
              alignSelf: 'center',
            }}
          >
            Point your camera at the event QR code to quickly check in
          </Text>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

ScanCheckInSheet.displayName = 'ScanCheckInSheet';

export default ScanCheckInSheet;
