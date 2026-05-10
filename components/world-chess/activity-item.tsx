import ItemBadge from '@/components/world-chess/item-badge';
import theme from '@/features/world-chess/theme/theme';
import { Text, View } from 'react-native';

const ITEM_HEIGHT = 80;

interface ActivityItemProps {
  title: string;
  datetime: string;
  points: number;
}

export function Divider() {
  return (
    <View
      style={{
        height: 1,
        backgroundColor: theme.semantic.stroke['lowest-emphasis'],
      }}
    />
  );
}

export default function ActivityItem({ title, datetime, points }: ActivityItemProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.02)',
        paddingVertical: theme.primitives.spacing['8'],
        paddingHorizontal: theme.primitives.spacing['12'],
        height: ITEM_HEIGHT,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: theme.semantic.fg['high-emphasis'],
            fontSize: theme.primitives.font.size['p-lg'],
            fontFamily: theme.primitives.font.family.header,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: theme.semantic.fg['medium-emphasis'],
            fontSize: theme.primitives.font.size['p-lg'],
            fontFamily: theme.primitives.font.family.p,
            marginTop: 2,
          }}
        >
          {datetime}
        </Text>
      </View>
      <ItemBadge label={`+${points} pts`} />
    </View>
  );
}
