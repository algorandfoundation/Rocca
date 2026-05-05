import theme from '@/features/world-chess/theme/theme';
import { Entypo } from '@expo/vector-icons';
import { Text, TouchableOpacity } from 'react-native';

export default function BackNavButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{ flexDirection: 'row', alignItems: 'center' }}
    >
      <Entypo
        name="chevron-small-left"
        size={24}
        color={theme.semantic.fg['brand-secondary'] as string}
      />
      <Text
        style={{
          color: theme.semantic.fg['brand-secondary'] as string,
          fontSize: theme.primitives.font.size['p-lg'],
          fontFamily: theme.primitives.font.family.p,
        }}
      >
        {'Back'}
      </Text>
    </TouchableOpacity>
  );
}
