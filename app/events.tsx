import { Divider } from '@/components/world-chess/ActivityItem';
import AddProofSheet from '@/components/world-chess/AddProofSheet';
import EventItem from '@/components/world-chess/EventItem';
import theme from '@/theme/theme';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useCallback, useRef } from 'react';
import { ImageSourcePropType, Pressable, ScrollView, View } from 'react-native';

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
    position: '# 1st',
    logo: require('../assets/images/layer2.png'),
  },
  {
    id: '2',
    name: 'Norway Chess 2026',
    location: 'Stavanger, Norway · Apr 12, 2026',
    points: 35,
    position: '# 2nd',
    logo: require('../assets/images/layer2.png'),
  },
  {
    id: '3',
    name: 'Tata Steel Chess 2026',
    location: 'Wijk aan Zee, Netherlands · Jan 18, 2026',
    points: 50,
    position: '# 3rd',
    logo: require('../assets/images/layer2.png'),
  },
  {
    id: '4',
    name: 'Sinquefield Cup 2025',
    location: 'St. Louis, USA · Sep 3, 2025',
    points: 20,
    position: '# 4th',
    logo: require('../assets/images/layer2.png'),
  },
  {
    id: '5',
    name: 'Grand Chess Tour 2025',
    location: 'Paris, France · Jul 20, 2025',
    points: 25,
    position: '# 3rd',
    logo: require('../assets/images/layer2.png'),
  },
  {
    id: '6',
    name: 'Candidates Tournament 2025',
    location: 'Toronto, Canada · Apr 5, 2025',
    points: 35,
    position: '# 2nd',
    logo: require('../assets/images/layer2.png'),
  },
];

export default function Events() {
  const proofSheetRef = useRef<BottomSheetModal>(null);

  const onAddProofPress = useCallback(() => {
    proofSheetRef.current?.present();
  }, []);

  const onProofSheetDismiss = useCallback(() => {
    proofSheetRef.current?.dismiss();
  }, []);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.semantic.bg['app-bg'] as string }}
      contentContainerStyle={{
        paddingHorizontal: theme.primitives.spacing['8'],
        paddingVertical: theme.primitives.spacing['8'],
      }}
    >
      {events.map((event) => (
        <View key={event.id}>
          <Pressable onPress={onAddProofPress}>
            <EventItem
              logo={event.logo}
              name={event.name}
              location={event.location}
              points={event.points}
              position={event.position}
            />
          </Pressable>
          <Divider />
        </View>
      ))}
      <AddProofSheet ref={proofSheetRef} onDismiss={onProofSheetDismiss} />
    </ScrollView>
  );
}
