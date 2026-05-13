import Button from '@/components/world-chess/Button';
import theme from '@/theme/theme';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';

interface AddProofSheetProps {
  onDismiss: () => void;
}

const AddProofSheet = forwardRef<BottomSheetModal, AddProofSheetProps>(({ onDismiss }, ref) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const { height: windowHeight } = useWindowDimensions();
  // Explicit pixel height so the area fills space inside Reanimated's BottomSheetView
  // (flex: 1 doesn't resolve inside worklet-driven layout)
  // 70% snap point minus header (~68px), description (~68px), upload button (~76px), paddings (~32px)
  const uploadAreaHeight = windowHeight * 0.7 - 244;

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

  const onChooseFile = useCallback(() => {
    // Placeholder — wire up a real document picker here
    setFileName('document.pdf');
  }, []);

  const onUpload = useCallback(() => {
    // Placeholder — wire up upload logic here
    onDismiss();
  }, [onDismiss]);

  const onRetake = useCallback(() => {
    setFileName(null);
  }, []);

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['70%']}
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
          flexDirection: 'column',
        }}
      >
        {/* Header row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: theme.primitives.spacing['24'],
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
            Add Proof
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

        {/* Content container with flex growth */}
        <Text
          style={{
            color: theme.semantic.fg['medium-emphasis'] as string,
            fontSize: theme.primitives.font.size['p-md'],
            fontFamily: theme.primitives.font.family.p,
            textAlign: 'center',
            marginBottom: theme.primitives.spacing['24'],
            paddingHorizontal: theme.primitives.spacing['8'],
            width: '85%',
            alignSelf: 'center',
          }}
        >
          Upload a document that proves you attended this event
        </Text>

        {/* File upload area */}
        <Pressable
          onPress={onChooseFile}
          style={({ pressed }) => ({
            height: uploadAreaHeight,
            borderWidth: 1,
            borderColor: theme.semantic.stroke['low-emphasis'] as string,
            borderStyle: 'dashed',
            borderRadius: theme.primitives.radius['8'],
            paddingHorizontal: theme.primitives.spacing['16'],
            paddingVertical: theme.primitives.spacing['16'],
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.primitives.spacing['8'],
            marginBottom: theme.primitives.spacing['12'],
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Ionicons
            name={fileName ? 'document-text-outline' : 'cloud-upload-outline'}
            size={36}
            color={theme.semantic.fg['medium-emphasis'] as string}
          />
          <Text
            style={{
              color: fileName
                ? (theme.semantic.fg['high-emphasis'] as string)
                : (theme.semantic.fg['medium-emphasis'] as string),
              fontSize: theme.primitives.font.size['p-md'],
              fontFamily: theme.primitives.font.family.p,
              textAlign: 'center',
            }}
          >
            {fileName ?? 'Tap to choose a file'}
          </Text>
          {!fileName && (
            <Text
              style={{
                color: theme.semantic.fg['low-emphasis'] as string,
                fontSize: theme.primitives.font.size['p-sm'],
                fontFamily: theme.primitives.font.family.p,
              }}
            >
              PDF, JPG, PNG supported
            </Text>
          )}
          {fileName && (
            <Button
              label="Retake"
              variant="secondary"
              size="small"
              onPress={onRetake}
              leftIcon={
                <MaterialIcons
                  name="undo"
                  size={14}
                  color={theme.semantic.bg['brand-primary'] as string}
                />
              }
            />
          )}
        </Pressable>

        {/* Upload button */}
        <View style={{ marginTop: theme.primitives.spacing['12'] }}>
          <Button
            label="Upload"
            variant="primary"
            onPress={onUpload}
            disabled={!fileName}
            leftIcon={
              <Feather
                name="upload"
                size={16}
                color={theme.semantic.fg.black as string}
                style={{ paddingRight: theme.primitives.spacing[2] }}
              />
            }
          />
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

AddProofSheet.displayName = 'AddProofSheet';

export default AddProofSheet;
