import ActivityTabs, { Activity, Event } from '@/components/world-chess/ActivityTabs';
import ProfileOverview from '@/components/world-chess/ProfileOverview';
import SessionDebug from '@/components/world-chess/SessionDebug';
import { useInvalidateSession, useSession } from '@/hooks/useSession';
import { chessGateway } from '@/lib/chess-gateway';
import theme from '@/theme/theme';
import Ionicons from '@expo/vector-icons/build/Ionicons';
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import { useCallback, useRef } from 'react';
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
  const router = useRouter();
  const invalidateSession = useInvalidateSession();
  const menuSheetRef = useRef<BottomSheetModal>(null);
  const session = useSession();

  const onScanPress = () => {
    Alert.alert('Not yet implemented!');
  };

  const onMenuPress = useCallback(() => {
    menuSheetRef.current?.present();
  }, []);

  const onCancelMenuPress = useCallback(() => {
    menuSheetRef.current?.dismiss();
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

  const renderBackdrop = useCallback(
    (props: React.ComponentProps<typeof BottomSheetBackdrop>) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

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
        <ActivityTabs activities={activities} events={events} />
      </View>

      {/* Hamburger menu sheet */}
      <BottomSheetModal
        ref={menuSheetRef}
        snapPoints={['30%']}
        index={0}
        enablePanDownToClose
        enableDynamicSizing={false}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.semantic.bg['surface-1'] }}
        handleIndicatorStyle={{ display: 'none' }}
      >
        <BottomSheetView
          style={{
            paddingHorizontal: theme.primitives.spacing['16'],
            paddingBottom: theme.primitives.spacing['32'],
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: theme.primitives.spacing['16'],
              position: 'relative',
            }}
          >
            <Text
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                color: theme.semantic.fg['high-emphasis'] as string,
                fontSize: theme.primitives.font.size['p-md'],
                fontFamily: theme.primitives.font.family.p,
                textAlign: 'center',
              }}
            >
              Menu
            </Text>
            <Pressable onPress={onCancelMenuPress} hitSlop={8}>
              <Text
                style={{
                  color: theme.semantic.fg['brand-secondary'] as string,
                  fontSize: theme.primitives.font.size['p-lg'],
                  fontFamily: theme.primitives.font.family.p,
                  marginLeft: theme.primitives.spacing['8'],
                }}
              >
                Cancel
              </Text>
            </Pressable>
          </View>

          <SessionDebug session={session} />

          <Pressable
            onPress={onLogoutPress}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: theme.primitives.spacing['12'],
              paddingHorizontal: theme.primitives.spacing['16'],
              paddingVertical: theme.primitives.spacing['16'],
              backgroundColor: theme.semantic.bg['surface-1'],
              borderRadius: theme.primitives.radius['4'],
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons
              name="log-out-outline"
              size={24}
              color={theme.semantic.fg['brand-secondary']}
            />
            <Text
              style={{
                color: theme.semantic.fg['brand-secondary'] as string,
                fontSize: theme.primitives.font.size['p-lg'],
                fontFamily: theme.primitives.font.family.p,
              }}
            >
              Log out
            </Text>
          </Pressable>
        </BottomSheetView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}
