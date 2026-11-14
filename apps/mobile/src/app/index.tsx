import {Redirect} from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {authClient} from '@/lib/auth-client';
import {COLORS, RADIUS} from '@/lib/theme';

export default function HomeScreen() {
  const {data: session, isPending} = authClient.useSession();

  if (isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/sign-in" />;
  }

  const firstName = session.user.name.split(' ')[0];

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.brand}>Binary</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => authClient.signOut()}
        >
          <Text style={styles.signOut}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <Text style={styles.badge}>● You&apos;re signed in</Text>
        <Text style={styles.title}>Welcome, {firstName}.</Text>
        <Text style={styles.muted}>{session.user.email}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>No agents yet</Text>
          <Text style={styles.muted}>
            Agents arrive in a later chapter. Your account and session are
            working end to end.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  screen: {flex: 1, backgroundColor: COLORS.background},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  brand: {color: COLORS.foreground, fontSize: 18, fontWeight: '600'},
  signOut: {color: COLORS.mutedForeground, fontSize: 14},
  body: {padding: 24, gap: 8},
  badge: {color: COLORS.primary, fontSize: 13},
  title: {color: COLORS.foreground, fontSize: 30, fontWeight: '600'},
  muted: {color: COLORS.mutedForeground, fontSize: 15, lineHeight: 22},
  card: {
    marginTop: 24,
    padding: 20,
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: RADIUS,
  },
  cardTitle: {color: COLORS.foreground, fontSize: 17, fontWeight: '600'},
});
