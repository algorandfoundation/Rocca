import { AppText } from '@/components/Text';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import React from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatThread {
  id: string;
  name: string;
  preview: string;
  timestamp: string;
  avatarColor: string;
  avatarBg: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatRow({
  item,
  onPress,
}: {
  item: ChatThread;
  onPress: (item: ChatThread) => void;
}) {
  return (
    <Pressable style={styles.row} onPress={() => onPress(item)}>
      <View
        style={[styles.avatar, { backgroundColor: item.avatarBg, borderColor: item.avatarColor }]}
      >
        <FontAwesome6 name="robot" size={24} color={item.avatarColor} />
      </View>

      <View style={styles.rowContent}>
        <View style={styles.rowTop}>
          <AppText variant="label" bold style={styles.rowName} numberOfLines={1}>
            {item.name}
          </AppText>
          <AppText variant="caption" color="muted">
            {item.timestamp}
          </AppText>
        </View>
        <AppText variant="caption" color="muted" numberOfLines={1} style={styles.rowPreview}>
          {item.preview}
        </AppText>
      </View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 76,
    paddingHorizontal: theme.primitives.spacing.sm,
    paddingVertical: theme.primitives.spacing.md,
    gap: theme.primitives.spacing.md,
    backgroundColor: theme.semantic.bg.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.semantic.stroke.default,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.primitives.spacing.sm,
  },
  rowName: {
    flex: 1,
  },
  rowPreview: {
    flex: 1,
  },
}));
