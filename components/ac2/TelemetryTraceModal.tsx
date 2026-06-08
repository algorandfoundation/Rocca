import { BottomSheetBackdrop, BottomSheetFlatList, BottomSheetModal } from '@gorhom/bottom-sheet';
import { Button } from '../Button';
import { AppText as Text } from '../Text';

import { AC2Message } from '@algorandfoundation/ac2-sdk/schema';
import { MaterialIcons } from '@expo/vector-icons';
import { forwardRef, useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

interface AC2TelemetryTraceModalProps {
  /**
   * Array of AC2 messages to display in the telemetry trace.
   */
  messages: AC2Message[];
  onDismiss?: () => void;
}

function formatTimestamp(unix: number): string {
  return new Date(unix * 1000).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function shortType(type: string): string {
  const slash = type.lastIndexOf('/');
  return slash >= 0 ? type.slice(slash + 1) : type;
}

function MessageCard({ message }: { message: AC2Message }) {
  const [jsonVisible, setJsonVisible] = useState(false);
  const styles = stylesheet;

  return (
    <View style={styles.card}>
      <Text style={styles.meta} bold>
        [{formatTimestamp(message.created_time)}] {shortType(message.type)}
      </Text>
      <Text style={styles.detail}>{message.type}</Text>
      <Text style={styles.detail} numberOfLines={1} ellipsizeMode="middle">
        From: {message.from}
      </Text>
      {message.id && <Text style={styles.id}>ID: {message.id.slice(0, 16)}...</Text>}
      <Button
        variant="ghost"
        size="sm"
        onPress={() => setJsonVisible((v) => !v)}
        label={jsonVisible ? 'Hide JSON' : 'View JSON'}
        style={styles.toggleBtn}
      />
      {jsonVisible && (
        <ScrollView horizontal style={styles.jsonBox} showsHorizontalScrollIndicator={false}>
          <Text style={styles.json}>{JSON.stringify(message, null, 2)}</Text>
        </ScrollView>
      )}
    </View>
  );
}

export const AC2TelemetryTraceModal = forwardRef<BottomSheetModal, AC2TelemetryTraceModalProps>(
  ({ messages, onDismiss }, ref) => {
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
        snapPoints={['75%']}
        index={0}
        enablePanDownToClose
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={stylesheet.shell}
        handleComponent={null}
      >
        <View style={stylesheet.body}>
          {/** Header */}
          <View style={stylesheet.header}>
            <View style={stylesheet.headerTitleRow}>
              <MaterialIcons name="shield" size={24} color="black" />
              <Text variant="h2" bold style={stylesheet.title} color="primary" numberOfLines={1}>
                AC2 Telemetry Trace
              </Text>
            </View>
            <View style={stylesheet.headerButtonRow}>
              <Button
                variant="outline"
                size="sm"
                label="Export JSON"
                onPress={() => alert('Not yet implemented!')}
              />
              <Pressable onPress={() => onDismiss?.()} hitSlop={8} style={stylesheet.closeButton}>
                <MaterialIcons name="keyboard-arrow-down" size={24} color="black" />
              </Pressable>
            </View>
          </View>
          {/** Content */}
          <BottomSheetFlatList
            style={stylesheet.scroll}
            data={messages}
            keyExtractor={(msg, index) => msg.id ?? `${msg.type}-${msg.created_time}-${index}`}
            renderItem={({ item }) => <MessageCard message={item} />}
            contentContainerStyle={stylesheet.container}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </BottomSheetModal>
    );
  },
);

AC2TelemetryTraceModal.displayName = 'AC2 TelemetryTraceModal';

// ─── Styles ───────────────────────────────────────────────────────────────────

const stylesheet = StyleSheet.create((theme) => ({
  shell: {
    backgroundColor: theme.semantic.bg.surface,
  },
  body: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: theme.primitives.spacing.base,
    paddingVertical: theme.primitives.spacing.md,
    paddingBottom: theme.primitives.spacing.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.primitives.spacing.gap(1),
    margin: theme.primitives.spacing.gap(2),
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.primitives.spacing.sm,
    flexShrink: 1,
    //paddingRight: theme.primitives.spacing.xl * 4,
  },
  headerButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.primitives.spacing.sm,
  },
  closeButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flexShrink: 1,
    color: theme.semantic.fg.highEmphasis,
  },
  card: {
    backgroundColor: theme.semantic.bg.chat,
    borderRadius: theme.primitives.radii.md,
    padding: theme.primitives.spacing.md,
    marginBottom: theme.primitives.spacing.md,
    borderWidth: 1,
    borderColor: theme.primitives.color.border,
  },
  meta: {
    fontSize: theme.primitives.typography.fontSizes.sm,
    color: theme.semantic.fg.primary,
    marginBottom: theme.primitives.spacing.xs,
    fontFamily: theme.primitives.typography.fonts.bold,
  },
  detail: {
    fontSize: theme.primitives.typography.fontSizes.xs,
    color: theme.semantic.fg.mediumEmphasis,
    marginBottom: theme.primitives.spacing.xs,
  },
  id: {
    fontSize: theme.primitives.typography.fontSizes.xs,
    color: theme.semantic.fg.success,
    marginBottom: theme.primitives.spacing.sm,
    fontFamily: theme.primitives.typography.fonts.bold,
  },
  toggleBtn: {
    marginBottom: theme.primitives.spacing.sm,
  },
  jsonBox: {
    backgroundColor: theme.semantic.bg.dark,
    borderRadius: theme.primitives.radii.sm,
    padding: theme.primitives.spacing.sm,
  },
  json: {
    fontSize: theme.primitives.typography.fontSizes.xs,
    color: theme.semantic.fg.success,
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },
}));
