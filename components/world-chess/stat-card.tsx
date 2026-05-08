import theme from '@/features/world-chess/theme/theme';
import { Text, View } from 'react-native';

interface StatCardProps {
  label: string;
  value: string;
}

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: theme.primitives.spacing['12'],
        backgroundColor: theme.semantic.bg['surface-1'],
        borderRadius: theme.primitives.radius['4'],
      }}
    >
      <Text
        style={{
          color: theme.semantic.bg['brand-secondary'],
          fontSize: theme.primitives.font.size['display-lg'],
          fontFamily: theme.primitives.font.family.numeric,
          textAlign: 'center',
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: theme.semantic.fg['high-emphasis'] as string,
          fontSize: theme.primitives.font.size['p-md'],
          fontFamily: theme.primitives.font.family.p,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </View>
  );
}
