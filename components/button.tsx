import theme from '@/features/world-chess/theme/theme';
import { Image, ImageSourcePropType, Text, TouchableOpacity } from 'react-native';

type Variant = 'primary' | 'secondary' | 'danger';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  leftIcon?: ImageSourcePropType;
  rightIcon?: ImageSourcePropType;
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
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  leftIcon,
  rightIcon,
  disabled = false,
}: ButtonProps) {
  const styles = variantStyles[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={{
        backgroundColor: disabled ? (theme.semantic.bg.disabled as string) : styles.backgroundColor,
        borderColor: disabled ? 'transparent' : styles.borderColor,
        borderWidth: styles.borderWidth ?? 0,
        borderRadius: theme.primitives.radius['6'],
        paddingVertical: theme.primitives.spacing['12'],
        paddingHorizontal: theme.primitives.spacing['12'],
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {leftIcon ? (
        <Image
          source={leftIcon}
          style={{
            width: 20,
            height: 20,
            marginRight: theme.primitives.spacing['8'],
            tintColor: disabled ? (theme.semantic.fg.disabled as string) : styles.iconTint,
          }}
          resizeMode="contain"
        />
      ) : null}
      <Text
        style={{
          color: disabled ? (theme.semantic.fg.disabled as string) : styles.textColor,
          fontFamily: theme.primitives.font.family.header,
          fontWeight: 'bold',
          fontSize: theme.primitives.font.size['p-lg'],
        }}
      >
        {label}
      </Text>
      {rightIcon ? (
        <Image
          source={rightIcon}
          style={{
            width: 20,
            height: 20,
            marginLeft: theme.primitives.spacing['8'],
            tintColor: disabled ? (theme.semantic.fg.disabled as string) : styles.iconTint,
          }}
          resizeMode="contain"
        />
      ) : null}
    </TouchableOpacity>
  );
}
