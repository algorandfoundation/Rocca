import theme from '@/theme/theme';
import { ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type Variant = 'primary' | 'secondary' | 'danger' | 'link';
type Size = 'small' | 'large';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  disabled?: boolean;
}

const variantStyles: Record<
  Variant,
  {
    backgroundColor: string;
    borderColor?: string;
    borderWidth?: number;
    textColor: string;
    iconTint: string;
  }
> = {
  primary: {
    backgroundColor: theme.semantic.bg['brand-primary'] as string,
    textColor: theme.semantic.fg.black as string,
    iconTint: theme.semantic.fg.black as string,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderColor: theme.semantic.fg['brand-primary'] as string,
    borderWidth: 1,
    textColor: theme.semantic.fg['brand-primary'] as string,
    iconTint: theme.semantic.fg['brand-primary'] as string,
  },
  danger: {
    backgroundColor: 'transparent',
    borderColor: theme.semantic.fg.error as string,
    borderWidth: 1,
    textColor: theme.semantic.fg.error as string,
    iconTint: theme.semantic.fg.error as string,
  },
  link: {
    backgroundColor: 'transparent',
    textColor: theme.semantic.fg['brand-secondary'] as string,
    iconTint: theme.semantic.fg['brand-secondary'] as string,
  },
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'large',
  leftIcon,
  rightIcon,
  disabled = false,
}: ButtonProps) {
  const styles = variantStyles[variant];

  const sizeStyles =
    size === 'small'
      ? {
          paddingVertical: theme.primitives.spacing['4'],
          paddingHorizontal: theme.primitives.spacing['8'],
          gap: 7,
          fontSize: theme.primitives.font.size['p-md'],
          fontWeight: '500' as const,
        }
      : {
          paddingVertical: theme.primitives.spacing['12'],
          paddingHorizontal: theme.primitives.spacing['12'],
          gap: 0,
          fontSize: theme.primitives.font.size['p-lg'],
          fontWeight: 'bold' as const,
        };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={{
        backgroundColor: disabled ? (theme.semantic.bg.disabled as string) : styles.backgroundColor,
        borderColor: disabled ? 'transparent' : styles.borderColor,
        borderWidth: styles.borderWidth ?? 0,
        borderRadius: variant === 'link' ? 0 : theme.primitives.radius['6'],
        paddingVertical: variant === 'link' ? 0 : sizeStyles.paddingVertical,
        paddingHorizontal: sizeStyles.paddingHorizontal,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: sizeStyles.gap,
        }}
      >
        {leftIcon}
        <Text
          style={{
            color: disabled ? (theme.semantic.fg.disabled as string) : styles.textColor,
            fontFamily: theme.primitives.font.family.header,
            fontWeight: sizeStyles.fontWeight,
            fontSize: sizeStyles.fontSize,
          }}
        >
          {label}
        </Text>
        {rightIcon}
      </View>
    </TouchableOpacity>
  );
}
