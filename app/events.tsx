import BackNavButton from '@/components/back-nav-button';
import theme from '@/features/world-chess/theme/theme';
import { Stack, useRouter } from 'expo-router';
import { Image, ScrollView, Text, View } from 'react-native';

const events: {
  id: string;
  name: string;
  location: string;
  date: string;
  position: string;
}[] = [
  {
    id: '1',
    name: 'FIDE Grand Prix 2026',
    location: 'Berlin, Germany',
    date: 'May 1, 2026',
    position: '#1ST',
  },
  {
    id: '2',
    name: 'Norway Chess 2026',
    location: 'Stavanger, Norway',
    date: 'Apr 12, 2026',
    position: '#2ND',
  },
  {
    id: '3',
    name: 'Tata Steel Chess 2026',
    location: 'Wijk aan Zee, Netherlands',
    date: 'Jan 18, 2026',
    position: '#1ST',
  },
  {
    id: '4',
    name: 'Sinquefield Cup 2025',
    location: 'St. Louis, USA',
    date: 'Sep 3, 2025',
    position: '#4TH',
  },
  {
    id: '5',
    name: 'Grand Chess Tour 2025',
    location: 'Paris, France',
    date: 'Jul 20, 2025',
    position: '#3RD',
  },
  {
    id: '6',
    name: 'Candidates Tournament 2025',
    location: 'Toronto, Canada',
    date: 'Apr 5, 2025',
    position: '#2ND',
  },
];

export default function Events() {
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
          {events.map((event, index) => (
            <View key={event.id}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: theme.primitives.spacing['12'],
                  paddingHorizontal: theme.primitives.spacing['12'],
                }}
              >
                {/* Event logo */}
                <Image
                  source={require('../assets/images/layer2.png')}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    marginRight: theme.primitives.spacing['12'],
                  }}
                  resizeMode="cover"
                />
                {/* Event info */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.semantic.fg.white as string,
                      fontSize: 15,
                      fontFamily: theme.primitives.font.family.header,
                    }}
                    numberOfLines={1}
                  >
                    {event.name}
                  </Text>
                  <Text
                    style={{
                      color: theme.semantic.fg['medium-emphasis'] as string,
                      fontSize: 13,
                      fontFamily: theme.primitives.font.family.p,
                    }}
                    numberOfLines={1}
                  >
                    {event.location} · {event.date}
                  </Text>
                </View>
                {/* Position badge */}
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
                      color: theme.primitives.color.brand.primary,
                      fontFamily: theme.primitives.font.family.numeric,
                      fontSize: theme.primitives.font.size['p-md'],
                      fontWeight: 'bold',
                    }}
                  >
                    {event.position}
                  </Text>
                </View>
              </View>
              {index < events.length - 1 && (
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
