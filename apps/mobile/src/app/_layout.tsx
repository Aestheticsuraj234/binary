import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {ActivityIndicator, View} from 'react-native';

import {authClient} from '@/lib/auth-client';
import {COLORS} from '@/lib/theme';
import {TodayCountProvider} from '@/lib/today-count';

/**
 * Signed out, only sign-in and sign-up exist; signed in, only the app.
 * When the session changes, Expo Router moves to a screen that exists.
 */
export default function RootLayout() {
  const {data: session, isPending} = authClient.useSession();

  if (isPending) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.background,
        }}
      >
        <StatusBar style="light" />
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  return (
    <TodayCountProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {backgroundColor: COLORS.background},
        }}
      >
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="agents/[id]" />
          <Stack.Screen name="rooms/[id]" />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="sign-up" />
        </Stack.Protected>
      </Stack>
    </TodayCountProvider>
  );
}
