import {
  CHARACTERS,
  characterOf,
  type Agent,
  type ThreadSummary,
} from '@binary/shared';
import {useRouter} from 'expo-router';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {Character, CharacterAvatar} from '@/components/character-face';
import {EmptyNote, SectionTitle, TabScreen} from '@/components/tab-screen';
import {COLORS} from '@/lib/theme';
import {timeAgo} from '@/lib/time';
import {useApi} from '@/lib/use-api';

/** Crew: the characters you hired, and your latest chats with them. */
export default function CrewScreen() {
  const router = useRouter();
  const crew = useApi<{agents: Agent[]}>('/api/agents');
  const recent = useApi<{threads: ThreadSummary[]}>('/api/threads');
  const agents = crew.data?.agents ?? [];
  const threads = recent.data?.threads ?? [];

  return (
    <TabScreen
      title="Your crew"
      subtitle="Tap a character to start a chat."
      isLoading={crew.isLoading}
      error={crew.error}
      onRefresh={async () => {
        await Promise.all([crew.reload(), recent.reload()]);
      }}
    >
      {agents.length === 0 ? (
        <EmptyNote>
          No characters yet. Hire your first one in the web app, then pull down
          to refresh.
        </EmptyNote>
      ) : (
        <View style={styles.grid}>
          {agents.map((agent) => {
            const {color} = CHARACTERS[characterOf(agent.avatar)];
            return (
              <Pressable
                key={agent.id}
                accessibilityRole="button"
                accessibilityLabel={`Chat with ${agent.name}`}
                onPress={() => router.push(`/agents/${agent.id}`)}
                style={({pressed}) => [
                  styles.card,
                  {backgroundColor: `${color}14`, borderColor: `${color}40`},
                  pressed && styles.pressed,
                ]}
              >
                <Character avatar={agent.avatar} size={96} />
                <Text style={styles.name} numberOfLines={1}>
                  {agent.name}
                </Text>
                <Text style={styles.role} numberOfLines={2}>
                  {agent.role}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {threads.length > 0 && (
        <>
          <SectionTitle>Recent chats</SectionTitle>
          <View style={styles.list}>
            {threads.map((thread) => (
              <Pressable
                key={thread.id}
                accessibilityRole="button"
                onPress={() =>
                  router.push(`/agents/${thread.agent.id}?chat=${thread.id}`)
                }
                style={({pressed}) => [styles.row, pressed && styles.pressed]}
              >
                <CharacterAvatar avatar={thread.agent.avatar} size={36} />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {thread.title}
                  </Text>
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {thread.agent.name} · {timeAgo(thread.updatedAt)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12},
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'center',
    gap: 4,
    padding: 14,
    borderWidth: 1,
    borderRadius: 24,
  },
  pressed: {opacity: 0.75},
  name: {color: COLORS.foreground, fontSize: 17, fontWeight: '600'},
  role: {
    color: COLORS.mutedForeground,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  list: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    backgroundColor: COLORS.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  rowText: {flex: 1, minWidth: 0},
  rowTitle: {color: COLORS.foreground, fontSize: 15, fontWeight: '500'},
  rowMeta: {color: COLORS.mutedForeground, fontSize: 13},
});
