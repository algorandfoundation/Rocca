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
          fontSize: theme.typography.fontSizes['2xl'],
          fontFamily: theme.typography.fonts.bold,
          fontWeight: theme.typography.fontWeights.bold,
          lineHeight: theme.typography.fontSizes['2xl'] * theme.typography.lineHeights.tight,
          color: theme.colors.textPrimary,
        },
        h2: {
          fontSize: theme.typography.fontSizes.xl,
          fontFamily: theme.typography.fonts.bold,
          fontWeight: theme.typography.fontWeights.bold,
          lineHeight: theme.typography.fontSizes.xl * theme.typography.lineHeights.tight,
          color: theme.colors.textPrimary,
        },
        h3: {
          fontSize: theme.typography.fontSizes.lg,
          fontFamily: theme.typography.fonts.semiBold,
          fontWeight: theme.typography.fontWeights.semiBold,
          lineHeight: theme.typography.fontSizes.lg * theme.typography.lineHeights.normal,
          color: theme.colors.textPrimary,
        },
        body: {
          fontSize: theme.typography.fontSizes.base,
          fontFamily: theme.typography.fonts.regular,
          fontWeight: theme.typography.fontWeights.regular,
          lineHeight: theme.typography.fontSizes.base * theme.typography.lineHeights.normal,
          color: theme.colors.textPrimary,
        },
        label: {
          fontSize: theme.typography.fontSizes.md,
          fontFamily: theme.typography.fonts.semiBold,
          fontWeight: theme.typography.fontWeights.semiBold,
          lineHeight: theme.typography.fontSizes.md * theme.typography.lineHeights.normal,
          color: theme.colors.textPrimary,
        },
        caption: {
          fontSize: theme.typography.fontSizes.sm,
          fontFamily: theme.typography.fonts.medium,
          fontWeight: theme.typography.fontWeights.medium,
          lineHeight: theme.typography.fontSizes.sm * theme.typography.lineHeights.relaxed,
          color: theme.colors.textSecondary,
        },
        micro: {
          fontSize: theme.typography.fontSizes.xs,
          fontFamily: theme.typography.fonts.medium,
          fontWeight: theme.typography.fontWeights.medium,
          lineHeight: theme.typography.fontSizes.xs * theme.typography.lineHeights.relaxed,
          color: theme.colors.textSecondary,
        },
      },
      color: {
        neutral: { color: theme.colors.textPrimary },
        muted: { color: theme.colors.textSecondary },
        inverse: { color: theme.colors.textInverse },
        primary: { color: theme.colors.primary },
        success: { color: theme.colors.success },
        danger: { color: theme.colors.danger },
        warning: { color: theme.colors.warning },
      },
    },
  },
  bold: {
    fontFamily: theme.typography.fonts.bold,
    fontWeight: theme.typography.fontWeights.bold,
  },
}));
