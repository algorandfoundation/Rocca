import { generateSecretKey, type Key } from '@algorandfoundation/keystore';
import { MaterialIcons } from '@expo/vector-icons';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useState, type ComponentProps } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { useProvider } from '@/hooks/useProvider';
import { Button } from './Button';
import { AppText } from './Text';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SecretKeyVaultModalProps {
  onDismiss?: () => void;
}

// ─── Key Row ─────────────────────────────────────────────────────────────────

function SecretKeyRow({ item, onRemove }: { item: Key; onRemove: (id: string) => void }) {
  const { theme } = useUnistyles();
  const { key } = useProvider();
  const label = (item.metadata?.serviceName as string | undefined) ?? item.id.slice(0, 8);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);

  const handleToggleVisible = async () => {
    if (revealed !== null) {
      setRevealed(null);
      return;
    }
    setRevealing(true);
    try {
      const keyData = await key.store.export(item.id);
      if (keyData.privateKey) {
        setRevealed(new TextDecoder().decode(keyData.privateKey));
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to reveal the key.');
    } finally {
      setRevealing(false);
    }
  };

  return (
    <View style={stylesheet.keyRow}>
      <View style={stylesheet.keyRowIcon}>
        <MaterialIcons name="vpn-key" size={18} color={theme.colors.fg.primary} />
      </View>
      <View style={stylesheet.keyRowInfo}>
        <AppText variant="label" bold>
          {label}
        </AppText>
        <AppText variant="caption" color="muted" numberOfLines={1} ellipsizeMode="middle">
          {revealed ?? '••••••••••••••••'}
        </AppText>
      </View>
      <Pressable
        onPress={handleToggleVisible}
        disabled={revealing}
        hitSlop={8}
        style={stylesheet.iconButton}
      >
        <MaterialIcons
          name={revealed !== null ? 'visibility-off' : 'visibility'}
          size={18}
          color={theme.colors.fg.muted}
        />
      </Pressable>
      <Pressable
        onPress={() =>
          Alert.alert('Remove Key', `Remove the key for "${label}"?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => onRemove(item.id) },
          ])
        }
        hitSlop={8}
        style={stylesheet.iconButton}
      >
        <MaterialIcons name="delete-outline" size={20} color={theme.colors.fg.danger} />
      </Pressable>
    </View>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export const ServiceSecretKeyVaultModal = forwardRef<BottomSheetModal, SecretKeyVaultModalProps>(
  ({ onDismiss }, ref) => {
    const { keys, key } = useProvider();
    const { theme } = useUnistyles();
    const [serviceName, setServiceName] = useState('');
    const [keyValue, setKeyValue] = useState('');
    const [keyVisible, setKeyVisible] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);

    const secretKeys = keys.filter((k) => k.type === 'secret-key');

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

    const resetForm = () => {
      setServiceName('');
      setKeyValue('');
      setKeyVisible(false);
      setIsAdding(false);
    };

    const handleAdd = async () => {
      if (!serviceName.trim() || !keyValue.trim()) return;
      setLoading(true);
      try {
        // generate a new key with the provided name and value.
        const serviceSecret = await generateSecretKey({
          id: serviceName.trim(),
          value: keyValue.trim(),
        });
        // add to store
        await key.store.import(serviceSecret);
        resetForm();
      } catch (e) {
        console.error(e);
        Alert.alert('Error', 'Failed to store the key. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    const handleRemove = async (id: string) => {
      try {
        await key.store.remove(id);
      } catch {
        Alert.alert('Error', 'Failed to remove the key.');
      }
    };

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['70%']}
        index={0}
        enablePanDownToClose
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={stylesheet.shell}
        handleComponent={null}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <View style={stylesheet.body}>
          {/* Header */}
          <View style={stylesheet.header}>
            <View style={stylesheet.headerLeft}>
              <MaterialIcons name="key" size={20} color={theme.colors.fg.primary} />
              <AppText variant="h3">Secret Key Vault</AppText>
            </View>
            <Pressable onPress={() => onDismiss?.()} hitSlop={8}>
              <MaterialIcons name="keyboard-arrow-down" size={26} color={theme.colors.fg.muted} />
            </Pressable>
          </View>

          {/* Scrollable key list */}
          <BottomSheetScrollView
            style={stylesheet.scroll}
            contentContainerStyle={stylesheet.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {secretKeys.length === 0 ? (
              <View style={stylesheet.emptyState}>
                <MaterialIcons name="lock-outline" size={36} color={theme.colors.fg.muted} />
                <AppText variant="caption" color="muted" style={stylesheet.emptyText}>
                  {'No secret keys stored yet.\nAdd a key to use with agent services.'}
                </AppText>
              </View>
            ) : (
              <View style={stylesheet.section}>
                <AppText variant="micro" color="muted" style={stylesheet.sectionLabel}>
                  STORED KEYS ({secretKeys.length})
                </AppText>
                {secretKeys.map((k) => (
                  <SecretKeyRow key={k.id} item={k} onRemove={handleRemove} />
                ))}
              </View>
            )}
          </BottomSheetScrollView>

          {/* Fixed footer — add button or add form */}
          <View style={stylesheet.footer}>
            {isAdding ? (
              <View style={stylesheet.form}>
                <AppText variant="micro" color="muted" style={stylesheet.sectionLabel}>
                  ADD NEW KEY
                </AppText>
                <View style={stylesheet.inputGroup}>
                  <AppText variant="caption" color="muted">
                    Service Name
                  </AppText>
                  <BottomSheetTextInput
                    style={stylesheet.input}
                    placeholder="e.g. Stripe, OpenAI"
                    placeholderTextColor={theme.colors.fg.muted}
                    value={serviceName}
                    onChangeText={setServiceName}
                    autoCapitalize="none"
                    returnKeyType="next"
                  />
                </View>
                <View style={stylesheet.inputGroup}>
                  <AppText variant="caption" color="muted">
                    Secret Key
                  </AppText>
                  <View style={stylesheet.inputWrapper}>
                    <BottomSheetTextInput
                      style={[stylesheet.input, stylesheet.inputWithEye]}
                      placeholder="sk_live_••••••••"
                      placeholderTextColor={theme.colors.fg.muted}
                      value={keyValue}
                      onChangeText={setKeyValue}
                      secureTextEntry={!keyVisible}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleAdd}
                    />
                    <Pressable
                      onPress={() => setKeyVisible((v) => !v)}
                      hitSlop={8}
                      style={stylesheet.eyeButton}
                    >
                      <MaterialIcons
                        name={keyVisible ? 'visibility-off' : 'visibility'}
                        size={18}
                        color={theme.colors.fg.muted}
                      />
                    </Pressable>
                  </View>
                </View>
                <View style={stylesheet.formActions}>
                  <Button
                    label="Cancel"
                    onPress={resetForm}
                    variant="ghost"
                    size="sm"
                    style={stylesheet.cancelBtn}
                  />
                  <Button
                    label="Save Key"
                    onPress={handleAdd}
                    variant="primary"
                    size="sm"
                    color="primary"
                    loading={loading}
                    disabled={!serviceName.trim() || !keyValue.trim()}
                    style={stylesheet.saveBtn}
                  />
                </View>
              </View>
            ) : (
              <Button
                label="Add Key"
                onPress={() => setIsAdding(true)}
                variant="primary"
                size="md"
                color="primary"
                fullWidth
                leftIcon={<MaterialIcons name="add" size={16} color={theme.colors.fg.inverse} />}
              />
            )}
          </View>
        </View>
      </BottomSheetModal>
    );
  },
);

ServiceSecretKeyVaultModal.displayName = 'ServiceSecretKeyVaultModal';

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.base,
    paddingBottom: theme.spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
  },
  section: {
    gap: theme.spacing.sm,
  },
  sectionLabel: {
    letterSpacing: 0.5,
  },
  keyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bg.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    padding: theme.spacing.md,
    gap: theme.spacing.md,
  },
  keyRowIcon: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.bg.app,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyRowInfo: {
    flex: 1,
    gap: 2,
  },
  iconButton: {
    padding: theme.spacing.xs,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.default,
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.bg.surface,
  },
  form: {
    gap: theme.spacing.sm,
  },
  inputGroup: {
    gap: theme.spacing.xs,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: theme.colors.bg.app,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.sizes.base,
    color: theme.colors.fg.default,
    fontFamily: theme.typography.fonts.regular,
  },
  inputWithEye: {
    paddingRight: theme.spacing.xl + theme.spacing.md,
  },
  eyeButton: {
    position: 'absolute',
    right: theme.spacing.md,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  cancelBtn: {
    minWidth: 80,
  },
  saveBtn: {
    minWidth: 100,
  },
}));
