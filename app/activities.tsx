import ActivityItem, { Divider } from '@/components/world-chess/ActivityItem';
import theme from '@/theme/theme';
import { ScrollView, View } from 'react-native';

const activities: {
  id: string;
  title: string;
  datetime: string;
  points: number;
}[] = [
  { id: '1', title: 'Chess Rewards', datetime: 'May 7, 2026 · 3:42 PM', points: 5 },
  { id: '2', title: 'Chess Rewards', datetime: 'May 6, 2026 · 11:15 AM', points: 10 },
  { id: '3', title: 'Chess Rewards', datetime: 'May 5, 2026 · 7:30 PM', points: 3 },
  { id: '4', title: 'Chess Rewards', datetime: 'May 4, 2026 · 9:00 AM', points: 7 },
  { id: '5', title: 'Chess Rewards', datetime: 'May 3, 2026 · 6:15 PM', points: 15 },
  { id: '6', title: 'Chess Rewards', datetime: 'May 2, 2026 · 2:30 PM', points: 5 },
];

export default function Activities() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.semantic.bg['app-bg'] as string }}
      contentContainerStyle={{
        paddingHorizontal: theme.primitives.spacing['8'],
        paddingVertical: theme.primitives.spacing['8'],
      }}
    >
      {activities.map((item) => (
        <View key={item.id}>
          <ActivityItem title={item.title} datetime={item.datetime} points={item.points} />
          <Divider />
        </View>
      ))}
    </ScrollView>
  );
}
