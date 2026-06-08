import React from 'react';
import { ActivityIndicator, StyleProp, TouchableOpacity, ViewStyle } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { AppText } from './Text';

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'pill' | 'pillLight' | 'link';
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
  const spinnerColor = isLight ? theme.semantic.fg.inverse : theme.primitives.color.brand.hover;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        stylesheet.base,
        variant === 'link' && stylesheet.linkReset,
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
            color={
              isLight
                ? 'inverse'
                : variant === 'ghost'
                  ? 'muted'
                  : variant === 'link'
                    ? 'primary'
                    : 'neutral'
            }
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
    gap: theme.primitives.spacing.sm,
    variants: {
      variant: {
        primary: {
          backgroundColor: theme.primitives.color.brand.primary,
          borderRadius: theme.primitives.radii.md,
          ...theme.primitives.shadows.primary,
        },
        outline: {
          backgroundColor: 'transparent',
          borderRadius: theme.primitives.radii.md,
          borderWidth: 1,
          borderColor: theme.semantic.stroke.default,
        },
        ghost: {
          backgroundColor: 'transparent',
          borderRadius: theme.primitives.radii.md,
        },
        pill: {
          backgroundColor: theme.primitives.color.brand.primary,
          borderRadius: theme.primitives.radii.full,
          ...theme.primitives.shadows.md,
        },
        pillLight: {
          backgroundColor: theme.semantic.bg.surface,
          borderRadius: theme.primitives.radii.full,
          ...theme.primitives.shadows.md,
        },
        link: {
          backgroundColor: 'transparent',
          borderRadius: 0,
          paddingVertical: 0,
          paddingHorizontal: 0,
        },
      },
      size: {
        sm: {
          paddingVertical: theme.primitives.spacing.sm,
          paddingHorizontal: theme.primitives.spacing.md,
        },
        md: {
          paddingVertical: theme.primitives.spacing.md,
          paddingHorizontal: theme.primitives.spacing.base,
        },
        lg: {
          paddingVertical: theme.primitives.spacing.base,
          paddingHorizontal: theme.primitives.spacing.xl,
        },
      },
    },
  },
  fullWidth: {
    width: '100%',
  },
  linkReset: {
    borderRadius: 0,
    paddingVertical: 0,
  },
  disabled: {
    opacity: 0.5,
  },
}));
