import theme from '@/theme/theme';
import { Text, View } from 'react-native';

type ItemBadgeVariant = 'event' | 'activity';

interface ItemBadgeProps {
  label: string;
  variant: ItemBadgeVariant;
  color?: string;
}

export default function ItemBadge({ label, variant, color }: ItemBadgeProps) {
  const backgroundColor =
    variant === 'event'
      ? (theme.semantic.bg['inverse-brand-secondary'] as string)
      : (theme.semantic.bg['inverse-brand-primary'] as string);
  const labelColor =
    color ??
    (variant === 'event'
      ? (theme.semantic.fg.warning as string)
      : theme.primitives.color.brand.primary);

  return (
    <View
      style={{
        backgroundColor,
        borderRadius: theme.primitives.radius['6'],
        paddingVertical: theme.primitives.spacing['4'],
        paddingHorizontal: theme.primitives.spacing['12'],
        marginLeft: theme.primitives.spacing['12'],
        minWidth: 72,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: labelColor,
          fontFamily: theme.primitives.font.family.numeric,
          fontSize: theme.primitives.font.size.h3,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
