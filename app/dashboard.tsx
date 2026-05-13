import ActivityTabs, { Event } from '@/components/world-chess/ActivityTabs';
import MenuSheet from '@/components/world-chess/MenuSheet';
import ProfileOverview from '@/components/world-chess/ProfileOverview';
import ScanCheckInSheet from '@/components/world-chess/ScanCheckInSheet';
import { useActivities } from '@/hooks/useActivities';
import { useInvalidateSession, useSession } from '@/hooks/useSession';
import { chessGateway } from '@/lib/chess-gateway';
import theme from '@/theme/theme';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const router = useRouter();
  const invalidateSession = useInvalidateSession();
  const menuSheetRef = useRef<BottomSheetModal>(null);
  const scanSheetRef = useRef<BottomSheetModal>(null);
  const session = useSession();

  const { activities } = useActivities();

  const onScanPress = useCallback(() => {
    scanSheetRef.current?.present();
  }, []);

  const onMenuPress = useCallback(() => {
    menuSheetRef.current?.present();
  }, []);

  const onMenuDismiss = useCallback(() => {
    menuSheetRef.current?.dismiss();
  }, []);

  const onScanDismiss = useCallback(() => {
    scanSheetRef.current?.dismiss();
  }, []);

  const onLogoutPress = useCallback(async () => {
    menuSheetRef.current?.dismiss();
    try {
      chessGateway.clearCookie();
      await invalidateSession();
    } catch (error) {
      console.error('[dashboard] logout error', error);
    } finally {
      router.replace('/auth/login');
    }
  }, [invalidateSession, router]);

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
        />
        <ActivityTabs activities={activities.slice(0, 3)} events={events.slice(0, 3)} />
      </View>

      <ScanCheckInSheet ref={scanSheetRef} onDismiss={onScanDismiss} />
      <MenuSheet
        ref={menuSheetRef}
        onDismiss={onMenuDismiss}
        onLogout={onLogoutPress}
        session={session}
      />
    </SafeAreaView>
  );
}
