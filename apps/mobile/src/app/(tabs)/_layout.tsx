import {Ionicons} from '@expo/vector-icons';
import {useFocusEffect} from 'expo-router';
import {Tabs} from 'expo-router/js-tabs';
import {useCallback} from 'react';
import type {ColorValue} from 'react-native';

import {COLORS} from '@/lib/theme';
import {useTodayCount} from '@/lib/today-count';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// The tints set below are plain strings.
function icon(name: IconName) {
  return ({color, size}: {color: ColorValue; size: number}) => (
    <Ionicons name={name} color={String(color)} size={size} />
  );
}

/** The four tabs: your crew, rooms, what waits for you, and you. */
export default function TabsLayout() {
  const {pending, refresh} = useTodayCount();

  // The badge is fresh whenever you come back to the tabs.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: {backgroundColor: COLORS.background},
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.mutedForeground,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{title: 'Crew', tabBarIcon: icon('people')}}
      />
      <Tabs.Screen
        name="rooms"
        options={{title: 'Rooms', tabBarIcon: icon('chatbubbles')}}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: 'Today',
          tabBarIcon: icon('sunny'),
          tabBarBadge: pending > 0 ? pending : undefined,
          tabBarBadgeStyle: {
            backgroundColor: COLORS.primary,
            color: COLORS.primaryForeground,
          },
        }}
      />
      <Tabs.Screen
        name="account"
        options={{title: 'You', tabBarIcon: icon('person-circle')}}
      />
    </Tabs>
  );
}
