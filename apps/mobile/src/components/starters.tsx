import {CHARACTERS, characterOf} from '@binary/shared';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {Character} from '@/components/character-face';
import {COLORS} from '@/lib/theme';

interface StartersProps {
  avatar: string | null;
  /** What the character says first; defaults to its own greeting. */
  greeting?: string;
  /** First messages to tap; defaults to the character's own. */
  starters?: string[];
  onPick: (text: string) => void;
}

/** An empty chat: the character, its hello, and a few first messages. */
export function Starters({avatar, greeting, starters, onPick}: StartersProps) {
  const character = CHARACTERS[characterOf(avatar)];
  return (
    <View style={styles.wrap}>
      <Character avatar={avatar} size={150} />
      <Text style={styles.greeting}>{greeting ?? character.greeting}</Text>
      <View style={styles.list}>
        {(starters ?? character.starters).map((starter) => (
          <Pressable
            key={starter}
            accessibilityRole="button"
            onPress={() => onPick(starter)}
            style={({pressed}) => [styles.starter, pressed && styles.pressed]}
          >
            <Text style={styles.starterText}>{starter}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {alignItems: 'center', gap: 14, paddingTop: 24},
  greeting: {
    color: COLORS.foreground,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  list: {alignSelf: 'stretch', gap: 8, marginTop: 4},
  starter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pressed: {borderColor: COLORS.primary},
  starterText: {color: COLORS.mutedForeground, fontSize: 14},
});
