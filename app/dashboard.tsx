import ActivityTabs, { Activity, Event } from '@/components/world-chess/ActivityTabs';
import ProfileOverview from '@/components/world-chess/ProfileOverview';
import theme from '@/theme/theme';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import { Alert, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const activities: Activity[] = [
  { id: '1', title: 'Chess Rewards', datetime: 'May 7, 2026 · 3:42 PM', points: 5 },
  { id: '2', title: 'Chess Rewards', datetime: 'May 6, 2026 · 11:15 AM', points: 10 },
  { id: '3', title: 'Chess Rewards', datetime: 'May 5, 2026 · 7:30 PM', points: 3 },
];

const events: Event[] = [
  {
    id: '1',
    name: 'FIDE Grand Prix 2026',
    location: 'Berlin, Germany · May 1, 2026',
    position: '# 1st',
    points: 50,
    logo: require('../assets/images/layer2.png'),
  },
  {
    id: '2',
    name: 'Norway Chess 2026',
    location: 'Stavanger, Norway · Apr 12, 2026',
    position: '# 2nd',
    points: 35,
    logo: require('../assets/images/layer2.png'),
  },
  {
    id: '3',
    name: 'Tata Steel Chess 2026',
    location: 'Wijk aan Zee, Netherlands · Jan 18, 2026',
    position: '# 3rd',
    points: 50,
    logo: require('../assets/images/layer2.png'),
  },
];

const profile = {
  avatar: require('../assets/images/magnus-pfp.png'),
  name: 'Magnus Carlsen',
  elo: 2830,
  progressPoints: 1240n,
};

export default function Dashboard() {
  const onScanPress = () => {
    Alert.alert('Not yet implemented!');
  };

  const onMenuPress = () => {
    Alert.alert('Not yet implemented!');
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        alignItems: 'center',
        backgroundColor: theme.semantic.bg['app-bg'] as string,
      }}
    >
      {/* Header */}
      <View
        style={{
          width: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: theme.primitives.spacing['8'],
          paddingHorizontal: theme.primitives.spacing['16'],
        }}
      >
        <Text
          style={{
            color: theme.semantic.fg['high-emphasis'] as string,
            fontSize: theme.primitives.font.size['h4'],
            fontFamily: theme.primitives.font.family.header,
          }}
        >
          Vault
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.primitives.spacing['12'],
          }}
        >
          <Pressable onPress={onScanPress} hitSlop={8}>
            <Ionicons name="scan-outline" size={24} color={theme.semantic.fg['high-emphasis']} />
          </Pressable>
          <Pressable onPress={onMenuPress} hitSlop={8}>
            <Ionicons name="menu-outline" size={32} color={theme.semantic.fg['high-emphasis']} />
          </Pressable>
        </View>
      </View>

      {/* Content */}
      <View
        style={{
          flex: 1,
          width: '100%',
          paddingHorizontal: theme.primitives.spacing['8'],
          paddingTop: theme.primitives.spacing['16'],
        }}
      >
        <ProfileOverview
          name={profile.name}
          eloRating={profile.elo}
          progressPoints={profile.progressPoints}
          avatar={profile.avatar}
          onSharePress={() => {}}
        />
        <ActivityTabs activities={activities} events={events} />
      </View>
    </SafeAreaView>
  );
}
