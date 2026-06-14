import React from 'react';
import { Text, TextProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

// ─── Types ────────────────────────────────────────────────────────────────────

type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'label' | 'caption' | 'micro';
type TextColor = 'neutral' | 'muted' | 'inverse' | 'primary' | 'success' | 'danger' | 'warning';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: TextColor;
  bold?: boolean;
  children: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppText({
  variant = 'body',
  color = 'neutral',
  bold = false,
  style,
  children,
  ...rest
}: AppTextProps) {
  stylesheet.useVariants({ variant, color });

  return (
    <Text style={[stylesheet.base, bold && stylesheet.bold, style]} {...rest}>
      {children}
    </Text>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const stylesheet = StyleSheet.create((theme) => ({
  base: {
    variants: {
      variant: {
        h1: {
          fontSize: theme.typography.sizes.xl * 1.22,
          fontFamily: theme.typography.fonts.bold,
          fontWeight: theme.typography.weights.bold,
          lineHeight: theme.typography.sizes.xl * 1.22 * theme.typography.lineHeights.tight,
          color: theme.colors.fg.default,
        },
        h2: {
          fontSize: theme.typography.sizes.xl,
          fontFamily: theme.typography.fonts.bold,
          fontWeight: theme.typography.weights.bold,
          lineHeight: theme.typography.sizes.xl * theme.typography.lineHeights.tight,
          color: theme.colors.fg.default,
        },
        h3: {
          fontSize: theme.typography.sizes.lg,
          fontFamily: theme.typography.fonts.semiBold,
          fontWeight: theme.typography.weights.semiBold,
          lineHeight: theme.typography.sizes.lg * theme.typography.lineHeights.normal,
          color: theme.colors.fg.default,
        },
        body: {
          fontSize: theme.typography.sizes.base,
          fontFamily: theme.typography.fonts.regular,
          fontWeight: theme.typography.weights.regular,
          lineHeight: theme.typography.sizes.base * theme.typography.lineHeights.normal,
          color: theme.colors.fg.default,
        },
        label: {
          fontSize: theme.typography.sizes.md,
          fontFamily: theme.typography.fonts.semiBold,
          fontWeight: theme.typography.weights.semiBold,
          lineHeight: theme.typography.sizes.md * theme.typography.lineHeights.normal,
          color: theme.colors.fg.default,
        },
        caption: {
          fontSize: theme.typography.sizes.sm,
          fontFamily: theme.typography.fonts.medium,
          fontWeight: theme.typography.weights.medium,
          lineHeight: theme.typography.sizes.sm * theme.typography.lineHeights.relaxed,
          color: theme.colors.fg.muted,
        },
        micro: {
          fontSize: theme.typography.sizes.xs,
          fontFamily: theme.typography.fonts.medium,
          fontWeight: theme.typography.weights.medium,
          lineHeight: theme.typography.sizes.xs * theme.typography.lineHeights.relaxed,
          color: theme.colors.fg.muted,
        },
      },
      color: {
        neutral: { color: theme.colors.fg.default },
        muted: { color: theme.colors.fg.muted },
        inverse: { color: theme.colors.fg.inverse },
        primary: { color: theme.colors.fg.primary },
        success: { color: theme.colors.fg.success },
        danger: { color: theme.colors.fg.danger },
        warning: { color: theme.colors.fg.warning },
      },
    },
  },
  bold: {
    fontFamily: theme.typography.fonts.bold,
    fontWeight: theme.typography.weights.bold,
  },
}));
