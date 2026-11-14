import {StyleSheet, Text, TextInput, View} from 'react-native';
import type {TextInputProps} from 'react-native';

import {COLORS, RADIUS} from '@/lib/theme';

interface TextFieldProps extends TextInputProps {
  label: string;
}

/** A labelled text input in the Binary dark style. */
export function TextField({label, ...inputProps}: TextFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={COLORS.mutedForeground}
        autoCapitalize="none"
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {gap: 8},
  label: {color: COLORS.foreground, fontSize: 14, fontWeight: '500'},
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS,
    paddingHorizontal: 14,
    color: COLORS.foreground,
    backgroundColor: COLORS.card,
    fontSize: 16,
  },
});
