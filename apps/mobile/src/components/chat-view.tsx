import {useRef, useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type ScrollViewInstance,
} from 'react-native';

import {CharacterAvatar} from '@/components/character-face';
import {Composer} from '@/components/composer';
import {MessageBubble} from '@/components/message-bubble';
import {COLORS} from '@/lib/theme';
import type {Message, useChat} from '@/lib/use-chat';

interface Member {
  id: string;
  name: string;
  avatar: string | null;
}

interface ChatViewProps {
  chat: ReturnType<typeof useChat>;
  /** Who wrote an answer. */
  authorOf: (message: Message) => Member | undefined;
  /** A room labels answers and offers @Name chips for its members. */
  members?: Member[];
  placeholder: string;
  /** Shown before the first message; `send` sends a starter. */
  renderEmpty: (send: (text: string) => void) => React.ReactNode;
}

/** The messages and the box below them, kept above the keyboard. */
export function ChatView({
  chat,
  authorOf,
  members,
  placeholder,
  renderEmpty,
}: ChatViewProps) {
  const [draft, setDraft] = useState('');
  const scroll = useRef<ScrollViewInstance>(null);

  async function send(text: string) {
    if (chat.isRunning) {
      return;
    }
    const previous = draft;
    setDraft('');
    // A message that doesn't pass the checks goes back into the box.
    if (!(await chat.send(text))) {
      setDraft(previous);
    }
  }

  function mention(name: string) {
    setDraft(
      (text) => `${text}${text && !text.endsWith(' ') ? ' ' : ''}@${name} `,
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scroll}
        style={styles.flex}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        // Keep the newest words in view while an answer streams in.
        onContentSizeChange={() =>
          scroll.current?.scrollToEnd({animated: true})
        }
      >
        {chat.messages.length === 0
          ? renderEmpty((text) => void send(text))
          : chat.messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                author={authorOf(message)}
                showName={members !== undefined}
                onDecide={chat.decide}
              />
            ))}
      </ScrollView>
      {members && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipBar}
          contentContainerStyle={styles.chips}
          keyboardShouldPersistTaps="handled"
        >
          {members.map((member) => (
            <Pressable
              key={member.id}
              accessibilityRole="button"
              accessibilityLabel={`Mention ${member.name}`}
              onPress={() => mention(member.name)}
              style={styles.chip}
            >
              <CharacterAvatar avatar={member.avatar} size={20} />
              <Text style={styles.chipText}>@{member.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <Composer
        value={draft}
        onChange={setDraft}
        onSend={() => void send(draft)}
        isRunning={chat.isRunning}
        placeholder={placeholder}
        error={chat.error}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  list: {gap: 16, padding: 16, paddingBottom: 24},
  chipBar: {flexGrow: 0, borderTopWidth: 1, borderTopColor: COLORS.border},
  chips: {gap: 8, paddingHorizontal: 12, paddingVertical: 8},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipText: {color: COLORS.mutedForeground, fontSize: 13},
});
