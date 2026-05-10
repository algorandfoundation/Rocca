import ItemBadge from '@/components/world-chess/item-badge';
import theme from '@/theme/theme';
import { Image, ImageSourcePropType, Text, View } from 'react-native';

const ITEM_HEIGHT = 80;

interface EventItemProps {
  logo: ImageSourcePropType;
  name: string;
  location: string;
  points: number;
  position: string;
}

export default function EventItem({ logo, name, location, points, position }: EventItemProps) {
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
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          marginRight: theme.primitives.spacing['12'],
          backgroundColor: theme.semantic.bg['surface-1'] as string,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Image source={logo} style={{ width: 40, height: 40 }} resizeMode="contain" />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            color: theme.semantic.fg['high-emphasis'] as string,
            fontSize: theme.primitives.font.size['p-lg'],
            fontFamily: theme.primitives.font.family.header,
          }}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          style={{
            color: theme.semantic.fg['medium-emphasis'],
            fontSize: theme.primitives.font.size['p-lg'],
            fontFamily: theme.primitives.font.family.p,
          }}
          numberOfLines={1}
        >
          {location}
        </Text>
        <Text
          style={{
            color: theme.semantic.fg['medium-emphasis'],
            fontSize: theme.primitives.font.size['p-lg'],
            fontFamily: theme.primitives.font.family.p,
          }}
        >
          +{points} points
        </Text>
      </View>
      <ItemBadge label={position} />
    </View>
  );
}
