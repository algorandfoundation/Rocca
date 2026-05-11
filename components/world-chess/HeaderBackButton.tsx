import theme from '@/theme/theme';
import { Entypo } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function HeaderBackButton() {
  const router = useRouter();
  return (
    <Pressable onPress={() => router.back()} hitSlop={8}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Entypo name="chevron-small-left" size={28} color={theme.semantic.fg['brand-secondary']} />
        <Text
          style={{
            color: theme.semantic.fg['brand-secondary'],
            fontSize: theme.primitives.font.size['p-lg'],
            fontFamily: theme.primitives.font.family.header,
            paddingRight: theme.primitives.spacing['8'],
          }}
        >
          Back
        </Text>
      </View>
    </Pressable>
  );
}
