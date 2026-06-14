import { AppText } from '@/components/Text';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native-unistyles';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DrawerContentProps {
  onReset: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DrawerContent({ onReset }: DrawerContentProps) {
  return (
    <SafeAreaView style={styles.drawerContent} edges={['top', 'bottom', 'left']}>
      <View style={styles.drawerMenu}>
        <Pressable
          style={styles.drawerItem}
          onPress={() =>
            Alert.alert(
              'Reset Wallet',
              'Are you sure you want to reset your wallet? This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset',
                  style: 'destructive',
                  onPress: onReset,
                },
              ],
            )
          }
        >
          <MaterialIcons name="lock-reset" size={20} color="#5f6368" />
          <AppText variant="label">Reset Wallet</AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create((theme) => ({
  drawerContent: {
    flex: 1,
    backgroundColor: theme.semantic.bg.surface,
    paddingHorizontal: theme.primitives.spacing.base,
    justifyContent: 'space-between',
  },
  drawerMenu: {
    flex: 1,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.primitives.spacing.md,
    paddingVertical: theme.primitives.spacing.md,
  },
}));
