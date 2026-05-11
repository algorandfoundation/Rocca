import theme from '@/theme/theme';
import { Text, View } from 'react-native';

interface ItemBadgeProps {
  label: string;
  color?: string;
}

export default function ItemBadge({
  label,
  color = theme.primitives.color.brand.primary,
}: ItemBadgeProps) {
  return (
    <View
      style={{
        backgroundColor: theme.primitives.color.neutral['90'],
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
          color,
          fontFamily: theme.primitives.font.family.numeric,
          fontSize: theme.primitives.font.size.h3,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
