import type {Agent, Thread} from '@binary/shared';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useEffect} from 'react';
import {ActivityIndicator, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {CharacterAvatar} from '@/components/character-face';
import {ChatView} from '@/components/chat-view';
import {HeaderButton, ScreenHeader} from '@/components/screen-header';
import {Starters} from '@/components/starters';
import {apiJson} from '@/lib/api';
import {confirm} from '@/lib/confirm';
import {COLORS} from '@/lib/theme';
import {useApi} from '@/lib/use-api';
import {useChat} from '@/lib/use-chat';

/** A chat with one character. `?chat=<id>` opens a saved one. */
export default function AgentChatScreen() {
  const router = useRouter();
  const {id, chat: chatId} = useLocalSearchParams<{
    id: string;
    chat?: string;
  }>();
  const {data, error} = useApi<{agent: Agent}>(`/api/agents/${id}`);
  const agent = data?.agent;
  const chat = useChat({
    agentId: id,
    start: async () => {
      const result = await apiJson<{thread: Thread}>(
        `/api/agents/${id}/threads`,
        {method: 'POST'},
      );
      return result.data?.thread.id;
    },
  });
  const {open} = chat;

  useEffect(() => {
    void open(chatId);
  }, [open, chatId]);

  async function deleteChat() {
    const sure = await confirm(
      'Delete this chat?',
      'This cannot be undone.',
      'Delete',
    );
    if (sure && chat.threadId) {
      await apiJson(`/api/threads/${chat.threadId}`, {method: 'DELETE'});
      router.setParams({chat: undefined});
      void open(undefined);
    }
  }

  if (!agent) {
    return (
      <SafeAreaView style={styles.center}>
        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <ActivityIndicator color={COLORS.primary} />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader
        title={agent.name}
        subtitle={agent.role}
        leading={
          <CharacterAvatar avatar={agent.avatar} mood={chat.mood} size={40} />
        }
      >
        <View style={styles.actions}>
          <HeaderButton
            icon="add"
            label="New chat"
            disabled={chat.isRunning || !chat.threadId}
            onPress={() => {
              router.setParams({chat: undefined});
              void open(undefined);
            }}
          />
          {chat.threadId && (
            <HeaderButton
              icon="trash-outline"
              label="Delete chat"
              disabled={chat.isRunning}
              onPress={() => void deleteChat()}
            />
          )}
        </View>
      </ScreenHeader>
      <ChatView
        chat={chat}
        authorOf={() => agent}
        placeholder={`Message ${agent.name}…`}
        renderEmpty={(send) => <Starters avatar={agent.avatar} onPick={send} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: COLORS.background},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  error: {color: COLORS.destructive, fontSize: 15},
  actions: {flexDirection: 'row', gap: 8},
});
