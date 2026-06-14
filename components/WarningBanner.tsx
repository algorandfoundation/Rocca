import { AppText } from '@/components/Text';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WarningBannerProps {
  message: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WarningBanner({ message }: WarningBannerProps) {
  const { theme } = useUnistyles();

  return (
    <View style={styles.warningCard}>
      <MaterialIcons name="info-outline" size={20} color={theme.primitives.color.state.warning} />
      <AppText variant="label" bold style={styles.warningText}>
        {message}
      </AppText>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create((theme) => ({
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.primitives.spacing.sm,
    paddingHorizontal: theme.primitives.spacing.sm,
    paddingVertical: theme.primitives.spacing.sm,
    backgroundColor: '#fff8e1',
    borderBottomWidth: 1,
    borderBottomColor: theme.primitives.color.state.warning,
  },
  warningText: {
    color: theme.primitives.color.state.warning,
    flex: 1,
  },
}));
