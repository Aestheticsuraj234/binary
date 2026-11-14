import {Pressable, StyleSheet, Text} from 'react-native';

import {COLORS, RADIUS} from '@/lib/theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

/** The lime call-to-action button, used once per screen. */
export function PrimaryButton({title, onPress, disabled}: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => [
        styles.button,
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      <Text style={styles.title}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: RADIUS,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: {opacity: 0.7},
  title: {color: COLORS.primaryForeground, fontSize: 16, fontWeight: '600'},
});
