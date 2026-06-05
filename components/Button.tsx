import React from 'react';
import { ActivityIndicator, StyleProp, TouchableOpacity, ViewStyle } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { AppText } from './Text';

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'pill' | 'pillLight';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  leftIcon,
  style,
}: ButtonProps) {
  const { theme } = useUnistyles();
  stylesheet.useVariants({ variant, size });

  const isLight = variant === 'primary' || variant === 'pill';
  const spinnerColor = isLight ? theme.colors.textInverse : theme.colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        stylesheet.base,
        fullWidth && stylesheet.fullWidth,
        (disabled || loading) && stylesheet.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : (
        <>
          {leftIcon}
          <AppText
            variant="label"
            color={isLight ? 'inverse' : variant === 'ghost' ? 'muted' : 'neutral'}
          >
            {label}
          </AppText>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const stylesheet = StyleSheet.create((theme) => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    variants: {
      variant: {
        primary: {
          backgroundColor: theme.colors.primary,
          borderRadius: theme.radii.md,
          ...theme.shadows.primary,
        },
        outline: {
          backgroundColor: 'transparent',
          borderRadius: theme.radii.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        ghost: {
          backgroundColor: 'transparent',
          borderRadius: theme.radii.md,
        },
        pill: {
          backgroundColor: theme.colors.primary,
          borderRadius: theme.radii.full,
          ...theme.shadows.md,
        },
        pillLight: {
          backgroundColor: theme.colors.bgWhite,
          borderRadius: theme.radii.full,
          ...theme.shadows.md,
        },
      },
      size: {
        sm: {
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
        },
        md: {
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.base,
        },
        lg: {
          paddingVertical: theme.spacing.base,
          paddingHorizontal: theme.spacing.xl,
        },
      },
    },
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
}));
