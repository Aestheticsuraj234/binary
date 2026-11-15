import {ROUTING_MODE_INFO, type Room, type Thread} from '@binary/shared';
import {useLocalSearchParams, useRouter} from 'expo-router';
import {useEffect} from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {CharacterAvatar} from '@/components/character-face';
import {ChatView} from '@/components/chat-view';
import {HeaderButton, ScreenHeader} from '@/components/screen-header';
import {apiJson} from '@/lib/api';
import {confirm} from '@/lib/confirm';
import {COLORS} from '@/lib/theme';
import {timeAgo} from '@/lib/time';
import {useApi} from '@/lib/use-api';
import {useChat} from '@/lib/use-chat';

/** A room's chat. `?chat=<id>` opens a saved one. */
export default function RoomChatScreen() {
  const router = useRouter();
  const {id, chat: chatId} = useLocalSearchParams<{
    id: string;
    chat?: string;
  }>();
  const {data, error, reload} = useApi<{room: Room; threads: Thread[]}>(
    `/api/rooms/${id}`,
  );
  const room = data?.room;
  const chat = useChat({
    start: async () => {
      const result = await apiJson<{thread: Thread}>(
        `/api/rooms/${id}/threads`,
        {
          method: 'POST',
        },
      );
      return result.data?.thread.id;
    },
  });
  const {open} = chat;

  useEffect(() => {
    void open(chatId);
  }, [open, chatId]);

  function openChat(threadId: string | undefined) {
    router.setParams({chat: threadId});
    void open(threadId);
  }

  async function deleteChat() {
    const sure = await confirm(
      'Delete this chat?',
      'This cannot be undone.',
      'Delete',
    );
    if (sure && chat.threadId) {
      await apiJson(`/api/threads/${chat.threadId}`, {method: 'DELETE'});
      openChat(undefined);
      void reload();
    }
  }

  if (!room) {
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

  const lead = room.members.find((member) => member.id === room.leadAgentId);
  const speaker =
    room.members.find((member) => member.id === chat.speakerId) ?? lead;
  const hint =
    room.routingMode === 'auto'
      ? `${lead?.name ?? 'The lead'} will pick who answers.`
      : `@Mention who should answer, or ${lead?.name ?? 'the lead'} will.`;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader
        title={room.name}
        subtitle={room.members.map((member) => member.name).join(', ')}
        leading={
          <CharacterAvatar
            avatar={speaker?.avatar ?? null}
            mood={chat.mood}
            size={40}
          />
        }
      >
        <View style={styles.actions}>
          <HeaderButton
            icon="add"
            label="New chat"
            disabled={chat.isRunning || !chat.threadId}
            onPress={() => {
              openChat(undefined);
              void reload();
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
        members={room.members}
        authorOf={(message) =>
          room.members.find((member) => member.id === message.authorAgentId)
        }
        placeholder={`Message ${room.name}…`}
        renderEmpty={() => (
          <View style={styles.empty}>
            <View style={styles.faces}>
              {room.members.map((member) => (
                <View key={member.id} style={styles.member}>
                  <CharacterAvatar avatar={member.avatar} size={48} />
                  <Text style={styles.memberName} numberOfLines={1}>
                    {member.name}
                  </Text>
                  {member.id === room.leadAgentId && (
                    <Text style={styles.lead}>lead</Text>
                  )}
                </View>
              ))}
            </View>
            <Text style={styles.mode}>
              {ROUTING_MODE_INFO[room.routingMode].label}: {hint}
            </Text>
            {data.threads.length > 0 && (
              <View style={styles.chats}>
                <Text style={styles.chatsTitle}>Earlier chats</Text>
                {data.threads.map((thread) => (
                  <Pressable
                    key={thread.id}
                    accessibilityRole="button"
                    onPress={() => openChat(thread.id)}
                    style={styles.chatRow}
                  >
                    <Text style={styles.chatTitle} numberOfLines={1}>
                      {thread.title}
                    </Text>
                    <Text style={styles.chatTime}>
                      {timeAgo(thread.updatedAt)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
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
  empty: {gap: 18, paddingTop: 24},
  faces: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
  },
  member: {alignItems: 'center', gap: 4, width: 64},
  memberName: {color: COLORS.foreground, fontSize: 13},
  lead: {color: COLORS.primary, fontSize: 11},
  mode: {
    color: COLORS.mutedForeground,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  chats: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    overflow: 'hidden',
  },
  chatsTitle: {
    color: COLORS.mutedForeground,
    fontSize: 12,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  chatTitle: {flex: 1, color: COLORS.foreground, fontSize: 14},
  chatTime: {color: COLORS.mutedForeground, fontSize: 12},
});
