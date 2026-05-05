import Button from '@/components/button';
import theme from '@/features/world-chess/theme/theme';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface VerifyIdentityBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (photoUri: string) => void;
}

export const VerifyIdentityBottomSheet: React.FC<VerifyIdentityBottomSheetProps> = ({
  isOpen,
  onClose,
}) => {
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const snapPoints = ['75%'];

  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  const handleUploadPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleClose = () => {
    setPhotoUri(null);
    onClose();
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      index={-1}
      enablePanDownToClose={false}
      onChange={(index) => {
        if (index === -1) handleClose();
      }}
      backgroundStyle={{ backgroundColor: theme.semantic.bg['surface-1'] as string }}
      handleIndicatorStyle={{ display: 'none' }}
    >
      <BottomSheetView style={styles.sheet}>
        {/* Header row: Cancel left, Title center, Spacer right */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={handleClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelLink}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Verify Identity</Text>
          </View>
          <View style={styles.cancelButton} />
        </View>

        {/* Image preview placeholder */}
        <View style={styles.previewContainer}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="contain" />
          ) : (
            <View style={styles.previewPlaceholder} />
          )}
        </View>

        {/* Upload button */}
        <View style={styles.buttonGroup}>
          <Button label="Upload" variant="primary" onPress={handleUploadPhoto} />
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: theme.semantic.bg['surface-1'] as string,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.primitives.spacing['16'],
    minHeight: 48,
    marginHorizontal: theme.primitives.spacing['16'],
  },
  cancelButton: {
    minWidth: 60,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  cancelLink: {
    color: theme.semantic.fg['brand-secondary'] as string,
    fontFamily: theme.primitives.font.family.header,
    fontSize: theme.primitives.font.size['p-lg'],
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: theme.semantic.fg['high-emphasis'] as string,
    fontFamily: theme.primitives.font.family.header,
    fontSize: theme.primitives.font.size['h5'],
    textAlign: 'center',
  },
  previewContainer: {
    flex: 1,
    marginBottom: theme.primitives.spacing['16'],
  },
  previewImage: {
    flex: 1,
    borderRadius: theme.primitives.radius['8'],
  },
  previewPlaceholder: {
    flex: 1,
    borderRadius: theme.primitives.radius['8'],
    backgroundColor: theme.primitives.color.neutral['90'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  buttonGroup: {
    width: '100%',
  },
});
