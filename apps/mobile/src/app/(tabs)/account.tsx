import {StyleSheet, Text, View} from 'react-native';

import {PrimaryButton} from '@/components/primary-button';
import {TabScreen} from '@/components/tab-screen';
import {API_URL} from '@/lib/api';
import {authClient} from '@/lib/auth-client';
import {COLORS, RADIUS} from '@/lib/theme';

/** You: who is signed in, and signing out. */
export default function AccountScreen() {
  const {data: session} = authClient.useSession();

  return (
    <TabScreen
      title="You"
      subtitle="Your account on this phone."
      isLoading={!session}
      error=""
      onRefresh={async () => {}}
    >
      <View style={styles.card}>
        <Text style={styles.name}>{session?.user.name}</Text>
        <Text style={styles.muted}>{session?.user.email}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>On the web</Text>
        <Text style={styles.muted}>
          Hire characters, connect apps, add API keys and set up routines in the
          web app. Everything shows up here.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Voice</Text>
        <Text style={styles.muted}>
          Tap the microphone in any chat and speak. Your OpenAI key turns it
          into text you can check before sending.
        </Text>
      </View>
      <Text style={styles.server}>Connected to {API_URL}</Text>
      <PrimaryButton
        title="Sign out"
        onPress={() => void authClient.signOut()}
      />
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 4,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS * 2,
    backgroundColor: COLORS.card,
  },
  name: {color: COLORS.foreground, fontSize: 18, fontWeight: '600'},
  label: {color: COLORS.foreground, fontSize: 15, fontWeight: '600'},
  muted: {color: COLORS.mutedForeground, fontSize: 14, lineHeight: 21},
  server: {color: COLORS.mutedForeground, fontSize: 12, textAlign: 'center'},
});
