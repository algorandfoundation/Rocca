import { Divider } from '@/components/world-chess/activity-item';
import Button from '@/components/world-chess/button';
import EventItem from '@/components/world-chess/event-item';
import theme from '@/theme/theme';
import { Entypo } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { ImageSourcePropType, ScrollView, View } from 'react-native';

const events: {
  id: string;
  name: string;
  location: string;
  points: number;
  position: string;
  logo: ImageSourcePropType;
}[] = [
  {
    id: '1',
    name: 'FIDE Grand Prix 2026',
    location: 'Berlin, Germany · May 1, 2026',
    points: 50,
    position: '#1ST',
    logo: require('../assets/images/layer2.png'),
  },
  {
    id: '2',
    name: 'Norway Chess 2026',
    location: 'Stavanger, Norway · Apr 12, 2026',
    points: 35,
    position: '#2ND',
    logo: require('../assets/images/layer2.png'),
  },
  {
    id: '3',
    name: 'Tata Steel Chess 2026',
    location: 'Wijk aan Zee, Netherlands · Jan 18, 2026',
    points: 50,
    position: '#1ST',
    logo: require('../assets/images/layer2.png'),
  },
  {
    id: '4',
    name: 'Sinquefield Cup 2025',
    location: 'St. Louis, USA · Sep 3, 2025',
    points: 20,
    position: '#4TH',
    logo: require('../assets/images/layer2.png'),
  },
  {
    id: '5',
    name: 'Grand Chess Tour 2025',
    location: 'Paris, France · Jul 20, 2025',
    points: 25,
    position: '#3RD',
    logo: require('../assets/images/layer2.png'),
  },
  {
    id: '6',
    name: 'Candidates Tournament 2025',
    location: 'Toronto, Canada · Apr 5, 2025',
    points: 35,
    position: '#2ND',
    logo: require('../assets/images/layer2.png'),
  },
];

export default function Events() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Button
              label="Back"
              variant="link"
              size="large"
              onPress={() => router.back()}
              leftIcon={
                <Entypo
                  name="chevron-small-left"
                  size={24}
                  color={theme.semantic.fg['brand-secondary']}
                />
              }
            />
          ),
        }}
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: theme.semantic.bg['app-bg'] as string }}
        contentContainerStyle={{
          paddingHorizontal: theme.primitives.spacing['8'],
          paddingVertical: theme.primitives.spacing['8'],
        }}
      >
        {events.map((event) => (
          <View key={event.id}>
            <EventItem
              logo={event.logo}
              name={event.name}
              location={event.location}
              points={event.points}
              position={event.position}
            />
            <Divider />
          </View>
        ))}
      </ScrollView>
    </>
  );
}
