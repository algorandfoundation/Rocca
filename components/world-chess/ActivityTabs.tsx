import ActivityItem, { Divider } from '@/components/world-chess/ActivityItem';
import Button from '@/components/world-chess/Button';
import EventItem from '@/components/world-chess/EventItem';
import theme from '@/theme/theme';
import MaterialIcons from '@expo/vector-icons/build/MaterialIcons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ImageSourcePropType, Text, TouchableOpacity, View } from 'react-native';

export interface Activity {
  id: string;
  title: string;
  datetime: string;
  points: number;
}

export interface Event {
  id: string;
  name: string;
  location: string;
  points: number;
  position: string;
  logo: ImageSourcePropType;
}

interface ActivityTabsProps {
  activities: Activity[];
  events: Event[];
}

type Tab = 'activities' | 'events';

export default function ActivityTabs({ activities, events }: ActivityTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('activities');
  const router = useRouter();

  return (
    <View style={{ flex: 1 }}>
      {/* Tab bar */}
      <View
        style={{
          flexDirection: 'row',
          gap: theme.primitives.spacing['16'],
          marginBottom: theme.primitives.spacing['12'],
        }}
      >
        {(['activities', 'events'] as Tab[]).map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} activeOpacity={0.7}>
              <Text
                style={{
                  color: isActive
                    ? (theme.semantic.fg['high-emphasis'] as string)
                    : (theme.semantic.fg['medium-emphasis'] as string),
                  fontSize: theme.primitives.font.size.h4,
                  fontFamily: theme.primitives.font.family.header,
                  textTransform: 'capitalize',
                }}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab content */}
      {activeTab === 'activities' ? (
        <View style={{ flex: 1 }}>
          <View style={{ marginBottom: theme.primitives.spacing['16'] }}>
            {activities.map((item, idx) => (
              <View key={item.id}>
                <ActivityItem title={item.title} datetime={item.datetime} points={item.points} />
                {idx < activities.length - 1 && <Divider />}
              </View>
            ))}
          </View>
          <Button
            label="See All"
            variant="secondary"
            rightIcon={
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={theme.semantic.fg['brand-primary']}
              />
            }
            onPress={() => router.push('/activities')}
          />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ marginBottom: theme.primitives.spacing['16'] }}>
            {events.map((event, index, arr) => (
              <View key={`${event.id}-${index}`}>
                <EventItem
                  logo={event.logo}
                  name={event.name}
                  location={event.location}
                  points={event.points}
                  position={event.position}
                />
                {index < arr.length - 1 && <Divider />}
              </View>
            ))}
          </View>
          <Button
            label="See All"
            variant="secondary"
            rightIcon={
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={theme.semantic.fg['brand-primary']}
              />
            }
            onPress={() => router.push('/events')}
          />
        </View>
      )}
    </View>
  );
}
