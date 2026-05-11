import Button from '@/components/world-chess/Button';
import StatCard from '@/components/world-chess/StatCard';
import theme from '@/theme/theme';
import MaterialIcons from '@expo/vector-icons/build/MaterialIcons';
import { Image, ImageSourcePropType, Text, View } from 'react-native';

interface ProfileOverviewProps {
  name: string;
  eloRating: number;
  progressPoints: bigint;
  avatar: ImageSourcePropType;
  onSharePress?: () => void;
}

export default function ProfileOverview({
  name,
  eloRating,
  progressPoints,
  avatar,
  onSharePress,
}: ProfileOverviewProps) {
  return (
    <View style={{ width: '100%', marginBottom: theme.primitives.spacing['24'] }}>
      {/* Top: Profile / Name box */}
      <View
        style={{
          width: '100%',
          alignItems: 'center',
          paddingHorizontal: theme.primitives.spacing['16'],
          paddingVertical: theme.primitives.spacing['16'],
          backgroundColor: theme.semantic.bg['surface-1'],
          borderRadius: theme.primitives.radius['4'],
          gap: theme.primitives.spacing['8'],
        }}
      >
        <Image
          source={avatar}
          style={{
            width: 64,
            height: 64,
            borderRadius: theme.primitives.radius['32'],
          }}
          resizeMode="cover"
        />
        <Text
          style={{
            color: theme.semantic.fg['high-emphasis'] as string,
            fontSize: theme.primitives.font.size.h4,
            fontFamily: theme.primitives.font.family.header,
          }}
        >
          {name}
        </Text>
        <Button
          variant="secondary"
          label="Share Profile"
          size="small"
          onPress={onSharePress}
          leftIcon={
            <MaterialIcons name="qr-code" size={14} color={theme.semantic.fg['brand-primary']} />
          }
        />
      </View>

      {/* Gap */}
      <View style={{ height: theme.primitives.spacing['8'] }} />

      {/* Bottom: Stats side by side */}
      <View style={{ flexDirection: 'row', gap: theme.primitives.spacing['8'] }}>
        <StatCard label="ELO Rating" value={eloRating.toString()} />
        <StatCard label="Progress Points" value={progressPoints.toString()} />
      </View>
    </View>
  );
}
