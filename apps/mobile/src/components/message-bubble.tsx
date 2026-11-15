import {StyleSheet, Text, View} from 'react-native';

import {CharacterAvatar} from '@/components/character-face';
import {Markdown} from '@/components/markdown';
import {ToolCallRow} from '@/components/tool-call-row';
import {COLORS} from '@/lib/theme';
import type {Message} from '@/lib/use-chat';

interface MessageBubbleProps {
  message: Message;
  /** The answering character, for assistant messages. */
  author?: {name: string; avatar: string | null};
  /** In a room, every answer is labelled with its character's name. */
  showName?: boolean;
  onDecide: (
    approvalId: string,
    decision: 'approve' | 'reject',
  ) => Promise<void>;
}

/** One message: yours on the right, a character's on the left. */
export function MessageBubble({
  message,
  author,
  showName,
  onDecide,
}: MessageBubbleProps) {
  if (message.role === 'tool') {
    // A decision about a tool call: a quiet line, not a bubble.
    return (
      <Text style={styles.note} numberOfLines={3}>
        {message.content}
      </Text>
    );
  }
  if (message.role === 'user') {
    return (
      <View style={styles.userRow}>
        <Text style={styles.user} selectable>
          {message.content}
        </Text>
      </View>
    );
  }
  const thinking =
    message.isStreaming && !message.content && !message.toolCalls;
  return (
    <View style={styles.row}>
      <CharacterAvatar
        avatar={author?.avatar ?? null}
        mood={message.error ? 'oops' : 'idle'}
        size={32}
      />
      <View style={styles.column}>
        {showName && author && <Text style={styles.name}>{author.name}</Text>}
        {thinking ? (
          <View
            style={[styles.bubble, styles.dots]}
            accessibilityRole="progressbar"
            accessibilityLabel={`${author?.name ?? 'The agent'} is thinking`}
          >
            <View style={styles.dot} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
        ) : (
          <View style={[styles.bubble, message.error && styles.failed]}>
            {message.toolCalls?.map((call) => (
              <ToolCallRow key={call.id} call={call} onDecide={onDecide} />
            ))}
            {message.content ? <Markdown>{message.content}</Markdown> : null}
            {message.error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {message.error}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    alignSelf: 'center',
    maxWidth: '85%',
    textAlign: 'center',
    color: COLORS.mutedForeground,
    fontSize: 12,
  },
  userRow: {flexDirection: 'row', justifyContent: 'flex-end'},
  user: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderTopRightRadius: 6,
    backgroundColor: COLORS.secondary,
    color: COLORS.foreground,
    fontSize: 15,
    lineHeight: 22,
  },
  row: {flexDirection: 'row', alignItems: 'flex-start', gap: 8},
  column: {flex: 1, gap: 4, alignItems: 'flex-start'},
  name: {color: COLORS.mutedForeground, fontSize: 12, fontWeight: '500'},
  bubble: {
    maxWidth: '100%',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderTopLeftRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  failed: {borderColor: `${COLORS.destructive}80`},
  error: {color: COLORS.destructive, fontSize: 14},
  dots: {flexDirection: 'row', gap: 6, paddingVertical: 16},
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.mutedForeground,
  },
  dot2: {opacity: 0.7},
  dot3: {opacity: 0.4},
});
