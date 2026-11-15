import {Ionicons} from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {COLORS} from '@/lib/theme';
import {useVoiceInput} from '@/lib/voice';

interface ComposerProps {
  value: string;
  onChange: (update: (text: string) => string) => void;
  onSend: () => void;
  /** True while an answer streams in: you can type, not send. */
  isRunning: boolean;
  placeholder: string;
  error: string;
}

/**
 * The message box, with a microphone. A recording becomes text in the box,
 * so you can fix a word before sending.
 */
export function Composer({
  value,
  onChange,
  onSend,
  isRunning,
  placeholder,
  error,
}: ComposerProps) {
  const voice = useVoiceInput((text) =>
    onChange((draft) => (draft.trim() ? `${draft.trimEnd()} ${text}` : text)),
  );
  const recording = voice.state === 'recording';
  const canSend = !isRunning && value.trim() !== '' && voice.state === 'idle';
  const shownError = voice.error || error;

  return (
    <View style={styles.wrap}>
      {recording && (
        <Text style={styles.hint} accessibilityLiveRegion="polite">
          Listening… tap the square when you're done.
        </Text>
      )}
      <View style={[styles.box, recording && styles.boxRecording]}>
        <TextInput
          value={value}
          onChangeText={(text) => onChange(() => text)}
          placeholder={
            voice.state === 'transcribing'
              ? 'Writing down what you said…'
              : placeholder
          }
          placeholderTextColor={COLORS.mutedForeground}
          accessibilityLabel={placeholder}
          multiline
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={recording ? 'Stop recording' : 'Talk'}
          disabled={voice.state === 'transcribing'}
          onPress={() => void voice.toggle()}
          style={[styles.round, recording && styles.recording]}
        >
          {voice.state === 'transcribing' ? (
            <ActivityIndicator size="small" color={COLORS.foreground} />
          ) : (
            <Ionicons
              name={recording ? 'stop' : 'mic'}
              size={18}
              color={recording ? COLORS.primaryForeground : COLORS.foreground}
            />
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send"
          disabled={!canSend}
          onPress={onSend}
          style={[styles.round, styles.send, !canSend && styles.dimmed]}
        >
          <Ionicons
            name="arrow-up"
            size={18}
            color={COLORS.primaryForeground}
          />
        </Pressable>
      </View>
      {shownError ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {shownError}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  hint: {color: COLORS.primary, fontSize: 13, paddingHorizontal: 8},
  box: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    padding: 6,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  boxRecording: {borderColor: COLORS.primary},
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 140,
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 9,
    color: COLORS.foreground,
    fontSize: 16,
  },
  round: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
  },
  recording: {backgroundColor: COLORS.primary},
  send: {backgroundColor: COLORS.primary},
  dimmed: {opacity: 0.4},
  error: {color: COLORS.destructive, fontSize: 13, paddingHorizontal: 8},
});
