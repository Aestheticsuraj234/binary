import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';

import {COLORS} from '@/lib/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {backgroundColor: COLORS.background},
        }}
      />
    </>
  );
}
