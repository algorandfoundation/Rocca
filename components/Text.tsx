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
          fontSize: theme.primitives.typography.fontSizes.xl * 1.22,
          fontFamily: theme.primitives.typography.fonts.bold,
          fontWeight: theme.primitives.typography.fontWeights.bold,
          lineHeight:
            theme.primitives.typography.fontSizes.xl *
            1.22 *
            theme.primitives.typography.lineHeights.tight,
          color: theme.semantic.fg.highEmphasis,
        },
        h2: {
          fontSize: theme.primitives.typography.fontSizes.xl,
          fontFamily: theme.primitives.typography.fonts.bold,
          fontWeight: theme.primitives.typography.fontWeights.bold,
          lineHeight:
            theme.primitives.typography.fontSizes.xl *
            theme.primitives.typography.lineHeights.tight,
          color: theme.semantic.fg.highEmphasis,
        },
        h3: {
          fontSize: theme.primitives.typography.fontSizes.lg,
          fontFamily: theme.primitives.typography.fonts.semiBold,
          fontWeight: theme.primitives.typography.fontWeights.semiBold,
          lineHeight:
            theme.primitives.typography.fontSizes.lg *
            theme.primitives.typography.lineHeights.normal,
          color: theme.semantic.fg.highEmphasis,
        },
        body: {
          fontSize: theme.primitives.typography.fontSizes.base,
          fontFamily: theme.primitives.typography.fonts.regular,
          fontWeight: theme.primitives.typography.fontWeights.regular,
          lineHeight:
            theme.primitives.typography.fontSizes.base *
            theme.primitives.typography.lineHeights.normal,
          color: theme.semantic.fg.highEmphasis,
        },
        label: {
          fontSize: theme.primitives.typography.fontSizes.md,
          fontFamily: theme.primitives.typography.fonts.semiBold,
          fontWeight: theme.primitives.typography.fontWeights.semiBold,
          lineHeight:
            theme.primitives.typography.fontSizes.md *
            theme.primitives.typography.lineHeights.normal,
          color: theme.semantic.fg.highEmphasis,
        },
        caption: {
          fontSize: theme.primitives.typography.fontSizes.sm,
          fontFamily: theme.primitives.typography.fonts.medium,
          fontWeight: theme.primitives.typography.fontWeights.medium,
          lineHeight:
            theme.primitives.typography.fontSizes.sm *
            theme.primitives.typography.lineHeights.relaxed,
          color: theme.semantic.fg.mediumEmphasis,
        },
        micro: {
          fontSize: theme.primitives.typography.fontSizes.xs,
          fontFamily: theme.primitives.typography.fonts.medium,
          fontWeight: theme.primitives.typography.fontWeights.medium,
          lineHeight:
            theme.primitives.typography.fontSizes.xs *
            theme.primitives.typography.lineHeights.relaxed,
          color: theme.semantic.fg.mediumEmphasis,
        },
      },
      color: {
        neutral: { color: theme.semantic.fg.highEmphasis },
        muted: { color: theme.semantic.fg.mediumEmphasis },
        inverse: { color: theme.semantic.fg.inverse },
        primary: { color: theme.semantic.fg.primary },
        success: { color: theme.semantic.fg.success },
        danger: { color: theme.semantic.fg.danger },
        warning: { color: theme.semantic.fg.warning },
      },
    },
  },
  bold: {
    fontFamily: theme.primitives.typography.fonts.bold,
    fontWeight: theme.primitives.typography.fontWeights.bold,
  },
}));
