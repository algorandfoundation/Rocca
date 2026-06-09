import React from 'react';
import { ActivityIndicator, StyleProp, TouchableOpacity, ViewStyle } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { AppText } from './Text';

// ─── Types ────────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'pill' | 'pillLight' | 'white' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg';
type ButtonColor = 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  color?: ButtonColor;
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
  color = 'primary',
  fullWidth = false,
  disabled = false,
  loading = false,
  leftIcon,
  style,
}: ButtonProps) {
  const { theme } = useUnistyles();
  stylesheet.useVariants({ variant, size });

  const colorValue = getColorValue(theme, color);
  const isFilled =
    variant === 'primary' ||
    variant === 'pill' ||
    variant === 'outline' ||
    variant === 'pillLight' ||
    variant === 'white';
  const spinnerColor =
    variant === 'white'
      ? theme.semantic.fg.onLight
      : isFilled
        ? theme.semantic.fg.inverse
        : colorValue;

  const textColorMap: Record<ButtonVariant, string> = {
    primary: 'inverse',
    outline: 'inverse',
    ghost: 'muted',
    pill: 'inverse',
    pillLight: 'inverse',
    white: 'neutral',
    link: 'primary',
  };

  const colorStyle = {
    ...(variant === 'primary' || variant === 'pill' || variant === 'pillLight'
      ? { backgroundColor: colorValue }
      : {}),
    ...(variant === 'outline' ? { borderColor: colorValue, backgroundColor: colorValue } : {}),
    ...(variant === 'white' ? { backgroundColor: theme.semantic.bg.white } : {}),
    ...(variant === 'link' || variant === 'ghost' ? { backgroundColor: 'transparent' } : {}),
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        stylesheet.base,
        colorStyle,
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
            color={textColorMap[variant] as any}
            style={variant === 'white' ? stylesheet.whiteLabel : undefined}
            bold
          >
            {label}
          </AppText>
        </>
      )}
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const getColorValue = (theme: any, colorName: ButtonColor) => {
  const colorMap: Record<ButtonColor, string> = {
    primary: theme.primitives.color.brand.primary,
    secondary: theme.primitives.color.brand.soft,
    success: theme.primitives.color.state.success,
    error: theme.primitives.color.state.danger,
    info: theme.primitives.color.brand.primary,
    warning: theme.primitives.color.state.warning,
  };
  return colorMap[colorName];
};

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
        white: {
          backgroundColor: theme.semantic.bg.white,
          borderRadius: theme.primitives.radii.full,
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
  whiteLabel: {
    color: theme.semantic.fg.onLight,
  },
}));
