import ActivityItem, { Divider } from '@/components/world-chess/ActivityItem';
import { useActivities } from '@/hooks/useActivities';
import theme from '@/theme/theme';
import { ScrollView, Text, View } from 'react-native';

export default function Activities() {
  const { activities, isLoading, error, address, indexerDisabled, missingPlayer } = useActivities();

  const hint = (() => {
    if (indexerDisabled) return 'Indexer disabled (EXPO_PUBLIC_INDEXER_URL is empty).';
    if (missingPlayer) return 'Signed in but no vault player linked to this session yet.';
    if (error) return `Failed to load activities: ${(error as Error)?.message ?? String(error)}`;
    if (isLoading) return 'Loading activities…';
    if (activities.length === 0)
      return address
        ? `No on-chain activity for ${address}.`
        : 'No address resolved for this user.';
    return null;
  })();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.semantic.bg['app-bg'] as string }}
      contentContainerStyle={{
        paddingHorizontal: theme.primitives.spacing['8'],
        paddingVertical: theme.primitives.spacing['8'],
      }}
    >
      {hint && (
        <View style={{ paddingVertical: theme.primitives.spacing['4'] }}>
          <Text style={{ color: theme.semantic.fg['medium-emphasis'] as string }}>{hint}</Text>
        </View>
      )}
      {activities.map((item) => (
        <View key={item.id}>
          <ActivityItem title={item.title} datetime={item.datetime} points={item.points} />
          <Divider />
        </View>
      ))}
    </ScrollView>
  );
}
