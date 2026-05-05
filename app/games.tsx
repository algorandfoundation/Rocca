import BackNavButton from '@/components/back-nav-button';
import theme from '@/features/world-chess/theme/theme';
import { Stack, useRouter } from 'expo-router';
import { Image, ScrollView, Text, View } from 'react-native';

type GameResult = 'WIN' | 'LOSE' | 'DRAW';

const games: {
  id: string;
  opponent: string;
  round: string;
  result: GameResult;
}[] = [
  { id: '1', opponent: 'Hikaru Nakamura', round: 'World Blitz Final - Round 7', result: 'WIN' },
  {
    id: '2',
    opponent: 'Fabiano Caruana',
    round: 'Candidates Tournament - Round 3',
    result: 'LOSE',
  },
  { id: '3', opponent: 'Ian Nepomniachtchi', round: 'FIDE Grand Prix - Round 5', result: 'WIN' },
  { id: '4', opponent: 'Alireza Firouzja', round: 'Norway Chess - Round 2', result: 'DRAW' },
  { id: '5', opponent: 'Ding Liren', round: 'World Championship - Game 12', result: 'WIN' },
  { id: '6', opponent: 'Wesley So', round: 'Tata Steel - Round 9', result: 'LOSE' },
];

const resultColor: Record<GameResult, string> = {
  WIN: theme.primitives.color.brand.primary,
  LOSE: theme.primitives.color.neutral['40'],
  DRAW: theme.primitives.color.brand.secondary,
};

export default function Games() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => <BackNavButton onPress={() => router.back()} />,
        }}
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: theme.semantic.bg['app-bg'] as string }}
        contentContainerStyle={{
          paddingHorizontal: theme.primitives.spacing['16'],
          paddingVertical: theme.primitives.spacing['16'],
        }}
      >
        <View
          style={{
            width: '100%',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.09)',
            borderRadius: theme.primitives.radius['8'],
            backgroundColor: 'rgba(255,255,255,0.02)',
            overflow: 'hidden',
          }}
        >
          {games.map((game, index) => (
            <View key={game.id}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: theme.primitives.spacing['12'],
                  paddingHorizontal: theme.primitives.spacing['12'],
                }}
              >
                {/* Opponent avatar */}
                <Image
                  source={require('../assets/images/magnus-pfp.png')}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    marginRight: theme.primitives.spacing['12'],
                  }}
                  resizeMode="cover"
                />
                {/* Name and round */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.semantic.fg.white as string,
                      fontSize: 15,
                      fontFamily: theme.primitives.font.family.header,
                    }}
                    numberOfLines={1}
                  >
                    {game.opponent}
                  </Text>
                  <Text
                    style={{
                      color: theme.semantic.fg['medium-emphasis'] as string,
                      fontSize: 13,
                      fontFamily: theme.primitives.font.family.p,
                    }}
                    numberOfLines={1}
                  >
                    {game.round}
                  </Text>
                </View>
                {/* Result badge */}
                <View
                  style={{
                    backgroundColor: theme.primitives.color.neutral['90'],
                    borderRadius: theme.primitives.radius['6'],
                    paddingVertical: theme.primitives.spacing['4'],
                    paddingHorizontal: theme.primitives.spacing['12'],
                    marginLeft: theme.primitives.spacing['12'],
                  }}
                >
                  <Text
                    style={{
                      color: resultColor[game.result],
                      fontFamily: theme.primitives.font.family.numeric,
                      fontSize: theme.primitives.font.size['p-md'],
                      fontWeight: 'bold',
                    }}
                  >
                    {game.result}
                  </Text>
                </View>
              </View>
              {index < games.length - 1 && (
                <View
                  style={{
                    height: 1,
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    marginHorizontal: theme.primitives.spacing['12'],
                  }}
                />
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
}
