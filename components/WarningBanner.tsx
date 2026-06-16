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
      <MaterialIcons name="info-outline" size={20} color={theme.colors.state.warning} />
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
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.palette.yellow[100],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.state.warning,
  },
  warningText: {
    color: theme.colors.state.warning,
    flex: 1,
  },
}));
